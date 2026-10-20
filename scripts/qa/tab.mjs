import { fileURLToPath } from 'node:url';
// Click every [onclick] on one tab (default gotham; --tab mission|suit|case|allies), one at a time, and report console errors per control.
// State is restored between clicks (data snapshot, session, sheets), so a destructive control (log rest day, start) can't shift the list.
// node tab.mjs [--tab mission] [--file html] [--fixture train|rest|none|<path>] [--width 393]
//   sheets/overlays: --open "openSettings()" --scope "#sheet [onclick]" re-opens that surface after every tap and taps what is inside it;
//   --inject-file f.js runs page code after boot (e.g. seeded allies); --skip "backupData|exportCSV" leaves out controls that would start a download.
import fs from 'node:fs';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const TAB = A.tab || 'gotham';
const SCOPE = A.scope || '#app [onclick]';
const SKIP = A.skip ? new RegExp(A.skip) : null;
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const fixture = A.fixture === 'none' ? null : A.fixture === 'rest' ? fx('./fixture.json') : !A.fixture || A.fixture === 'train' ? fx('./fixture-train.json') : A.fixture;
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture, width: A.width || null });
const P = ctx.page; const out = { tapped: 0, withErrors: [], skipped: [] };
const reset = (snap) => P.evaluate((snap, TAB, OPEN) => {
  try { closeSheet(); } catch (e) {} try { closeOverlay(); } catch (e) {} try { closeAlfredChat(); } catch (e) {} try { _closeModal(); } catch (e) {}
  try { stopTimers(); } catch (e) {}
  state.session = null; state.step = null; state.subpage = null; state.minimized = false; state.showOnboarding = false; state.tab = TAB;
  state.data = JSON.parse(snap); try { __qa.clear(); } catch (e) {} render();
  if (OPEN) { try { eval(OPEN); } catch (e) { console.error('open failed: ' + e.message); } }
}, snap, TAB, A.open || '');
try {
  await open(ctx, { settle: 1500 });
  if (!fixture) await P.evaluate(() => { state.showOnboarding = false; state.data.u.name = 'Bruce'; render(); });
  if (A['inject-file']) await P.evaluate(fs.readFileSync(A['inject-file'], 'utf8'));
  const snap = await P.evaluate(() => JSON.stringify(state.data));
  await reset(snap); await sleep(300);
  const labels = await P.evaluate((SC) => [...document.querySelectorAll(SC)].map((e) => (e.getAttribute('onclick') || '').slice(0, 70)), SCOPE);
  for (let i = 0; i < labels.length; i++) {
    if (SKIP && SKIP.test(labels[i])) { out.skipped.push(labels[i]); continue; }
    const before = ctx.log.errors.length;
    const ok = await P.evaluate((i, SC) => { const e = document.querySelectorAll(SC)[i]; if (!e) return false; e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, i, SCOPE);
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
