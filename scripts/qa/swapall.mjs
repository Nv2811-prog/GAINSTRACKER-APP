import { fileURLToPath } from 'node:url';
// SWAP ACROSS THE SPLIT (2026-10-27): a swap asks "only this day / every day with it"; every changed day keeps its own sets × reps for the slot
// (weekly planned volume never moves); the plan editor can swap too; "Copy lifts to the other Upper days" carries a day's swaps slot by slot.
// Real app, fixture-train (active split cycle8v2: Upper A 12 lifts, Upper B / C 13 with Reverse Pec Deck). node swapall.mjs [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const OLD = 'Plate-Loaded Chest Press', NEW = 'Hammer Strength Iso-Lateral Incline Press';
const tapRow = async (re) => {
  const pt = await ev((src) => { const e = [...document.querySelectorAll('#sheet .gh-row')].find((x) => new RegExp(src).test(x.textContent)); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, re.source);
  if (!pt) return false; await sleep(250); await P.touchscreen.tap(pt.x, pt.y); await sleep(500); return true;
};
// the plan as {day: {lift: sets}} and the split's total planned sets
const PLAN = () => { const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); const o = {}; let tot = 0; sp.days.forEach((d) => { if (d.rest) return; o[d.name] = {}; (d.exercises || []).forEach((n) => { const s = +((d.plan || {})[n] || {}).s || 0; o[d.name][n] = s; tot += s; }); }); return { o, tot, lists: sp.days.map((d) => (d.exercises || []).join('|')) }; };
try {
  await open(ctx, { settle: 1400 });
  const p0 = await ev(new Function('return (' + PLAN.toString() + ')()'));
  /* ---------- a workout swap asks, "only this day" keeps the slot's sets on this day ---------- */
  await ev((OLD) => { const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); __qa.clear(); startWorkout(sp.id, 0); const ei = state.session.exercises.findIndex((e) => e.name === OLD); openSwap(ei); }, OLD); await sleep(400);
  const pk = await ev(() => document.querySelectorAll('#swap-list .px-row').length);
  ok('the swap list offers chest alternatives', pk > 0, pk);
  await ev((a) => { const ei = state.session.exercises.findIndex((e) => e.name === a.OLD); swapPick(ei, a.NEW); }, { OLD, NEW }); await sleep(300);
  const sc = await ev(() => ({ kind: state._sheetKind, rows: [...document.querySelectorAll('#sheet .gh-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()) }));
  ok('picking a lift other days also have asks where it applies (every day / only Upper A)', sc.kind === 'swapscope' && /Every day with it/.test(sc.rows[0]) && /Upper A · Upper B · Upper C/.test(sc.rows[0]) && /Only Upper A/.test(sc.rows[1]), sc);
  await tapRow(/Only Upper A/);
  const p1 = await ev(new Function('return (' + PLAN.toString() + ')()'));
  const s1 = await ev((NEW) => ({ name: state.session.exercises.some((e) => e.name === NEW) }), NEW);
  const A0 = 'Upper A · Wingspan', B0 = 'Upper B · Shoulder Armor', C0 = 'Upper C · Chest Plate';
  ok('"Only Upper A": tonight and Upper A swap; the new lift keeps the slot\'s sets (no drift to 3)', s1.name && p1.o[A0][NEW] === p0.o[A0][OLD] && !(OLD in p1.o[A0]) && p1.o[B0][OLD] === p0.o[B0][OLD] && p1.tot === p0.tot, { a: p1.o[A0], tot: [p0.tot, p1.tot] });
  ok('…and the slot stays where it was', p1.lists[0].split('|').indexOf(NEW) === p0.lists[0].split('|').indexOf(OLD), p1.lists[0]);
  await ev(() => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); }); await sleep(300);
  const pu = await ev(new Function('return (' + PLAN.toString() + ')()'));
  const su = await ev((OLD) => state.session.exercises.some((e) => e.name === OLD), OLD);
  ok('Undo puts the old lift back tonight and in the plan', su && pu.lists.join() === p0.lists.join() && pu.tot === p0.tot, { su, lists: pu.lists[0] });
  /* ---------- "every day with it": Upper A, B and C, each keeping its own sets ---------- */
  await ev((a) => { const ei = state.session.exercises.findIndex((e) => e.name === a.OLD); swapPick(ei, a.NEW); }, { OLD, NEW }); await sleep(300);
  await tapRow(/Every day with it/);
  const p2 = await ev(new Function('return (' + PLAN.toString() + ')()'));
  const t2 = await ev(() => (document.getElementById('toast') || {}).textContent || '');
  ok('"Every day with it": the lift changes on Upper A, B and C', [A0, B0, C0].every((d) => (d in p2.o) && (NEW in p2.o[d]) && !(OLD in p2.o[d])) && /3 days/.test(t2), { t2, a: Object.keys(p2.o[B0]) });
  ok('each day keeps its own sets for that slot, so the planned weekly volume is unchanged', [A0, B0, C0].every((d) => p2.o[d][NEW] === p0.o[d][OLD]) && p2.tot === p0.tot, { tot: [p0.tot, p2.tot] });
  await ev(() => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); }); await sleep(300);
  const p2u = await ev(new Function('return (' + PLAN.toString() + ')()'));
  ok('Undo restores every day', p2u.lists.join() === p0.lists.join(), p2u.lists);
  /* ---------- the plan editor can swap too (same question) ---------- */
  const pe = await ev((a) => { const sp = state.data.splits.find((s) => s.id === 'cycle8v2'); const j = sp.days[3].exercises.indexOf('Lat Pulldown (Wide Grip)'); openSplitSheet(); state._gmPlanEd = 'cycle8v2|3|' + j; refreshSplitSheet(); const btn = !!document.querySelector('#sheet [aria-label="Swap lift"]'); openPlanSwap('cycle8v2', 3, j); const list = document.querySelectorAll('#swap-list .px-row').length; planSwapPick('cycle8v2', 3, j, 'Close-Grip Lat Pulldown'); const kind = state._sheetKind; planSwap('cycle8v2', 3, j, 'Close-Grip Lat Pulldown', 'all'); const days = sp.days.filter((d) => (d.exercises || []).includes('Close-Grip Lat Pulldown')).map((d) => d.name); return { btn, list, kind, days, back: state._sheetKind }; }, {});
  ok('the plan editor has a Swap button per lift, with the same days question; "every day" swaps them all and returns to the editor', pe.btn && pe.list > 0 && pe.kind === 'swapscope' && pe.days.length === 3 && pe.back === 'splits', pe);
  await ev(() => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); }); await sleep(300);
  /* ---------- yesterday's case: Upper A changed alone, Copy lifts carries the swaps to B and C ---------- */
  const cp = await ev((a) => {
    const sp = state.data.splits.find((s) => s.id === 'cycle8v2'), A = sp.days[0];
    swapInDay(A, a.OLD, a.NEW); swapInDay(A, 'Cable Cross-Body Extension', 'Cable Overhead Triceps Extension');   // two Upper-A-only swaps, as on a first day at a new gym
    const before = (() => { let t = 0; sp.days.forEach((d) => Object.values(d.plan || {}).forEach((p) => { t += +p.s || 0; })); return t; })();
    const bSets = { ...sp.days[3].plan }, cLen = sp.days[6].exercises.length;
    openSplitSheet(); const btn = [...document.querySelectorAll('#sheet .gm-sp.is-active .btn')].find((b) => /Copy lifts to Upper B, Upper C/.test(b.textContent));
    btn.click();
    const B = sp.days[3], C = sp.days[6];
    const after = (() => { let t = 0; sp.days.forEach((d) => Object.values(d.plan || {}).forEach((p) => { t += +p.s || 0; })); return t; })();
    return { btn: !!btn, bHas: B.exercises.includes(a.NEW) && B.exercises.includes('Cable Overhead Triceps Extension') && !B.exercises.includes(a.OLD), cHas: C.exercises.includes(a.NEW) && !C.exercises.includes('Cable Cross-Body Extension'),
      bSetsKept: B.plan[a.NEW].s === bSets[a.OLD].s && B.plan['Cable Overhead Triceps Extension'].s === bSets['Cable Cross-Body Extension'].s, rpd: B.exercises.includes('Reverse Pec Deck') && C.exercises.includes('Reverse Pec Deck'), cLen: [cLen, C.exercises.length], tot: [before, after],
      toast: (document.getElementById('toast') || {}).textContent || '' };
  }, { OLD, NEW });
  ok('Edit plan offers "Copy lifts to Upper B, Upper C" on Upper A', cp.btn, cp);
  ok('one tap carries Upper A\'s swaps to Upper B and C, slot by slot', cp.bHas && cp.cHas && /2 swaps copied to Upper B · Upper C/.test(cp.toast), cp);
  ok('each day keeps its own sets, their extra lift (Reverse Pec Deck) stays, total planned sets unchanged', cp.bSetsKept && cp.rpd && cp.cLen[0] === cp.cLen[1] && cp.tot[0] === cp.tot[1], cp);
  const again = await ev(() => { const sp = state.data.splits.find((s) => s.id === 'cycle8v2'), before = JSON.stringify(sp.days); const n = copyDayLifts('cycle8v2', 0); return { n, same: JSON.stringify(sp.days) === before }; });
  ok('copying again changes nothing (they already match)', again.n === 0 && again.same, again);
  const sib = await ev(() => { state.data.splits.push({ id: 'qa-gen', name: 'QA', days: [{ name: 'Day 1', exercises: ['Barbell Bench Press', 'Barbell Row'] }, { name: 'Day 2', exercises: ['Leg Press (45°)', 'Leg Extension'] }] }); const sp = state.data.splits.find((s) => s.id === 'qa-gen'); const r = daySiblings(sp, 0).length; state.data.splits.pop(); return r; });
  ok('days that only share a generic first word (Day 1 / Day 2) are not treated as copies of each other', sib === 0, sib);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
