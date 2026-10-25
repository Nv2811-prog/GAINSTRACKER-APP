import { fileURLToPath } from 'node:url';
// DECIMAL COMMA (2026-10-25): iOS's decimal keypad on a comma-locale phone (Danish) types "82,5". It used to be stored as typed and read as
// NaN / 0 kg everywhere (no volume, no record, "last 0 × 8"). Now: kgNum reads both, setField stores a dot, history stays as typed.
// Real app, fixture-train. node decimal.mjs [--v 1]
import { launch, open, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)) });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const CP = 'Plate-Loaded Chest Press';
try {
  await open(ctx, { settle: 1400 });
  ok('kgNum / fmtKg read a comma decimal', await ev(() => kgNum('82,5') === 82.5 && kgNum('82.5') === 82.5 && kgNum(80) === 80 && kgNum('') === 0 && kgNum(null) === 0 && fmtKg('82,5') === '82.5'), null);
  // old history logged with a comma: it must count everywhere, without rewriting it
  const hist = await ev((CP) => {
    const d = state.data; d.workouts.unshift({ id: 'dc1', date: new Date(now() - 3600e3).toISOString(), name: 'Upper A · Wingspan', splitId: 'cycle8v2', dayIdx: 0, gym: d.u.activeGym, totalVol: 1,
      exercises: [{ name: CP, sets: [{ w: '102,5', r: '8', type: 'NRM', done: true }, { w: '97,5', r: '7', type: 'NRM', done: true }] }] }); save();
    const lb = lastBestSet(CP), p = progressionFor(CP), vol = setVolume(exFor(CP), d.workouts[0].exercises[0].sets[0]);
    return { lb: lb && [lb.w, lb.r, Math.round(lb.e1)], p: p && [p.w, p.r], vol, kept: d.workouts[0].exercises[0].sets[0].w };
  }, CP);
  ok('old "102,5" history: last best 102.5 × 8, its e1RM, the target 102.5 × 9, real volume, and the stored text untouched', hist.lb && hist.lb[0] === 102.5 && hist.lb[2] === Math.round(102.5 * (1 + 8 / 30)) && hist.p[0] === 102.5 && hist.p[1] === 9 && hist.vol > 800 && hist.kept === '102,5', hist);
  const ui = await ev((CP) => {
    const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); __qa.clear(); startWorkout(sp.id, 3); setReadiness('okay'); beginPatrol();
    const ei = state.session.exercises.findIndex((x) => x.name === CP); state.session._focusEi = ei; try { focusEx(ei); } catch (e) {} render();
    const f = document.getElementById('lgfocus'), last = [...f.querySelectorAll('.lg2-last')].map((x) => x.textContent.replace(/\s+/g, '')), tile = [...f.querySelectorAll('.lg2-kpi')].map((k) => k.textContent.replace(/\s+/g, ' '));
    return { last, tile: tile.join(' | ') };
  }, CP);
  ok('the focus card reads it: "last 102.5 × 8 / 97.5 × 7", Last time 102.5', ui.last[0] === 'last102.5×8' && ui.last[1] === 'last97.5×7' && /Lasttime102\.5×8/.test(ui.tile.replace(/\s+/g, '')), ui);
  // typing a comma now stores a dot; finishing a session that still holds an old comma (a restored session) counts it
  const fin = await ev((CP) => {
    const ses = state.session, ei = ses.exercises.findIndex((x) => x.name === CP); setField(ei, 0, 'w', '105,5'); setField(ei, 0, 'r', '8');
    const typed = ses.exercises[ei].sets[0].w; ses.exercises[ei].sets[1].w = '100,5'; ses.exercises[ei].sets[1].r = '7';
    toggleDone(ei, 0); toggleDone(ei, 1); finishWorkout();
    const w = state.data.workouts[0], R = state.lastResult;
    return { typed, vol: w.totalVol, pr: (R.prsThis || []).map((p) => p.name + ':' + Math.round(p.orm)), sets: w.exercises.find((e) => e.name === CP).sets.map((s) => s.w) };
  }, CP);
  ok('a typed "105,5" is stored as 105.5', fin.typed === '105.5', fin);
  ok('finishing counts the comma weights: real volume and a record at 105.5 × 8', fin.vol > 1500 && fin.pr.some((x) => x === CP + ':' + Math.round(105.5 * (1 + 8 / 30))), fin);
  const tools = await ev(() => ({ ramp: warmRamp('Barbell Bench Press', '82,5', '8', 3).map((x) => x.w), forge: (() => { openForge('100,5', '5'); const b = (document.querySelector('#fg-out .fg-big .num') || {}).textContent; closeSheet(); return b; })() }));
  ok('the warm-up ramp and the Forge accept "82,5" / "100,5"', tools.ramp.length === 3 && tools.ramp[2] < 82.5 && tools.forge === String(Math.round(100.5 * (1 + 5 / 30))), tools);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
