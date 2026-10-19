// Builds qa/fixture.json: ~8 weeks of realistic training on the user's real 8-day cycle, created
// through the app's OWN finishWorkout() write path (raw injection makes impossible states — see
// project memory). Run: node seed.mjs [htmlFile]
import fs from 'node:fs';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';

const file = process.argv[2] || DEFAULT_FILE;
const REF_NOW = new Date('2026-10-18T17:30:00').getTime();
const DAY = 864e5;
const START = REF_NOW - 56 * DAY;

const ctx = await launch({ file, storage: {}, fakeNow: START });
await open(ctx, { settle: 1500 });
const res = await ctx.page.evaluate(async (START, REF_NOW, DAY) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const d = state.data;
  // --- profile, as if onboarding was completed 8 weeks ago
  Object.assign(d.u, { name: 'Bruce', bodyweight: 84, goal: 'build', weeklyGoal: 4, gyms: ['Fitness X'], activeGym: 'Fitness X' });
  d.onboardingDone = true; d.experienceLevel = 'intermediate';
  d.prsByGym = { 'Fitness X': {} }; d.prs = d.prsByGym['Fitness X'];
  if (!d.splits || !d.splits.length) d.splits = defaultSplits();
  if (!d.splits.find((s) => s.id === 'cycle8')) d.splits.push(cycle8Split());
  d.activeSplitId = 'cycle8'; d._nextDay = 0; d.dataVersion = 1;
  state.showOnboarding = false; save(); render(); __qa.clear();

  const BASE = { 'Plate-Loaded Chest Press': 80, 'Lat Pulldown (Wide Grip)': 65, 'Incline Machine Chest Press': 60, 'Chest-Supported T-Bar Row': 50, 'High-to-Low Cable Row': 45, 'Cable Lateral Raise': 10, 'Cable Cross-Body Extension': 15, 'V-Bar Triceps Pushdown': 35, 'Machine Preacher Curl': 30, 'Reverse-Grip Cable Curl': 25, 'Leg Extension': 70, 'Machine Seated Leg Curl': 55, 'Leg Press (45°)': 180, 'Hip Adduction Machine': 60, 'Standing Calf Raise': 80, 'Cable Rope Crunch': 40, 'Wrist Curl': 25, 'Reverse Wrist Curl': 15, 'Reverse Pec Deck': 40, 'Machine Shoulder Press': 50, 'Hip Hinge (Erectors)': 40, 'Pec Deck Fly': 55 };
  const r25 = (x) => Math.round(x / 2.5) * 2.5;
  const seen = {}; let sessions = 0; const sp = d.splits.find((s) => s.id === 'cycle8');
  let cyc = 0; // position in the 8-day cycle
  for (let day = 0; day < 56; day++) {
    const di = cyc % sp.days.length; cyc++;
    const dayObj = sp.days[di];
    if (dayObj.rest) continue;
    if (day % 13 === 7) { cyc--; continue; } // occasionally life happens: the day slides by one
    const T = START + day * DAY + (day % 3) * 40 * 60e3; // ~17:30–18:50
    __qaSetNow(T);
    startWorkout('cycle8', di); __qa.clear();
    state.session.readiness = 3 + (day % 2); state.step = 'logging';
    const wk = Math.floor(day / 7);
    state.session.exercises.forEach((ex, ei) => {
      const b = BASE[ex.name] || 40; const n = (seen[ex.name] = (seen[ex.name] || 0) + 1);
      const w = r25(b * (1 + 0.018 * wk)); const reps = 6 + ((n + ei) % 4);
      if (ei === 0 && day % 2 === 0) ex.sets.unshift({ w: String(r25(w * 0.55)), r: '10', type: 'W', done: true, rpe: '' });
      ex.sets.forEach((s, si) => { if (s.type === 'W') return; s.w = String(si ? r25(w * 0.95) : w); s.r = String(Math.max(5, reps - si)); s.rpe = String(si ? 1 : 2); s.done = true; if (day > 40 && si === ex.sets.length - 1 && ei % 4 === 1) s.type = 'F'; });
    });
    __qaSetNow(T + 58 * 60e3);
    finishWorkout(); await wait(60); __qa.clear(); try { closeSheet(); } catch (e) {}
    state.step = null; sessions++;
  }
  // bodyweight trend + a couple of extras the home screen reads
  d.bwLog = Array.from({ length: 8 }, (_, i) => ({ date: new Date(START + i * 7 * DAY).toISOString(), kg: +(84.6 - i * 0.25).toFixed(1) }));
  __qaSetNow(REF_NOW);
  try { d._nextDay = computeNextDay(sp); } catch (e) {}
  save(); await wait(300); __qa.clear();
  return { sessions, workouts: d.workouts.length, prs: Object.keys(d.prs).length, nextDay: d._nextDay, xp: d.u.xp };
}, START, REF_NOW, DAY);
await sleep(1500);
const storage = await ctx.page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('gt_') && k !== 'gt_session') o[k] = localStorage.getItem(k); } return o; });
fs.writeFileSync(new URL('./fixture.json', import.meta.url), JSON.stringify({ now: REF_NOW, storage }, null, 0));
console.log(JSON.stringify({ res, keys: Object.keys(storage), bytes: (storage.gt_data || '').length, errors: ctx.log.errors.slice(0, 15), blocked: ctx.log.blocked }, null, 1));
await ctx.close();
