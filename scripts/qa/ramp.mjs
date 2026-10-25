import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// WARM-UP RAMP (GP:RAMP, 2026-10-25): top set in, 1–5 warm-up sets out, Add puts them on the lift. One engine (warmRamp) for the sheet and the Forge.
// Real app, fixture-train, real touch taps on the sheet. node ramp.mjs [--out shots-dir] [--width 375|393] [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const ev = (f, ...a) => P.evaluate(f, ...a);
const tapSel = async (sel, text) => {
  const pt = await ev((sel, text) => { const el = [...document.querySelectorAll(sel)].find((e) => text == null || e.textContent.trim() === text); if (!el) return null; el.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel, text);
  if (!pt) throw new Error('no element ' + sel + ' ' + (text || '')); await sleep(120); await P.touchscreen.tap(pt.x, pt.y); await sleep(450);
};
const CP = 'Plate-Loaded Chest Press';
try {
  await open(ctx, { settle: 1400 });
  /* ---------- 1 · the engine ---------- */
  const eng = await ev(() => {
    const R = (n, w, r, k, eq) => warmRamp(n, w, r, k, eq).map((x) => x.w + 'x' + x.r + (x.plates ? '[' + x.plates.join('+') + ']' : ''));
    const bar = +state.data.u.barWeight || 20, all = [1, 2, 3, 4, 5].map((k) => warmRamp('Barbell Bench Press', 100, 8, k));
    return {
      shape: all.map((l, i) => ({ n: l.length, inc: l.every((x, j) => !j || x.w > l[j - 1].w), below: l.every((x) => x.w < 100 && x.w >= bar),
        plates: l.every((x) => Math.abs(bar + 2 * x.plates.reduce((a, b) => a + b, 0) - x.w) < 1e-9), repsDown: l.every((x, j) => !j || x.r <= l[j - 1].r) })),
      b3: R('Barbell Bench Press', 100, 8, 3), heavy: R('Barbell Bench Press', 100, 3, 3), light: R('Barbell Bench Press', 100, 12, 3),
      mach: R('Plate-Loaded Chest Press', 100, 8, 3), cable: R('Cable Lateral Raise', 10, 12, 3), tiny: R('Cable Lateral Raise', 5, 10, 5),
      bw: R('Pull-Up', 0, 10, 3).length + R('Pull-Up', 20, 8, 3).length, lowbar: R('Barbell Bench Press', 30, 8, 3), bar,
    };
  });
  ok('engine: 1–5 warm-ups on a 100 kg × 8 barbell top set: as many sets as asked, rising, below the top, never under the bar, plates add up, reps fall', eng.shape.every((x, i) => x.n === i + 1 && x.inc && x.below && x.plates && x.repsDown), eng.shape);
  ok('engine: 3 warm-ups for 100 × 8 = 45 × 8, 65 × 5, 85 × 2 with plates per side', eng.b3.join() === '45x8[10+2.5],65x5[20+2.5],85x2[25+5+2.5]', eng.b3);
  ok('engine: a heavy 3-rep top set ends closer (87.5), a light 12-rep one lower (80) with shorter sets', /^87\.5x2/.test(eng.heavy[2]) && /^80x2/.test(eng.light[2]) && eng.light[0].startsWith('40x6'), { heavy: eng.heavy, light: eng.light });
  ok('engine: machines round to 2.5 kg steps, no plates', eng.mach.join() === '45x8,65x5,85x2', eng.mach);
  ok('engine: a light cable lift still rises (2.5, 5, 7.5)', eng.cable.join() === '2.5x6,5x5,7.5x2', eng.cable);
  ok('engine: steps that round onto each other merge (5 asked, fewer given), all below the top', eng.tiny.length < 5 && eng.tiny.every((x) => parseFloat(x) < 5), eng.tiny);
  ok('engine: bodyweight lifts get no ramp', eng.bw === 0, eng.bw);
  ok('engine: a 30 kg barbell top set starts at the empty bar and merges the rest', eng.lowbar.join() === eng.bar + 'x5[],25x2[2.5]', eng.lowbar);

  /* ---------- 2 · the sheet from the logging card ---------- */
  await ev((CP) => {
    const d = state.data, sp = d.splits.find((s) => s.id === 'cycle8v2');
    d.workouts.unshift({ id: 'rp1', date: new Date(now() - 3600e3).toISOString(), name: sp.days[0].name, splitId: 'cycle8v2', dayIdx: 0, gym: d.u.activeGym, totalVol: 1,
      exercises: [{ name: CP, sets: [{ w: '100', r: '8', type: 'NRM', done: true }, { w: '95', r: '7', type: 'NRM', done: true }] }] });
    d.warmPrefs = {}; save(); __qa.clear(); startWorkout(sp.id, 3); try { setReadiness(3); } catch (e) {} try { beginPatrol(); } catch (e) { state.step = 'logging'; }
    const ei = state.session.exercises.findIndex((x) => x.name === CP); state.session._focusEi = ei; try { focusEx(ei); } catch (e) {} __qa.clear(); render();
  }, CP);
  await sleep(500);
  await tapSel('#lgfocus .lg2-hint .lg2-b3', 'Warm-up ramp');
  const s1 = await ev(() => { const sh = $('sheet'), st = state._rp; return { kind: state._sheetKind, w: st && st.w, r: st && st.r, n: st && st.n, rows: sh.querySelectorAll('#rp-body .px-rr:not(.fg-work)').length, on: (sh.querySelector('.rp-n .chip.on') || {}).textContent, go: (sh.querySelector('.rp-go') || {}).textContent }; });
  ok('the Warm-up ramp button opens the sheet, top set prefilled from the first set (100 × 9 target), 3 warm-ups for the first lift', s1.kind === 'ramp' && s1.w === '100' && s1.r === '9' && s1.n === 3 && s1.rows === 3 && s1.on === '3' && /Add 3 warm-up sets/.test(s1.go || ''), s1);
  if (A.out) { await sleep(300); await P.screenshot({ path: path.join(A.out, 'ramp-sheet.png') }); }
  await tapSel('#sheet .rp-n .chip', '2');
  const s2 = await ev((CP) => ({ rows: document.querySelectorAll('#rp-body .px-rr:not(.fg-work)').length, pref: (state.data.warmPrefs || {})[exKey(CP)], go: (document.querySelector('#sheet .rp-go') || {}).textContent }), CP);
  ok('a count chip changes the list live and is remembered for this lift', s2.rows === 2 && s2.pref === 2 && /Add 2 warm-up sets/.test(s2.go || ''), s2);
  // typing a new top weight redraws only the list: the field keeps focus
  const inp = await P.$('#sheet .fg-in input[aria-label="Top set kilograms"]');
  await inp.click({ clickCount: 3 }); await P.keyboard.type('120'); await sleep(250);
  const s3 = await ev(() => ({ focus: document.activeElement && document.activeElement.getAttribute('aria-label'), top: (document.querySelector('#rp-body .fg-work .num') || {}).textContent, first: (document.querySelector('#rp-body .px-rr .num') || {}).textContent }));
  ok('typing the top weight updates the ramp and keeps the field focused', s3.focus === 'Top set kilograms' && s3.top === '120' && s3.first === '60', s3);
  await tapSel('#sheet .rp-go');
  const s4 = await ev((CP) => { const e = state.session.exercises.find((x) => x.name === CP); return { sets: e.sets.map((s) => s.type + ':' + s.w + 'x' + s.r), sheet: $('sheet').classList.contains('on'), toast: $('toast').textContent }; }, CP);
  ok('Add puts the warm-ups first as W sets (60 × 8, 90 × 3), working sets untouched, sheet closes, toast', s4.sets.slice(0, 2).join() === 'W:60x8,W:90x3' && s4.sets.length === 4 && s4.sets.slice(2).every((x) => !x.startsWith('W:')) && !s4.sheet && /2 warm-up sets added/.test(s4.toast), s4);
  // a logged warm-up stays; un-done ones are replaced, never stacked
  await ev((CP) => { const e = state.session.exercises.find((x) => x.name === CP); e.sets[0].done = true; render(); openRamp(state.session.exercises.indexOf(e)); }, CP);
  const s5a = await ev(() => state._rp.n);
  await ev(() => { rampN(3); rampSet('w', '120'); rampAdd(); });
  const s5 = await ev((CP) => state.session.exercises.find((x) => x.name === CP).sets.filter((s) => s.type === 'W').map((s) => s.w + (s.done ? '✓' : '')), CP);
  ok('re-opened with the remembered count (2); a logged warm-up stays, the un-done ones are replaced (1 logged + 3 new)', s5a === 2 && s5.length === 4 && s5[0] === '60✓' && s5.slice(1).join() === '52.5,77.5,100', { s5a, s5 });
  const nw = await ev((CP) => { const e = state.session.exercises.find((x) => x.name === CP); return e.sets.filter((s) => s.type === 'W').length; }, CP);
  ok('warm-ups never count as working volume (they are W sets)', nw === 4, nw);

  /* ---------- 3 · the Forge uses the same engine ---------- */
  const fg = await ev(() => { closeSheet(); openForge(100, 5); const ramp = (o) => { const all = [...o.querySelectorAll('.px-rr')], k = all.findIndex((x) => x.classList.contains('fg-work')); return all.slice(0, k); }; const o = $('fg-out'), rows = ramp(o).map((x) => x.querySelector('.num').textContent); const eng = warmRamp('', 100, 5, 3, 'barbell').map((x) => fmtKg(x.w)); state._forgeN = 5; drawForge(); const five = ramp($('fg-out')).length; state._forgeN = 3; return { rows, eng, chips: o.querySelectorAll('.rp-n .chip').length, five }; });
  ok('the Forge ramp is the same engine, with its own 1–5 chips', fg.rows.slice(0, 3).join() === fg.eng.join() && fg.chips === 5 && fg.five === 5, fg);
  const wide = await ev(() => { openRamp(0); const sh = $('sheet'); const r = sh.scrollWidth <= sh.clientWidth + 1; closeSheet(); return r; });
  ok('no horizontal overflow in the sheet', wide, null);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ width: A.width || 393, passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
