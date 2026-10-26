import { fileURLToPath } from 'node:url';
// The whole training loop with REAL touch taps: nav through all 5 tabs, start logging, one-tap ghost values on empty sets,
// a heavy set -> the in-row PR moment, finish -> summary slides -> session RPE -> Done -> Home, Profile "Records" header on one row, Alfred chat.
// node flow.mjs [--width 375|393|430] [--out dir] [--file html]   (every value in the printed JSON should be true / non-empty; errors must be [])
import os from 'node:os';
import path from 'node:path';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const av = process.argv.slice(2);
const opt = (k, d) => { const i = av.indexOf('--' + k); return i >= 0 ? av[i + 1] : d; };
const width = opt('width', null); const file = opt('file', DEFAULT_FILE); const out = opt('out', process.env.QA_SHOTS || os.tmpdir());
const tag = width || '393';
const ctx = await launch({ file, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width });
const P = ctx.page; const R = {};
const ev = (f, ...a) => P.evaluate(f, ...a);
const shot = (n) => P.screenshot({ path: path.join(out, `flow-${n}-${tag}.png`) });
const tapAt = async (sel, i = 0) => {
  await P.waitForSelector(sel, { timeout: 6000 }).catch(() => {});
  const found = await ev((s, i) => { const e = document.querySelectorAll(s)[i]; if (!e) return false; e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); return true; }, sel, i);
  if (!found) return false;
  // a finger lands on a still page: wait until the app's own smooth scroll (after a tick) has stopped, or the haptic switch's scroll guard rightly reads the tap as a scroll
  await P.waitForFunction(() => { const y = window.scrollY, w = window.__qaY; window.__qaY = y; return w === y; }, { polling: 120, timeout: 3000 }).catch(() => {});
  const pt = await ev((s, i) => { const r = document.querySelectorAll(s)[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel, i);
  await sleep(90); await P.touchscreen.tap(pt.x, pt.y); await sleep(400); return true;
};
const sets = () => ev(() => state.session.exercises.map((e) => e.sets.map((s) => ({ d: !!s.done, w: s.w, r: s.r }))));
try {
  await open(ctx, { settle: 1600 });
  R.homeRendered = await ev(() => !!document.querySelector('#app .gh') && document.querySelector('#app').innerText.length > 100);
  // quality pass: the hero's top row stays one line at 375 and 393, Home shows only the muscles that need attention (the full map is the Suit grid)
  R.homeHeroOneLine = await ev(() => { const e = document.querySelector('#app .s3 .gh-top .eyebrow'); return !!e && e.getBoundingClientRect().height < 20; });
  R.homeExceptionsOnly = await ev(() => document.querySelectorAll('#app .gh-mgrid .gh-mt').length <= 6 && !!document.querySelector('#app .gh-mall'));
  // Search: a real tap opens Find anything; typing keeps the field focused and filters the list (it used to redraw the sheet on every key)
  await tapAt('.topbar .tbtn', 0); await sleep(500);
  await P.focus('#sheet .ix-q input'); await P.keyboard.type('su', { delay: 40 }); await sleep(200);
  R.searchKeepsFocus = await ev(() => { const a = document.activeElement, n = document.querySelectorAll('#idx-list .gh-row').length; return !!a && a.tagName === 'INPUT' && a.value === 'su' && n >= 1 && n < 28; });
  await ev(() => { closeSheet(); });
  const tabs = [];
  for (let i = 0; i < 5; i++) { await tapAt('#nav button', i); tabs.push(await ev(() => state.tab)); }
  R.navTabs = tabs.join('>'); R.navDistinct = new Set(tabs).size === 5;
  await ev(() => { go('gotham'); });
  // Profile: the Records header keeps title and "All N" on ONE row
  R.recordsHeader = await ev(() => {
    __qa.tab('case'); const sec = [...document.querySelectorAll('.gh-sec')].find((s) => /Records/.test(s.textContent));
    if (!sec) return 'no Records section'; const b = sec.querySelector('.gh-more'); if (!b) return 'no action button';
    sec.scrollIntoView({ block: 'center', behavior: 'instant' });
    const h = sec.querySelector('h2').getBoundingClientRect(), br = b.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    return Math.abs((h.top + h.height / 2) - (br.top + br.height / 2)) < 10 && br.right > sr.right - 6 && br.left > h.right;
  });
  await sleep(300); await shot('records');
  await ev(() => { __qa.tab('gotham'); });
  // logging
  await ev(() => { __qa.startLogging(0); }); await sleep(500);
  R.loggingStep = await ev(() => state.step === 'logging');
  const before = await sets();
  await tapAt('.sdone', 0);
  const after = await sets();
  let ghost = null; before.forEach((ex, ei) => ex.forEach((s, si) => { const a = after[ei][si]; if (!s.d && a.d) ghost = { w: a.w, r: a.r, filledFromEmpty: !String(s.w || '') && !!String(a.w || '') && !!String(a.r || '') }; }));
  R.ghostTick = !!ghost && ghost.filledFromEmpty;
  await tapAt('.sdone:not(.on)', 0); await tapAt('.sdone:not(.on)', 0);
  R.setsTicked = await ev(() => state.session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)) >= 3;
  // PR moment: a clearly heavy set on the focused lift
  const target = await ev(() => {
    const ses = state.session; const order = [ses._focusEi != null ? ses._focusEi : 0, ...ses.exercises.map((_, i) => i)];
    for (const ei of order) { const e = ses.exercises[ei]; const si = e.sets.findIndex((s) => s.type !== 'W' && !s.done); if (si >= 0) { const rec = (state.data.prs[e.name] || {}).orm || 0; e.sets[si].w = String(rec ? Math.ceil(rec * 1.06 / (1 + 5 / 30) / 2.5) * 2.5 : 60); e.sets[si].r = '5'; render(); return { ei, si }; } }   /* ~6% over the record: a real PR, not the >30% "different machine?" leap */
    return null;
  });
  if (target) {
    await tapAt(`[onclick*="toggleDone(${target.ei},${target.si})"]`);
    R.prSetDone = await ev((ei, si) => !!state.session.exercises[ei].sets[si].done, target.ei, target.si);
    R.prRow = await ev((k) => !!(state.session._prRows && state.session._prRows[k]), target.ei + ':' + target.si);
    R.prRowInDom = await ev(() => document.querySelectorAll('#app [class*="pr"]').length > 0);
    await sleep(250); await shot('pr');
  } else R.prRow = 'no open working set';
  R.noTakeoverDuringSets = await ev(() => !document.querySelector('#cine.on'));
  // finish -> summary
  await ev(() => { __qa.finish(); });
  // the finish moment (.p3-fin) covers the deck for ~1.5 s; wait until it is gone so the taps land on the slides
  await P.waitForFunction(() => state.step === 'summary' && !!document.querySelector('button[onclick="sumNav(1)"]') && !document.querySelector('.p3-fin'), { timeout: 12000 }).catch(() => {});
  await sleep(1300);   // let the post-moment scroll-to-top settle before touching the deck
  R.summaryStep = await ev(() => state.step === 'summary');
  await shot('summary-0');
  // a record earns the one full-screen celebration at the finish; dismiss it like a user would
  R.finishCelebration = await ev(() => !!document.querySelector('#cine.on'));
  if (R.finishCelebration) { await tapAt('#cine.on button'); await P.waitForFunction(() => !document.querySelector('#cine.on'), { timeout: 6000 }).catch(() => {}); await sleep(400); }
  R.celebrationDismissed = await ev(() => !document.querySelector('#cine.on'));
  R.finishModal = await ev(() => { const m = document.querySelector('#modal.on'); return m ? 'OPEN: ' + (m.textContent || '').trim().slice(0, 80) : 'none'; });
  R.nextHit = await ev(() => { const b = document.querySelector('button[onclick="sumNav(1)"]'); if (!b) return 'no Next button'; b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!e || e === b || b.contains(e)) return e ? 'the button' : 'null'; const er = e.getBoundingClientRect(); const cs = getComputedStyle(e); const chain = []; for (let p = e; p && p !== document.body && chain.length < 5; p = p.parentElement) chain.push(`${p.tagName.toLowerCase()}${p.id ? '#' + p.id : ''}${p.className ? '.' + String(p.className).trim().split(/\s+/).slice(0, 2).join('.') : ''}`); return `COVERING by ${chain.join(' < ')} "${(e.textContent || '').trim().slice(0, 50)}" pos ${cs.position} z ${cs.zIndex} rect ${[er.left, er.top, er.width, er.height].map(Math.round)} button ${[r.left, r.top, r.width, r.height].map(Math.round)}`; });
  for (let n = 0; n < 2; n++) await tapAt('button[onclick="sumNav(1)"]');
  R.slideInfo = await ev(() => `card ${state.sumCard}, rpe buttons ${document.querySelectorAll('#p3rpe button').length}, next ${!!document.querySelector('button[onclick="sumNav(1)"]')}, done ${!!document.querySelector('button[onclick="closeSummary()"]')}, fin ${!!document.querySelector('.p3-fin')}`);
  R.rpeSlide = await ev(() => !!document.querySelector('#p3rpe button'));
  await tapAt('#p3rpe button[onclick="setSessionRpe(8)"]');
  R.rpeSaved = await ev(() => !!(state.lastResult && state.lastResult.wk && state.lastResult.wk.rpe === 8));
  R.rpePersisted = await ev(() => { const d = state.lastResult.wk.date; const w = JSON.parse(localStorage.getItem('gt_data')).workouts.find((x) => x.date === d); return !!w && w.rpe === 8; });
  await shot('rpe');
  for (let n = 0; n < 6; n++) { if (await ev(() => !!document.querySelector('button[onclick="closeSummary()"]'))) break; await tapAt('button[onclick="sumNav(1)"]'); }
  await tapAt('button[onclick="closeSummary()"]'); await sleep(500);
  R.backHome = await ev(() => state.step == null && !!document.querySelector('#app .gh') && !document.querySelector('#nav.hide'));
  R.savedWorkouts = await ev(() => JSON.parse(localStorage.getItem('gt_data')).workouts.length);
  // Alfred chat
  await ev(() => { localStorage.setItem('gt_gemini', 'x'); window.geminiConvCall = async () => 'Keep one or two reps in reserve.\n[FOLLOWUPS: Why RIR? | What about sets?]'; openAlfredChat(); }); await sleep(500);
  R.chatOpen = await ev(() => { const p = document.querySelector('#ac-panel'); return !!p && getComputedStyle(p).display !== 'none'; });
  R.chatInput16 = await ev(() => { const i = document.querySelector('#ac-panel textarea, #ac-panel input'); return !!i && parseFloat(getComputedStyle(i).fontSize) >= 16; });
  R.noHorizontalScroll = await ev(() => document.documentElement.scrollWidth <= innerWidth + 1);
  await shot('chat');
} catch (e) { R.fatal = String((e && e.stack) || e).slice(0, 500); }
R.errors = ctx.log.errors; R.failed = ctx.log.failed;
console.log(JSON.stringify(R, null, 1));
await ctx.close();
