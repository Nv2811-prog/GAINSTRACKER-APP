import { fileURLToPath } from 'node:url';
// GP:CHARM regression check (wave 6): light sweep once per tab per session, live numbers + ring draw-ins on first view only,
// section-header icons, hero View Transition group (<= 220 ms), scroll-driven hero art, art behind the sheets, reduced motion = quiet.
// node charm.mjs [--file html] [--fixture path] [--width 393]    exit code 1 when a check fails
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fixture = A.fixture || fileURLToPath(new URL('./fixture-train.json', import.meta.url));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture, width: A.width || null });
const P = ctx.page; const R = {};
await P.evaluateOnNewDocument(() => {
  window.__sw = 0; window.__cu = new Set();
  new MutationObserver((ms) => ms.forEach((m) => {
    if (m.type === 'characterData') window.__cu.add(m.target);
    m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('gp-sw')) window.__sw++; });
  })).observe(document, { childList: true, characterData: true, subtree: true });
});
const tab = async (t) => { await P.evaluate((x) => { window.__sw = 0; window.__cu = new Set(); __qa.tab(x); window.scrollTo(0, 0); }, t); await sleep(900); return P.evaluate(() => ({ sw: window.__sw, cu: window.__cu.size, first: !!document.querySelector('#app>.gh.gp-first'), ic: document.querySelectorAll('#app .gh-lh h3,#app .gh-sec h2').length - document.querySelectorAll('#app [data-ac] .gp-ic').length })); };
try {
  await open(ctx, { settle: 1500 });
  const m1 = await tab('mission'), m2 = await tab('gotham'), m3 = await tab('mission'), s1 = await tab('suit'), c1 = await tab('case');
  R.sweepOncePerTab = m1.sw === 1 && s1.sw === 1 && c1.sw === 1 && m2.sw === 0 && m3.sw === 0;
  R.countUpsFirstViewOnly = m1.cu > 0 && s1.cu > 0 && m2.cu === 0 && m3.cu === 0;
  R.drawInFirstViewOnly = m1.first && s1.first && !m2.first && !m3.first;
  R.noRerenderReplay = await P.evaluate(async () => { window.__sw = 0; window.__cu = new Set(); render(); render(); await new Promise((r) => setTimeout(r, 900)); return window.__sw === 0 && window.__cu.size === 0; });
  R.everySectionHeaderHasIcon = m1.ic === 0 && s1.ic === 0 && c1.ic === 0;
  R.parallaxMoves = await P.evaluate(async () => {
    __qa.tab('gotham'); window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
    const a = getComputedStyle(document.querySelector('.gh-art, .ga img')).transform; window.scrollTo(0, 340); await new Promise((r) => setTimeout(r, 350));
    return a !== getComputedStyle(document.querySelector('.gh-art, .ga img')).transform;
  });
  R.sheetArt = await P.evaluate(() => {
    openExDetail(state.data.workouts[0].exercises[0].name); const x = getComputedStyle(document.querySelector('.p3-xh'), '::before').backgroundImage; closeSheet();
    muscleDrill('chest'); const d = getComputedStyle(document.querySelector('.gm-dos .gm-bh'), '::before').backgroundImage; closeSheet();
    return /head-exercise\.jpg/.test(x) && /head-muscle\.jpg/.test(d);
  });
  R.heroTransition = await P.evaluate(async () => {
    __qa.tab('gotham'); window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300));
    go('suit', 1); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const an = document.getAnimations().filter((a) => a.effect && a.effect.pseudoElement), d = (n) => { const a = an.find((x) => x.effect.pseudoElement === n); return a ? a.effect.getComputedTiming().duration : null; };
    const hero = d('::view-transition-group(gp-hero)'), root = d('::view-transition-group(root)');
    await new Promise((r) => setTimeout(r, 500));
    return { hero, root, ok: hero > 0 && hero <= 220 && root > 0 && root <= 220 && !document.querySelector('[style*="view-transition-name"]') };
  });
  await P.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  R.reducedMotionQuiet = await P.evaluate(async () => { GP_SEEN.clear(); window.__sw = 0; go('mission', 1); await new Promise((r) => setTimeout(r, 600)); return window.__sw === 0 && state.tab === 'mission'; });
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 400); }
R.consoleErrors = ctx.log.errors;
const bad = Object.entries(R).filter(([k, v]) => (k === 'consoleErrors' ? v.length : k === 'heroTransition' ? !v.ok : v !== true));
console.log(JSON.stringify(R, null, 1));
console.log(bad.length ? 'FAIL: ' + bad.map((b) => b[0]).join(', ') : 'PASS: all charm checks');
await ctx.close();
process.exit(bad.length ? 1 : 0);
