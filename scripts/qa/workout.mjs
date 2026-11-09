import { fileURLToPath } from 'node:url';
// THE WORKOUT SCREEN (2026-11-09): sets are not locked (an added / removed set stays on that day, "Just today" for a one-off), warm-ups stay on every day with the
// lift and remember their numbers, the first working set always pairs with last time's first working set however many warm-ups sit before it (L with L, R with R),
// the boxes hold today's aim per set, the next set follows what you just did, ± nudges on the active row, and the sets start right under the lift's name.
// Real app, fixture-train (split cycle8v2; Plate-Loaded Chest Press last time 90 × 7 then F 85 × 6). node workout.mjs [--v 1] [--width 375] [--out dir]
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const CP = 'Plate-Loaded Chest Press', LAT = 'Lat Pulldown (Wide Grip)', SID = 'cycle8v2', UA = 0, UB = 3, LA = 1;
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const shot = (n) => (A.out ? P.screenshot({ path: path.join(A.out, n + '.png') }) : null);
// start a clean session on a plan day and focus one lift; returns its index
const begin = (day, lift) => ev((a) => {
  state.session = null; state.step = null; try { stopTimers(); } catch (e) {}
  const sp = state.data.splits.find((s) => s.id === a.SID); state.data.activeSplitId = a.SID;
  startWorkout(sp.id, a.day); state.step = 'logging'; const ei = state.session.exercises.findIndex((e) => e.name === a.lift); state.session._focusEi = ei; render(); return ei;
}, { SID, day, lift });
const rows = (ei) => ev((ei) => state.session.exercises[ei].sets.map((s) => [s.type || 'NRM', s.prevW == null ? null : String(s.prevW), s.prevR == null ? null : String(s.prevR)]), ei);
const planS = (day, lift) => ev((a) => { const d = state.data.splits.find((s) => s.id === a.SID).days[a.day]; return ((d.plan || {})[a.lift] || {}).s; }, { SID, day, lift });
const toastTxt = () => ev(() => (document.getElementById('toast') || {}).textContent || '');
const undoToast = () => ev(() => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); return !!u; });
const still = () => P.waitForFunction(() => { const y = window.scrollY, w = window.__qaY; window.__qaY = y; return w === y; }, { polling: 120, timeout: 3000 }).catch(() => {});   // a finger lands on a still page: the app scrolls smoothly to a newly focused lift
const tapSel = async (sel, re) => {
  await still();
  const found = await ev((a) => { const r = a.re ? new RegExp(a.re) : null, e = [...document.querySelectorAll(a.sel)].find((x) => !r || r.test(x.textContent)); if (!e) return false; e.scrollIntoView({ block: 'center', behavior: 'instant' }); window.__qaTap = e; return true; }, { sel, re: re ? re.source : null });
  if (!found) return false;
  await still();
  const pt = await ev(() => { const b = window.__qaTap.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await sleep(120); await P.touchscreen.tap(pt.x, pt.y); await sleep(350); return true;
};
try {
  await open(ctx, { settle: 1400 });
  const P0 = await ev((a) => JSON.stringify(state.data.splits.find((s) => s.id === a.SID).days.map((d) => d.plan || null)), { SID });
  const clean = () => ev((a) => { JSON.parse(a.P0).forEach((pl, i) => { const d = state.data.splits.find((s) => s.id === a.SID).days[i]; if (pl) d.plan = pl; }); delete state.data.warmSets; save(); }, { SID, P0 });   // what one scenario keeps must not leak into the next
  /* ---------- the first working set is always matched to last time's first working set ---------- */
  let ei = await begin(UA, CP);
  await ev((ei) => { addSet(ei); setSetType(ei, 0, 'W'); }, ei);
  let r = await rows(ei);
  ok('a set turned into a warm-up: the first working set still shows last time\'s FIRST working set (90 × 7)', r[0][0] === 'W' && r[1][1] === '90' && r[1][2] === '7' && r[2][1] === '85', r);
  await ev((ei) => { addWarm(ei); addWarm(ei); }, ei);
  r = await rows(ei);
  const wk = r.filter((x) => x[0] !== 'W');
  ok('however many warm-ups come first, working set 1 stays 90 × 7', r.slice(0, 3).every((x) => x[0] === 'W') && wk[0][1] === '90' && wk[0][2] === '7', r);
  await ev((ei) => { const e = state.session.exercises[ei]; moveSet(ei, e.sets.length - 1, -1); }, ei);
  r = await rows(ei);
  ok('moving rows re-matches them too (working set 1 is still 90 × 7)', r.filter((x) => x[0] !== 'W')[0][1] === '90', r);
  const lr = await ev((CP) => {
    const d = state.data, gym = activeGymName(), S = (a) => a.map(([w, rp, type]) => ({ w: String(w), r: String(rp), type, done: true }));
    d.workouts.unshift({ id: 'qa-lr', date: new Date(now() - 3600e3).toISOString(), name: 'QA', gym, totalVol: 1, exercises: [{ name: CP, sets: S([[20, 10, 'W'], [40, 9, 'L'], [42.5, 8, 'R'], [40, 8, 'L'], [42.5, 7, 'R']]) }] }); save();
    const out = withPrev(CP, ['W', 'W', 'L', 'R', 'L', 'R'].map((type) => ({ w: '', r: '', type, done: false }))).map((s) => [s.type, s.prevW == null ? null : String(s.prevW), s.prevR == null ? null : String(s.prevR)]);
    d.workouts.shift(); save(); return out;
  }, CP);
  ok('left pairs with left and right with right, after any warm-ups', lr[2].join() === 'L,40,9' && lr[3].join() === 'R,42.5,8' && lr[4].join() === 'L,40,8' && lr[5].join() === 'R,42.5,7', lr);
  /* ---------- the boxes hold today's aim; last time and the aim sit on the line under it ---------- */
  await clean();
  ei = await begin(UA, CP);
  const aim = await ev((ei) => { const f = document.getElementById('lgfocus'), inp = [...f.querySelectorAll('.lg2-sr input[inputmode]')].map((i) => i.placeholder), line = [...f.querySelectorAll('.lg2-last')].map((x) => x.textContent.replace(/\s+/g, '')); return { inp, line }; }, ei);
  ok('working set 1: boxes 90 × 8 (last 7 reps, +1), line says last 90 × 7 and aim 90 × 8', aim.inp[0] === '90' && aim.inp[1] === '8' && /last90×7/.test(aim.line[0]) && /aim90×8/.test(aim.line[0]), aim);
  ok('working set 2 aims from its own last numbers (85 × 6 → 85 × 7)', aim.inp[2] === '85' && aim.inp[3] === '7' && /last85×6/.test(aim.line[1]) && /aim85×7/.test(aim.line[1]), aim);
  await ev((ei) => toggleDone(ei, 0), ei);
  const tick = await ev((ei) => { const s = state.session.exercises[ei].sets[0]; return [s.w, s.r, s.done]; }, ei);
  ok('the tick logs the aim without typing', tick.join() === '90,8,true', tick);
  /* ---------- the next set follows what you just did ---------- */
  ei = await begin(UA, LAT);
  const c0 = await ev((ei) => lgGhosts(state.session.exercises[ei]).map((g) => g && [g.w, g.r]), ei);
  await ev((ei) => { setField(ei, 0, 'w', '77.5'); setField(ei, 0, 'r', '6'); toggleDone(ei, 0); }, ei);
  const c1 = await ev((ei) => lgGhosts(state.session.exercises[ei]).map((g) => g && [g.w, g.r]), ei);
  ok('you lift a different weight on set 1: set 2 now shows that weight and those reps', c0[1][0] === '70' && c1[1].join() === '77.5,6', { c0, c1 });
  ei = await begin(UA, LAT);
  await ev((ei) => { toggleDone(ei, 0); }, ei);
  const c2 = await ev((ei) => lgGhosts(state.session.exercises[ei]).map((g) => g && [g.w, g.r]), ei);
  ok('you hit the aim on set 1: set 2 keeps its own aim', c2[1].join() === c0[1].join(), { c0, c2 });
  /* ---------- sets are not locked: this day only, Just today for a one-off ---------- */
  await clean();
  ei = await begin(UA, CP);
  const b0 = await planS(UB, CP);
  await tapSel('#lgfocus .lg2-b3', /Add set/);
  const t1 = await toastTxt(); await shot('add-set');
  ok('Add set is saved on this day: Upper A goes to 3 sets, Upper B keeps its own', (await planS(UA, CP)) === 3 && (await planS(UB, CP)) === b0 && /Upper A: 3 sets saved/.test(t1) && /Just today/.test(t1), { t1, a: await planS(UA, CP), b: await planS(UB, CP) });
  let n = await begin(UA, CP);
  const again = await ev((n) => state.session.exercises[n].sets.filter((s) => s.type !== 'W').length, n);
  ok('next time that day starts with the added set', again === 3, again);
  const hdr = await ev(() => document.querySelector('#lgfocus .eb').textContent);
  ok('the plan line follows (Plan 3 × 5–10)', /Plan 3 ×/.test(hdr), hdr);
  await ev((n) => delSet(n, 2), n);
  ok('a removed set is saved too (back to 2)', (await planS(UA, CP)) === 2, await planS(UA, CP));
  n = await begin(UA, CP);   // a new workout: the plan is 2 now
  await ev((n) => addSet(n), n);
  const u1 = await undoToast(); await sleep(200);
  ok('"Just today" keeps tonight\'s extra set but leaves the plan alone', u1 && (await planS(UA, CP)) === 2 && (await ev((n) => state.session.exercises[n].sets.length, n)) === 3, { u1, s: await planS(UA, CP) });
  await ev((n) => addSet(n), n);
  ok('…and the rest of tonight on that lift stays a one-off', (await planS(UA, CP)) === 2, await planS(UA, CP));
  const bigger = await ev((a) => { const d = state.data.splits.find((s) => s.id === a.SID).days[a.UA], names = d.exercises.filter((x) => !fcIsAbs(exFor(x))); const cur = names.reduce((t, x) => t + ghSetsOf(d, x), 0); d.plan[names[2]].s += 20 - cur; save(); return cur; }, { SID, UA });
  n = await begin(UA, LAT);
  await ev((n) => addSet(n), n);
  const t2 = await toastTxt();
  ok('your own limit is flagged: a day over 20 working sets (abs not counted)', /Upper A is 21 sets, over your 20/.test(t2), { t2, bigger });
  await clean();
  /* ---------- warm-ups stay on every day with the lift, with their numbers ---------- */
  n = await begin(UA, CP);
  await tapSel('#lgfocus .lg2-b3', /Add warm-up/);
  const t3 = await toastTxt();
  ok('Add warm-up puts one row above the working sets and says it is kept', (await rows(n))[0][0] === 'W' && /1 warm-up on every day with it/.test(t3), { t3, r: await rows(n) });
  let m = await begin(UB, CP);
  let rb = await rows(m);
  ok('the warm-up is on Upper B too (same lift)', rb[0][0] === 'W' && rb.filter((x) => x[0] === 'W').length === 1 && rb.filter((x) => x[0] !== 'W').length === b0, rb);
  m = await begin(UA, LAT);
  ok('a different lift gets no warm-up', (await rows(m)).every((x) => x[0] !== 'W'), await rows(m));
  const w1 = await ev((a) => { const d = state.data, gym = activeGymName(), set = (w, r, type) => ({ w: String(w), r: String(r), type, done: true });
    d.workouts.unshift({ id: 'qa-w0', date: new Date(now() - 7200e3).toISOString(), name: 'QA', gym, totalVol: 1, exercises: [{ name: a.CP, sets: [set(40, 10, 'W'), set(90, 7, 'NRM')] }] });
    d.workouts.unshift({ id: 'qa-w1', date: new Date(now() - 3600e3).toISOString(), name: 'QA', gym, totalVol: 1, exercises: [{ name: a.CP, sets: [set(90, 7, 'NRM')] }] }); save(); return 1; }, { CP });
  m = await begin(UA, CP);
  const wg = await ev((m) => { const f = document.getElementById('lgfocus'), i = [...f.querySelectorAll('.lg2-sr.w input[inputmode]')].map((x) => x.placeholder); toggleDone(m, 0); const s = state.session.exercises[m].sets[0]; return { i, s: [s.w, s.r, s.done] }; }, m);
  ok('a warm-up shows your last warm-up numbers (even if the newest session had none) and the tick logs them', wg.i.join() === '40,10' && wg.s.join() === '40,10,true', { wg, w1 });
  await ev((a) => { state.data.workouts = state.data.workouts.filter((w) => !/^qa-w/.test(w.id)); save(); }, {});
  m = await begin(UA, CP);
  await ev((m) => delSet(m, 0), m);
  ok('removing the warm-up removes it on every day with the lift', (await ev((a) => state.data.warmSets[exKey(a)], CP)) === 0, await ev((a) => state.data.warmSets[exKey(a)], CP));
  m = await begin(UB, CP);
  ok('…so Upper B starts without it', (await rows(m)).every((x) => x[0] !== 'W'), await rows(m));
  await clean();
  /* ---------- practical during a set ---------- */
  ei = await begin(UA, CP);
  await shot('top');
  const top = await ev(() => { const f = document.getElementById('lgfocus'), y = (s) => { const e = f.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; }; return { kpis: !!f.querySelector('.lg2-kpis'), chips: !!f.querySelector('.lg2-chips'), fold: (f.querySelector('.lg2-fold') || {}).textContent, row: y('.lg2-sr') }; });
  ok('the sets start right under the lift: recovery, volume and e1RM fold into one line', !top.kpis && !top.chips && /Chest 9\d%/.test(top.fold) && /e1RM/.test(top.fold) && top.row < 400, top);
  await tapSel('#lgfocus .lg2-fold');
  const opened = await ev(() => { const f = document.getElementById('lgfocus'); return { kpis: !!f.querySelector('.lg2-kpis'), chips: !!f.querySelector('.lg2-chips'), lastTile: [...f.querySelectorAll('.lg2-kpi')].map((k) => k.textContent.replace(/\s+/g, ' ').trim()) }; });
  ok('one tap opens the details again; the Target tile matches set 1', opened.kpis && opened.chips && /90 ?× ?8/.test(opened.lastTile[0]), opened);
  await ev(() => lgToggleInfo());
  const before = await ev((ei) => { window.__qaRow = document.querySelector('#lgfocus .lg2-sr'); return !!document.querySelector('#lgfocus .lg2-nudge'); }, ei);
  await tapSel('#lgfocus .lg2-nudge button[aria-label="2.5 kg more"]');
  await tapSel('#lgfocus .lg2-nudge button[aria-label="1 rep less"]');
  const nd = await ev((ei) => { const s = state.session.exercises[ei].sets[0]; return { w: s.w, r: s.r, wv: document.querySelector('[data-fid="' + ei + '-0-w"]').value, rv: document.querySelector('[data-fid="' + ei + '-0-r"]').value, same: window.__qaRow === document.querySelector('#lgfocus .lg2-sr') }; }, ei);
  ok('± on the active row nudges from the aim (90 → 92.5, 8 → 7) without a keyboard or a redraw', before && nd.w === '92.5' && nd.r === '7' && nd.wv === '92.5' && nd.rv === '7' && nd.same, nd);
  ei = await begin(UA, CP);
  await ev((ei) => { addWarm(ei); toggleDone(ei, 1); }, ei);
  const act = await ev(() => [...document.querySelectorAll('#lgfocus .lg2-sr')].map((x) => x.classList.contains('act')));
  ok('a warm-up you skip does not hold the cursor: the next working set is active', act.join() === 'false,false,true', act);
  await ev(() => { delete state.data.warmSets; save(); });
  await ev(() => { state.session = null; state.step = null; try { stopTimers(); } catch (e) {} render(); });
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 900) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
