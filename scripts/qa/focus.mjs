import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// GP:FOCUS (2026-10-22): rank up to 5 muscles and the whole active split follows (order + sets), from the plan as written, with undo.
// Real touch taps, fixture-train (the 8-day cycle v2 is the active plan after migration v3). Pass/fail per check; exit 1 on any failure or console error.
//   1. the Mission dock has a Focus tile; it opens the sheet; taps rank muscles (badge 1, 2), a 6th is refused, a second tap removes
//   2. apply [back, chest]: focus lifts open their home days (upper), lower days keep their order, every day keeps the same lifts,
//      ≤ 20 working sets a day (abs not counted), ≤ 4 sets a lift, nothing over MRV, non-focus muscles never pushed under MEV, rep targets and
//      rest days unchanged, workouts byte-identical, the dock names the focus, tonight's session starts with the focus lift
//   3. Undo restores the splits byte for byte
//   4. re-ranking rebuilds from the plan as written (no compounding); Clear gives back the exact original days
//   5. a plan edited after a focus becomes the new starting point (the focus no longer claims it)
// node focus.mjs [--width 393|375] [--out shots-dir] [--file html] [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fx('./fixture-train.json'), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const page = async (name) => { if (A.out) { await sleep(300); await P.screenshot({ path: path.join(A.out, name + '.png') }); } };
const pointOf = (sel, text) => P.evaluate((sel, text) => {
  const el = [...document.querySelectorAll(sel)].find((e) => text == null || e.textContent.includes(text));
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel, text);
const tap = async (sel, text = null) => { const pt = await pointOf(sel, text); if (!pt) throw new Error('no element: ' + sel + ' ' + (text || '')); await sleep(150); await P.touchscreen.tap(pt.x, pt.y); await sleep(450); };
const ev = (f, ...a) => P.evaluate(f, ...a);
const reset = () => ev(() => {
  try { closeSheet(); } catch (e) {} state.session = null; state.step = null; state.subpage = null; state.showOnboarding = false;
  try { __qa.clear(); } catch (e) {} go('mission'); window.scrollTo(0, 0);
});
const openSheetByTile = async () => { await reset(); await sleep(300); await tap('.gd-t', 'Focus'); await sleep(500); };
// every rule the applied plan must keep, read through the app's own helpers
const audit = () => ev(() => {
  const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId), base = sp.focus ? sp.focus.base : sp.days, k = 7 / sp.days.length;
  const mb = fcModel(base), ma = fcModel(sp.days), wb = fcWeek(mb, k), wa = fcWeek(ma, k), bad = [];
  sp.days.forEach((d, i) => {
    const b = base[i];
    if (isRest(b)) { if (JSON.stringify(d) !== JSON.stringify(b)) bad.push('rest day ' + i + ' changed'); return; }
    if (d.exercises.slice().sort().join('|') !== b.exercises.slice().sort().join('|')) bad.push('day ' + i + ' lifts changed');
    if (fcWork(ma[i]) > FOCUS_DAY_CAP && fcWork(ma[i]) > fcWork(mb[i])) bad.push('day ' + i + ' over the cap: ' + fcWork(ma[i]));
    ma[i].forEach((l) => {
      if (l.s > Math.max(FOCUS_LIFT_MAX, ghSetsOf(b, l.n))) bad.push(l.n + ' ' + l.s + ' sets');
      const pb = b.plan && b.plan[l.n], pa = d.plan && d.plan[l.n];
      if (pb && pa && pb.r !== pa.r) bad.push(l.n + ' reps changed');
    });
  });
  M12.forEach((m) => {
    const z = zoneOf(m, 0);
    if ((wa[m] || 0) > z.mrv + 1e-6 && (wa[m] || 0) > (wb[m] || 0) + 1e-6) bad.push(m + ' pushed over MRV');
    if (!(sp.focus ? sp.focus.ranks : []).includes(m) && (wb[m] || 0) >= z.mev && (wa[m] || 0) < z.mev - 1e-6) bad.push(m + ' pushed under MEV');
  });
  return { bad, wb, wa, days: sp.days.map((d) => d.rest ? null : d.exercises.slice(0, 3)), ranks: sp.focus ? sp.focus.ranks : null };
});
const splitsRaw = () => ev(() => JSON.stringify(state.data.splits));
try {
  await open(ctx, { settle: 1400 });
  await reset(); await sleep(400);
  const s0 = await ev(() => ({ raw: JSON.stringify(state.data.splits), w: JSON.stringify(state.data.workouts), id: state.data.activeSplitId,
    orig: JSON.stringify(state.data.splits.find((s) => s.id === state.data.activeSplitId).days) }));
  ok('the 8-day cycle v2 is the active plan on the fixture', s0.id === 'cycle8v2', s0.id);

  /* ---------- 1 · tile, sheet, ranking taps ---------- */
  const tile = await ev(() => { const t = [...document.querySelectorAll('.gd-t')].find((x) => x.querySelector('.gd-t1').textContent === 'Focus'); return t && t.querySelector('.gd-t2').textContent; });
  ok('Mission dock: a Focus tile, inviting a ranking while none is set', tile === 'Rank your top 5', tile);
  await openSheetByTile();
  ok('the tile opens the Training focus sheet with nothing ranked', await ev(() => state._sheetKind === 'focus' && document.querySelectorAll('#sheet .fc-m').length === FOCUS_PICK.length && !document.querySelector('#sheet .fc-m.on')), null);
  await tap('#sheet .fc-m', 'Back'); await tap('#sheet .fc-m', 'Chest');
  const badges = await ev(() => [...document.querySelectorAll('#sheet .fc-m.on')].map((b) => b.querySelector('span').textContent + b.querySelector('b').textContent));
  ok('taps rank in order: Back 1, Chest 2 (gold badges)', badges.join() === 'Chest2,Back1', badges);
  const rows = await ev(() => [...document.querySelectorAll('#sheet .fc-row')].slice(0, 2).map((r) => r.querySelector('.fc-rt span').textContent + (r.querySelector('b.fc-rk') || {}).textContent));
  ok('the preview leads with the ranked muscles, in rank order', rows.join() === 'Back1,Chest2', rows);
  await page('01-sheet-ranked');
  await ev(() => { ['shoulders', 'biceps', 'triceps'].forEach((m) => fcTap(m)); fcTap('quads'); });
  ok('a sixth muscle is refused (five is the most)', await ev(() => state._fcDraft.length === 5 && !state._fcDraft.includes('quads')), null);
  await ev(() => ['shoulders', 'biceps', 'triceps'].forEach((m) => fcTap(m)));
  ok('a second tap removes a muscle and the rest keep their order', await ev(() => state._fcDraft.join() === 'back,chest'), null);

  /* ---------- 2 · apply ---------- */
  await tap('#sheet .fc-go');
  const a1 = await audit();
  ok('applied: focus stored on the split as [back, chest]', a1.ranks && a1.ranks.join() === 'back,chest', a1.ranks);
  ok('applied: every rule holds (same lifts, ≤20 sets a day w/o abs, ≤4 a lift, ≤MRV, no non-focus muscle under MEV, reps and rest days kept)', a1.bad.length === 0, a1.bad);
  ok('applied: back sets per week go up, chest does not go down', a1.wa.back > a1.wb.back + 3 && a1.wa.chest >= a1.wb.chest, { b: [a1.wb.back, a1.wa.back], c: [a1.wb.chest, a1.wa.chest] });
  ok('applied: upper days open with the back lifts, then chest', [0, 3, 6].every((i) => a1.days[i][0] === 'Lat Pulldown (Wide Grip)' && a1.days[i].includes('Chest-Supported T-Bar Row')), a1.days);
  ok('applied: lower days keep their written order (back is not their home)', [1, 4].every((i) => a1.days[i][0] === 'Leg Extension'), a1.days);
  ok('applied: logged workouts byte-identical', await ev(() => JSON.stringify(state.data.workouts)) === s0.w, null);
  ok('applied: the toast says what changed and offers Undo, no takeover', await ev(() => { const t = $('toast'); return t.classList.contains('on') && /Focus · Back › Chest/.test(t.textContent) && !!t.querySelector('.tundo') && !document.querySelector('#cine.on,#prfin'); }), null);
  ok('applied: the dock names the focus', await ev(() => [...document.querySelectorAll('.gd-t2')].some((x) => x.textContent === 'Back · Chest')), null);
  ok('applied: stored to localStorage', await ev(() => (JSON.parse(localStorage.getItem('gt_data')).splits.find((s) => s.id === 'cycle8v2').focus || {}).ranks.join() === 'back,chest'), null);
  await page('02-mission-after-apply');

  /* ---------- 3 · undo ---------- */
  await tap('#toast .tundo');
  ok('undo restores the splits byte for byte', await splitsRaw() === s0.raw, null);

  /* ---------- 4 · re-rank from the plan as written, start a session, clear ---------- */
  await ev(() => { state._fcDraft = ['back', 'chest']; fcApply(false); __qa.clear(); });
  await openSheetByTile();
  ok('reopened: the sheet shows the applied ranking', await ev(() => state._fcDraft.join() === 'back,chest' && !!document.querySelector('#sheet .fc-go') && /Clear focus/.test(document.querySelector('#sheet .fc-go').textContent)), null);
  await tap('#sheet .fc-m', 'Back');
  await tap('#sheet .fc-go');
  const fresh = await ev((orig) => JSON.stringify(fcBuild(JSON.parse(orig), ['chest']).days), s0.orig);
  ok('re-ranked to [chest]: built from the plan as written, not on top of the old focus', await ev(() => JSON.stringify(state.data.splits.find((s) => s.id === 'cycle8v2').days)) === fresh, null);
  const a2 = await audit();
  ok('re-ranked: every rule still holds', a2.bad.length === 0, a2.bad);
  const ses = await ev(() => { __qa.clear(); const sp = state.data.splits.find((s) => s.id === 'cycle8v2'), day = sp.days[6]; startWorkout(sp.id, 6); const e = state.session.exercises[0]; const r = { first: e.name, sets: e.sets.filter((x) => x.type !== 'W').length, plan: day.plan[e.name].s }; state.session = null; state.step = null; try { clearSession(); } catch (x) {} return r; });
  ok('a session started on Upper C opens with the focus lift at its focus set count', ses.first === 'Plate-Loaded Chest Press' && ses.sets === ses.plan && ses.plan > 2, ses);
  await openSheetByTile();
  await tap('#sheet .fc-go');   // the draft equals the applied focus: the one button is Clear focus
  ok('clear: the exact original days come back and the focus is gone', await ev((orig) => { const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); return JSON.stringify(sp.days) === orig && !sp.focus; }, s0.orig), null);

  /* ---------- 5 · a plan edited after a focus is the new starting point ---------- */
  await ev(() => { state._fcDraft = ['back']; fcApply(false); __qa.clear(); const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); gmWritePlan(sp.id, 0, 'Machine Preacher Curl', { s: 3, r: '6–10' }); __qa.clear(); });
  const ed = await ev(() => { const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); return { ranks: fcRanks(sp), keeps: fcBase(sp)[0].plan['Machine Preacher Curl'].s === 3, tile: [...document.querySelectorAll('.gd-t2')].some((x) => x.textContent === 'Rank your top 5') }; });
  ok('edited after a focus: the edit is kept and becomes the base, the focus no longer claims the plan', ed.ranks.length === 0 && ed.keeps && ed.tile, ed);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 600) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ width: A.width || 393, passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
