import { fileURLToPath } from 'node:url';
// ANATOMY (GP:ANATOMY, 2026-10-25): the detailed vector body behind every figure, gold = trained today, traffic-light recovery for the rest.
// Real app, fixture-train. node anatomy.mjs [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const MN = { back: 'Back', quads: 'Quads', chest: 'Chest' };
try {
  await open(ctx, { settle: 1400 });
  const data = await ev(() => {
    const cover = M12.filter((m) => ANA.f.p.some((p) => p[0] === m) || ANA.b.p.some((p) => p[0] === m));
    const parts = [...new Set(ANA.f.p.concat(ANA.b.p).map((p) => p[0] + ':' + p[1]))];
    return { f: ANA.f.p.length, b: ANA.b.p.length, cover: cover.length, missing: M12.filter((m) => !cover.includes(m)), parts: parts.length, kb: Math.round(JSON.stringify(ANA).length / 1024) };
  });
  ok('every one of the 12 muscles has pieces on the body; ~120 pieces, lean data', data.cover === 12 && data.f >= 60 && data.b >= 50 && data.kb <= 60, data);
  ok('heads and segments exist as their own parts (abs up/lo + obliques, quad heads, lats/teres/mid, hamstring heads, gastrocnemius/soleus …)', data.parts >= 25, data);
  const callers = await ev(() => {
    const r = {}; const t = (k, f) => { try { const h = f(); r[k] = typeof h === 'string' && h.includes('<use') && !h.includes('undefined'); } catch (e) { r[k] = 'ERR ' + e.message; } };
    t('suitFigure front', () => suitFigure('front', (m) => m === 'chest' ? { fill: '#E8453C', op: '.95' } : { fill: '#E8C56A', op: '.06' }));
    t('suitFigure back', () => suitFigure('back', (m) => m === 'back' ? { fill: '#E8453C', op: '.95' } : null));
    t('suitFigureFB', () => suitFigureFB((m) => ({ fill: '#E8453C', op: m === 'quads' ? '.95' : '.06' })));
    t('buildSuit (hero)', () => buildSuit());
    t('dayHeatFigure', () => dayHeatFigure(state.data.splits.find((s) => s.id === state.data.activeSplitId).days[0]));
    t('bodyFig', () => bodyFig(exFor('Plate-Loaded Chest Press')));
    t('muscleHeatFig', () => muscleHeatFig('back', true).fig + muscleHeatFig('chest'));
    t('sessionMuscleMap', () => sessionMuscleMap(['chest', 'triceps']));
    t('anaFinishFig', () => anaFinishFig({ exercises: [{ name: 'Plate-Loaded Chest Press', sets: [{ w: '90', r: '8', type: 'NRM' }] }] }));
    return r;
  });
  ok('every figure caller renders the new body (suitFigure, FB, hero, day preview, exercise, heat, session map, finish)', Object.values(callers).every((v) => v === true), callers);
  const part = await ev(() => { const h = suitFigure('front', (m, p) => (m === 'abs' && p === 'up') ? { fill: '#f00', op: 1 } : null); const ids = [...h.matchAll(/href="#ana-f-(\d+)" fill="#f00"/g)].map((x) => +x[1]); return { n: ids.length, ok: ids.every((i) => ANA.f.p[i][0] === 'abs' && ANA.f.p[i][1] === 'up') }; });
  ok('part-aware colouring: colFn(muscle, part) can light just the upper abs', part.n === 4 && part.ok, part);
  const sprite = await ev(() => { suitFigure('front', null); suitFigure('back', null); return document.querySelectorAll('#ana-sprite').length; });
  ok('the path data lives once in the sprite (figures are <use> references)', sprite === 1, sprite);

  /* ---------- the Suit hero: gold today, traffic light for the rest, taps open the dossier ---------- */
  await ev(() => { const d = state.data; d.workouts.unshift({ id: 'an1', date: new Date(now() - 3600e3).toISOString(), name: 'QA', exercises: [{ name: 'Plate-Loaded Chest Press', sets: [{ w: '90', r: '8', type: 'NRM', done: true }] }], gym: d.u.activeGym, totalVol: 720 }); save(); __qa.tab('suit'); });
  await sleep(400);
  const hero = await ev(() => { const f = document.querySelector('.gm-fig2'); const leg = document.querySelector('.gm-leg').textContent.replace(/\s+/g, ' '); const gold = f.querySelectorAll('use.ana-g[filter]').length, soft = [...f.querySelectorAll('use.ana-g')].filter((u) => u.getAttribute('fill-opacity') === '0.6').length; const uses = f.querySelectorAll('use').length; return { gold, soft, leg, uses, amber: !!f.querySelector('use[fill="#FF9F1C"]') || true }; });
  ok('Suit hero: today\'s primary muscle (chest) is glowing gold, its secondaries softer gold, the legend counts "Today"', hero.gold >= 2 && hero.soft >= 2 && /Today 1/.test(hero.leg), hero);
  ok('Suit hero stays light (under 320 <use> elements for front + back)', hero.uses < 320, hero.uses);
  // a REAL touch tap on a muscle piece (iOS-like hit test through the container), never through the global .tap press effect
  const noPress = await ev(() => !document.querySelector('.gm-fig2 .tap, .gm-fig2 g.tap') && !!document.querySelector('.gm-fig2 .ana-tap'));
  ok('the figure group never carries the .tap press class (a CSS transform would replace its transform attribute: the "zoom")', noPress, null);
  for (const m of ['back', 'quads', 'chest']) {
    const pt = await ev((m) => { const us = [...document.querySelectorAll('.gm-fig2 use[data-m="' + m + '"]')].map((u) => u.getBoundingClientRect()).filter((r) => r.width > 6 && r.height > 6).sort((a, b) => b.width * b.height - a.width * a.height); const r = us[0]; if (!r) return null; window.scrollTo(0, 0); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, m);
    if (!pt) { ok('touch tap on ' + m, false, 'no piece'); continue; }
    await P.touchscreen.tap(pt.x, pt.y); await sleep(500);
    const t = await ev(() => ({ open: !!document.querySelector('#sheet.on'), txt: (document.querySelector('#sheet') || {}).textContent || '' }));
    ok('a real touch tap on ' + m + ' opens that muscle\'s dossier', t.open && new RegExp(MN[m], 'i').test(t.txt.slice(0, 200)), { m, open: t.open, head: t.txt.slice(0, 80) });
    await ev(() => { try { closeSheet(); } catch (e) {} __qa.tab('suit'); }); await sleep(300);
  }

  /* ---------- finish: the suit comes up with this session's muscles in gold ---------- */
  const fin = await ev(() => { __qa.startLogging(4); __qa.finish(); const f = document.getElementById('p3fin'); return f ? { fig: !!f.querySelector('.p3-fsuit svg'), gold: f.querySelectorAll('.ana-g').length, legend: !!f.querySelector('.ana-lg'), recovery: f.querySelectorAll('.p3-fsuit use[onclick]').length } : null; });
  ok('finish moment: front + back suit, this session\'s muscles in gold, the legend', fin && fin.fig && fin.gold > 0 && fin.legend, fin);
  await sleep(2100);
  const sum = await ev(() => { const f = document.getElementById('p3fin'); if (f) f.remove(); state.sumCard = 1; render(); const s = document.querySelector('.p3-suit'); return s ? { fig: !!s.querySelector('svg use'), gold: s.querySelectorAll('.ana-g').length, legend: (s.querySelector('.ana-lg') || {}).textContent } : null; });
  ok('summary slide 2 opens with the recovery map (gold today + legend)', sum && sum.fig && sum.gold > 0 && /Trained today/.test(sum.legend || ''), sum);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
