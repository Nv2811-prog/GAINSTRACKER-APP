import { fileURLToPath } from 'node:url';
// MACHINE SETUP (2026-10-26): the setup strip on machine / cable lifts, the stepper sheet (fields by movement), per gym, old notes kept;
// the brand line above a machine's name. Real app, fixture-train. node setup.mjs [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)) });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const LP = 'Lat Pulldown (Wide Grip)';
try {
  await open(ctx, { settle: 1400 });
  const s0 = await ev((LP) => { __qa.startLogging(0); const ses = state.session, ei = ses.exercises.findIndex((e) => e.name === LP); ses._focusEi = ei; try { focusEx(ei); } catch (e) {} render(); const st = document.querySelector('#lgfocus .lg2-setup'); return { ei, has: !!st, empty: st && st.classList.contains('empty'), txt: st && st.textContent }; }, LP);
  ok('a cable / machine lift shows the setup strip, inviting a first save', s0.has && s0.empty && /tap to save/.test(s0.txt), s0);
  const bar = await ev(() => { const ses = state.session; ses.exercises.unshift({ name: 'Barbell Bench Press', sets: seedSets('Barbell Bench Press') }); ses._focusEi = 0; try { focusEx(0); } catch (e) {} render(); const has = !!document.querySelector('#lgfocus .lg2-setup'); ses.exercises.shift(); return has; });
  ok('a barbell lift has no setup strip', !bar, bar);
  const sh = await ev((LP) => { const ei = state.session.exercises.findIndex((e) => e.name === LP); openSetup(ei); return { kind: state._sheetKind, rows: [...document.querySelectorAll('#sheet .su-l')].map((x) => x.textContent) }; }, LP);
  ok('the sheet starts with the fields a pulldown needs (Seat, Thigh pad)', sh.kind === 'setup' && sh.rows.join() === 'Seat,Thigh pad', sh);
  await ev(() => { setupStep('seat', 1); setupStep('seat', 1); setupStep('seat', 1); setupStep('thigh', 1); setupStep('thigh', 1); setupAdd('handles'); setupSet('handles', 'wide'); setupSet('note', 'pin 7'); setupSave(); });
  await sleep(300);
  const s1 = await ev((LP) => { const ei = state.session.exercises.findIndex((e) => e.name === LP); state.session._focusEi = ei; try { focusEx(ei); } catch (e) {} render(); return 0; }, LP) || await ev((LP) => ({ strip: (document.querySelector('#lgfocus .lg2-setup .v') || {}).textContent, stored: JSON.stringify(((state.data.machineSettings || {})[activeGymName()] || {})[LP]) }), LP);
  ok('steppers + a text field + note save, and the strip reads them back', s1.strip === 'Seat 3 · Thigh pad 2 · Handles wide · pin 7' && s1.stored === '{"seat":"3","thigh":"2","handles":"wide","note":"pin 7"}', s1);
  const g = await ev((LP) => { switchGym('Copenhagen Gym Valby'); const there = machineSetting(LP); switchGym('Fitness X'); return { there, here: machineSetting(LP) }; }, LP);
  ok('setups are per gym (Copenhagen Gym starts empty, Fitness X keeps its own)', g.there === '' && /Seat 3/.test(g.here), g);
  const leg = await ev(() => { state.data.machineSettings[activeGymName()]['Leg Extension'] = 'seat 5, pad low'; return { text: machineSetting('Leg Extension'), sheet: (() => { openSetup(-1, 'Leg Extension'); const r = [...document.querySelectorAll('#sheet .su-l')].map((x) => x.textContent); const n = $('sheet').querySelector('.su-note').value; closeSheet(); return { r, n }; })() }; });
  ok('an old free-text setup is kept as the note; a leg extension starts with Back pad + Shin pad', leg.text === 'seat 5, pad low' && leg.sheet.n === 'seat 5, pad low' && leg.sheet.r.join() === 'Back pad,Shin pad', leg);
  const br = await ev((LP) => { const ei = state.session.exercises.findIndex((e) => e.name === LP); swapExercise(ei, 'Hammer Strength Iso-Lateral Front Lat Pulldown'); state.session._focusEi = ei; try { focusEx(ei); } catch (e) {} render(); const f = document.getElementById('lgfocus'); return { brand: (f.querySelector('.lg2-br') || {}).textContent, title: f.querySelector('h2').textContent }; }, LP);
  ok('a brand machine shows the brand line and a short title', br.brand === 'Hammer Strength' && br.title === 'Iso-Lateral Front Lat Pulldown', br);
  const menu = await ev(() => { const ei = state.session._focusEi; lgExMenu(ei); const b = [...document.querySelectorAll('#sheet .lg2-mi')].find((x) => /Machine setup/.test(x.textContent)); if (!b) return null; b.click(); return state._sheetKind; });
  ok('the ⋯ menu opens the same setup sheet', menu === 'setup', menu);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
