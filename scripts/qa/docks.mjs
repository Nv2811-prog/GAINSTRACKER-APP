import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
// The feature docks: on every tab that has one (mission, suit, case, allies) tap EVERY tile with a real touch and check that it opens its feature
// (a sheet, a sub-page, or a smooth scroll to the section it names), that it throws nothing, and that the row itself is sound
// (tiles >= 112 x 44 px, label + live sub on each, nothing wider than the phone, no .hx haptic overlay / data-hx inside the row).
// node docks.mjs [--width 393] [--tab mission|suit|case|allies] [--file html]      exit 1 on any failure
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const TABS = A.tab ? [A.tab] : ['mission', 'suit', 'case', 'allies'];
const SEED = fs.readFileSync(fx('./seed-allies.js'), 'utf8');
const MIN_W = 112, MIN_H = 44;
const results = []; let failed = false;
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fx('./fixture-train.json'), width: A.width || null });
const P = ctx.page;
const reset = (snap, tab) => P.evaluate((snap, tab) => {
  try { closeSheet(); } catch (e) {} try { closeOverlay(); } catch (e) {} try { _closeModal(); } catch (e) {} try { stopTimers(); } catch (e) {}
  state.session = null; state.step = null; state.subpage = null; state.minimized = false; state.showOnboarding = false; state.tab = tab;
  state.data = JSON.parse(snap); try { __qa.clear(); } catch (e) {} render(); window.scrollTo(0, 0);
}, snap, tab);
try {
  await open(ctx, { settle: 1500 });
  await P.evaluate(SEED);
  const snap = await P.evaluate(() => JSON.stringify(state.data));
  for (const tab of TABS) {
    await reset(snap, tab); await sleep(350);
    const dock = await P.evaluate(() => {
      const d = document.querySelector('.gd'); if (!d) return null;
      return {
        tiles: [...d.querySelectorAll('.gd-t')].map((t) => { const r = t.getBoundingClientRect(); return { name: t.querySelector('.gd-t1').textContent, sub: t.querySelector('.gd-t2').textContent, fn: t.getAttribute('onclick'), w: Math.round(r.width), h: Math.round(r.height), icon: !!t.querySelector('.gd-i svg') }; }),
        scrolls: d.scrollWidth > d.clientWidth, hx: d.querySelectorAll('.hx,[data-hx]').length,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        gapToHero: Math.round(d.getBoundingClientRect().top - (d.previousElementSibling ? d.previousElementSibling.getBoundingClientRect().bottom : 0))
      };
    });
    const res = { tab, ok: true, problems: [], tiles: [] };
    if (!dock) { res.ok = false; res.problems.push('no dock on this tab'); results.push(res); failed = true; continue; }
    dock.tiles.forEach((t) => { if (t.w < MIN_W || t.h < MIN_H) res.problems.push(`${t.name}: ${t.w}x${t.h} is under ${MIN_W}x${MIN_H}`); if (!t.sub || !t.name || !t.icon) res.problems.push(`${t.name || '?'}: missing label, sub or icon`); });
    if (dock.hx) res.problems.push(`${dock.hx} haptic overlay hosts inside the dock`);
    if (dock.pageOverflow) res.problems.push('page scrolls horizontally');
    if (dock.tiles.length > 3 && !dock.scrolls) res.problems.push('4+ tiles but the row does not scroll');
    for (let i = 0; i < dock.tiles.length; i++) {
      await reset(snap, tab); await sleep(250);
      const before = ctx.log.errors.length;
      await P.evaluate((i) => document.querySelectorAll('.gd .gd-t')[i].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }), i); await sleep(450);
      const pt = await P.evaluate((i) => { const el = document.querySelectorAll('.gd .gd-t')[i], r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; return { x, y, y0: window.scrollY, hit: (document.elementFromPoint(x, y) || document.body).closest('.gd-t') === el }; }, i);
      if (!pt.hit) res.problems.push(`${dock.tiles[i].name}: its centre is not hittable (covered or off screen)`);
      await P.touchscreen.tap(pt.x, pt.y); await sleep(900);
      const eff = await P.evaluate(() => ({ sheet: !!document.getElementById('sheet').classList.contains('on'), overlay: !!(document.getElementById('overlay') || { classList: { contains: () => false } }).classList.contains('on'), sub: state.subpage || null, y: Math.round(window.scrollY) }));
      const kind = eff.sheet ? 'sheet' : eff.overlay ? 'overlay' : eff.sub ? 'page:' + eff.sub : Math.abs(eff.y - pt.y0) > 40 ? 'scroll' : 'NOTHING';
      const errs = ctx.log.errors.slice(before);
      const t = dock.tiles[i];
      res.tiles.push({ tile: t.name, sub: t.sub, w: t.w, opens: kind, errors: errs.length });
      if (kind === 'NOTHING') res.problems.push(`${t.name}: the tap opened nothing (${t.fn})`);
      if (errs.length) res.problems.push(`${t.name}: ${errs[0].slice(0, 120)}`);
    }
    res.ok = !res.problems.length; if (!res.ok) failed = true; results.push(res);
  }
} catch (e) { failed = true; results.push({ fatal: String(e && e.stack || e).slice(0, 400) }); }
console.log(JSON.stringify({ width: A.width || 393, results, pageErrors: ctx.log.errors.length, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
