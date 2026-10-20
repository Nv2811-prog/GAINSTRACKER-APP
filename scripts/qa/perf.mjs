import { fileURLToPath } from 'node:url';
// Perf budget check: HTML size, DOM nodes, render() ms, infinite animations and backdrop-filter per screen, first paint.
// node perf.mjs [html] [--throttle 4] [--width 393]     (CPU throttle 4 approximates a mid-range phone; targets: <=1 infinite animation, <=3 backdrop-filters per screen)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const av = process.argv.slice(2);
const file = av.find((a, i) => !a.startsWith('--') && !(av[i - 1] || '').startsWith('--')) || DEFAULT_FILE;
const opt = (k, d) => { const i = av.indexOf('--' + k); return i >= 0 ? av[i + 1] : d; };
const throttle = +opt('throttle', 1); const width = opt('width', null);
const fixture = fileURLToPath(new URL('./fixture-train.json', import.meta.url));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const MEASURE = () => {
  const vw = innerWidth, vh = innerHeight;
  const shown = (el, cs, r) => cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  const inView = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  let bf = 0, bfView = 0; const bfNames = [];
  const check = (el, pseudo) => {
    const v = getComputedStyle(el, pseudo).backdropFilter;
    if (!v || v === 'none') return;
    const ecs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (!shown(el, ecs, r)) return;
    bf++; if (inView(r) || ecs.position === 'fixed') { bfView++; bfNames.push((el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]) + (pseudo || '')); }
  };
  document.querySelectorAll('*').forEach((el) => { check(el, null); check(el, '::before'); check(el, '::after'); });
  const infinite = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity);
  const infView = []; let infAll = 0;
  for (const a of infinite) {
    const t = a.effect.target; if (!t) continue; infAll++;
    const cs = getComputedStyle(t); const r = t.getBoundingClientRect();
    if (shown(t, cs, r) && (inView(r) || cs.position === 'fixed') && +cs.opacity > 0) infView.push(a.animationName + (a.effect.pseudoElement || '') + '@' + (t.id ? '#' + t.id : '.' + String(t.className).split(' ')[0]));
  }
  const times = []; for (let i = 0; i < 12; i++) { const s = performance.now(); render(); times.push(performance.now() - s); }
  times.sort((x, y) => x - y);
  return { dom: document.querySelectorAll('*').length, appDom: document.querySelectorAll('#app *').length, renderMs: +times[6].toFixed(1), renderMax: +times[11].toFixed(1), backdropAll: bf, backdropView: bfView, bfNames: bfNames.slice(0, 5), infiniteAll: infAll, infiniteVisible: infView.length, infNames: [...new Set(infView)].slice(0, 6) };
};

const out = { file: file.split('/').pop(), throttle, bytes: fs.statSync(file).size, gzip: zlib.gzipSync(fs.readFileSync(file)).length, paint: [], screens: {} };
// cold first paint, 3 loads
const fcps = [], dcls = [];
for (let n = 0; n < 3; n++) {
  const c = await launch({ file, fixture, width });
  if (throttle > 1) { const cdp = await c.page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  await open(c, { settle: 800 });
  const p = await c.page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: fcp ? fcp.startTime : null, dcl: nav ? nav.domContentLoadedEventEnd : null, appChildren: document.querySelector('#app').children.length }; });
  fcps.push(p.fcp); dcls.push(p.dcl); await c.close();
}
out.paint = { fcpMs: +median(fcps.filter(Boolean)).toFixed(0), appBootedByMs: +median(dcls.filter(Boolean)).toFixed(0) };
const ctx = await launch({ file, fixture, width });
const P = ctx.page;
if (throttle > 1) { const cdp = await P.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
await open(ctx, { settle: 1500 });
const grab = async (name, prep) => { if (prep) await P.evaluate(prep); await sleep(900); out.screens[name] = await P.evaluate(MEASURE); };
for (const t of ['gotham', 'mission', 'suit', 'case', 'allies', 'alfred']) await grab(t, `__qa.tab('${t}')`);
await grab('readiness', `(() => { const { sp, i } = __qa.nextDay(); startWorkout(sp.id, i); __qa.clear(); })()`);
await grab('logging', `(() => { try { setReadiness(3); } catch (e) { state.session.readiness = 3; } try { beginPatrol(); } catch (e) { state.step = 'logging'; } __qa.clear();
  for (let n = 0, ei = 0; ei < state.session.exercises.length && n < 3; ei++) { const ex = state.session.exercises[ei]; for (let si = 0; si < ex.sets.length && n < 3; si++) { const s = ex.sets[si]; if (s.type === 'W') continue; s.w = s.prevW || '40'; s.r = s.prevR || '8'; s.rpe = '2'; try { toggleDone(ei, si); } catch (e) { s.done = true; } n++; } } __qa.clear(); })()`);
await grab('sheet-open', 'openSettings()');
await grab('home-live', `(() => { try { closeSheet(); } catch (e) {} minimizeWorkout(); __qa.tab('gotham'); })()`);
await P.evaluate(() => { try { resumeWorkout(); } catch (e) {} __qa.finish(); }); await sleep(1500); await P.evaluate(() => { __qa.clear(); }); await grab('summary', null);
out.errors = ctx.log.errors.slice(0, 5);
await ctx.close();
const S = Object.entries(out.screens);
console.log(`${out.file} @cpu x${throttle}  size ${out.bytes} B (gzip ${out.gzip} B)  FCP ${out.paint.fcpMs} ms  app booted by ${out.paint.appBootedByMs} ms  errors ${JSON.stringify(out.errors)}`);
console.log('screen      dom  #app  render(ms,max)  infinite(vis/all)  backdrop(vis/all)');
for (const [k, v] of S) console.log(`${k.padEnd(11)} ${String(v.dom).padStart(4)} ${String(v.appDom).padStart(5)}  ${String(v.renderMs).padStart(6)} ${String(v.renderMax).padStart(6)}   ${v.infiniteVisible}/${v.infiniteAll} ${v.infNames.join(',')}   ${v.backdropView}/${v.backdropAll} ${v.bfNames.join(',')}`);
