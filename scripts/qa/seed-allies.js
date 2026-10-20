// QA seed: three allies (one on patrol with unread chat, one with a streak at risk, one idle) so the Allies tab renders with a populated league.
// node scripts/qa/tab.mjs --tab allies --inject-file scripts/qa/seed-allies.js [--open "openAllySheet(0)" --scope "#sheet [onclick]"]
(() => {
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const split = { n: 'Push Pull Legs', d: [{ n: 'Push', r: 0, e: ['Bench Press', 'Overhead Press'] }, { n: 'Pull', r: 0, e: ['Barbell Row', 'Lat Pulldown'] }, { n: 'Legs', r: 0, e: ['Squat', 'Leg Press'] }, { n: 'Rest', r: 1, e: [] }] };
  state.data.allies = [
    { n: 'Dick', rk: 'Vigilante', sl: 6, w: 52, opt: 61, vol: 410000, streak: 5, _uid: 'qa_dick', recent: [{ t: day(0), n: 'Push' }, { t: day(2), n: 'Legs' }, { t: day(3), n: 'Pull' }], lifts: [{ n: 'Bench Press', o: 112, w: 100, r: 5 }, { n: 'Squat', o: 150, w: 130, r: 6 }, { n: 'Deadlift', o: 190, w: 170, r: 5 }], spl: split },
    { n: 'Barbara', rk: 'Detective', sl: 5, w: 31, opt: 48, vol: 220000, streak: 4, _uid: 'qa_babs', recent: [{ t: day(1), n: 'Pull' }, { t: day(3), n: 'Push' }], lifts: [{ n: 'Barbell Row', o: 82, w: 70, r: 6 }], spl: split },
    { n: 'Tim', rk: 'Rookie', sl: 3, w: 9, opt: 22, vol: 52000, streak: 0, recent: [{ t: day(12), n: 'Legs' }], lifts: [], spl: null },
  ];
  state.data.chatUnread = { qa_dick: 3 };
  try { cloud.presence = { qa_dick: { on: true } }; } catch (e) { /* offline harness: presence stays empty */ }
  try { render(); } catch (e) { /* tab not on Allies yet */ }
})();
