import { fileURLToPath } from 'node:url';
// End-to-end smoke test of the REAL merged app with REAL coordinate taps (through the haptic
// switch overlays): nav, start, tick sets, minimise → home shows RESUME, resume, finish, summary,
// Alfred chat. Prints a pass/fail table + console errors. node smoke.mjs [html]
import os from 'node:os';
import path from 'node:path';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const file = process.argv[2] || DEFAULT_FILE;
const ctx = await launch({ file, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)) });
const P = ctx.page; const R = {};
const tap = async (sel, i = 0) => { const ok = await P.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (!e) return false; e.scrollIntoView({ block: 'center', behavior: 'instant' }); return true; }, sel, i); if (!ok) return 'MISSING'; await sleep(250); const b = await P.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: t === e ? 'host' : (t && t.classList.contains('hx') && t.parentElement === e) ? 'own-hx' : 'OTHER:' + (t ? t.className || t.tagName : 'none') }; }, sel, i); await P.touchscreen.tap(b.x, b.y); await sleep(450); return b.hit; };
const ev = (f) => P.evaluate(f);
try {
  await open(ctx, { settle: 1600 });
  R.bootNoCine = await ev(() => !document.querySelector('#cine.on') && !(state._cineQ || []).length);
  R.hxCount = await ev(() => document.querySelectorAll('.hx').length);
  R.bodyFont = await ev(() => getComputedStyle(document.body).fontFamily.slice(0, 40));
  R.navTap = await tap('#nav button', 1); R.tabAfter = await ev(() => state.tab);
  await tap('#nav button', 0);
  await ev(() => { __qa.startLogging(0); });
  await sleep(400);
  await ev(() => { const s = state.session.exercises[0].sets.find((x) => x.type !== 'W'); s.w = '90'; s.r = '8'; render(); });
  R.sdoneTap = await tap('.sdone', 0);
  R.done1 = await ev(() => state.session.exercises[0].sets.filter((x) => x.done && x.type !== 'W').length);
  R.emptyTick = await ev(() => { const ex = state.session.exercises[1]; const si = ex.sets.findIndex((x) => x.type !== 'W'); toggleDone(1, si); const s = ex.sets[si]; return { done: s.done, w: s.w, r: s.r }; });
  await ev(() => { minimizeWorkout(); }); await sleep(300);
  R.heroResume = await ev(() => /RESUME/i.test((document.querySelector('#app') || {}).innerText || ''));
  await ev(() => { resumeWorkout(); }); await sleep(300);
  R.stepAfterResume = await ev(() => state.step);
  R.finish = await ev(() => { __qa.finish(); return state.step; }); await sleep(600);
  R.savedWorkouts = await ev(() => JSON.parse(localStorage.getItem('gt_data')).workouts.length);
  await ev(() => { __qa.clear(); try { closeSheet(); } catch (e) {} state.step = null; go('gotham'); });
  await ev(() => { localStorage.setItem('gt_gemini', 'x'); window.geminiConvCall = async () => 'Machines are fine. Keep 1-2 reps in reserve.\n[FOLLOWUPS: Why RIR? | What about sets? | Open settings]'; openAlfredChat(); });
  await sleep(500);
  R.chatOpen = await ev(() => !!document.querySelector('#ac-panel') && getComputedStyle(document.querySelector('#ac-panel')).display !== 'none');
  R.chatInputPx = await ev(() => { const i = document.querySelector('#ac-panel textarea, #ac-panel input[type=text], #ac-panel input:not([type])'); return i ? getComputedStyle(i).fontSize : 'none'; });
  await P.screenshot({ path: path.join(process.env.QA_SHOTS || os.tmpdir(), 'smoke-chat.png') });
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 400); }
R.errors = ctx.log.errors; R.failed = ctx.log.failed;
console.log(JSON.stringify(R, null, 1));
await ctx.close();
