import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// WAVE 8A: strongest variation per standard lift. The Strength standards, the Big-3 total, the Body trend, the Profile dock tile and the bodyweight badges all read ONE number per lift:
// your strongest logged variation of that movement pattern as a barbell equivalent (leg press counts about half toward the squat), with a sanity cap. Real touch taps on fixture-train.
// node strength.mjs [--width 393|375] [--out shots-dir] [--file html]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fx('./fixture-train.json'), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const ev = (f, ...a) => P.evaluate(f, ...a);
const shot = async (sel, name) => { if (!A.out) return; const el = await P.$(sel); if (!el) return; await el.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' })); await sleep(300); await el.screenshot({ path: path.join(A.out, name + '.png') }); };
const page = async (name) => { if (A.out) { await sleep(400); await P.screenshot({ path: path.join(A.out, name + '.png') }); } };
const tap = async (sel, idx = 0) => {
  const pt = await ev((sel, idx) => { const el = document.querySelectorAll(sel)[idx]; if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel, idx);
  if (!pt) throw new Error('no element: ' + sel);
  await sleep(150); await P.touchscreen.tap(pt.x, pt.y); await sleep(600);
};
const reset = (snap) => ev((snap) => {
  try { closeSheet(); } catch (e) {} try { _closeModal(); } catch (e) {} try { stopTimers(); } catch (e) {}
  state.session = null; state.step = null; state.subpage = null; state.showOnboarding = false; state.tab = 'case';
  state.data = JSON.parse(snap); try { __qa.clear(); } catch (e) {} render(); window.scrollTo(0, 0);
}, snap);
// every lift's estimate in one call: {lift: {name, orm, est, f, raw, capped, ratio}}
const est = () => ev(() => { const bw = bodyW(), o = { bw }; SV_STD.forEach((l) => { const e = liftEstimate(l); o[l] = e && { name: e.name, orm: e.orm, est: e.est, f: e.f, raw: e.raw, capped: e.capped, ratio: e.orm / bw }; }); return o; });
const addPR = (name, orm) => ev((n, o) => { state.data.prs[n] = { orm: o, date: new Date().toISOString() }; render(); }, name, orm);
try {
  await open(ctx, { settle: 1500 });
  const snap = await ev(() => JSON.stringify(state.data));
  await reset(snap); await sleep(400);

  /* ---------- 1 · the fixture: Leg Press (45°) e1RM 263 is the squat ---------- */
  const e0 = await est();
  const lp = await ev(() => state.data.prs['Leg Press (45°)'].orm);
  ok('fixture: the Squat standard is the strongest squat-pattern lift, Leg Press (45°), at x0.50', e0['Squat'] && e0['Squat'].name === 'Leg Press (45°)' && e0['Squat'].est && e0['Squat'].f === 0.5 && Math.abs(e0['Squat'].orm - lp * 0.5) < 1e-9, e0['Squat']);
  ok('fixture: the leg press sled reads as a sane squat (1.3 to 1.9 x BW, not 3 x)', e0['Squat'].ratio > 1.3 && e0['Squat'].ratio < 1.9, e0['Squat'].ratio);
  ok('fixture: bench, press and row come from machines at their factors, not at face value', e0['Bench Press'].f === 0.85 && e0['Overhead Press'].est && e0['Overhead Press'].f === 0.85 && e0['Barbell Row'].est, { b: e0['Bench Press'], o: e0['Overhead Press'], r: e0['Barbell Row'] });
  ok('fixture: no converted lift reads past the Elite tier', await ev(() => SV_STD.every((l) => { const e = liftEstimate(l); return !e || !e.est || e.orm / bodyW() <= STD[l].e + 1e-9; })), e0);

  /* ---------- 2 · the card says where each number came from ---------- */
  await reset(snap); await sleep(500);
  const row = await ev(() => { const r = [...document.querySelectorAll('.p3-sr')].find((x) => x.querySelector('.p3-srh b').textContent === 'Squat'); return r ? { num: r.querySelector('.num').textContent, via: [...r.querySelectorAll('.p3-sv > *')].map((x) => x.textContent).join(' '), role: r.getAttribute('role'), label: r.getAttribute('aria-label'), sn: r.querySelector('.p3-sn').textContent } : null; });
  ok('card: the Squat row shows its ratio and "est. · via Leg Press (45°) · 263 kg × 0.50"', row && row.num === e0['Squat'].ratio.toFixed(2) && /^est\. · via Leg Press \(45°\) · 263 kg × 0\.50$/.test(row.via), row);
  ok('card: rows are labelled buttons', row && row.role === 'button' && /Squat/.test(row.label), row);
  await shot('.p3-std-c', 'strength-card');

  /* ---------- 3 · the strongest variation wins; things that are not comparable never count ---------- */
  await addPR('Goblet Squat', 400); await addPR('Bulgarian Split Squat', 400); await addPR('Single-Leg Press', 900); await addPR('Dumbbell Bench Press', 400); await addPR('Cable Chest Press', 400); await addPR('Dumbbell Romanian Deadlift', 400); await addPR('Machine Unilateral Row', 900); await addPR('Dumbbell Shoulder Press', 400);
  const e1 = await est();
  ok('not comparable: goblet, split, single-leg, dumbbell, cable and unilateral lifts never count', e1['Squat'].name === e0['Squat'].name && e1['Bench Press'].name === e0['Bench Press'].name && e1['Deadlift'].name === e0['Deadlift'].name && e1['Overhead Press'].name === e0['Overhead Press'].name && e1['Barbell Row'].name === e0['Barbell Row'].name, e1);
  await addPR('Hack Squat Machine', 200);
  const e2 = await est();
  ok('strongest wins: a hack squat (x0.85) beats the leg press (x0.50)', e2['Squat'].name === 'Hack Squat Machine' && Math.abs(e2['Squat'].orm - 170) < 1e-9 && e2['Squat'].est, e2['Squat']);
  await addPR('Barbell Back Squat', 120);
  ok('strongest wins: a lighter barbell squat does not replace it', (await est())['Squat'].name === 'Hack Squat Machine', null);
  await addPR('Barbell Back Squat', 190);
  const e3 = await est();
  ok('strongest wins: a heavier barbell squat is the lift itself (no conversion, no "est.")', e3['Squat'].name === 'Barbell Back Squat' && !e3['Squat'].est && e3['Squat'].orm === 190, e3['Squat']);
  await addPR('Barbell Incline Bench Press', 100); await addPR('Barbell Romanian Deadlift', 100);
  const e4 = await est();
  ok('variations: incline x1.12 counts toward the bench, an RDL x1.10 toward the deadlift', e4['Bench Press'].name === 'Barbell Incline Bench Press' && Math.abs(e4['Bench Press'].orm - 112) < 1e-9 && e4['Deadlift'].name === 'Barbell Romanian Deadlift' && Math.abs(e4['Deadlift'].orm - 110) < 1e-9, { b: e4['Bench Press'], d: e4['Deadlift'] });
  await addPR('Leg Press (45°)', 900); await addPR('Smith Machine Shoulder Press', 900);
  const e5 = await est();
  ok('sanity cap: an absurd machine number stops at the Elite tier x bodyweight and says so', e5['Overhead Press'].capped && Math.abs(e5['Overhead Press'].ratio - 1) < 1e-9 && /capped at Elite/.test(await ev(() => [...document.querySelectorAll('.p3-sr')].find((x) => x.querySelector('.p3-srh b').textContent === 'Overhead Press').textContent)), e5['Overhead Press']);
  await shot('.p3-std-c', 'strength-card-variations');

  /* ---------- 4 · one number everywhere ---------- */
  const c = await ev(() => {
    const bw = bodyW(), sum = SV_BIG3.reduce((s, l) => s + liftEstimate(l).orm, 0), b3 = p3BigThree(), rel = bdRel(bdEntries()), top = Math.max(...SV_STD.map((l) => liftEstimate(l).orm));
    const dock = [...document.querySelectorAll('.gd .gd-t')].find((x) => /^Standards/.test(x.textContent));
    return { ratio: b3.ratio, sum: sum / bw, relLast: rel.length && rel[rel.length - 1].v, relN: rel.length, card: document.querySelector('.p3-b3 .num').textContent, dock: dock && dock.querySelector('.gd-t2').textContent, ach: achStats().bwRatio, achWant: top / bw };
  });
  ok('Big-3 total = the sum of the three card numbers over bodyweight', Math.abs(c.ratio - c.sum) < 1e-9 && c.card === c.ratio.toFixed(2), c);
  ok('Body trend: the last point equals the Strength card Big-3 x BW', c.relN > 1 && Math.abs(c.relLast - c.ratio) < 1e-9, c);
  ok('Profile dock: the Standards tile shows the same Big-3', c.dock && c.dock.includes(c.ratio.toFixed(2)), c);
  ok('badges: bodyweight ratio uses the best standard lift as a barbell equivalent (a leg press is not a 3 x badge)', Math.abs(c.ach - c.achWant) < 1e-9, c);

  /* ---------- 5 · history is read the same way ---------- */
  await reset(snap); await sleep(300);
  await shot('.bd-c', 'body-section');
  const h = await ev(() => {
    const rows = svRows('Squat'), names = Object.keys(rows), early = liftEstimateAt('Squat', new Date('2020-01-01').getTime(), rows), mid = liftEstimateAt('Squat', now() - 21 * 864e5, rows), cur = liftEstimate('Squat');
    const rel = bdRel(bdEntries()), b3 = p3BigThree();
    return { names, early, mid: mid && mid.orm, cur: cur.orm, delta: b3.d, relOk: rel.every((p) => isFinite(p.v) && p.v > 0), n: rel.length };
  });
  ok('history: only counting lifts have rows, nothing before the first log, earlier is not stronger than now', h.names.length >= 1 && h.names.every((n) => !/goblet|split|dumbbell|cable/i.test(n)) && h.early === null && h.mid > 0 && h.mid <= h.cur + 1e-9, h);
  ok('history: 4-week delta and the weekly relative-strength points are real numbers', Number.isFinite(h.delta) && h.relOk && h.n > 1, h);

  /* ---------- 6 · the library: one lift per exercise, nothing dumb counted ---------- */
  const lib = await ev(() => { const bad = [], dup = []; EXDB.forEach((x) => { const hit = SV_STD.filter((l) => svRule(l, x.n)); if (hit.length > 1) dup.push(x.n + ': ' + hit.join('/')); if (hit.length && /dumbbell|cable|goblet|split squat|bulgarian|single|one.?leg|one.?arm|lunge|step.?up|kettlebell|sissy|calf/i.test(x.n)) bad.push(x.n); }); return { bad, dup, n: EXDB.filter((x) => SV_STD.some((l) => svRule(l, x.n))).length }; });
  ok('library: no exercise counts for two standard lifts, no dumbbell / cable / single-leg lift counts, 60+ lifts are claimed', !lib.bad.length && !lib.dup.length && lib.n >= 60, lib);

  /* ---------- 7 · the variation sheet ---------- */
  await reset(snap); await sleep(500);
  await addPR('Hack Squat Machine', 200);
  const idx = await ev(() => [...document.querySelectorAll('.p3-sr')].findIndex((x) => x.querySelector('.p3-srh b').textContent === 'Squat'));
  await tap('.p3-sr', idx); await sleep(300);
  const sh = await ev(() => { const s = document.getElementById('sheet'), r = [...s.querySelectorAll('.gh-row')]; return { on: s.classList.contains('on'), pg: !!s.querySelector('.sv-pg'), h: (s.querySelector('.st-h h2') || { textContent: '' }).textContent, done: !!s.querySelector('.st-h .btn.sm'), names: r.map((x) => x.querySelector('.gh-t1').textContent), nums: r.map((x) => +x.querySelector('.sv-eq .num').textContent), lede: (s.querySelector('.sv-lede') || { textContent: '' }).textContent, over: s.scrollWidth > s.clientWidth + 1 }; });
  ok('sheet: a tap opens the Squat variations, strongest first, with a Done button', sh.on && sh.pg && sh.h === 'Squat' && sh.done && sh.names[0] === 'Hack Squat Machine' && sh.names[1] === 'Leg Press (45°)' && sh.nums[0] === 170 && sh.nums[1] === Math.round(lp * 0.5) && sh.nums.every((v, i, a) => !i || a[i - 1] >= v), sh);
  ok('sheet: the lede names the lift that counts and the bodyweight ratio; nothing overflows', /Hack Squat Machine/.test(sh.lede) && /82\.8 kg/.test(sh.lede) && !sh.over, sh);
  ok('sheet: the lede also names the next tier, in kg and in the units you train (target / factor)', /Next, Elite at 207 kg, about 244 kg on the Hack Squat Machine\./.test(sh.lede), sh.lede);
  await page('variation-sheet');
  await tap('#sheet .st-h .btn.sm'); await sleep(300);
  ok('sheet: Done closes it', !(await ev(() => document.getElementById('sheet').classList.contains('on'))), null);

  /* ---------- 8 · fit ---------- */
  await reset(snap); await sleep(400);
  const fit = await ev(() => { const card = document.querySelector('.p3-std-c').getBoundingClientRect(), bad = []; document.querySelectorAll('.p3-sr').forEach((r) => { const b = r.getBoundingClientRect(); if (r.scrollWidth > r.clientWidth + 1 || b.right > card.right + 1) bad.push(r.querySelector('.p3-srh b').textContent); r.querySelectorAll('.p3-sv, .p3-sn, .p3-srh').forEach((x) => { if (x.getBoundingClientRect().right > card.right - 8) bad.push('inner ' + x.className); }); }); return { bad, h: Math.min(...[...document.querySelectorAll('.p3-sr')].map((r) => r.getBoundingClientRect().height)) }; });
  ok('fit: every Strength row, its via line included, stays inside the card; rows are >= 44px', !fit.bad.length && fit.h >= 44, fit);

  /* ---------- 9 · the cautious end of the table: a trap bar is not flattered, a wide-stance sled is still a leg press ---------- */
  const rules = await ev(() => ({ trap: svRule('Deadlift', 'Trap Bar Deadlift'), wide: svRule('Squat', 'Machine 45° Leg Wide Press'), single: svRule('Squat', 'Machine 45 Degrees One Leg Press'), calf: svRule('Squat', 'Machine 45° Calf Press'), hinge: svRule('Deadlift', 'Hip Hinge (Erectors)') }));
  ok('factors: trap bar x0.92, a "Leg Wide Press" counts as a leg press x0.50, a one-leg press and a calf press never count', rules.trap && rules.trap.f === 0.92 && rules.wide && rules.wide.f === 0.5 && !rules.single && !rules.calf && rules.hinge && rules.hinge.f === 0.85, rules);

  await reset(snap); await ev(() => { state.data.u.bodyweight = 50.3; }); await addPR('Machine Chest Press', 900);
  const capRow = await ev(() => { const r = [...document.querySelectorAll('.p3-sr')].find((x) => x.querySelector('.p3-srh b').textContent === 'Bench Press'); return r && { sn: r.querySelector('.p3-sn').textContent, num: r.querySelector('.num').textContent, via: r.querySelector('.p3-sv').textContent }; });
  ok('cap: a capped lift sits ON its tier at any bodyweight (50.3 kg x Elite 1.5 reads Elite, not "Advanced, Elite in +0 kg")', capRow && capRow.num === '1.50' && /Elite/.test(capRow.sn) && !/ in \+/.test(capRow.sn) && /capped at Elite/.test(capRow.via), capRow);

  /* ---------- 10 · the Suit hero: the vault still, its own look (a one-class override loses to GP:ART, so read the COMPUTED style), the parallax, the Fuel tile ---------- */
  await reset(snap); await ev(() => { state.tab = 'suit'; render(); window.scrollTo(0, 0); }); await sleep(900);
  const hero = await ev(() => {
    const a = document.querySelector('.gm-suit .ga-suit-hero'), i = a && a.querySelector('img');
    if (!i) return null;
    const cs = getComputedStyle(i), af = getComputedStyle(a, '::after'), fuel = [...document.querySelectorAll('.gd-t')].find((b) => /^Fuel/.test(b.textContent)), lab = document.querySelector('.gd-t .gd-a');
    return { src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth === 720, heroes: document.querySelectorAll('.gm-suit .ga').length, pos: cs.objectPosition, op: cs.opacity, mask: cs.webkitMaskImage || cs.maskImage, filter: cs.filter, veil: af.backgroundImage, anim: cs.animationName, halo: getComputedStyle(document.querySelector('.gm-suit .gm-st')).textShadow, fig: !!document.querySelector('.gm-suit .gm-fig2 svg'), legend: !!document.querySelector('.gm-suit .gm-leg'), fuelArt: fuel && fuel.querySelector('.gd-a').getAttribute('style'), firstArt: lab && lab.getAttribute('style') };
  });
  ok('Suit hero: the vault still (suit-hero.jpg) is loaded, right aligned, placed once; the figure and the legend sit on top', hero && /suit-hero\.jpg$/.test(hero.src) && hero.loaded && hero.pos === '100% 50%' && hero.heroes === 1 && hero.fig && hero.legend, hero);
  ok('Suit hero: its own look wins over the standard art rules (full opacity, no left mask, the lighter #0b0d12 veil, brightness lift)', hero && hero.op === '1' && hero.mask === 'none' && /brightness\(1\.3\)/.test(hero.filter) && /rgb\(11, 13, 18\)/.test(hero.veil) && !/rgb\(17, 25, 39\)/.test(hero.veil), hero);
  ok('Suit hero: the scroll-driven push-in from GP:CHARM still runs on it, and the status line has a dark halo', hero && hero.anim === 'gpPar' && /rgba?\(5, 7, 12/.test(hero.halo), hero);
  ok('Suit dock: the Fuel tile has its own still (tile-fuel), not the Lab art', hero && /tile-fuel\.jpg/.test(hero.fuelArt || '') && !/tile-lab/.test(hero.fuelArt || ''), hero && hero.fuelArt);
  await shot('.gm-suit', 'suit-hero');
  await ev(() => window.scrollTo(0, 0)); await page('suit-top');
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 500) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ width: A.width || 393, passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
