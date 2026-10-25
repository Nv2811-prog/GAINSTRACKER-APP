import { fileURLToPath } from 'node:url';
// TONIGHT'S DAY (2026-10-25 rewrite): computeNextDay is derived from history per split, never from a stored pointer.
// Real app, fixture-train (migrations put the 8-day cycle v2 in charge, with the old cycle as its lineage). Each scenario injects a history
// and pins the clock, then asks the app's own computeNextDay / Home hero. Days: 0 UA · 1 LA · 2 R · 3 UB · 4 LB · 5 R · 6 UC · 7 R.
// node cycle.mjs [--v 1]
import { launch, open, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)) });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
// run(hist, opts) in the page: hist = [{d:'2026-10-19T10:00', i:dayIdx, s:splitId (default cycle8v2), n:name (default the v2 day's), q:quick}]
const run = (hist, o = {}) => P.evaluate((hist, o) => {
  const d = state.data, sp = d.splits.find((s) => s.id === 'cycle8v2');
  if (o.setup) (new Function(o.setup))();
  d.workouts = hist.map((x, k) => ({ id: 'cy' + k, date: new Date(x.d).toISOString(), name: x.n != null ? x.n : sp.days[x.i].name, splitId: x.s === undefined ? 'cycle8v2' : x.s,
    dayIdx: x.i == null ? null : x.i, exercises: [], totalVol: 1, gym: 'Fitness X', ...(x.q ? { quick: 1 } : {}) }));
  d.restLog = (o.rest || []).map((r) => new Date(r).toISOString());
  if (o.ptr != null) d._nextDay = o.ptr;
  window.__qaSetNow(new Date(o.now).getTime());
  if (o.act) (new Function(o.act))();
  return computeNextDay(d.splits.find((s) => s.id === 'cycle8v2'));
}, hist, o);
try {
  await open(ctx, { settle: 1400 });
  const base = await P.evaluate(() => ({ act: state.data.activeSplitId, from: (state.data.splits.find((s) => s.id === 'cycle8v2') || {}).from }));
  ok('fixture: the v2 cycle is active and remembers the old cycle (v4 lineage)', base.act === 'cycle8v2' && JSON.stringify(base.from) === '["cycle8"]', base);
  const T = async (name, want, hist, o) => { const got = await run(hist, o); ok(name, got === want, { want, got }); };
  // Mon 19 Oct 2026 … (CEST until 25 Oct, CET after: the DST switch is inside S6's gap on purpose)
  await T('no history: the first day', 0, [], { now: '2026-10-19T18:00' });
  await T('Upper A done this morning: tonight is Lower A', 1, [{ d: '2026-10-19T09:00', i: 0 }], { now: '2026-10-19T20:00' });
  await T('the day after Lower A is the rest day', 2, [{ d: '2026-10-20T18:00', i: 1 }], { now: '2026-10-21T12:00' });
  await T('an UNLOGGED rest day passes by itself at midnight', 3, [{ d: '2026-10-20T18:00', i: 1 }], { now: '2026-10-22T07:00' });
  await T('a logged rest day is used up at once', 3, [{ d: '2026-10-20T18:00', i: 1 }], { now: '2026-10-21T20:00', rest: ['2026-10-21T09:00'] });
  await T('3 missed days never skip a training day (Upper B → Lower B)', 4, [{ d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-23T18:00' });
  await T('a long gap after Lower B lands on Upper C, not past it (across the DST change)', 6, [{ d: '2026-10-19T18:00', i: 4 }], { now: '2026-10-30T18:00' });
  await T('another split\'s session never moves the cycle', 4, [{ d: '2026-10-20T18:00', i: 0, s: 'mine', n: 'Push' }, { d: '2026-10-19T18:00', i: 3 }],
    { now: '2026-10-20T20:00', setup: "state.data.splits=state.data.splits.filter(s=>s.id!=='mine').concat([{id:'mine',name:'Mine',days:[{name:'Push',exercises:[]},{name:'Upper C · Chest Plate',exercises:[]}]}])" });
  await T('a same-named day from ANOTHER existing split does not count', 4, [{ d: '2026-10-20T18:00', i: 1, s: 'mine', n: 'Upper C · Chest Plate' }, { d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-20T20:00' });
  await T('a Free session never moves the cycle', 4, [{ d: '2026-10-20T18:00', i: null, s: null, n: 'Free Session' }, { d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-20T20:00' });
  await T('switching to another split and back keeps the position', 4, [{ d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-20T12:00', act: "setActiveSplit('mine');setActiveSplit('cycle8v2');" });
  await T('switching gym and back keeps the position', 4, [{ d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-20T12:00', act: "switchGym('QA Gym');switchGym('Fitness X');" });
  await T('training a non-tonight day (Upper C instead of Lower B): tonight follows Upper C', 7, [{ d: '2026-10-20T18:00', i: 6 }, { d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-20T20:00' });
  await T('… and its rest day passes by itself: Upper A two days later', 0, [{ d: '2026-10-20T18:00', i: 6 }, { d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-22T09:00' });
  await T('history logged under the OLD cycle counts for v2 (lineage)', 5, [{ d: '2026-10-19T18:00', i: 4, s: 'cycle8' }], { now: '2026-10-19T21:00' });
  await T('an out-of-order history array: the newest by DATE decides', 4, [{ d: '2026-10-13T18:00', i: 0 }, { d: '2026-10-19T18:00', i: 3 }], { now: '2026-10-19T21:00' });
  await T('a quick "Mark as done" counts like a session', 4, [{ d: '2026-10-19T18:00', i: 3, q: 1 }], { now: '2026-10-19T21:00' });
  await T('legacy sessions without a split id count by day name', 4, [{ d: '2026-10-19T18:00', i: null, s: null, n: 'Upper B · Shoulder Armor' }], { now: '2026-10-19T21:00' });
  await T('a session of a DELETED split counts by day name', 4, [{ d: '2026-10-19T18:00', i: 3, s: 'gone123', n: 'Upper B · Shoulder Armor' }], { now: '2026-10-19T21:00' });
  await T('THE BUG: a stale pointer after a logged rest no longer decides (was Upper A)', 3, [{ d: '2026-10-20T18:00', i: 1 }], { now: '2026-10-21T20:00', rest: ['2026-10-21T09:00'], ptr: 0 });
  await T('a renamed day is still found by its index', 4, [{ d: '2026-10-19T18:00', i: 3, n: 'Old Upper B name' }], { now: '2026-10-19T21:00' });

  /* ---------- the Home rest hero ---------- */
  const hero = await P.evaluate(() => {
    const d = state.data, sp = d.splits.find((s) => s.id === 'cycle8v2');
    d.workouts = [{ id: 'h1', date: new Date('2026-10-19T09:00').toISOString(), name: sp.days[6].name, splitId: 'cycle8v2', dayIdx: 6, exercises: [], totalVol: 1, gym: 'Fitness X' }];
    d.restLog = []; window.__qaSetNow(new Date('2026-10-19T20:00').getTime()); state.session = null; state.step = null; go('gotham');
    const a = { tonight: currentPlanDay().i, trained: !!document.querySelector('.gh-hero.is-rest .gh-done'), log: !!document.querySelector('.gh-hero.is-rest [onclick="logRestDay()"]') };
    const n0 = (d.restLog || []).length; logRestDay(); a.refused = (d.restLog || []).length === n0;
    window.__qaSetNow(new Date('2026-10-20T12:00').getTime()); go('gotham');
    const b = document.querySelector('.gh-hero.is-rest');
    a.next = { tonight: currentPlanDay().i, log: !!(b && b.querySelector('[onclick="logRestDay()"]')), train: ((b && [...b.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Train anyway')) || {}).getAttribute?.('onclick') };
    logRestDay(); a.after = { tonight: currentPlanDay().i, logged: (d.restLog || []).length };
    undoRestDay(); a.undo = { tonight: currentPlanDay().i, logged: (d.restLog || []).length };
    return a;
  });
  ok('rest hero on a day you trained: "Trained today", no Log rest button', hero.tonight === 7 && hero.trained && !hero.log, hero);
  ok('logRestDay refuses on a day you trained (no dead tap needed)', hero.refused, hero);
  ok('next day: the rest hero offers Log rest day, and Train anyway starts the NEXT plan day (Upper A), not a free session', hero.next.tonight === 7 && hero.next.log && /startWorkout\('cycle8v2',0\)/.test(hero.next.train || ''), hero.next);
  ok('logging the rest moves tonight on at once; Undo puts it back', hero.after.tonight === 0 && hero.after.logged === 1 && hero.undo.tonight === 7 && hero.undo.logged === 0, hero);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 600) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
