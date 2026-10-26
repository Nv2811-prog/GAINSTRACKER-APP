import { fileURLToPath } from 'node:url';
// BRAND MACHINES (2026-10-26): Panatta / Hammer Strength / BootyBuilder / Cybex / Arsenal machines, each its own lift; shown (first) only at gyms
// with that brand, or when searched by name. Real app, fixture-train. node machines.mjs [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)) });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
try {
  await open(ctx, { settle: 1400 });
  const cat = await ev(() => { const b = EXDB.filter((e) => e.br), names = EXDB.map((e) => e.n.toLowerCase()); return { n: b.length, brands: [...new Set(b.map((e) => e.br))].sort(), dupNames: names.length - new Set(names).size, badMuscle: b.filter((e) => !(e.p || []).every((m) => M12.includes(m))).map((e) => e.n), ids: new Set(b.map((e) => e.id)).size }; });
  ok('108 brand machines from five brands, unique names and ids, real muscles', cat.n === 108 && cat.brands.join() === 'Arsenal Strength,BootyBuilder,Cybex,Hammer Strength,Panatta' && cat.dupNames === 0 && !cat.badMuscle.length && cat.ids === 108, cat);
  const fix = await ev(() => { const e = exFor('Machine Back Extension'); return { p: e.p, sub: e.sub, tgt: e.tgt }; });
  ok('Machine Back Extension now trains the lower back (erectors), not "lats" with triceps cues', fix.p.join() === 'back' && fix.sub && fix.sub.back.join() === 'ere' && /erector/i.test(fix.tgt), fix);
  // a gym without these brands: the picker stays clean, search still finds them
  const fx = await ev(() => { openPicker(); const all = [...document.querySelectorAll('#ex-list .px-n, #ex-list b')].map((x) => x.textContent); pickMuscle('biceps'); const bi = [...document.querySelectorAll('#ex-list')].map((x) => x.textContent).join(' '); pickMuscle('all'); const s = $('ex-search'); s.value = 'french'; updateExList(); const fr = $('ex-list').textContent; closeSheet(); return { brandInAll: /Panatta|Hammer Strength|Cybex|BootyBuilder|Arsenal/.test(all.join(' ')), brandInBi: /Panatta|Hammer Strength|Cybex/.test(bi), french: /Panatta Super French Press/.test(fr) }; });
  ok('a gym without those brands: no brand machines in the lists, but search by name still finds them', !fx.brandInAll && !fx.brandInBi && fx.french, fx);
  // Copenhagen Gym: its machines first
  await ev(() => { switchGym('Copenhagen Gym Valby'); state.data.gymEquipment = Object.assign({}, state.data.gymEquipment, { 'Copenhagen Gym Valby': { equip: {}, brands: ['Panatta', 'Hammer Strength', 'BootyBuilder', 'Cybex', 'Arsenal Strength'] } }); save(); });
  const cg = await ev(() => { openPicker(); pickMuscle('biceps'); const rows = [...$('ex-list').children].map((r) => r.textContent.replace(/\s+/g, ' ').trim()).slice(0, 8); closeSheet(); return rows; });
  ok('Copenhagen Gym: the biceps list opens with its machines (preacher, four-angles incline, seated biceps, arm curl…)', cg.slice(0, 4).every((t) => /Panatta|Hammer Strength|Cybex/.test(t)) && cg.some((t) => /Preacher/.test(t)), cg);
  const sw = await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); __qa.clear(); startWorkout(sp.id, 0); const ei = state.session.exercises.findIndex((e) => e.name === 'Plate-Loaded Chest Press'); openSwap(ei); const rows = [...$('swap-list').children].map((r) => r.textContent.replace(/\s+/g, ' ').trim()).slice(0, 5); closeSheet(); return rows; });
  ok('swapping a chest lift at Copenhagen Gym offers its chest machines first', sw.length && sw.slice(0, 3).every((t) => /Panatta|Hammer Strength|Cybex|Arsenal/.test(t)), sw);
  const log = await ev(() => { const ei = state.session.exercises.findIndex((e) => e.name === 'Plate-Loaded Chest Press'); swapExercise(ei, 'Hammer Strength Iso-Lateral Incline Press'); const e = state.session.exercises[ei]; return { name: e.name, sets: e.sets.length, fig: !!exFor(e.name).p, pattern: movePattern(exFor(e.name)) }; });
  ok('a brand machine logs like any lift (sets, muscles, its own figure pattern)', log.name === 'Hammer Strength Iso-Lateral Incline Press' && log.sets > 0 && log.fig && log.pattern === 'incline', log);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
