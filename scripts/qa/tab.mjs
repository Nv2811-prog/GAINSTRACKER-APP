import { fileURLToPath } from 'node:url';
// Click every [onclick] on one tab (default gotham; --tab mission|suit|case|allies), one at a time, and report console errors per control.
// State is restored between clicks (data snapshot, session, sheets), so a destructive control (log rest day, start) can't shift the list.
// node tab.mjs [--tab mission] [--file html] [--fixture train|rest|none|<path>] [--width 393]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const TAB = A.tab || 'gotham';
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const fixture = A.fixture === 'none' ? null : A.fixture === 'rest' ? fx('./fixture.json') : !A.fixture || A.fixture === 'train' ? fx('./fixture-train.json') : A.fixture;
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture, width: A.width || null });
const P = ctx.page; const out = { tapped: 0, withErrors: [], skipped: [] };
const reset = (snap) => P.evaluate((snap, TAB) => {
  try { closeSheet(); } catch (e) {} try { closeOverlay(); } catch (e) {} try { closeAlfredChat(); } catch (e) {} try { _closeModal(); } catch (e) {}
  try { stopTimers(); } catch (e) {}
  state.session = null; state.step = null; state.subpage = null; state.minimized = false; state.showOnboarding = false; state.tab = TAB;
  state.data = JSON.parse(snap); try { __qa.clear(); } catch (e) {} render();
}, snap, TAB);
try {
  await open(ctx, { settle: 1500 });
  if (!fixture) await P.evaluate(() => { state.showOnboarding = false; state.data.u.name = 'Bruce'; render(); });
  const snap = await P.evaluate(() => JSON.stringify(state.data));
  await reset(snap); await sleep(300);
  const labels = await P.evaluate(() => [...document.querySelectorAll('#app [onclick]')].map((e) => (e.getAttribute('onclick') || '').slice(0, 70)));
  for (let i = 0; i < labels.length; i++) {
    const before = ctx.log.errors.length;
    const ok = await P.evaluate((i) => { const e = document.querySelectorAll('#app [onclick]')[i]; if (!e) return false; e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, i);
    await sleep(220);
    if (!ok) { out.skipped.push(labels[i]); continue; }
    out.tapped++;
    const errs = ctx.log.errors.slice(before);
    if (errs.length) out.withErrors.push({ i, onclick: labels[i], errors: errs.map((x) => x.slice(0, 160)) });
    await reset(snap); await sleep(60);
  }
  out.total = labels.length;
} catch (e) { out.fatal = String(e && e.stack || e).slice(0, 400); }
out.pageErrors = ctx.log.errors.length; out.failedRequests = ctx.log.failed;
console.log(JSON.stringify(out, null, 1));
await ctx.close();
