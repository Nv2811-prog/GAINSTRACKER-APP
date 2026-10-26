import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// Screen audit (quality pass): opens EVERY tab, page, sub-page, sheet and the live-session screens through the app's own functions, at one phone width,
// and checks each one for the things a real thumb notices:
//   pageX / sticksOut   nothing wider than the phone (page level, or any element that is not inside its own scroller)
//   clipped             text cut off inside buttons, chips, tags and headings (ellipsis is allowed only on .gh-t1 / .nm row titles)
//   wrapped             a header, tag, chip or button label that wraps onto a second line
//   unlabeled           a tappable with no text, aria-label or title (icon-only, or a bare glyph such as "-" or a chevron)
//   tiny                a tappable under 28 px with no 32 px hit area behind it
//   opens / threw       the surface did not open, or opening it threw
//   errors              anything printed to the console while the screen opened
//   strands             a sheet that a tap on the backdrop does not close; a sub-page without a Back button and a visible tab bar
// plus the one-thing-once rules of the quality pass (the suit figure only on the Suit tab, Home shows the volume exceptions only, no second Hydration, ...).
// Static first: every inline handler in the source must call a function that exists (a dead tap is a ReferenceError waiting for a finger).
// node layout.mjs [--width 393|375] [--fixture train|rest|none|live] [--only <substring>] [--shots dir] [--file html]     exit 1 on any problem
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { const nx = av[i + 1]; if (nx === undefined || nx.startsWith('--')) A[av[i].slice(2)] = true; else { A[av[i].slice(2)] = nx; i++; } }
const fx = (n) => fileURLToPath(new URL(n, import.meta.url));
const FILE = A.file || DEFAULT_FILE, WIDTH = A.width || '393';
const FIXTURES = A.fixture ? [A.fixture] : ['train', 'rest', 'none', 'live'];
const SEED = fs.readFileSync(fx('./seed-allies.js'), 'utf8');
const problemsAll = []; let surfaces = 0;

