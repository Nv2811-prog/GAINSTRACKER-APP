// Onboarding flow, brand-new user (no fixture): welcome -> you -> goal -> experience -> Home, then re-enter from Settings (edit mode).
// Checks what is collected + persisted (u.name, u.bodyweight, u.natty, u.goal, experienceLevel, onboardingDone), the guards (bad bodyweight, experience required), back navigation,
// that no splash/cine blocks the first Home, and prints console errors. node onboarding.mjs [--file html] [--width 393] [--out dir]
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: null, width: A.width || null });
const P = ctx.page; const R = {}; const out = A.out || '';
const ev = (f, ...a) => P.evaluate(f, ...a);
const click = (sel, i = 0) => ev((s, i) => { const e = document.querySelectorAll(s)[i]; if (!e) return false; e.click(); return true; }, sel, i);
const shot = async (n) => { if (out) { fs.mkdirSync(out, { recursive: true }); await P.screenshot({ path: path.join(out, n + '.png') }); } };
const step = () => ev(() => state.obStep);
try {
  await open(ctx, { settle: 1400 });
  R.startsOnWelcome = (await ev(() => state.showOnboarding)) && (await step()) === 0;
  R.welcomeNoNav = await ev(() => document.getElementById('nav').classList.contains('hide'));
  await shot('onb-0-welcome');
  await click('.ob-hero .btn-1'); await sleep(250);
  R.step1 = await step();
  await P.type('#ob-name', 'Bruce'); await P.type('#ob-bw', '5');
  await click('.ob-cta .btn-1'); await sleep(150);
  R.badBodyweightBlocked = (await step()) === 1;
  await P.click('#ob-bw', { clickCount: 3 }); await P.type('#ob-bw', '84');
  await click('.st-seg.wide button', 0);
  await shot('onb-1-you');
  await click('.ob-cta .btn-1'); await sleep(250);
  R.step2 = await step();
  R.goalPreselected = await ev(() => state.obTmp.goal === 'build' && !!document.querySelector('.ob-card.on'));
  await click('.ob-card', 1);   // Cut fat
  await shot('onb-2-goal');
  await click('.ob-cta .btn-1'); await sleep(250);
  R.step3 = await step();
  R.goDisabledUntilPick = await ev(() => document.getElementById('ob-go').disabled);
  await click('.ob-cta .btn-1'); await sleep(150);
  R.stillStep3AfterBlankTap = (await step()) === 3;
  await click('.btn-i', 0); await sleep(200);   // back to goal
  R.backToStep2 = (await step()) === 2 && (await ev(() => state.obTmp.goal === 'cut'));
  await click('.ob-cta .btn-1'); await sleep(200);
  await click('.ob-card', 2);   // Advanced
  R.goEnabled = await ev(() => !document.getElementById('ob-go').disabled);
  await shot('onb-3-experience');
  await click('#ob-go'); await sleep(700);
  R.saved = await ev(() => { const u = state.data.u, s = JSON.parse(localStorage.getItem('gt_data') || '{}'); return { name: u.name, bw: u.bodyweight, natty: u.natty, goal: u.goal, exp: state.data.experienceLevel, done: state.data.onboardingDone, persisted: s.u && s.u.name === 'Bruce' && s.u.goal === 'cut' && s.experienceLevel === 'DARK_KNIGHT' && s.onboardingDone === true }; });
  R.landed = await ev(() => ({ tab: state.tab, onb: state.showOnboarding, navShown: !document.getElementById('nav').classList.contains('hide'), cine: !!document.querySelector('#cine.on'), splash: !!document.querySelector('.splash'), hasContent: (document.getElementById('app').innerText || '').length > 80 }));
  await shot('first-home');
  // edit mode from Settings
  await ev(() => { openSettings(); }); await sleep(250);
  await shot('settings-after-onboarding');
  await ev(() => { obStart(true); }); await sleep(250);
  R.editPrefill = await ev(() => ({ step: state.obStep, name: document.getElementById('ob-name').value, bw: document.getElementById('ob-bw').value, edit: state.obEdit }));
  await click('.ob-cta .btn-1'); await sleep(200); await click('.ob-card', 0); await click('.ob-cta .btn-1'); await sleep(200);
  R.editSaveLabel = await ev(() => document.getElementById('ob-go').textContent.trim());
  await click('#ob-go'); await sleep(500);
  R.editSaved = await ev(() => ({ goal: state.data.u.goal, onb: state.showOnboarding, tab: state.tab, sheetClosed: !document.getElementById('sheet').classList.contains('on') }));
  // back out of edit mode without saving
  await ev(() => { obStart(true); }); await sleep(200);
  await click('.btn-i', 0); await sleep(200);
  R.editCancelled = await ev(() => !state.showOnboarding && state.data.u.goal === 'build');
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 500); }
R.errors = ctx.log.errors; R.failed = ctx.log.failed;
console.log(JSON.stringify(R, null, 1));
await ctx.close();
