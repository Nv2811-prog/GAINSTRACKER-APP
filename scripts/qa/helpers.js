// In-page QA helpers (window.__qa). Injected before the app boots; call after boot.
// They drive the REAL app functions so the screens you reach are the screens the user reaches.
window.__qa = {
  // Remove one-shot cinematic overlays (stinger, cine queue, outro, toasts) so a
  // screenshot shows the underlying screen. Never touches data.
  clear() {
    try { document.querySelectorAll('.ripple').forEach((n) => n.remove()); } catch (e) {}
    try { ['stinger','outro','prfin'].forEach((id) => { const n = document.getElementById(id); if (n) n.remove(); }); } catch (e) {}
    try { if (typeof cineDismiss === 'function') cineDismiss(); } catch (e) {}
    try { state._cineQ = []; state._cineOn = false; } catch (e) {}
    try { const c = document.getElementById('cine'); if (c) c.classList.remove('on'); } catch (e) {}
    try { document.querySelectorAll('.g9-outro,.outro,#outro').forEach((n) => n.remove()); } catch (e) {}
    try { const t = document.getElementById('toast'); if (t) { t.classList.remove('on'); t.style.pointerEvents = ''; } } catch (e) {}   // an Undo toast sets pointer-events:auto inline: hiding it must also hand the taps back
  },
  tab(t) { this.clear(); try { closeSheet(); } catch (e) {} state.subpage = null; state.step = state.session && state.step ? state.step : null; go(t); this.clear(); },
  // Index of the next training day on the active split (what "tonight" would be).
  nextDay() {
    const d = state.data; const sp = d.splits.find((s) => s.id === d.activeSplitId) || d.splits[0];
    let i = (d._nextDay || 0) % sp.days.length; let guard = 0;
    while (sp.days[i] && sp.days[i].rest && guard++ < sp.days.length) i = (i + 1) % sp.days.length;
    return { sp, i };
  },
  // Start tonight's workout and land on the logging screen. doneSets = how many working sets to
  // pre-complete (uses the previous session's numbers +a little, like a real lifter would).
  startLogging(doneSets = 0) {
    this.clear(); try { closeSheet(); } catch (e) {}
    const { sp, i } = this.nextDay();
    startWorkout(sp.id, i); this.clear();
    try { setReadiness(3); } catch (e) { state.session.readiness = 3; }
    try { beginPatrol(); } catch (e) { state.step = 'logging'; }
    this.clear();
    let n = 0;
    for (let ei = 0; ei < state.session.exercises.length && n < doneSets; ei++) {
      const ex = state.session.exercises[ei];
      for (let si = 0; si < ex.sets.length && n < doneSets; si++) {
        const s = ex.sets[si]; if (s.type === 'W') continue;
        s.w = s.prevW || '40'; s.r = s.prevR || '8'; s.rpe = String(1 + (n % 2));
        try { toggleDone(ei, si); } catch (e) { s.done = true; }
        n++;
      }
    }
    this.clear(); try { render(); } catch (e) {}
    this.clear();
    return { split: sp.name, day: state.session.day, exercises: state.session.exercises.length };
  },
  // Finish the current session through the real write path and land on the summary.
  finish() { try { finishWorkout(); } catch (e) { return 'ERR ' + e.message; } return state.step; },
  info() {
    const d = state.data; return { workouts: d.workouts.length, prs: Object.keys(d.prs || {}).length, split: (d.splits.find((s) => s.id === d.activeSplitId) || {}).name, tab: state.tab, step: state.step, name: d.u.name, xp: d.u.xp };
  },
};