// ---------- static: dead handlers ----------
function deadHandlers() {
  const src = fs.readFileSync(FILE, 'utf8'), decl = new Set(), miss = new Map();
  for (const m of src.matchAll(/(?:^|[\s;{}(])(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g)) decl.add(m[1]);
  for (const m of src.matchAll(/(?:^|[\s;{}])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) decl.add(m[1]);
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) decl.add(m[1]);
  const OK = new Set(['event', 'this', 'if', 'return', 'typeof', 'void', 'new', 'function', 'setTimeout', 'Math', 'JSON', 'document', 'window', 'state', 'parseInt', 'parseFloat', 'String', 'Number', 'Object', 'Array', 'navigator', 'location', 'history', 'console', 'Date', 'Promise', 'Boolean', 'encodeURIComponent', 'decodeURIComponent', 'isNaN', 'else', 'for', 'while', 'do', 'try', 'catch', 'switch', 'case', 'break', 'continue', 'throw', 'delete', 'in', 'of', 'requestAnimationFrame', 'clearTimeout', 'setInterval', 'clearInterval', 'Event']);
  const re = /\bon(?:click|input|change|keydown|keyup|submit|touchstart|touchend|pointerdown|focus|blur)=\s*(?:"([^"]*)"|'([^']*)')/g;
  let n = 0;
  for (const m of src.matchAll(re)) {
    n++;
    const bare = (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, '0').replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/`[^`]*`/g, '``');
    for (const c of bare.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) if (!OK.has(c[2]) && !decl.has(c[2])) { if (!miss.has(c[2])) miss.set(c[2], src.slice(0, m.index).split('\n').length); }
  }
  return { n, miss: [...miss].map(([k, l]) => `${k} (line ${l})`) };
}

// ---------- surfaces ----------
const SHEET = 'sheet', OVERLAY = 'overlay', TAB = 'tab', SUB = 'sub';
const COMMON = [
  ['tab gotham', "__qa.tab('gotham')", TAB], ['tab mission', "__qa.tab('mission')", TAB], ['tab suit', "__qa.tab('suit')", TAB], ['tab case', "__qa.tab('case')", TAB], ['tab allies', "__qa.tab('allies')", TAB],
  ['page alfred', "__qa.tab('alfred')", TAB], ['page fuel', "__qa.tab('fuel')", TAB],
  ['sub lab', "state.subpage='lab';render()", SUB], ['sub infirmary', "state.subpage='infirmary';render()", SUB], ['sub garage', "state.subpage='garage';render()", SUB], ['sub archive', "state.subpage='archive';render()", SUB],
  ['sheet search', 'openIndex()', SHEET], ['sheet settings', 'openSettings()', SHEET], ['sheet data control', 'openDataControl()', SHEET], ['sheet plan editor', 'openSplitSheet()', SHEET], ['sheet time-lapse', 'openMastery()', SHEET],
  ['sheet day briefing', 'openDayBriefing(state.data.activeSplitId,0)', SHEET], ['sheet dossier', "muscleDrill('chest')", SHEET], ['sheet exercise', "openExDetail('Bench Press (Barbell)')", SHEET],
  ['sheet effort', 'openRirDossier()', SHEET], ['sheet stalled', 'openStalledLifts()', SHEET], ['sheet batcomputer', 'openBatcomputer()', SHEET], ['sheet forge', 'openForge()', SHEET],
  ['sheet measure', 'openMeasure()', SHEET], ['sheet week review', 'openCaveReview()', SHEET], ['sheet gyms', 'openGyms()', SHEET], ['sheet tips', 'openTips()', SHEET], ['sheet sleep', 'openSleepLog()', SHEET],
  ['sheet split exchange', 'openSplitExchange()', SHEET], ['sheet leaderboard', 'openLeaderboard()', SHEET], ['sheet manage allies', 'openJusticeLeague()', SHEET], ['sheet ally', 'openAllySheet(0)', SHEET, 'allies'],
  ['sheet oracle', 'openOracle()', SHEET], ['sheet trophy room', 'openTrophyRoom()', SHEET], ['sheet contracts', 'openContracts()', SHEET], ['sheet simulator', 'openSimulator()', SHEET], ['sheet focus', 'openFocus()', SHEET],
  ['sheet plate calculator', 'openPlateSheet(-1)', SHEET], ['sheet 1RM test day', 'openTestDay()', SHEET],
  ['sheet add exercise', 'openPicker()', SHEET], ['sheet add exercise, no match', "openPicker();document.getElementById('ex-search').value='zzq';updateExList()", SHEET],
  ['sheet custom exercise', "openPicker();openCustomCreator('Cable Y Raise')", SHEET], ['sheet edit exercise', "openExEditor('Lat Pulldown (Wide Grip)')", SHEET],
  ['sheet edit exercise + part info', "openExEditor('Lat Pulldown (Wide Grip)');cxInfo('triceps','long')", SHEET], ['sheet picture picker', "openPicPicker('Bench Press (Barbell)','x')", SHEET],
  ['sheet rank ladder', 'openRankLadder()', OVERLAY],
  ['overlay alfred chat', 'openAlfredChat()', OVERLAY]
];
const LIVE = [
  ['step readiness', '(()=>{const {sp,i}=__qa.nextDay();startWorkout(sp.id,i);})()', 'step'], ['step logging', '__qa.startLogging(2)', 'step'],
  ['step logging + exercise sheet', '__qa.startLogging(2);openExDetail(state.session.exercises[0].name)', SHEET], ['step logging + plate sheet', '__qa.startLogging(1);openPlateSheet(0)', SHEET], ['step logging + warm-up ramp sheet', '__qa.startLogging(1);openRamp(0)', SHEET],
  ['step logging + swap sheet', '__qa.startLogging(2);openSwap(0)', SHEET], ['step logging + running order sheet', '__qa.startLogging(2);openReorder()', SHEET], ['step logging + skip sheet', '__qa.startLogging(2);openSkipEx(0)', SHEET],
  ['home with a live session', "__qa.startLogging(2);state.minimized=true;state.step=null;go('gotham')", TAB], ['mission with a live session', "__qa.startLogging(2);state.minimized=true;state.step=null;go('mission')", TAB],
  ['step summary', '__qa.startLogging(3);__qa.finish()', 'step']
];

// ---------- the in-page audit ----------
function audit(rootSel) {
  const root = document.querySelector(rootSel); if (!root) return { err: 'no root ' + rootSel };
  const W = window.innerWidth;
  const o = { pageX: document.documentElement.scrollWidth > W + 1, sticksOut: [], clipped: [], wrapped: [], unlabeled: [], tiny: [], dupHeads: [], n: 0 };
  const cls = (e) => (typeof e.className === 'string' ? e.className : '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
  const tx = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const nm = (e) => `${e.tagName.toLowerCase()}${cls(e) ? '.' + cls(e) : ''} "${tx(e).slice(0, 24)}"`;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const clippedByAncestor = (e) => { for (let p = e.parentElement; p && p !== root && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true; return false; };
  const push = (arr, v, max = 6) => { if (arr.length < max) arr.push(v); };
  const all = [...root.querySelectorAll('*')].filter((e) => !(e.closest('svg') && e.tagName.toLowerCase() !== 'svg') && vis(e));
  o.n = all.length;
  for (const e of all) {
    const r = e.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !clippedByAncestor(e) && getComputedStyle(e).position !== 'fixed') push(o.sticksOut, `${nm(e)} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  // clipped text
  const CTRL = 'button,.btn,.chip,.tag,.gh-more,h1,h2,h3,.gd-t1,.eyebrow,.gh-chip,.tbtn';
  root.querySelectorAll(CTRL + ',.gh-t2,.gh-title').forEach((e) => {
    if (!vis(e) || e.closest('svg') || e.classList.contains('hx')) return;
    const cs = getComputedStyle(e), cut = e.scrollWidth > e.clientWidth + 1 && cs.overflowX !== 'visible';
    if (!cut) return;
    const ell = cs.textOverflow === 'ellipsis', ctrl = e.matches(CTRL);
    if (!ell || ctrl) push(o.clipped, `${nm(e)} ${e.scrollWidth}>${e.clientWidth}`);
  });
  // wrapped labels
  const lines = (e) => { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let lo = 1e9, hi = -1e9, n; while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) { if (r.width < 1) continue; lo = Math.min(lo, r.top); hi = Math.max(hi, r.top); } } const fs = parseFloat(getComputedStyle(e).fontSize) || 14; return hi - lo > fs * 0.8 ? 2 : 1; };
  root.querySelectorAll('h1,h2,h3,.eyebrow,.tag,.chip,.gh-more,.gd-t1,.gd-t2,.btn,.btn-1,.gh-chip,.tbtn,.gh-lh .t-xs,.gh-sec .t-xs').forEach((e) => {
    if (!vis(e) || e.closest('svg') || e.closest('.wk-act') || e.classList.contains('hx')) return;
    if (e.matches('.gh-title,.af-title')) return;                                             // hero titles are two lines by design
    if (e.matches('h2,h3') && !e.closest('.gh-sec,.gh-lh,.st-h,.sp-hd,.p3-ch,.p3-ch2')) return;   // a long exercise or plan name heading may wrap; section and card headers never
    if (lines(e) > 1) push(o.wrapped, nm(e));
  });
  // duplicate section headers on one screen
  const seen = new Map();
  root.querySelectorAll('.gh-sec h2,.gh-lh h3,.p3-ch2 h3').forEach((e) => { if (!vis(e)) return; const t = tx(e).toLowerCase(); seen.set(t, (seen.get(t) || 0) + 1); });
  seen.forEach((n, t) => { if (n > 1) o.dupHeads.push(t + ' x' + n); });
  // tappables: labelled, big enough
  root.querySelectorAll('button,[onclick],[role="button"],a[href]').forEach((e) => {
    if (!vis(e) || e.closest('svg') || e.classList.contains('hx') || e.classList.contains('ovbg') || e.id === 'sheetbg' || e.tagName.toLowerCase() === 'svg') return;   // backdrops dismiss, they are not controls
    const r = e.getBoundingClientRect(), t = tx(e), lab = (e.getAttribute('aria-label') || e.getAttribute('title') || '').trim(), alt = [...e.querySelectorAll('img[alt]')].map((i) => i.alt).join('').trim();
    const glyph = !lab && /^[\s\-−+×✕‹›<>▶▲▼•·…]{1,3}$/.test(t);
    if ((!t && !lab && !alt) || glyph) push(o.unlabeled, `${nm(e)} ${(e.getAttribute('onclick') || '').slice(0, 28)}`, 8);
    if (Math.min(r.width, r.height) < 28) {
      e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r2 = e.getBoundingClientRect(), cx = r2.left + r2.width / 2, cy = r2.top + r2.height / 2, pr = r2.height <= r2.width ? [[cx, cy - 16], [cx, cy + 16]] : [[cx - 16, cy], [cx + 16, cy]];
      const okHit = pr.every(([x, y]) => { if (x < 0 || y < 0 || x > W || y > window.innerHeight) return true; const h = document.elementFromPoint(x, y); return !h || h === e || e.contains(h); });
      if (!okHit) push(o.tiny, `${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  return o;
}

// ---------- one-thing-once rules (each returns a list of problems for the surface just opened) ----------
function rules(name, kind) {
  const q = (s) => [...document.querySelectorAll(s)], bad = [];
  const heads = (sc) => q(sc).map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim());
  const figs = q('.gm-fig2').length;
  if (name === 'tab suit' && figs !== 1) bad.push('the Suit tab must show exactly one suit figure, found ' + figs);
  if (name !== 'tab suit' && !/day briefing/.test(name) && figs) bad.push('a second suit figure (.gm-fig2) outside the Suit tab, found ' + figs);
  if (name === 'tab gotham') {
    const tiles = q('.gh-mgrid .gh-mt').length, mall = q('.gh-mall').length;
    if (tiles > 6) bad.push('Home shows ' + tiles + ' muscle tiles: it shows the exceptions only, the full map is the Suit grid');
    if (!mall && (state.data.workouts || []).length) bad.push('Home has no "All muscles" link to the Suit grid');
    if (q('.gh-sun-l li').length > 1) bad.push('Sunday card repeats records / stalled lifts that the Lifts card shows');
  }
  if (name === 'tab mission' && q('.gm-freq,.gm-fq').length) bad.push('Mission still has the Frequency card');
  if (name === 'page alfred' && q('.af-dos,.af-chips').length) bad.push('Alfred page still has the 12 dossier chips');
  if (name === 'page fuel') {
    if (heads('.fu-stack .gh-t1').some((t) => /hydration/i.test(t))) bad.push('Fuel tracks Hydration twice (Hydration card + Daily stack)');
    if (!q('.sp-hd .btn-i').length) bad.push('Fuel has no Back button');
  }
  if (name === 'sub lab') {
    const rows = heads('.gh-list .gh-t1');
    if (rows.some((t) => /1RM calculator|^Measure$/i.test(t))) bad.push('Lab still lists the 1RM calculator / Measure (Forge covers 1RM, Suit owns measurements)');
    if (!rows.includes('Forge') || !rows.includes('Oracle')) bad.push('Lab tools are missing Forge or Oracle');
    if (q('.gm-lab .gm-fig2,.gm-lab .gm-mastery').length) bad.push('Lab shows a suit figure');
  }
  if (name === 'tab suit') {
    const t = heads('.gd .gd-t1'); if (!t.includes('Fuel')) bad.push('Suit dock has no Fuel tile');
    if (heads('.gh-sec h2').includes('Body')) bad.push('Suit still has a "Body" header (Profile owns Body; Suit shows Measurements)');
  }
  if (kind === 'sheet' || kind === 'overlay') {   // wave 8: one header pattern, no emoji titles, no trailing full-width Close
    const host = document.getElementById(kind === 'overlay' ? 'ovcard' : 'sheet'), first = host && host.firstElementChild, last = host && host.lastElementChild;
    if (first) {
      if (!first.classList.contains('sh-hd') && (first.classList.contains('ttl') || (first.classList.contains('row') && first.querySelector(':scope > .ttl')))) bad.push('a bare title row opens this sheet: it needs the shared header (shHd / shHead)');
      if (last !== first && last.tagName === 'BUTTON' && /^\s*Close\s*$/.test(last.textContent)) bad.push('the sheet still ends in a full-width Close');
      const t = host.querySelector('.sh-hd h2,.sh-hd .ttl,.ttl');
      if (t && /\p{Extended_Pictographic}/u.test(t.textContent)) bad.push('the sheet title still has an emoji: ' + t.textContent.trim().slice(0, 24));
    }
  }
  if (name === 'sheet time-lapse' && q('#sheet .gm-mastery').length) bad.push('Time-lapse still has the Mastery suit');
  if (name === 'sheet search') {
    const list = q('#idx-list .gh-row'); if (list.length < 20) bad.push('search lists only ' + list.length + ' destinations');
    if (/\p{Extended_Pictographic}/u.test(document.getElementById('idx-list').textContent)) bad.push('search rows still use emoji');
    const titles = list.map((e) => e.querySelector('.gh-t1').textContent); if (new Set(titles).size !== titles.length) bad.push('search lists a destination twice');
  }
  return bad;
}

const results = [];
const note = (fixture, surface, problems) => { surfaces++; if (problems.length) { problemsAll.push({ fixture, surface, problems }); } results.push({ fixture, surface, ok: !problems.length }); };

const dh = deadHandlers();
if (dh.miss.length) problemsAll.push({ fixture: 'static', surface: 'inline handlers', problems: ['undefined function(s): ' + dh.miss.join(', ')] });

for (const fixName of FIXTURES) {
  const fixture = fixName === 'none' ? null : fixName === 'rest' ? fx('./fixture.json') : fx('./fixture-train.json');
  const ctx = await launch({ file: FILE, fixture, width: WIDTH }); const P = ctx.page;
  const list = (fixName === 'live' ? LIVE : COMMON).filter((s) => !A.only || s[0].includes(A.only));
  try {
    await open(ctx, { settle: 1500 });
    await P.evaluate(() => { try { state.showOnboarding = false; if (!state.data.u.name) state.data.u.name = 'Bruce'; render(); } catch (e) {} });
    await P.evaluate(SEED);
    const snap = await P.evaluate(() => JSON.stringify(state.data));
    for (const [name, js, kind, needs] of list) {
      const problems = []; const before = ctx.log.errors.length;
      await P.evaluate((snap) => {
        try { closeSheet(); } catch (e) {} try { closeOverlay(); } catch (e) {} try { closeAlfredChat(); } catch (e) {} try { _closeModal(); } catch (e) {} try { stopTimers(); } catch (e) {}
        state.session = null; state.step = null; state.subpage = null; state.minimized = false; state.showOnboarding = false; state.tab = 'gotham';
        state.data = JSON.parse(snap); try { __qa.clear(); } catch (e) {} render(); window.scrollTo(0, 0);
      }, snap);
      await sleep(200);
      if (needs === 'allies' && !(await P.evaluate(() => (state.data.allies || []).length))) continue;
      const threw = await P.evaluate((js) => { try { (0, eval)('(()=>{' + js + '})()'); return null; } catch (e) { return e.message; } }, js);
      await sleep(650); await P.evaluate(() => { try { __qa.clear(); } catch (e) {} });
      if (threw) problems.push('opening threw: ' + threw.slice(0, 140));
      const rootSel = await P.evaluate(() => { const on = ['modal', 'ac-panel', 'overlay', 'sheet'].map((id) => document.getElementById(id)).find((e) => e && e.classList.contains('on')); return on ? '#' + on.id : '#app'; });
      const isLayer = rootSel !== '#app';
      if ((kind === SHEET || kind === OVERLAY) && !isLayer && !threw) problems.push('the tap opened nothing');
      if ((kind === TAB || kind === SUB || kind === 'step') && isLayer) problems.push('a ' + rootSel + ' layer is open over the screen');
      const a = await P.evaluate(audit, rootSel);
      if (a.err) problems.push(a.err);
      else {
        if (a.pageX) problems.push('page scrolls horizontally');
        for (const k of ['sticksOut', 'clipped', 'wrapped', 'unlabeled', 'tiny', 'dupHeads']) if (a[k].length) problems.push(k + ': ' + a[k].join(' | '));
      }
      problems.push(...(await P.evaluate(rules, name, kind)));
      if (kind === SUB) { const s = await P.evaluate(() => ({ back: !!document.querySelector('.sp-hd .btn-i'), nav: !!document.getElementById('nav') && !document.getElementById('nav').classList.contains('hide') })); if (!s.back) problems.push('strands: no Back button'); if (!s.nav) problems.push('strands: tab bar hidden'); }
      if (A.shots) { fs.mkdirSync(A.shots, { recursive: true }); await P.screenshot({ path: path.join(A.shots, `${fixName}-${WIDTH}-${name.replace(/[^a-z0-9]+/gi, '-')}.png`) }); }
      if (kind === SHEET && isLayer) { await P.touchscreen.tap(8, 8); await sleep(450); if (await P.evaluate((s) => document.querySelector(s).classList.contains('on'), rootSel)) problems.push('strands: a tap on the backdrop does not close the sheet'); }
      const errs = ctx.log.errors.slice(before); if (errs.length) problems.push('console: ' + errs[0].slice(0, 150));
      note(fixName, name, problems);
    }
    // behaviours that need real input
    if (fixName === 'train' && (!A.only || 'search'.includes(A.only))) {
      const before = ctx.log.errors.length, p = [];
      await P.evaluate(() => { try { closeSheet(); } catch (e) {} try { closeOverlay(); } catch (e) {} try { closeAlfredChat(); } catch (e) {} try { _closeModal(); } catch (e) {} state.session = null; state.step = null; state.subpage = null; state.tab = 'gotham'; try { __qa.clear(); } catch (e) {} render(); openIndex(); }); await sleep(500);
      await P.focus('#sheet .ix-q input'); await P.keyboard.type('su', { delay: 40 }); await sleep(150);
      const r1 = await P.evaluate(() => ({ focus: document.activeElement && document.activeElement.tagName, v: document.activeElement && document.activeElement.value, n: document.querySelectorAll('#idx-list .gh-row').length }));
      if (r1.focus !== 'INPUT' || r1.v !== 'su') p.push('search loses focus while typing (' + JSON.stringify(r1) + ')');
      if (!(r1.n >= 1 && r1.n < 28)) p.push('search "su" lists ' + r1.n + ' rows');
      await P.keyboard.type('zzz', { delay: 20 }); await sleep(100);
      if (!(await P.evaluate(() => /No match/.test(document.getElementById('idx-list').textContent)))) p.push('search "suzzz" shows no empty state');
      await P.evaluate(() => closeSheet());
      // the Suit dock Fuel tile really goes to Fuel; Fuel's Back returns to Suit
      await P.evaluate(() => { __qa.tab('suit'); }); await sleep(400);
      const fuelPt = () => P.evaluate(() => { const t = [...document.querySelectorAll('.gd .gd-t')].find((x) => /Fuel/.test(x.textContent)); if (!t) return null; t.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); return true; });
      const tp0 = await fuelPt(); await sleep(500);   // let scroll-snap settle, THEN measure
      const tp = tp0 && await P.evaluate(() => { const t = [...document.querySelectorAll('.gd .gd-t')].find((x) => /Fuel/.test(x.textContent)), r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (!tp) p.push('Suit dock has no Fuel tile to tap'); else {
        await P.touchscreen.tap(tp.x, tp.y); await sleep(900);
        if ((await P.evaluate(() => state.tab)) !== 'fuel') p.push('the Fuel tile did not open Fuel');
        await P.evaluate(() => { const b = document.querySelector('.sp-hd .btn-i'); if (b) b.click(); }); await sleep(500);
        if ((await P.evaluate(() => state.tab)) !== 'suit') p.push('Fuel Back did not return to Suit');
      }
      const errs = ctx.log.errors.slice(before); if (errs.length) p.push('console: ' + errs[0].slice(0, 150));
      note(fixName, 'behaviour: search typing + Fuel tile', p);
      // counts that must agree across screens
      const c = await P.evaluate(() => { const n = stalledLifts().length; __qa.tab('mission'); const tile = [...document.querySelectorAll('.gd-t')].find((x) => /Lab/.test(x.textContent)); const m = tile && /(\d+) stalled/.exec(tile.textContent); state.subpage = 'lab'; render(); const row = [...document.querySelectorAll('.gh-row')].find((x) => /Plateau breaker/.test(x.textContent)); const l = row && /(\d+) stalled/.exec(row.textContent); state.subpage = null; return { n, mission: m ? +m[1] : 0, lab: l ? +l[1] : 0, prs: Object.keys(state.data.prs || {}).filter((k) => (state.data.prs[k] || {}).orm > 0).length }; });
      const cp = []; if (c.mission !== c.n || c.lab !== c.n) cp.push(`stalled lifts disagree: detector ${c.n}, Mission Lab tile ${c.mission}, Lab row ${c.lab}`);
      const rec = await P.evaluate(() => { __qa.tab('case'); const t = [...document.querySelectorAll('.gd-t')].find((x) => /Records/.test(x.textContent)), a = [...document.querySelectorAll('.gh-sec')].find((x) => /Records/.test(x.textContent)); return { tile: t && (/(\d+)/.exec(t.querySelector('.gd-t2').textContent) || [])[1], all: a && (/All (\d+)/.exec(a.textContent) || [])[1] }; });
      if (rec.tile && rec.all && rec.tile !== rec.all) cp.push(`Profile Records: dock says ${rec.tile}, section says All ${rec.all}`);
      note(fixName, 'behaviour: counts agree', cp);
    }
  } catch (e) { problemsAll.push({ fixture: fixName, surface: 'harness', problems: [String(e && e.stack || e).slice(0, 300)] }); }
  await ctx.close();
}
const failing = problemsAll.length;
console.log(JSON.stringify({ width: WIDTH, handlers: dh.n, surfaces, failing, problems: problemsAll }, null, 1));
process.exit(failing ? 1 : 0);
