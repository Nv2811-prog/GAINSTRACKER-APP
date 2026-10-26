import { fileURLToPath } from 'node:url';
// CUSTOM + EDITED EXERCISES (2026-10-27): brand + name, muscle PARTS (tap = main, twice = assist) with an info card per part, edit any lift
// (brand, equipment, parts, bodyweight; the name stays so history stays linked), Undo / back to the original. Real app, fixture-train.
// node customex.mjs [--v 1] [--width 375]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const LP = 'Lat Pulldown (Wide Grip)';
const tapEl = async (sel, textRe) => {
  const pt = await ev((sel, src) => { const re = src ? new RegExp(src) : null; const e = [...document.querySelectorAll(sel)].find((x) => !re || re.test(x.textContent)); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel, textRe ? textRe.source : null);
  if (!pt) return false; await sleep(250); await P.touchscreen.tap(pt.x, pt.y); await sleep(450); return true;
};
try {
  await open(ctx, { settle: 1400 });
  /* ---------- the info content: every part of every muscle explains itself ---------- */
  const inf = await ev(() => { const miss = []; Object.keys(SUBG).forEach((m) => SUBG[m].forEach(([id]) => { const x = (PART_INFO[m] || {})[id]; if (!x || !x[0] || !x[1]) miss.push(m + '.' + id); })); return miss; });
  ok('every muscle part has an info text: what it does + how to hit it', !inf.length, inf);
  /* ---------- create: brand + name, parts with main / assist ---------- */
  const mk = await ev(() => {
    openPicker(); openCustomCreator('');
    const brands = [...document.querySelectorAll('#sheet .cx-chips .chip')].map((b) => b.textContent.trim());
    cxSetBrand('Panatta'); document.getElementById('cx-name').value = 'Chest Press'; cxLive();
    const saved = document.getElementById('cx-full').textContent;
    cxPart('chest', 'up'); cxPart('chest', 'mid'); cxPart('shoulders', 'front'); cxPart('shoulders', 'front'); cxPart('triceps', 'lat'); cxPart('triceps', 'lat');
    const badges = [...document.querySelectorAll('#sheet .cx-pc')].filter((b) => b.classList.contains('on')).map((b) => b.firstChild.textContent.trim() + ' ' + b.querySelector('i').textContent.trim());
    cxPart('chest', 'lo'); cxPart('chest', 'lo'); cxPart('chest', 'lo');   // main -> assist -> off
    saveCustomEx();
    const ex = exFor('Panatta Chest Press');
    return { brands, saved, badges, ex: { n: ex.n, br: ex.br, p: ex.p, s: ex.s, sub: ex.sub, subA: ex.subA || null, custom: ex.custom } };
  });
  ok('the brand row offers your gyms\' brands, None and Other', ['None', 'Panatta', 'Hammer Strength', 'Cybex', 'Other'].every((b) => mk.brands.includes(b)), mk.brands);
  ok('brand + name compose the lift\'s name ("Saved as …")', /Panatta Chest Press/.test(mk.saved), mk.saved);
  ok('a tap marks a part Main, a second tap Assist, a third clears it', mk.badges.join('|') === 'Upper pec Main|Mid pec Main|Front delt Assist|Lateral head Assist', mk.badges);
  ok('saved with its brand, muscles from the parts (main -> primary, assist only -> secondary) and every part', mk.ex.n === 'Panatta Chest Press' && mk.ex.br === 'Panatta' && mk.ex.p.join() === 'chest' && mk.ex.s.join() === 'shoulders,triceps' && JSON.stringify(mk.ex.sub) === '{"chest":["up","mid"],"shoulders":["front"],"triceps":["lat"]}' && !mk.ex.subA && mk.ex.custom, mk.ex);
  const pk = await ev(() => { openPicker(); pickMuscle('chest'); const t = document.getElementById('ex-list').textContent; closeSheet(); return { gym: activeGymName(), brands: gymBrands(), shown: /Panatta Chest Press/.test(t) }; });
  ok('your own brand lift shows in the chest list even at a gym without that brand', pk.shown && !pk.brands.includes('Panatta'), pk);
  const oth = await ev(() => { openPicker(); openCustomCreator(''); cxSetBrand('__other'); const i = document.getElementById('cx-br'); i.value = 'Gym80'; cxLive(); document.getElementById('cx-name').value = 'Lat Row'; cxPart('back', 'mid'); saveCustomEx(); openPicker(); openCustomCreator(''); const has = [...document.querySelectorAll('#sheet .cx-chips .chip')].some((b) => b.textContent.trim() === 'Gym80'); closeSheet(); return { ex: exFor('Gym80 Lat Row').br, has }; });
  ok('a typed brand ("Other") is saved and offered next time', oth.ex === 'Gym80' && oth.has, oth);
  const card = await ev(() => { openPicker(); openCustomCreator(''); const t = (m, id) => { cxInfo(m, id); const c = document.querySelector('#sheet .cx-ic'); return c ? c.textContent : ''; }; const r = { tl: t('triceps', 'long'), tla: t('triceps', 'lat'), ul: t('back', 'ulat'), ll: t('back', 'llat') }; cxInfo('back', 'llat'); r.closed = !document.querySelector('#sheet .cx-ic'); closeSheet(); return r; });
  ok('the info card explains each part (triceps: elbow moving overhead vs elbow still; lats: wide vs close grip) and closes again',
    /overhead/i.test(card.tl) && /Elbow still/i.test(card.tla) && /Wide grip/i.test(card.ul) && /Close or neutral grip/i.test(card.ll) && card.closed, card);
  /* ---------- edit a built-in lift: parts change, the name (and so the history) stays ---------- */
  const e0 = await ev((LP) => { const ex = exFor(LP); return { id: ex.id, rows: exerciseRows(LP).length, back: exSub(ex, 'back') }; }, LP);
  const e1 = await ev((LP) => {
    openExEditor(LP, 'detail');
    const fixedName = !document.getElementById('cx-name') && /Lat Pulldown \(Wide Grip\)/.test(document.querySelector('#sheet .cx-fixed').textContent);
    const d = state.cxDraft; const pre = JSON.stringify(d.parts.back || {});
    // back: upper lats main, lower lats main, mid-back assist; rear delt assist
    d.parts = { ...d.parts, back: { ulat: 'main', llat: 'main', mid: 'assist' }, shoulders: { rear: 'assist' } }; renderCustomCreator();
    saveCustomEx();
    const ex = exFor(LP);
    return { fixedName, pre, n: ex.n, sub: ex.sub.back, subA: (ex.subA || {}).back, s: ex.s, edited: !!(state.data.exEdits || {})[ex.id], rows: exerciseRows(LP).length, sheet: !!document.querySelector('#sheet.on .p3-xd'), tgt: exTarget(ex) };
  }, LP);
  ok('editing keeps the name fixed and shows it', e1.fixedName, e1);
  ok('the edit saves the parts on the built-in lift (upper + lower lats main, mid-back assist, rear delt assist)', e1.n === LP && e1.sub.join() === 'ulat,llat,mid' && (e1.subA || []).join() === 'mid' && e1.s.includes('shoulders') && e1.edited, e1);
  ok('its history is untouched and Save returns to its page', e1.rows === e0.rows && e1.sheet, { e0, e1 });
  ok('its "what it trains" label now follows your parts', /Upper lats & Lower lats & Mid-back/.test(e1.tgt), e1.tgt);
  // assist parts count half: one fresh session with 3 working sets
  const w = await ev((LP) => {
    const before = subSetCounts('back');
    state.data.workouts.unshift({ id: 'qa-cx', date: new Date(now() - 3600e3).toISOString(), name: 'QA', gym: activeGymName(), totalVol: 1, exercises: [{ name: LP, sets: [1, 2, 3].map(() => ({ w: '60', r: '10', type: 'NRM', done: true })) }] }); save();
    const after = subSetCounts('back'); state.data.workouts.shift(); save();
    return { ul: after.ulat - before.ulat, mid: after.mid - before.mid };
  }, LP);
  ok('an assist part counts half of a main part in the per-part weekly sets', w.ul > 0 && Math.abs(w.mid - w.ul / 2) < 0.06, w);
  const und = await ev((LP) => { const u = document.querySelector('#toast .tundo'); if (u) u.click(); return { edited: !!(state.data.exEdits || {})[exFor(LP).id], back: exSub(exFor(LP), 'back') }; }, LP);
  ok('Undo puts the original parts back', !und.edited && und.back.join() === e0.back.join(), { und, e0 });
  const rs = await ev((LP) => {
    openExEditor(LP); state.cxDraft.parts = { back: { llat: 'main' } }; saveCustomEx();
    openExEditor(LP); const btn = [...document.querySelectorAll('#sheet .cx-foot .btn')].some((b) => /Back to the original/.test(b.textContent));
    cxResetEx(); return { btn, edited: !!(state.data.exEdits || {})[exFor(LP).id], back: exSub(exFor(LP), 'back') };
  }, LP);
  ok('"Back to the original" drops your edit', rs.btn && !rs.edited && rs.back.join() === e0.back.join(), { rs, e0 });
  const br = await ev((LP) => { openExEditor(LP); cxSetBrand('__other'); document.getElementById('cx-br').value = 'Gym80'; cxLive(); saveCustomEx(); const ex = exFor(LP); openPicker(); pickMuscle('back'); const shown = document.getElementById('ex-list').textContent.includes(LP); closeSheet(); return { br: ex.br, shown, n: ex.n }; }, LP);
  ok('a brand set on a built-in lift sticks and never hides it from the list', br.br === 'Gym80' && br.shown && br.n === LP, br);
  /* ---------- a custom lift is edited in place ---------- */
  const ce = await ev(() => { const id = exFor('Gym80 Lat Row').id; openExEditor('Gym80 Lat Row'); state.cxDraft.parts = { back: { mid: 'main', ulat: 'assist' }, traps: { mid: 'assist' } }; saveCustomEx(); const e = state.data.customEx.find((x) => x.id === id); return { n: e.n, sub: e.sub, subA: e.subA, s: e.s, br: e.br, count: state.data.customEx.filter((x) => x.id === id).length }; });
  ok('editing a custom lift rewrites it in place (same lift, new parts)', ce.n === 'Gym80 Lat Row' && ce.count === 1 && ce.sub.back.join() === 'ulat,mid' && ce.subA.back.join() === 'ulat' && ce.s.join() === 'traps' && ce.br === 'Gym80', ce);
  /* ---------- bad saved data never breaks the library ---------- */
  const bad = await ev((LP) => { const id = exFor(LP).id; const keep = state.data.exEdits; let err = null;
    try { state.data.exEdits = { [id]: { p: ['nope'], sub: { back: ['zz'], fake: ['x'] }, br: 5, eq: 7 } }; rebuildExDB(); } catch (e) { err = String(e); }
    const ex = exFor(LP), r1 = { p: ex.p, back: exSub(ex, 'back'), br: ex.br || null };
    try { state.data.exEdits = []; rebuildExDB(); } catch (e) { err = String(e); }
    state.data.exEdits = keep; rebuildExDB(); return { err, r1 }; }, LP);
  ok('corrupt edits are ignored field by field (no error, the lift keeps its own muscles, a non-text brand is dropped)', !bad.err && bad.r1.p.join() === 'back' && bad.r1.back.length > 0 && bad.r1.br === null, bad);
  /* ---------- entry points (real taps) ---------- */
  await ev((LP) => { closeSheet(); openExDetail(LP); }, LP); await sleep(400);
  const t1 = await tapEl('#sheet .gh-row', /Edit exercise/);
  const s1 = await ev(() => ({ open: /Edit exercise/.test((document.querySelector('#sheet .sh-hd') || document.getElementById('sheet')).textContent), name: (state.cxDraft || {}).n }));
  ok('the exercise page has an "Edit exercise" row that opens the editor', t1 && s1.open && s1.name === LP, { t1, s1 });
  await ev(() => closeCustomCreator()); await sleep(300);
  const back = await ev(() => !!document.querySelector('#sheet.on .p3-xd'));
  ok('Back from the editor returns to the exercise page', back, back);
  await ev((LP) => { closeSheet(); __qa.startLogging(0); const ei = state.session.exercises.findIndex((e) => e.name === LP); lgExMenu(ei); }, LP); await sleep(300);
  const t2 = await tapEl('#sheet .lg2-mi', /Edit exercise/);
  const s2 = await ev(() => ({ draft: !!state.cxDraft, from: (state.cxDraft || {}).from }));
  ok('the workout ⋯ menu has "Edit exercise" too', t2 && s2.draft && s2.from === 'session', { t2, s2 });
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
