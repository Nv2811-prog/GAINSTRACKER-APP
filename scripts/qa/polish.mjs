import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// WAVE 8 pass/fail (GP:POLISH): real touch taps through the surfaces that were brought up to the Gotham Pro standard and the four micro-moments.
//   readiness check-in (one tap starts) · add-exercise picker (search, empty state offers "Create <name>") · custom exercise creator (footer tells what is missing, draft survives the picture picker; muscle parts, see customex.mjs)
//   swap sheet (same picker row, search, swap) · skip sheet (line-icon reasons, plain-text reason, the session summary still reads old emoji-prefixed ones) · emoji in sheet chips become line icons
//   micro-moments: set tick draws its check + one gold edge pulse (<= 400 ms, never replays on a later render, silent under reduced motion) · crown on a record from the last 24 h ·
//   Mission cycle ring · stepper number tick (plate calculator)
// node polish.mjs [--width 393|375] [--file html] [--shots dir]     exit 1 on any failed check or console error
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fx('./fixture-train.json'), width: A.width || '393' });
const P = ctx.page, out = [], taps = [];
const shot = async (name, sel) => { if (!A.shots) return; fs.mkdirSync(A.shots, { recursive: true }); const f = path.join(A.shots, name + '.png'); if (sel) { const el = await P.$(sel); if (el) { await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(250); await el.screenshot({ path: f }); } } else await P.screenshot({ path: f }); };
const check = (name, cond, extra = '') => out.push({ name, ok: !!cond, ...(cond ? {} : { extra: String(extra).slice(0, 220) }) });
const EMOJI = '\\p{Extended_Pictographic}';   // regexp source, built inside the page with the u flag
// a real finger: scroll the element into view, let it settle, then tap its centre (haptic hosts and scroll guards behave as on the phone)
async function tap(sel, nth = 0) {
  // scroll only when the element is off screen (the app ignores a tap that follows a scroll within ~0.4 s, like a thumb that was still scrolling), then let it settle
  const pos = (scroll) => P.evaluate((s, n, sc) => { const e = document.querySelectorAll(s)[n]; if (!e) return null; let r = e.getBoundingClientRect(); if (sc && (r.top < 70 || r.bottom > innerHeight - 90)) { e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); r = e.getBoundingClientRect(); } return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel, nth, scroll);
  if (!(await pos(true))) { check('tap target exists: ' + sel, false); return false; }
  await sleep(520); const p = await pos(false); await P.touchscreen.tap(p.x, p.y);
  const hit = await ev((x, y) => { const h = document.elementFromPoint(x, y); return h ? h.tagName.toLowerCase() + '.' + String(h.className).slice(0, 40) + '#' + h.id : 'none'; }, p.x, p.y);
  taps.push(sel + '[' + nth + '] @' + Math.round(p.x) + ',' + Math.round(p.y) + ' -> ' + hit); return true;
}
const ev = (fn, ...a) => P.evaluate(fn, ...a);
const reset = () => ev(() => { try { closeSheet(); } catch (e) {} try { closeOverlay(); } catch (e) {} state.session = null; state.step = null; state.subpage = null; state.minimized = false; state.showOnboarding = false; try { __qa.clear(); } catch (e) {} __qa.tab('gotham'); });
try {
  await open(ctx, { settle: 1500 });
  await ev(() => { state.showOnboarding = false; render(); });

  // ---- readiness check-in: hero + three one-tap rows, one tap starts the session ----
  await ev(() => { const { sp, i } = __qa.nextDay(); startWorkout(sp.id, i); }); await sleep(500);
  const rd = await ev(() => ({ rows: document.querySelectorAll('.rd-o').length, gyms: document.querySelectorAll('.rd-gym .chip').length, hero: !!document.querySelector('.rd-hero .gh-title') }));
  check('readiness: hero, gym chips and three one-tap rows', rd && rd.rows === 3 && rd.gyms >= 2 && rd.hero, JSON.stringify(rd));
  await tap('.rd-o.fresh'); await sleep(700);
  const rd2 = await ev(() => ({ step: state.step, r: state.session && state.session.readiness }));
  check('readiness: one tap sets it and moves on', rd2.step !== 'readiness' && !!rd2.r, JSON.stringify(rd2));
  await reset();

  // ---- set tick micro-moment ----
  await ev(() => { __qa.startLogging(0); }); await sleep(500);
  await tap('.lg2-sr.act .sdone'); await sleep(110);
  await shot('tick-moment');
  const m = await ev(() => { const row = document.querySelector('.lg2-sr.tickfx'); if (!row) return null; const ck = row.querySelector('.lg2-ck.on'), path = row.querySelector('.lg2-ck.on .gi path'), a = getComputedStyle(row, '::after'); return { n: document.querySelectorAll('.tickfx').length, edge: a.animationName, edgeMs: parseFloat(a.animationDuration) * 1000, pop: ck && getComputedStyle(ck).animationName, draw: path && getComputedStyle(path).animationName, drawMs: path ? parseFloat(getComputedStyle(path).animationDuration) * 1000 : 0 }; });
  check('set tick: the row that was ticked takes the moment (one row)', m && m.n === 1, JSON.stringify(m));
  check('set tick: check draws, gold edge pulses, pop on the button', m && m.edge === 'px-edge' && m.draw === 'px-draw' && m.pop === 'lg2-pop', JSON.stringify(m));
  check('set tick: every part is <= 400 ms', m && m.edgeMs <= 400 && m.drawMs <= 400, JSON.stringify(m));
  await ev(() => render()); await sleep(60);
  check('set tick: a later render never replays it', (await ev(() => document.querySelectorAll('.tickfx').length)) === 0);

  // ---- skip sheet: line-icon reasons, a real tap stores a plain reason; the summary reads old emoji-prefixed ones too ----
  await reset();
  await ev(() => { __qa.startLogging(2); openSkipEx(3); }); await sleep(500);
  const sk = await ev((src) => ({ hd: !!document.querySelector('#sheet .sh-hd .sh-ic'), rows: document.querySelectorAll('#sheet .rd-o.sm').length, icons: document.querySelectorAll('#sheet .rd-o.sm .lead svg').length, emoji: new RegExp(src, 'u').test(document.getElementById('sheet').textContent), btm: document.getElementById('sheet').lastElementChild.className }), EMOJI);
  check('skip sheet: header, five icon rows, no emoji, no bottom button', sk.hd && sk.rows === 5 && sk.icons === 5 && !sk.emoji && /gh/.test(sk.btm), JSON.stringify(sk));
  await tap('#sheet .rd-o.sm', 1); await sleep(450);
  const sk2 = await ev(() => ({ why: state.session.exercises[3]._skip, open: document.getElementById('sheet').classList.contains('on') }));
  check('skip sheet: a tap stores the plain reason and closes', sk2.why === 'Short on time' && !sk2.open, JSON.stringify(sk2));
  await reset();

  // ---- swap sheet: same picker row, search, one tap swaps ----
  await ev(() => { __qa.startLogging(0); openSwap(0); }); await sleep(500);
  const n0 = await ev(() => document.querySelectorAll('#swap-list .px-row').length);
  await P.focus('#swap-search'); await P.keyboard.type('mach', { delay: 30 }); await sleep(200);
  const f1 = await ev(() => { const rows = [...document.querySelectorAll('#swap-list .px-row .px-n')].map((e) => e.textContent.toLowerCase()); return { n: rows.length, all: rows.every((t) => t.includes('mach')), focus: document.activeElement && document.activeElement.id }; });
  check('swap: search filters and keeps focus', n0 >= 3 && f1.n > 0 && f1.n <= n0 && f1.all && f1.focus === 'swap-search', JSON.stringify({ n0, f1 }));
  await P.keyboard.type('zzq', { delay: 20 }); await sleep(150);
  check('swap: empty state says what is missing', await ev(() => /No match/.test((document.querySelector('#swap-list .px-empty') || {}).textContent || '')));
  await ev(() => { const i = document.getElementById('swap-search'); i.value = ''; drawSwapList(); }); await sleep(100);
  const before = await ev(() => state.session.exercises[0].name);
  await tap('#swap-list .px-row .px-add'); await sleep(450);
  // the lift is on other days of the split too, so the swap asks where it applies (swapall.mjs covers both answers)
  const asked = await ev(() => state._sheetKind === 'swapscope');
  if (asked) { await tap('#sheet .gh-row:last-child'); await sleep(450); }
  const after = await ev(() => ({ n: state.session.exercises[0].name, open: document.getElementById('sheet').classList.contains('on') }));
  check('swap: a tap swaps the lift (after "which days?" when other days have it) and closes the sheet', asked && after.n !== before && !after.open, JSON.stringify({ asked, before, after }));
  await reset();

  // ---- add-exercise picker -> empty state offers Create -> creator keeps its draft across the picture picker ----
  await ev(() => openPicker()); await sleep(500);
  check('picker: rows with a round add button', (await ev(() => document.querySelectorAll('#ex-list .px-row .px-add').length)) > 10);
  await P.focus('#ex-search'); await P.keyboard.type('zzq', { delay: 30 }); await sleep(200);
  check('picker: an unknown name offers Create', await ev(() => /Create "zzq"/.test((document.querySelector('#ex-list .px-empty .btn') || {}).textContent || '')));
  await tap('#ex-list .px-empty .btn'); await sleep(450);
  const cx = await ev(() => ({ name: (document.getElementById('cx-name') || {}).value, hint: (document.getElementById('cx-hint') || {}).textContent, ready: document.getElementById('cx-foot').classList.contains('ready') }));
  check('creator: name prefilled, footer says a main muscle part is missing', cx.name === 'Zzq' && /main mover/.test(cx.hint) && !cx.ready, JSON.stringify(cx));
  await tap('.cx-pc'); await sleep(350);
  check('creator: the footer is ready once a muscle part is marked main', await ev(() => document.getElementById('cx-foot').classList.contains('ready')));
  await tap('.cx-pic .btn'); await sleep(450);
  check('creator: the picture picker opens on the shared header', await ev(() => /Choose a picture/.test((document.querySelector('#sheet .sh-hd h2') || {}).textContent || '')));
  await tap('#sheet .sh-hd .btn-i'); await sleep(450);
  const cx2 = await ev(() => ({ name: (document.getElementById('cx-name') || {}).value, chip: !!document.querySelector('.cx-pc.on') }));
  check('creator: the draft (name, muscle part) survives the picture picker', cx2.name === 'Zzq' && cx2.chip, JSON.stringify(cx2));
  await reset();

  // ---- Forge: the fields keep focus while typing, the results redraw in place ----
  await ev(() => openForge()); await sleep(450);
  await P.focus('#sheet .fg-in label:nth-child(1) input'); await P.keyboard.type('100', { delay: 30 });
  const fg1 = await ev(() => ({ id: document.activeElement && document.activeElement.getAttribute('aria-label'), v: document.activeElement && document.activeElement.value }));
  await P.focus('#sheet .fg-in label:nth-child(2) input'); await P.keyboard.type('5', { delay: 30 }); await sleep(200);
  const fg2 = await ev(() => ({ big: (document.querySelector('#fg-out .fg-big .num') || {}).textContent, ramp: document.querySelectorAll('#fg-out .px-rr').length, pct: document.querySelectorAll('#fg-out .fg-row').length, head: !!document.querySelector('#sheet .sh-hd .sh-ic'), bottom: document.getElementById('sheet').lastElementChild.className }));
  check('Forge: typing keeps focus in the field', fg1.id === 'Weight in kilograms' && fg1.v === '100', JSON.stringify(fg1));
  check('Forge: 100 x 5 gives 117 kg, ramp (3 warm-ups + top set, the shared warmRamp engine) and plate-jump rows, nine percentages', fg2.big === '117' && fg2.ramp === 8 && fg2.pct === 9 && fg2.head, JSON.stringify(fg2));
  await reset();

  // ---- emoji in sheet chips become line icons ----
  await ev(() => openTips()); await sleep(450);
  const tp = await ev((src) => { const cs = [...document.querySelectorAll('#sheet .chip')]; return { n: cs.length, svg: cs.filter((c) => c.querySelector('svg')).length, emoji: cs.filter((c) => new RegExp(src, 'u').test(c.textContent)).length }; }, EMOJI);
  check('Tips: every chip has a line icon and no emoji', tp.n >= 6 && tp.svg === tp.n && tp.emoji === 0, JSON.stringify(tp));
  await reset();

  // ---- crown: a record from the last 24 h wears it, an older one does not ----
  const cr = await ev(() => {
    const names = Object.keys(state.data.prs).filter((k) => state.data.prs[k] && state.data.prs[k].orm > 0), H = 3600e3;
    names.forEach((k) => { state.data.prs[k].date = new Date(Date.now() - 120 * 24 * H).toISOString(); }); state.data.prs[names[0]].date = new Date(Date.now() - 2 * H).toISOString(); state.data.prs[names[1]].date = new Date(Date.now() - 4 * 24 * H).toISOString();
    __qa.tab('case'); state.p3AllRec = true; render();
    const icon = (n) => { const t = document.createElement('div'); t.innerHTML = GP.icon(n); return t.firstElementChild.outerHTML; };
    const row = (n) => [...document.querySelectorAll('#p3-rec + section .gh-row')].find((r) => r.textContent.includes(n));
    const a = row(names[0]), b = row(names[1]);
    return { a: !!a && a.querySelector('.lead svg').outerHTML === icon('crown') && /New record/.test(a.textContent), b: !!b && b.querySelector('.lead svg').outerHTML !== icon('crown') && !/New record/.test(b.textContent), at: a && a.textContent.slice(0, 80) };
  });
  check('crown: a 2 h old record wears it with "New record", a 4 day old one does not', cr.a && cr.b, JSON.stringify(cr));
  await shot('crown-record', '#p3-rec + section');
  await reset();

  // ---- Mission cycle ring ----
  await ev(() => __qa.tab('mission')); await sleep(500);
  const cy = await ev(() => { const c = document.querySelector('.gm-hero .gm-cyc'); if (!c) return null; const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId) || state.data.splits[0]; return { svg: !!c.querySelector('svg'), day: c.querySelector('.num').textContent, of: (c.querySelector('span') || {}).textContent, n: sp.days.length }; });
  await shot('mission-hero', '.gm-hero');
  check('Mission: the hero shows the cycle position as a ring', cy && cy.svg && +cy.day >= 1 && cy.of === 'of ' + cy.n, JSON.stringify(cy));
  await reset();

  // ---- stepper tick (plate calculator) ----
  await ev(() => openPlateSheet(-1)); await sleep(450);
  await tap('#sheet [aria-label$="kg more"]'); await sleep(60);
  const up = await ev(() => { const i = document.getElementById('plate-target'); return { cls: i.classList.contains('tk-up'), anim: getComputedStyle(i).animationName, v: +i.value }; });
  await sleep(250); await tap('#sheet [aria-label$="kg less"]'); await sleep(60);
  const dn = await ev(() => { const i = document.getElementById('plate-target'); return { cls: i.classList.contains('tk-dn'), v: +i.value }; });
  check('stepper: the number slides the way it moved (up, then down), value follows', up.cls && up.anim === 'px-tk-up' && up.v > 0 && dn.cls && dn.v === 0, JSON.stringify({ up, dn }));
  // ---- reduced motion (last: the media emulation is page-wide) ----
  await reset(); await ev(() => { __qa.startLogging(0); }); await sleep(450);
  await P.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const rm0 = await ev(() => { const ex = state.session.exercises[0], si = ex.sets.findIndex((x) => x.type !== 'W' && !x.done); ex.sets[si].w = ex.sets[si].w || '40'; ex.sets[si].r = ex.sets[si].r || '8'; toggleDone(0, si); return { si, step: state.step, done: ex.sets.map((x) => x.done), tickfx: document.querySelectorAll('.tickfx').length, sheet: document.getElementById('sheet').classList.contains('on') }; }); await sleep(110);
  const rm = await ev(() => { const row = document.querySelector('.lg2-sr.tickfx'); if (!row) return null; const path = row.querySelector('.lg2-ck.on .gi path'); const a = getComputedStyle(row, '::after'); return { edge: a.animationName, edgeMs: parseFloat(a.animationDuration) * 1000, draw: path && getComputedStyle(path).animationName }; });   // a PR row keeps its own sweep, which the global reduced-motion rule collapses to ~0 ms
  check('set tick: silent under reduced motion', rm && (rm.edge === 'none' || rm.edgeMs <= 1) && rm.draw === 'none', JSON.stringify({ rm0, rm }));
  // ---- skip: the session summary notes plain reasons and drops an emoji prefix stored by an older build (finishes the session: keep it last) ----
  await reset();
  const note = await ev(() => { __qa.startLogging(2); skipExercise(3, 'Short on time'); skipExercise(4, '\u{1F3C3} Cardio instead'); __qa.finish(); return state.data.workouts.map((x) => x.notes || '').find((n) => /Skipped:/.test(n)) || null; });
  check('skip: the session summary notes both reasons, an old emoji prefix is dropped', note && /\(Short on time\)/.test(note) && /\(Cardio instead\)/.test(note), note);
} catch (e) { out.push({ name: 'harness', ok: false, extra: String(e && e.stack || e).slice(0, 400) }); }
const errs = ctx.log.errors;
check('no console errors', errs.length === 0, errs[0] || '');
await ctx.close();
const bad = out.filter((r) => !r.ok);
console.log(JSON.stringify({ width: A.width || '393', checks: out.length, failing: bad.length, failed: bad, ...(bad.length ? { taps } : {}) }, null, 1));
process.exit(bad.length ? 1 : 0);
