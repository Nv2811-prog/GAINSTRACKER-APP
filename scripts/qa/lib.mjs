import { fileURLToPath } from 'node:url';
// GainsTracker headless QA harness — shared library.
// Serves the app's directory on a private port, launches headless Chrome emulating an iPhone,
// fakes the clock (so fixture data reads "fresh"), BLOCKS every external network call (Firebase,
// Gemini, RapidAPI — never burn the user's ExerciseDB quota), and captures console errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const DEFAULT_FILE = '/Users/nickivendelbo/Desktop/Gainstracker batman/Gainstracker app not complete.html';
export const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

// Stand-in for an ExerciseDB demo: flat WHITE plate with a grey figure, like the real GIFs.
const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360"><rect width="360" height="360" fill="#fff"/><g fill="#8a8f96"><circle cx="180" cy="84" r="26"/><rect x="150" y="114" width="60" height="110" rx="22"/><rect x="104" y="122" width="40" height="16" rx="8" transform="rotate(-28 124 130)"/><rect x="216" y="122" width="40" height="16" rx="8" transform="rotate(28 236 130)"/><rect x="152" y="218" width="22" height="96" rx="10"/><rect x="186" y="218" width="22" height="96" rx="10"/></g><rect x="60" y="300" width="240" height="10" rx="5" fill="#c9cdd2"/></svg>`;

export function startServer(rootDir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      try {
        const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let p = path.join(rootDir, u);
        if (!p.startsWith(rootDir)) { res.writeHead(403); return res.end(); }
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
        if (!fs.existsSync(p)) { res.writeHead(404); return res.end('nf'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(p).pipe(res);
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

// Injected before any page script: offset Date so "now" = fakeNow (time still flows forward).
function fakeClock(fakeNow) {
  const RD = Date; let off = fakeNow ? fakeNow - RD.now() : 0;
  function FD(...a) { if (!new.target) return new RD(RD.now() + off).toString(); return a.length ? new RD(...a) : new RD(RD.now() + off); }
  FD.prototype = RD.prototype; FD.now = () => RD.now() + off; FD.parse = RD.parse; FD.UTC = RD.UTC;
  Object.defineProperty(window, 'Date', { value: FD, writable: true, configurable: true });
  window.__qaSetNow = (ms) => { off = ms - RD.now(); };
  window.__qaRealDate = RD;
  // Headless has no voices; make speech a silent no-op so nothing waits on it.
  try { if (window.speechSynthesis) { window.speechSynthesis.speak = () => {}; } } catch (e) {}
}

export async function launch({ file = DEFAULT_FILE, fixture = null, fakeNow = null, storage = null, headful = false, width = null } = {}) {
  const rootDir = path.dirname(path.resolve(file));
  const { srv, port } = await startServer(rootDir);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: headful ? false : 'new', args: ['--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--disable-features=Translate'] });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport(width ? { ...VIEWPORT, width: +width } : VIEWPORT);
  await page.setBypassServiceWorker(true);
  const log = { errors: [], warnings: [], failed: [], blocked: 0 };
  page.on('console', (m) => { const t = m.type(); const tx = m.text(); if (t === 'error') { if (!/ERR_BLOCKED_BY_CLIENT|Blocked call to navigator\.vibrate/.test(tx)) log.errors.push(tx); } else if (t === 'warning' || t === 'warn') log.warnings.push(tx); });
  page.on('pageerror', (e) => log.errors.push('PAGEERROR: ' + (e && e.message || e)));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.hostname === '127.0.0.1' || u.protocol === 'data:' || u.protocol === 'blob:') return req.continue();
    if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'raw.githubusercontent.com') return req.continue();
    if (u.hostname === 'exercisedb.p.rapidapi.com') {
      log.blocked++;
      if (u.pathname.startsWith('/image')) return req.respond({ status: 200, contentType: 'image/svg+xml', body: DEMO_SVG, headers: { 'Access-Control-Allow-Origin': '*' } });
      return req.respond({ status: 200, contentType: 'application/json', body: '[]', headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    log.blocked++;
    return req.abort('blockedbyclient');
  });
  page.on('requestfailed', (req) => { const f = req.failure(); if (f && !String(f.errorText).includes('ERR_BLOCKED_BY_CLIENT')) log.failed.push(req.url() + ' ' + f.errorText); });

  // Seed localStorage + fake clock before the app boots.
  let fx = null;
  if (fixture) fx = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const store = storage || (fx && fx.storage) || {};
  const now = fakeNow != null ? fakeNow : (fx && fx.now) || null;
  await page.evaluateOnNewDocument(fakeClock, now);
  await page.evaluateOnNewDocument((s) => { try { if (!sessionStorage.getItem('__qa_seeded')) { localStorage.clear(); for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); sessionStorage.setItem('__qa_seeded', '1'); } } catch (e) {} }, store);
  const helpers = fs.readFileSync(new URL('./helpers.js', import.meta.url), 'utf8');
  await page.evaluateOnNewDocument(helpers);
  const url = `http://127.0.0.1:${port}/${encodeURIComponent(path.basename(file))}`;
  return { browser, page, srv, log, url, close: async () => { try { await browser.close(); } catch (e) {} srv.close(); } };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function open(ctx, { settle = 1200 } = {}) {
  await ctx.page.goto(ctx.url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(settle);
}

// Screenshot what the phone shows, one viewport-high "screen" at a time (top → bottom).
export async function shootScreens(page, outPrefix, { max = 6, scroller = null } = {}) {
  const files = [];
  const total = await page.evaluate((sel) => { const el = sel && document.querySelector(sel); return el ? el.scrollHeight : document.documentElement.scrollHeight; }, scroller);
  const vh = VIEWPORT.height;
  const n = Math.min(max, Math.max(1, Math.ceil(total / vh)));
  for (let i = 0; i < n; i++) {
    await page.evaluate((y, sel) => { const el = sel && document.querySelector(sel); if (el) el.scrollTop = y; else window.scrollTo(0, y); }, i * vh, scroller);
    await sleep(350);
    const f = `${outPrefix}-${i}.png`;
    await page.screenshot({ path: f });
    files.push(f);
  }
  await page.evaluate((sel) => { const el = sel && document.querySelector(sel); if (el) el.scrollTop = 0; else window.scrollTo(0, 0); }, scroller);
  return { files, totalHeight: total, screens: Math.ceil(total / vh) };
}
