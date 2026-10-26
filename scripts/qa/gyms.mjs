import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// GYMS (2026-10-26): add Copenhagen Gym (brands preselected), strictly per-gym weights, reset weights & records, delete a gym (history kept,
// legacy unstamped sessions never move to another gym), Undo for both. Real app, fixture-train. node gyms.mjs [--out dir] [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const CP = 'Plate-Loaded Chest Press', CG = 'Copenhagen Gym Valby';
if (A.out) fs.mkdirSync(A.out, { recursive: true });
try {
  await open(ctx, { settle: 1400 });
  const base = await ev((CP) => { const d = state.data; return { legacy: d.u.legacyGym, gyms: d.u.gyms.slice(), last: (lastOuting(CP) || {}).date || null, n: d.workouts.length, unstamped: d.workouts.filter((w) => !w.gym).length }; }, CP);
  ok('migration v5 pinned the legacy gym (Fitness X); this gym has chest press history', base.legacy === 'Fitness X' && !!base.last, base);
  // add Copenhagen Gym: the equipment sheet opens with its brands preselected; save
  await ev((CG) => { appPrompt = () => Promise.resolve(CG); promptAddGym(false); }, CG); await sleep(500);
  const eq = await ev(() => ({ open: !!document.querySelector('#sheet.on'), brands: [...document.querySelectorAll('#sheet .gymbr.on')].map((b) => b.textContent) }));
  ok('adding "Copenhagen Gym Valby" opens its equipment with the five brands preselected', eq.open && ['Panatta', 'Hammer Strength', 'BootyBuilder', 'Cybex', 'Arsenal Strength'].every((b) => eq.brands.includes(b)), eq);
  await ev(() => saveGym());
  const cg = await ev((CP) => ({ active: activeGymName(), brands: ((state.data.gymEquipment || {})[activeGymName()] || {}).brands, last: lastOuting(CP), prs: Object.keys(state.data.prs || {}).length }), CP);
  ok('Copenhagen Gym is active, brands saved, and it starts EMPTY (no last weights, no records)', cg.active === CG && cg.brands && cg.brands.length === 5 && cg.last === null && cg.prs === 0, cg);
  // log a session there, then the per-gym separation both ways
  await ev((CP) => { const d = state.data; d.workouts.unshift({ id: 'cg1', date: new Date(now() - 60e3).toISOString(), name: 'QA', gym: activeGymName(), totalVol: 1, exercises: [{ name: CP, sets: [{ w: '120', r: '8', type: 'NRM', done: true }] }] }); save(); }, CP);
  const both = await ev((CP) => { const here = (lastOuting(CP) || {}).sets; switchGym('Fitness X'); const there = (lastOuting(CP) || {}).sets; return { here: here && here[0].w, there: there && there[0].w }; }, CP);
  ok('each gym sees only its own weights (Copenhagen 120, Fitness X its old numbers)', both.here === '120' && both.there && both.there !== '120', both);
  /* ---------- reset weights & records (Fitness X), with Undo ---------- */
  await ev(() => { openGyms(); }); await sleep(300);
  if (A.out) await P.screenshot({ path: path.join(A.out, 'gyms-sheet.png') });
  const r0 = await ev((CP) => ({ prs: Object.keys(state.data.prsByGym['Fitness X'] || {}).length, n: state.data.workouts.length }), CP);
  await ev(() => { appConfirm = () => Promise.resolve(true); gymResetAsk('Fitness X'); }); await sleep(300);
  const r1 = await ev((CP) => ({ prs: Object.keys(state.data.prsByGym['Fitness X'] || {}).length, live: Object.keys(state.data.prs || {}).length, last: lastOuting(CP), n: state.data.workouts.length, reset: !!(state.data.gymReset || {})['Fitness X'], vol: weeklySets('chest') }), CP);
  ok('reset: Fitness X records and last weights are gone, every session is still in history', r0.prs > 0 && r1.prs === 0 && r1.live === 0 && r1.last === null && r1.n === r0.n && r1.reset, { r0, r1 });
  ok('reset keeps the training history counting (weekly sets still read the sessions)', r1.vol > 0, r1.vol);
  await ev(() => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); }); await sleep(300);
  const r2 = await ev((CP) => ({ prs: Object.keys(state.data.prsByGym['Fitness X'] || {}).length, last: !!lastOuting(CP) }), CP);
  ok('Undo puts the records and last weights back', r2.prs === r0.prs && r2.last, r2);
  /* ---------- delete Fitness X: history stays, its weights never reach Copenhagen Gym ---------- */
  await ev(() => { appConfirm = () => Promise.resolve(true); gymDeleteAsk('Fitness X'); }); await sleep(300);
  const d1 = await ev((CP) => ({ gyms: state.data.u.gyms.slice(), active: activeGymName(), n: state.data.workouts.length, last: (lastOuting(CP) || {}).sets, legacy: state.data.u.legacyGym, prs: !!(state.data.prsByGym || {})['Fitness X'] }), CP);
  ok('delete: Fitness X is gone, Copenhagen Gym is active, history kept', d1.gyms.join() === CG && d1.active === CG && d1.n === r1.n && !d1.prs, d1);
  ok('old unstamped sessions stay with the deleted gym: Copenhagen still sees only its own 120', d1.last && d1.last[0].w === '120', d1.last);
  await ev(() => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); }); await sleep(300);
  const d2 = await ev(() => ({ gyms: state.data.u.gyms.slice(), active: activeGymName(), prs: Object.keys((state.data.prsByGym || {})['Fitness X'] || {}).length }));
  ok('Undo brings Fitness X back (gym, records, active)', d2.gyms.includes('Fitness X') && d2.prs > 0 && d2.active === 'Fitness X', d2);
  const only = await ev(() => { state.data.u.gyms = ['Solo']; state.data.u.activeGym = 'Solo'; let t = ''; const tt = toast; toast = (x) => { t = x; }; gymDeleteAsk('Solo'); toast = tt; return { t, gyms: state.data.u.gyms.slice() }; });
  ok('the last gym can\'t be deleted (add the new one first)', /Add your new gym first/.test(only.t) && only.gyms.join() === 'Solo', only);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
