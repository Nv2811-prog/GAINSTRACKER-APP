import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// LAST OUTING (2026-10-25): one lookup behind every "last time" number + the per-set "last" line under each working set.
// Real app, fixture-train. A controlled history is injected, then the app's own readers and the rendered focus card are checked.
// node lastweight.mjs [--out shots-dir] [--width 375|393] [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const ev = (f, ...a) => P.evaluate(f, ...a);
const CP = 'Plate-Loaded Chest Press';
try {
  await open(ctx, { settle: 1400 });
  // history (newest first in the array, except where a test breaks the order on purpose)
  await ev((CP) => {
    const d = state.data, w = (id, iso, name, ex, o = {}) => Object.assign({ id, date: new Date(iso).toISOString(), name, splitId: 'cycle8v2', dayIdx: 0, exercises: ex, totalVol: 1000, gym: 'Fitness X' }, o);
    const S = (arr) => arr.map(([wt, r, type]) => ({ w: String(wt), r: String(r), type: type || 'NRM', done: true }));
    d.u.gyms = ['Fitness X', 'Gym B']; d.u.activeGym = 'Fitness X'; d.exReset = {};
    d.workouts = [
      w('q1', '2026-10-18T09:00', 'Upper A · Wingspan', [{ name: CP, sets: S([[110, 8], [110, 8]]).map((s) => Object.assign(s, { est: 1 })) }], { quick: 1 }),   // newest, but a "Mark as done": never counts
      w('gb', '2026-10-17T18:00', 'Gym B day', [{ name: CP, sets: S([[105, 8]]) }, { name: 'Machine Shoulder Press', sets: S([[50, 9]]) }], { gym: 'Gym B', splitId: null, dayIdx: null }),
      w('a1', '2026-10-16T18:00', 'Upper A · Wingspan', [{ name: CP, sets: S([[20, 10, 'W'], [100, 8], [95, 7]]) }, { name: 'High-to-Low Cable Row', sets: S([[60, 10]]) }]),
      w('sc', '2026-10-15T18:00', 'Other', [{ name: 'Seated Cable Row (Close Grip)', sets: S([[80, 8]]) }], { splitId: null, dayIdx: null }),
      w('old', '2026-10-01T18:00', 'Upper A · Wingspan', [{ name: CP, sets: S([[90, 8], [90, 8]]) }, { name: 'Incline Machine Chest Press', sets: S([[70, 9], [70, 8]]) }]),
    ];
    save();
  }, CP);
  const lo = await ev((CP) => { const o = lastOuting(CP); return o && { w: o.sets.filter((s) => s.type !== 'W').map((s) => s.w + 'x' + s.r), gym: o.gym }; }, CP);
  ok('newest real outing at THIS gym (a newer quick log and a newer other-gym session are skipped)', lo && lo.w.join() === '100x8,95x7' && lo.gym === 'Fitness X', lo);
  ok('strictly per gym: a lift only done at another gym has no last time here (a new gym starts empty)', await ev(() => lastOuting('Machine Shoulder Press') === null), null);
  ok('case- and space-insensitive name match', await ev((CP) => { const o = lastOuting('  ' + CP.toLowerCase() + ' '); return o && o.sets[1].w === '100'; }, CP), null);
  ok('never through EX_ALIAS: High-to-Low Cable Row keeps its own 60 kg (not the Seated Cable Row\'s 80)', await ev(() => lastOuting('High-to-Low Cable Row').sets[0].w === '60'), null);
  ok('lastBestSet / progression read the same outing', await ev((CP) => { const b = lastBestSet(CP), p = progressionFor(CP); return b.w === 100 && b.r === 8 && p && p.w === 100 && p.r === 9; }, CP), null);
  ok('out-of-order history array: the newest by DATE wins', await ev((CP) => { const ws = state.data.workouts, o = ws.find((w) => w.id === 'old'); state.data.workouts = [o].concat(ws.filter((w) => w !== o)); save(); const r = lastOuting(CP).sets[1].w === '100'; state.data.workouts = ws; save(); return r; }, CP), null);
  ok('exReset: an archived lift starts fresh', await ev((CP) => { archiveExercise(CP); const none = lastOuting(CP) === null; unarchiveExercise(CP); return none && !!lastOuting(CP); }, CP), null);

  /* ---------- the session: Upper B (another day) and another split ---------- */
  const ub = await ev((CP) => {
    __qa.clear(); const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); startWorkout(sp.id, 3);
    const e = state.session.exercises.find((x) => x.name === CP); return e.sets.map((s) => [s.type, s.prevW, s.prevR].join(':'));
  }, CP);
  ok('Upper B: every set of the chest press carries Upper A\'s numbers (100 × 8, 95 × 7)', ub.join() === 'NRM:100:8,NRM:95:7', ub);
  const more = await ev((CP) => { const e = state.session.exercises.find((x) => x.name === CP); addSet(state.session.exercises.indexOf(e)); const s = e.sets[e.sets.length - 1]; return [s.prevW, s.prevR].join(':'); }, CP);
  ok('a set beyond last time\'s count shows the last working set (never blank)', more === '95:7', more);
  const seeded = await ev((CP) => seedSets(CP, { s: 4, r: '5–10' }).map((s) => s.prevW + ':' + s.prevR), CP);
  ok('a plan of 4 sets after a 2-set session: sets 3 and 4 show 95 × 7', seeded.join() === '100:8,95:7,95:7,95:7', seeded);
  // the focus card renders a "last" line under every working set
  const card = await ev((CP) => {
    const ses = state.session, ei = ses.exercises.findIndex((x) => x.name === CP); ses._focusEi = ei; state.step = 'logging'; try { focusEx(ei); } catch (e) {} render();
    const f = document.getElementById('lgfocus'); if (!f) return { none: true };
    const rows = f.querySelectorAll('.lg2-sr:not(.w)').length, lines = [...f.querySelectorAll('.lg2-last')].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
    const tile = [...f.querySelectorAll('.lg2-kpi')].find((k) => /Last time/i.test(k.textContent));
    return { rows, lines, tile: tile && tile.textContent.replace(/\s+/g, ' ').trim(), title: f.querySelector('h2').textContent };
  }, CP);
  ok('focus card: one "last" line per working set, with that set\'s numbers', card.title === CP && card.rows === 3 && card.lines.length === 3 && card.lines[0].replace(/\s+/g, '') === 'last100×8' && card.lines[1].replace(/\s+/g, '') === 'last95×7', card);
  ok('focus card: the Last time tile agrees (100 × 8)', /100\s*×\s*8/.test(card.tile || ''), card.tile);
  if (A.out) { await sleep(300); const el = await P.$('#lgfocus'); if (el) await el.screenshot({ path: path.join(A.out, 'focus-last-lines.png') }); }
  const sw = await ev((CP) => { const ses = state.session, ei = ses.exercises.findIndex((x) => x.name === CP); swapExercise(ei, 'Incline Machine Chest Press'); return ses.exercises[ei].sets.map((s) => s.prevW + ':' + s.prevR); }, CP);
  ok('swap: the new lift shows ITS last numbers per set, none of the old lift\'s', sw.join() === '70:9,70:8,70:8', sw);
  const sh = await ev(() => { const ses = state.session, ei = ses.exercises.findIndex((x) => x.name === 'Machine Shoulder Press'); if (ei < 0) return { none: true }; state.session._focusEi = ei; try { focusEx(ei); } catch (e) {} render(); const f = document.getElementById('lgfocus'); return { lines: f.querySelectorAll('.lg2-last').length, tile: [...f.querySelectorAll('.lg2-kpi')].map((k) => k.textContent.replace(/\s+/g, ' ')).join(' | ') }; });
  ok('a lift only trained at another gym: no "last" lines and an empty Last time tile here', sh.lines === 0 && /Last time\s*—\s*no history yet/.test(sh.tile), sh);
  const other = await ev((CP) => {
    state.session = null; state.step = null; const d = state.data;
    d.splits = d.splits.filter((s) => s.id !== 'qa-mine').concat([{ id: 'qa-mine', name: 'Mine', days: [{ name: 'Push', exercises: [CP.toUpperCase()] }] }]);
    startWorkout('qa-mine', 0); const e = state.session.exercises[0]; const r = e.sets.filter((s) => s.type !== 'W').map((s) => s.prevW + ':' + s.prevR); state.session = null; state.step = null; return r;
  }, CP);
  ok('another split (name typed in capitals): the newest weights show there too', other.join() === '100:8,95:7', other);
  const pv = await ev((CP) => { const d = state.data, wk = { id: 'now1', date: new Date(now()).toISOString(), name: 'Upper A · Wingspan', exercises: [{ name: CP, sets: [{ w: '102.5', r: '8', type: 'NRM', done: true }] }], gym: 'Fitness X', totalVol: 1 }; d.workouts.unshift(wk); save(); const p = prevExercise(CP, wk); d.workouts.shift(); save(); return p && Math.round(p.e1); }, CP);
  ok('summary vs-last compares with the outing BEFORE this session (100 × 8), not itself', pv === Math.round(100 * (1 + 8 / 30)), pv);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 600) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ width: A.width || 393, passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
