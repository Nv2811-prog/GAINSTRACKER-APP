import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// WAVE 10 (GP:QUICKLOG): "Mark as done" - a split day counted without logging it (low battery, a trial session, forgot).
// Real touch taps, fixture-train (clock Sunday 18 Oct 17:30, tonight = Upper C, day 7 of 8). Pass/fail per check; exit 1 on any failure or console error.
//   1. the Home link opens the sheet, prefilled (day, today), reason chip, summary = the Preview's numbers
//   2. confirm: ONE quick:1 workout, planned sets each est:1 with last time's numbers; cycle advances; weekly sets rise by the plan; sessions +1;
//      records / e1RM / progression / last time / strength / stall detector byte-identical; XP, lifetime volume, feed, badges untouched; toast with Undo, no takeover
//   3. Undo puts the stored data back byte for byte
//   4. the tag: Home last-session row, Profile calendar cell + legend, day detail - never a fake number
//   5. an OLDER day from Mission (Preview > Mark as done, Other date): inserted in date order, streak / last-trained / cycle pointer / muscle dates untouched; undo is byte-identical
//   6. a lift with no history gets blank est sets; a rest day offers nothing
// node quicklog.mjs [--width 393|375] [--out shots-dir] [--file html] [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fx('./fixture-train.json'), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const page = async (name) => { if (A.out) { await sleep(300); await P.screenshot({ path: path.join(A.out, name + '.png') }); } };
const shotEl = async (sel, name) => { if (!A.out) return; const el = await P.$(sel); if (!el) return; await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300); await el.screenshot({ path: path.join(A.out, name + '.png') }); };
const pointOf = (sel, idx, text) => P.evaluate((sel, idx, text) => {
  const all = [...document.querySelectorAll(sel)];
  const el = text != null ? all.find((e) => e.textContent.trim() === text) : all[idx];
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel, idx, text);
const tap = async (sel, idx = 0) => { const pt = await pointOf(sel, idx, null); if (!pt) throw new Error('no element: ' + sel + '[' + idx + ']'); await sleep(150); await P.touchscreen.tap(pt.x, pt.y); await sleep(500); };
const tapText = async (sel, text) => { const pt = await pointOf(sel, 0, text); if (!pt) throw new Error('no element: ' + sel + ' "' + text + '"'); await sleep(150); await P.touchscreen.tap(pt.x, pt.y); await sleep(450); };
const ev = (f, ...a) => P.evaluate(f, ...a);
const reset = () => ev(() => {
  try { closeSheet(); } catch (e) {} try { _closeModal(); } catch (e) {} try { stopTimers(); } catch (e) {}
  state.session = null; state.step = null; state.subpage = null; state.showOnboarding = false; state.tab = 'gotham'; state._ql = null;
  try { __qa.clear(); } catch (e) {} render(); window.scrollTo(0, 0);
});
// everything a quick log must leave alone, read through the app's own readers
const perf = () => ev(() => {
  const names = loggedExerciseNames(), out = {};
  names.forEach((n) => { out[n] = [progressionFor(n), lastBestSet(n), lastSetFor(n), exerciseRows(n), liftIntel(n), nextTarget(n)]; });
  return JSON.stringify({ names, out, stalled: stalledLifts(), est: SV_STD.map((l) => liftEstimate(l)), prs: state.data.prs, prsByGym: state.data.prsByGym });
});
const core = () => ev(() => {
  save();
  const d = state.data, sp = d.splits.find((s) => s.id === d.activeSplitId), u = d.u;
  return {
    raw: localStorage.getItem('gt_data'), tonight: computeNextDay(sp), nextDay: d._nextDay, n: d.workouts.length, first: d.workouts[0].id,
    tw: u.totalWorkouts, xp: u.xp, tv: u.totalVolume, td: u.totalDuration, streak: u.streakDays, last: u.lastTrainedDate, badges: JSON.stringify(u.earnedBadges),
    feed: JSON.stringify(d.patrolFeed || null), mlt: JSON.stringify(d.muscleLastTrained), mv: JSON.stringify(d.muscleVol),
    sets: M12.map((m) => weeklySets(m)), week: weekCount(),
  };
});
const toastNow = () => ev(() => ({ on: document.getElementById('toast').classList.contains('on'), undo: !!document.querySelector('#toast .tundo'), text: document.getElementById('toast').textContent }));
const noTakeover = () => ev(() => !document.getElementById('prfin') && !state._cineOn && !(document.getElementById('cine') || { classList: { contains: () => false } }).classList.contains('on') && state.step == null && !state.lastResult);
try {
  await open(ctx, { settle: 1500 });
  await reset(); await sleep(400);
  const plan0 = await ev(() => {
    const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId), i = computeNextDay(sp), day = sp.days[i];
    return { spId: sp.id, i, name: day.name, lifts: day.exercises.length, setsEach: day.exercises.map((n) => ghSetsOf(day, n)), total: ghDayStats(day).sets, pl: ghPlanSets(day), cycle: sp.days.length,
      lastNums: day.exercises.map((n) => (lastSetFor(n) || []).filter((s) => s.type !== 'W').map((s) => [s.w, s.r])), restIdx: sp.days.findIndex((d) => d.rest), perWeek: M12.map((m) => perWeek(ghPlanSets(day)[m] || 0)) };
  });
  const b = await core(), perf0 = await perf();

  /* ---------- 1 · Home link + sheet ---------- */
  const link = await ev(() => { const l = document.querySelector('.gh-hero .ql-link'); if (!l) return null; const r = l.getBoundingClientRect(); return { text: l.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(r.height), r: Math.round(r.right), vw: innerWidth, oneLine: l.querySelector('i').getBoundingClientRect().height < 20 }; });
  ok('home: the Tonight hero carries ONE "Mark as done" link, one line, inside the screen', link && /^Mark as done/.test(link.text) && link.h >= 32 && link.r <= link.vw - 8 && link.oneLine && (await ev(() => document.querySelectorAll('.ql-link').length)) === 1, link);
  ok('home: the page does not scroll sideways', await ev(() => document.documentElement.scrollWidth <= innerWidth + 1), null);
  await page('01-home-tonight');
  await tap('.gh-hero .ql-link');
  const sh = await ev(() => {
    const on = document.getElementById('sheet').classList.contains('on'), q = document.querySelector('#sheet .ql');
    const chipsOn = [...document.querySelectorAll('#sheet .ql-chips .chip.on')].map((c) => c.textContent.trim());
    const nums = [...document.querySelectorAll('#sheet .ql-tot .num')].map((n) => +n.textContent);
    return { on, q: !!q, chipsOn, nums, head: (document.querySelector('#sheet .sh-hd h2') || {}).textContent, go: (document.querySelector('#sheet .ql-go') || {}).disabled === false, wide: document.getElementById('sheet').scrollWidth <= document.getElementById('sheet').clientWidth + 1,
      why: [...document.querySelectorAll('#sheet .ql-chips .chip')].map((c) => c.textContent.trim()), x: !!document.querySelector('#sheet .sh-hd .btn-i[aria-label="Close"]'), close: [...document.querySelectorAll('#sheet > .gh > .btn')].filter((x) => /^Close$/.test(x.textContent.trim())).length };
  });
  ok('sheet: opens with the shared header (X, no bottom Close), day and Today prefilled', sh.on && sh.q && sh.head === 'Mark as done' && sh.x && !sh.close && sh.chipsOn.includes(plan0.name.split(' · ')[0]) && sh.chipsOn.includes('Today'), sh);
  ok('sheet: summary = the Preview numbers (lifts, sets)', sh.nums[0] === plan0.lifts && sh.nums[1] === plan0.total, { sh, plan0 });
  ok('sheet: the four reasons are offered, nothing overflows', ['Low battery', 'Trial session', 'Forgot to log', 'Other'].every((w) => sh.why.includes(w)) && sh.wide, sh);
  await page('02-sheet');
  await tapText('#sheet .ql-chips .chip', 'Low battery');
  ok('sheet: a reason chip takes the selection (tap again clears it)', await ev(() => state._ql.why === 'battery' && [...document.querySelectorAll('#sheet .chip.on')].some((c) => c.textContent.trim() === 'Low battery')), null);
  await page('03-sheet-reason');

  /* ---------- 2 · confirm ---------- */
  await tap('#sheet .ql-go');
  const t1 = await toastNow();
  ok('confirm: the sheet closes, a toast with Undo says it is counted from the plan', (await ev(() => !document.getElementById('sheet').classList.contains('on'))) && t1.on && t1.undo && /^Upper C marked done · counted from your plan/.test(t1.text), t1);
  ok('confirm: no summary, no PR finisher, no cinematic', await noTakeover(), null);
  await page('04-toast-undo');
  const a = await core(), perf1 = await perf();
  const wk = await ev(() => state.data.workouts[0]);
  ok('write: ONE new workout, newest first, tagged splitId + dayIdx, quick:1 with the reason', a.n === b.n + 1 && wk.quick === 1 && wk.why === 'battery' && wk.splitId === plan0.spId && wk.dayIdx === plan0.i && /Low battery/.test(wk.notes) && wk.name === plan0.name, wk);
  ok('write: every lift of the day, the PLANNED set count each, every set done + est:1', wk.exercises.length === plan0.lifts && wk.exercises.every((e, k) => e.sets.length === plan0.setsEach[k] && e.sets.every((s) => s.est === 1 && s.done === true)), wk.exercises.map((e) => e.name + ':' + e.sets.length));
  ok('write: each set is prefilled with last time\'s numbers for that lift', wk.exercises.every((e, k) => { const L = plan0.lastNums[k]; return e.sets.every((s, i) => { const t = L[Math.min(i, L.length - 1)]; return t ? s.w === t[0] && s.r === t[1] : s.w === '' && s.r === ''; }); }), { first: wk.exercises[0], last: plan0.lastNums[0] });
  ok('cycle: tonight moves to the day after (stable splitId + dayIdx), pointer follows', a.tonight === (plan0.i + 1) % plan0.cycle && a.nextDay === (plan0.i + 1) % plan0.cycle, { tonight: a.tonight, nextDay: a.nextDay });
  const dlt = a.sets.map((v, i) => v - b.sets[i]);
  ok('weekly sets: every muscle rises by what the plan gives it (+-1 for rounding), total up', dlt.every((d, i) => Math.abs(d - plan0.perWeek[i]) <= 1 && d >= 0) && dlt.reduce((x, y) => x + y, 0) >= 4, { dlt, want: plan0.perWeek.map((x) => Math.round(x * 10) / 10) });
  ok('consistency: one more session, the streak and last-trained follow, this week counts it', a.tw === b.tw + 1 && a.last !== b.last && a.streak === b.streak + 1 && a.week >= b.week, { b: [b.tw, b.streak, b.last, b.week], a: [a.tw, a.streak, a.last, a.week] });
  ok('recovery: the trained muscles carry the new date', a.mlt !== b.mlt && a.mv !== b.mv, null);
  ok('records, e1RM, progression, last time, strength rows, stall detector: byte-identical', perf1 === perf0, { same: perf1 === perf0 });
  ok('no XP, no lifetime volume or time, no feed post, no badge from an unlogged session', a.xp === b.xp && a.tv === b.tv && a.td === b.td && a.feed === b.feed && a.badges === b.badges, { xp: [b.xp, a.xp], tv: [b.tv, a.tv] });

  /* ---------- 3 · undo ---------- */
  await tap('#toast .tundo');
  const u1 = await core(), perf2 = await perf();
  ok('undo: the stored data is byte-identical to before', u1.raw === b.raw, { len: [b.raw.length, u1.raw.length] });
  ok('undo: tonight is back, records untouched', u1.tonight === b.tonight && perf2 === perf0 && (await ev(() => !document.querySelector('.gh-hero.is-rest'))), null);

  /* ---------- 4 · mark again; the tag everywhere it is shown ---------- */
  await tap('.gh-hero .ql-link'); await tapText('#sheet .ql-chips .chip', 'Low battery'); await tap('#sheet .ql-go');
  await ev(() => { __qa.clear(); }); await sleep(200);
  const rec = await ev(() => { const r = document.querySelector('.gh-rcp'); return r ? { text: r.textContent.replace(/\s+/g, ' ').trim(), tag: !!r.querySelector('.ql-tag') } : null; });
  ok('home: the last-session row says Marked done + the reason, and shows no kg / tonnes', rec && rec.tag && /Marked done/.test(rec.text) && /Low battery/.test(rec.text) && !/\d\s?(kg|t)\b/.test(rec.text), rec);
  await page('05-home-after'); await shotEl('.gh-rcp', '05b-home-last-session-row');
  await ev(() => __qa.tab('case')); await sleep(500);
  const cal = await ev(() => { const c = [...document.querySelectorAll('.p3-cd.on')].find((x) => x.classList.contains('qk')); return c ? { cls: c.className, label: c.getAttribute('aria-label'), legend: [...document.querySelectorAll('.p3-cl span')].map((s) => s.textContent.trim()) } : null; });
  ok('profile calendar: the day is lit as a marked-done day (own style, aria label) and the legend says so', cal && /qk/.test(cal.cls) && /marked done/.test(cal.label) && cal.legend.includes('Marked done'), cal);
  await shotEl('.p3-cal', '06-calendar');
  await tap('.p3-cd.qk');
  const dd = await ev(() => { const s = document.getElementById('sheet'); return { on: s.classList.contains('on'), text: s.textContent.replace(/\s+/g, ' '), tag: !!s.querySelector('.ql-tag') }; });
  ok('day detail: "Marked done" tag, reason, the planned sets - no tonnage', dd.on && dd.tag && /Marked done/.test(dd.text) && /Low battery/.test(dd.text) && /sets from your plan/.test(dd.text) && !/\d kg/.test(dd.text.replace(/\d+ ?× ?[^ ]*/g, '')), dd.text.slice(0, 300));
  await page('07-day-detail');
  const hist = await ev(() => { closeSheet(); const w = state.data.workouts[0]; return { n: loggedExerciseNames().length, ex: exerciseRows(w.exercises[0].name).every((r) => r.date !== w.date), last: (lastSetFor(w.exercises[0].name) || []).every((s) => !s.est) }; });
  ok('lift history: the marked day never shows up as a performance row or as last time', hist.ex && hist.last, hist);
  await reset();

  /* ---------- 5 · an OLDER day from Mission (Preview > Mark as done > Other date) ---------- */
  await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); const nl = CORE_EX.find((e) => !loggedExerciseNames().includes(e.n)); sp.days[0].exercises.push(nl.n); window.__newLift = nl.n; render(); });
  const o0 = await core(), perfO = await perf();
  await ev(() => __qa.tab('mission')); await sleep(500);
  await tap('.gm-day', 0); await sleep(300);
  ok('mission: the day row opens the Preview, which offers Mark as done (one B2 button, not a second gold button)', await ev(() => !!document.querySelector('#sheet .ql-mark') && document.querySelectorAll('#sheet .btn-1').length === 1), null);
  await page('08-mission-preview');
  await tap('#sheet .ql-mark');
  ok('older day: the sheet opens on that day (Upper A), Today selected', await ev(() => state._ql.di === 0 && [...document.querySelectorAll('#sheet .chip.on')].some((c) => c.textContent.trim() === 'Upper A')), null);
  await tapText('#sheet .ql-chips .chip', 'Other date');
  ok('older day: Other date needs a date first (confirm disabled), the picker is capped to 60 days back', await ev(() => { const g = document.querySelector('#sheet .ql-go'), i = document.querySelector('#sheet .ql-date'); return g.disabled && !!i && i.max === qlDayKey(new Date(now())) && !!i.min; }), null);
  await ev(() => { const i = document.querySelector('#sheet .ql-date'); i.value = '2026-10-15'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(250);
  await tapText('#sheet .ql-chips .chip', 'Trial session');
  const pick = await ev(() => ({ go: !document.querySelector('#sheet .ql-go').disabled, when: document.querySelector('#sheet .ql-tot').textContent, dup: !!document.querySelector('#sheet .ql-dup') }));
  ok('older day: the picked date shows in the summary, no duplicate warning on a free day', pick.go && /Thu 15 Oct/.test(pick.when) && !pick.dup, pick);
  await page('09-sheet-other-date');
  await tap('#sheet .ql-go');
  const o1 = await core();
  const ow = await ev(() => { const ws = state.data.workouts, i = ws.findIndex((w) => w.quick && w.dayIdx === 0); return { i, w: ws[i], sorted: ws.every((w, k) => k === 0 || new Date(ws[k - 1].date) >= new Date(w.date)), newLift: ws[i].exercises.find((e) => e.name === window.__newLift) }; });
  ok('older day: inserted by date (not on top), history still newest-first', ow.i > 0 && ow.sorted && /^2026-10-15/.test(ow.w.date.slice(0, 10)) && ow.w.why === 'trial', { i: ow.i, d: ow.w.date });
  ok('older day: streak, last-trained, cycle pointer, tonight and every muscle date are untouched', o1.streak === o0.streak && o1.last === o0.last && o1.nextDay === o0.nextDay && o1.tonight === o0.tonight && o1.mlt === o0.mlt && o1.first === o0.first, { o0: [o0.streak, o0.nextDay, o0.tonight], o1: [o1.streak, o1.nextDay, o1.tonight] });
  ok('older day: it still counts - sessions +1, weekly sets up, volume date-free', o1.tw === o0.tw + 1 && o1.sets.reduce((x, y) => x + y, 0) > o0.sets.reduce((x, y) => x + y, 0) && o1.xp === o0.xp, { o0: o0.sets, o1: o1.sets });
  ok('no history for a lift: blank weight and reps, still planned and est', ow.newLift && ow.newLift.sets.length === 3 && ow.newLift.sets.every((s) => s.w === '' && s.r === '' && s.est === 1 && s.done === true), ow.newLift);
  ok('older day: records, progression, last time byte-identical', (await perf()) === perfO, null);
  await tap('#toast .tundo');
  const o2 = await core();
  ok('older day: undo restores the exact stored data (the added test lift included)', o2.raw === o0.raw, { len: [o0.raw.length, o2.raw.length] });

  /* ---------- 5b · Yesterday chip + the duplicate note ---------- */
  await reset();
  const y0 = await core();
  await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); openQuickLog(sp.id, 4); });   // Lower B: a real Lower B session sits on yesterday
  await sleep(600);   // the sheet slides up: a tap during the slide misses
  await tapText('#sheet .ql-chips .chip', 'Yesterday');
  ok('yesterday: the summary shows yesterday\'s date and warns that this day is already logged then (a note, not a block)', await ev(() => { const y = new Date(now()); y.setDate(y.getDate() - 1); return document.querySelector('#sheet .ql-tot').textContent.includes(p3Date(y.getTime())) && !!document.querySelector('#sheet .ql-dup') && !document.querySelector('#sheet .ql-go').disabled; }), null);
  await page('10-sheet-yesterday-duplicate-note');
  await tap('#sheet .ql-go');
  const yw =await ev(() => { const y = new Date(now()); y.setDate(y.getDate() - 1); const w = state.data.workouts.find((x) => x.quick && x.dayIdx === 4); return { same: !!w && new Date(w.date).toDateString() === y.toDateString(), n: state.data.workouts.length }; });
  ok('yesterday: the entry lands on yesterday\'s calendar date', yw.same && yw.n === y0.n + 1, yw);
  await tap('#toast .tundo');
  ok('yesterday: undo is byte-identical', (await core()).raw === y0.raw, null);

  /* ---------- 6 · rest days ---------- */
  await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); sp.days[0].exercises.pop(); save(); openDayBriefing(sp.id, sp.days.findIndex((d) => d.rest)); }); await sleep(300);
  ok('rest day: the Preview offers no Mark as done, and the entry point refuses', await ev(() => { const none = !document.querySelector('#sheet .ql-mark'); const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); const n = state.data.workouts.length; openQuickLog(sp.id, sp.days.findIndex((d) => d.rest)); return none && state.data.workouts.length === n && !document.querySelector('#sheet .ql'); }), null);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 600) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ width: A.width || 393, passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
