import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// WAVE 7A: the one-tap weekly adjust (Sunday card, review sheet, Mission link row) and the Profile Body section (weigh-in, 12-week trend, relative strength).
// Real touch taps, fixture-train (its clock is Sunday 17:30). Pass/fail per check; exit 1 on any failure or console error.
// node weekly-body.mjs [--width 393|375] [--out shots-dir] [--file html]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fx('./fixture-train.json'), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
if (A.out) fs.mkdirSync(A.out, { recursive: true });
const shot = async (sel, name) => { if (!A.out) return; const el = await P.$(sel); if (!el) return; await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(300); await el.screenshot({ path: path.join(A.out, name + '.png') }); };
const page = async (name) => { if (A.out) { await sleep(300); await P.screenshot({ path: path.join(A.out, name + '.png') }); } };
const tap = async (sel, idx = 0) => {
  const pt = await P.evaluate((sel, idx) => { const el = document.querySelectorAll(sel)[idx]; if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel, idx);
  if (!pt) throw new Error('no element: ' + sel);
  await sleep(150); await P.touchscreen.tap(pt.x, pt.y); await sleep(500);
};
const ev = (f, ...a) => P.evaluate(f, ...a);
const reset = (snap, tab = 'gotham') => ev((snap, tab) => {
  try { closeSheet(); } catch (e) {} try { _closeModal(); } catch (e) {} try { stopTimers(); } catch (e) {}
  state.session = null; state.step = null; state.subpage = null; state.showOnboarding = false; state.tab = tab;
  state.data = JSON.parse(snap); try { __qa.clear(); } catch (e) {} render(); window.scrollTo(0, 0);
}, snap, tab);
const state0 = () => ev(() => ({ splits: JSON.stringify(state.data.splits), hist: JSON.stringify([state.data.workouts, state.data.prs, state.data.muscleVol]), adj: JSON.stringify(state.data.weekAdj == null ? null : state.data.weekAdj), bw: state.data.u.bodyweight, log: JSON.stringify(state.data.bwLog) }));
try {
  await open(ctx, { settle: 1500 });
  const snap = await ev(() => JSON.stringify(state.data));
  await reset(snap); await sleep(400);

  /* ---------- 1 · Sunday card ---------- */
  const card = await ev(() => { const b = [...document.querySelectorAll('.gh-sun .wk-act')]; return { n: b.length, tags: b.map((x) => x.tagName), labels: b.map((x) => x.querySelector('.wk-tx b').textContent), icons: b.every((x) => x.querySelector('.wk-ic svg')), go: b.every((x) => x.querySelector('.wk-go')), h: Math.min(...b.map((x) => x.getBoundingClientRect().height)), nested: !!document.querySelector('.gh-sun-hit .wk-act'), hit: !!document.querySelector('.gh-sun-hit[role=button]') }; });
  ok('card: 1-3 action buttons with icon, label and Apply', card.n >= 1 && card.n <= 3 && card.icons && card.go && card.labels.every((l) => /^(Add|Trim) .+ · .+/.test(l)), card);
  ok('card: buttons are >= 44px and are not nested in the review button', card.h >= 44 && !card.nested && card.hit, card);
  await shot('.gh-sun', 'sunday-card');

  /* ---------- 2 · apply -> toast + plan edited + marked + history untouched ---------- */
  const b0 = await state0();
  const first = await ev(() => { const b = document.querySelector('.gh-sun .wk-act:not(.is-done)'); return { label: b.querySelector('.wk-tx b').textContent, key: b.getAttribute('onclick') }; });
  await tap('.gh-sun .wk-act:not(.is-done)');
  const a1 = await state0();
  const toastUi = await ev(() => ({ on: document.getElementById('toast').classList.contains('on'), undo: !!document.querySelector('#toast .tundo'), text: document.getElementById('toast').textContent }));
  ok('apply: toast with Undo', toastUi.on && toastUi.undo, toastUi);
  ok('apply: the active plan changed, history/records/volume did not', a1.splits !== b0.splits && a1.hist === b0.hist, { same: a1.splits === b0.splits });
  const diff = await ev((before, label) => {
    const o = JSON.parse(before), n = state.data.splits, out = [];
    n.forEach((sp, si) => sp.days.forEach((d, di) => { const od = o[si].days[di]; Object.keys(d.plan || {}).forEach((k) => { const a = (od.plan || {})[k], b = d.plan[k]; if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ k, from: a && a.s, to: b.s, r: b.r, opt: b.opt, added: !(od.exercises || []).includes(k) && (d.exercises || []).includes(k) }); }); }));
    return { out, label, adj: state.data.weekAdj };
  }, b0.splits, first.label);
  const nSets = +(/(\d+) sets?/.exec(first.label) || [])[1] || 0;
  const sum = diff.out.reduce((s, c) => s + Math.abs(c.to - (c.from == null ? 0 : c.from)), 0);
  ok('apply: sets move by exactly what the label says, 2..10 per lift, rep range kept or 5-10', diff.out.length > 0 && sum === nSets && diff.out.every((c) => c.to >= 2 && c.to <= 10 && /5.10|6.10/.test(c.r)), diff);
  ok('apply: marked for this week', diff.adj && /^\d{4}-\d{2}-\d{2}$/.test(diff.adj.wk) && Object.keys(diff.adj.done).length === 1, diff.adj);
  ok('apply: the button flips to its result', (await ev(() => document.querySelectorAll('.gh-sun .wk-act.is-done').length)) === 1, null);
  await shot('.gh-sun', 'sunday-card-applied');
  await page('toast-undo');

  /* ---------- 3 · undo restores the exact previous plan ---------- */
  await tap('#toast .tundo');
  const u1 = await state0();
  ok('undo: the exact previous plan and week mark come back', u1.splits === b0.splits && u1.adj === b0.adj && u1.hist === b0.hist, { splits: u1.splits === b0.splits, adj: u1.adj });
  ok('undo: the button is back', (await ev(() => document.querySelectorAll('.gh-sun .wk-act:not(.is-done)').length)) === card.n, null);

  /* ---------- 4 · once per week ---------- */
  await tap('.gh-sun .wk-act:not(.is-done)'); await sleep(300);
  const s2 = (await state0()).splits;
  await ev((k) => { eval(k); }, first.key); await sleep(200);
  ok('once: a second tap on the same advice does not stack', (await state0()).splits === s2, null);

  /* ---------- 5 · the review sheet owns the same buttons and repaints in place ---------- */
  await reset(snap); await sleep(300);
  await tap('.gh-sun-hit');
  const sh = await ev(() => ({ on: document.getElementById('sheet').classList.contains('on'), n: document.querySelectorAll('#sheet .wk-act').length }));
  ok('sheet: opens with the same buttons', sh.on && sh.n === card.n, sh);
  await page('review-sheet');
  await tap('#sheet .wk-act:not(.is-done)'); await sleep(300);
  const sh2 = await ev(() => ({ on: document.getElementById('sheet').classList.contains('on'), done: document.querySelectorAll('#sheet .wk-act.is-done').length, home: document.querySelectorAll('.gh-sun .wk-act.is-done').length }));
  ok('sheet: stays open and the result shows in the sheet and on Home', sh2.on && sh2.done === 1 && sh2.home === 1, sh2);
  await page('review-sheet-applied');
  await tap('#toast .tundo');
  ok('sheet: undo restores the plan and the button', (await state0()).splits === b0.splits && (await ev(() => document.querySelectorAll('#sheet .wk-act:not(.is-done)').length)) === card.n, null);

  /* ---------- 6 · Mission links to the same buttons ---------- */
  await reset(snap, 'mission'); await sleep(400);
  const ms = await ev(() => ({ row: !!document.querySelector('.wk-sug'), text: (document.querySelector('.wk-sug') || { textContent: '' }).textContent, buttons: document.querySelectorAll('#app .wk-act').length }));
  ok('mission: one "Suggested this week" link row, no duplicate buttons', ms.row && /Suggested this week/.test(ms.text) && ms.buttons === 0, ms);
  await shot('.wk-sug', 'mission-row');
  await tap('.wk-sug');
  ok('mission: the row opens the review sheet with the buttons', await ev(() => document.getElementById('sheet').classList.contains('on') && document.querySelectorAll('#sheet .wk-act').length > 0), null);

  /* ---------- 7 · trim when over MRV; nothing is added while load spikes ---------- */
  await reset(snap); await sleep(300);
  await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); sp.days.forEach((d) => (d.exercises || []).forEach((n) => { if ((exFor(n).p || [])[0] === 'shoulders') d.plan[n].s = 5; })); window.__ws = weeklySets; weeklySets = (m) => m === 'shoulders' ? 34 : window.__ws(m); window.__ac = acwrInfo; acwrInfo = () => Object.assign({}, window.__ac(), { zone: 'spike' }); render(); });
  await sleep(300);
  const tr = await ev(() => [...document.querySelectorAll('.gh-sun .wk-act')].map((b) => ({ cls: b.className, t: b.querySelector('.wk-tx b').textContent })));
  ok('trim: over-MRV muscle gets a Trim button; no Add button while load spikes', tr.length >= 1 && /^Trim \d sets? · Delts$/.test(tr[0].t) && tr.every((x) => /bad/.test(x.cls)), tr);
  const t0 = await state0();
  await tap('.gh-sun .wk-act.bad');
  const t1 = await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId), o = []; sp.days.forEach((d) => (d.exercises || []).forEach((n) => { if ((exFor(n).p || [])[0] === 'shoulders') o.push(d.plan[n].s); })); return o; });
  ok('trim: sets came off, none under 2', t1.length && t1.every((s) => s >= 2) && t1.reduce((a, b) => a + b, 0) < 5 * t1.length, t1);
  await tap('#toast .tundo');
  ok('trim: undo restores exactly', (await state0()).splits === t0.splits, null);
  await ev(() => { weeklySets = window.__ws; acwrInfo = window.__ac; });

  /* ---------- 8 · no lift has room -> a library stretch lift ---------- */
  await reset(snap); await sleep(300);
  await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); sp.days.forEach((d) => { d.exercises = (d.exercises || []).filter((n) => !(exFor(n).p || []).includes('triceps')); Object.keys(d.plan || {}).forEach((k) => { if (!d.exercises.includes(k)) delete d.plan[k]; }); }); window.__ws = weeklySets; weeklySets = (m) => m === 'triceps' ? 2 : window.__ws(m); render(); });
  await sleep(300);
  const lf = await ev(() => [...document.querySelectorAll('.gh-sun .wk-act')].map((b) => ({ t: b.querySelector('.wk-tx b').textContent, s: b.querySelector('.wk-tx i').textContent })));
  const lift = lf.find((x) => /^Add a stretch lift · Triceps$/.test(x.t));
  ok('lift: an existing library stretch-position lift is offered', !!lift, lf);
  if (lift) {
    const l0 = await state0();
    await tap('.gh-sun .wk-act');
    const added = await ev(() => { const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); const o = []; sp.days.forEach((d, i) => (d.exercises || []).forEach((n) => { if ((exFor(n).p || [])[0] === 'triceps') o.push({ i, n, plan: d.plan[n], stretch: isLengthened(exFor(n)) }); })); return o; });
    ok('lift: added to a training day with 2-3 sets at 5-10 reps', added.length === 1 && added[0].stretch && added[0].plan.s >= 2 && added[0].plan.s <= 3 && added[0].plan.r === '5–10', added);
    await tap('#toast .tundo');
    ok('lift: undo removes it again, exactly', (await state0()).splits === l0.splits, null);
  }
  await ev(() => { weeklySets = window.__ws; });

  /* ---------- 9 · Profile: Body ---------- */
  await reset(snap, 'case'); await sleep(500);
  const dock = await ev(() => { const t = [...document.querySelectorAll('.gd .gd-t')].find((x) => /^Body/.test(x.textContent)); return t ? { sub: t.querySelector('.gd-t2').textContent, fn: t.getAttribute('onclick'), h: t.getBoundingClientRect().height, hx: !!t.querySelector('.hx,[data-hx]') } : null; });
  ok('dock: a Body tile with a live kg sub', dock && /kg/.test(dock.sub) && !dock.hx, dock);
  const dockIdx = await ev(() => [...document.querySelectorAll('.gd .gd-t')].findIndex((x) => /^Body/.test(x.textContent)));
  await tap('.gd .gd-t', dockIdx); await sleep(700);
  ok('dock: the tile scrolls to the Body section', await ev(() => { const r = document.getElementById('p3-body').getBoundingClientRect(); return r.top > 0 && r.top < 260; }), null);
  const body = await ev(() => ({ now: document.querySelector('.bd-now .num').textContent, input: document.getElementById('bd-kg').value, w: !!document.querySelector('.bd-w'), r: !!document.querySelector('.bd-r'), dots: document.querySelectorAll('.bd-w .bd-d').length, tag: (document.querySelector('.bd-meta .tag') || { textContent: '' }).textContent, avg: (document.querySelector('.bd-meta .t-xs') || { textContent: '' }).textContent, btn: document.querySelector('.bd-go').textContent.trim(), over: document.documentElement.scrollWidth > innerWidth + 1, dup: document.querySelectorAll('#p3-body').length }));
  ok('body: current weight, prefilled input, weekly-average line, relative-strength line', body.now === '82.8' && body.input === '82.8' && body.w && body.r && body.dots >= 2 && /kg \/ \d+ wk/.test(body.tag) && /Weekly avg/.test(body.avg) && body.btn === 'Log today' && !body.over && body.dup === 1, body);
  const rel = await ev(() => { const r = bdRel(bdEntries()); return { last: r[r.length - 1] && r[r.length - 1].v, big3: p3BigThree() && p3BigThree().ratio, n: r.length }; });
  ok('relative strength: last point equals the Strength card Big-3 x BW', rel.n > 1 && Math.abs(rel.last - rel.big3) < 1e-9, rel);
  await shot('.bd-c', 'body-card'); await page('body-in-page');

  /* log: one tap, prefilled; same-day second log replaces; undo; everything that reads u.bodyweight follows */
  const lg0 = await state0();
  await ev(() => { document.getElementById('bd-kg').value = '83.4'; });
  await tap('.bd-go'); await sleep(300);
  const lg1 = await ev(() => ({ bw: state.data.u.bodyweight, n: state.data.bwLog.length, last: state.data.bwLog[state.data.bwLog.length - 1], std: (document.querySelector('#p3-std .t-xs') || { textContent: '' }).textContent, id: (document.querySelector('.p3-idn .sub') || { textContent: '' }).textContent, btn: document.querySelector('.bd-go').textContent.trim(), now: document.querySelector('.bd-now .num').textContent, toast: !!document.querySelector('#toast .tundo') }));
  ok('log: bodyweight + log updated, one entry added (shape {date,kg})', lg1.bw === 83.4 && lg1.n === JSON.parse(lg0.log).length + 1 && lg1.last.kg === 83.4 && typeof lg1.last.date === 'string' && Object.keys(lg1.last).sort().join() === 'date,kg', lg1);
  ok('log: Strength header, identity strip and Body all read 83.4', /83\.4/.test(lg1.std) && /83\.4/.test(lg1.id) && lg1.now === '83.4' && lg1.btn === 'Update today' && lg1.toast, lg1);
  await ev(() => { document.getElementById('bd-kg').value = '83.0'; }); await tap('.bd-go'); await sleep(300);
  ok('log: a second weigh-in the same day replaces it', await ev((n) => state.data.bwLog.length === n && state.data.u.bodyweight === 83, JSON.parse(lg0.log).length + 1), null);
  await tap('#toast .tundo');
  const lg2 = await state0();
  ok('log: undo puts the log and u.bodyweight back exactly (one step)', lg2.bw === 83.4 && JSON.parse(lg2.log).length === JSON.parse(lg0.log).length + 1, { bw: lg2.bw });
  await ev((l, b) => { state.data.bwLog = JSON.parse(l); state.data.u.bodyweight = b; save(); render(); }, lg0.log, lg0.bw); await sleep(300);
  await reset(snap, 'case'); await sleep(300);
  await tap('.btn-i[aria-label="0.1 kg more"]'); await tap('.btn-i[aria-label="0.1 kg more"]');
  ok('stepper: + raises by 0.1 kg per tap', (await ev(() => document.getElementById('bd-kg').value)) === '83.0', null);
  await tap('.btn-i[aria-label="0.1 kg less"]');
  ok('stepper: - lowers by 0.1 kg', (await ev(() => document.getElementById('bd-kg').value)) === '82.9', null);
  await ev(() => { document.getElementById('bd-kg').value = '5'; }); const inv = await state0(); await tap('.bd-go');
  ok('log: an out-of-range weight is refused with a message and changes nothing', (await state0()).log === inv.log && (await ev(() => /Enter your weight/.test(document.getElementById('toast').textContent))), null);

  /* Settings + Fuel use the same single writer / link */
  await reset(snap, 'case'); await sleep(200);
  await ev(() => { const i = document.createElement('input'); i.value = '81.5'; stNum('bodyweight', i, 30, 300, 75, 0); });
  ok('settings: a bodyweight edit lands in the log too', await ev(() => state.data.u.bodyweight === 81.5 && state.data.bwLog[state.data.bwLog.length - 1].kg === 81.5), null);
  await reset(snap, 'fuel'); await sleep(300);
  const fu = await ev(() => ({ link: !!document.querySelector('.fu-bwl'), input: !!document.getElementById('fuel-bw') }));
  ok('fuel: a link row into Profile, no second weigh-in', fu.link && !fu.input, fu);
  await tap('.fu-bwl'); await sleep(900);
  ok('fuel: the link lands on Profile, Body', await ev(() => state.tab === 'case' && document.getElementById('p3-body').getBoundingClientRect().top < 300), null);

  /* empty states */
  await reset(snap, 'case'); await ev(() => { state.data.bwLog = []; render(); }); await sleep(300);
  ok('empty log: hint instead of a chart, logging still works', await ev(() => !!document.querySelector('.bd-hint') && !document.querySelector('.bd-w') && !!document.querySelector('.bd-go')), null);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 500) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ width: A.width || 393, passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
