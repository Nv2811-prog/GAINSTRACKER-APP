// PR finisher (GP:PRFIN, wave 9) — pass/fail with REAL taps through the set-tick haptic switch.
//   node scripts/qa/pr.mjs [--width 393|375] [--out dir]
// A  the next clip is fetched at idle and held as a Blob (Joker first) > a record by a real tap plays a full-screen <video src="blob:..."> above
//    everything > the stamp lands in the final second (lift, NEW RECORD, e1RM + delta, Bebas) > it closes itself > record 2 starts at the impact
//    (short cut), a tap skips > Joker, Bane, Two-Face, Penguin, Scarecrow, Joker (never the same twice, persisted) > sound refused = muted + the
//    app's own impact sfx > a lift with no standing record gets the crown only > typed inputs, set data, rest timer and scroll are untouched.
// B  clip fetch fails (offline), or is slower than ~400 ms: no overlay, the in-row crown shows, the rotation does not advance; once the clip is
//    ready the next record plays it.
// C  prefers-reduced-motion: the poster + stamp for ~1.2 s, no video, no mp4 fetched.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, sleep } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', process.env.QA_SHOTS || os.tmpdir());
const WIDTH = +arg('--width', 393);
fs.mkdirSync(OUT, { recursive: true });
const FIXTURE = fileURLToPath(new URL('./fixture-train.json', import.meta.url));
const shot = (P, name) => P.screenshot({ path: path.join(OUT, `pr-${WIDTH}-${name}.png`) });
const R = {}; const fails = [];
const check = (name, ok, info) => { R[name] = info === undefined ? !!ok : { ok: !!ok, info }; if (!ok) fails.push(name); };

async function waitFor(P, fn, { timeout = 8000, step = 60 } = {}, ...args) {
  const t0 = Date.now();
  for (;;) {
    const v = await P.evaluate(fn, ...args);
    if (v) return v;
    if (Date.now() - t0 > timeout) return null;
    await sleep(step);
  }
}
const INSTALL = () => {
  window.__probe = () => {
    const el = document.getElementById('prfin'); if (!el) return null;
    const v = el.querySelector('video'), r = el.getBoundingClientRect();
    const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return {
      clip: el.dataset.clip, short: !!el.dataset.short, on: el.classList.contains('pf-on'), hold: el.classList.contains('pf-hold'),
      full: Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight, top: !!(mid && mid.closest('#prfin')), z: getComputedStyle(el).zIndex,
      img: !!el.querySelector('img.pf-bg'),
      video: v ? { src: (v.currentSrc || v.src).slice(0, 5), playing: !v.paused && v.currentTime > 0 && v.readyState >= 2, t: v.currentTime, dur: v.duration, muted: v.muted, ended: v.ended } : null,
    };
  };
  window.__snap = () => ({
    sets: state.session.exercises.map((e) => e.sets.map((s) => [s.w, s.r, !!s.done, s.type || ''])),
    inputs: [...document.querySelectorAll('.lg2-cell input')].map((i) => i.value),
    scroll: Math.round(scrollY), step: state.step, restRunning: !!state.restRunning, restEnd: state.restEnd || 0, finN: state.session._finN || 0,
    crowns: document.querySelectorAll('.lg2-sr.pr .lg2-sn svg').length, prRows: document.querySelectorAll('.lg2-sr.pr').length,
  });
};
const playing = () => { const p = window.__probe(); return p && p.video && p.video.playing ? p : null; };
const gone = () => !document.getElementById('prfin');
// The first lift with a standing e1RM record, topped up to 4 working sets (the fixture plan has only 1-2 per lift).
const pickLift = (P) => P.evaluate(() => {
  const ses = state.session;
  for (let ei = 0; ei < ses.exercises.length; ei++) {
    const e = ses.exercises[ei], ex = exFor(e.name), rec = state.data.prs[e.name];
    if (!rec || !(rec.orm > 0) || ex.bw) continue;
    while (e.sets.filter((s) => s.type !== 'W').length < 4) addSet(ei);
    return { ei, work: e.sets.map((s, i) => (s.type !== 'W' ? i : -1)).filter((i) => i >= 0), name: e.name, rec: rec.orm };
  }
  return null;
});
// Make set (ei, si) an e1RM of rec x bump (5 reps, the smallest 0.5 kg step that gets there), untick it first, re-render.
const arm = (P, ei, si, bump) => P.evaluate((ei, si, bump) => {
  const e = state.session.exercises[ei], s = e.sets[si], ex = exFor(e.name), rec = state.data.prs[e.name].orm;
  if (s.done) toggleDone(ei, si);   // untick: lgUndo clears the in-session best, so this set can be a record again
  s.done = false; s.r = '5';
  let w = Math.floor(rec * bump / (1 + 5 / 30) * 2) / 2;
  for (let n = 0; n < 400; n++) { s.w = String(w); if (setE1RM(ex, s) >= rec * bump) break; w += 0.5; }
  render();
  return { name: e.name, w: s.w, e1: setE1RM(ex, s), rec };
}, ei, si, bump);
async function tapSdone(P, ei, si) {
  const sel = `.sdone[onclick="toggleDone(${ei},${si})"]`;
  const ok = await P.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; e.scrollIntoView({ block: 'center', behavior: 'instant' }); return true; }, sel);
  if (!ok) return 'MISSING';
  await sleep(250);
  const b = await P.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hit: t === e ? 'host' : (t && t.classList.contains('hx') && t.parentElement === e) ? 'own-hx' : 'OTHER:' + (t ? t.className || t.tagName : 'none') }; }, sel);
  await P.touchscreen.tap(b.x, b.y);
  return b.hit;
}
const tapMiddle = (P) => P.evaluate(() => [innerWidth / 2, innerHeight / 2]).then(([x, y]) => P.touchscreen.tap(x, y));
async function startLogging(P) {
  await P.evaluate(INSTALL);
  await P.evaluate(() => { __qa.startLogging(0); });
  await sleep(500);
  const L = await pickLift(P);
  return L;
}

try {
  // ───────────────────────── A: the finisher ─────────────────────────
  const ctx = await launch({ fixture: FIXTURE, clips: true, width: WIDTH });
  const P = ctx.page;
  const reqs = []; const tNav = Date.now();
  P.on('request', (rq) => { if (rq.url().includes('/assets/pr/')) reqs.push({ f: rq.url().split('/').pop(), ms: Date.now() - tNav }); });
  await open(ctx, { settle: 800 });
  const ready = await waitFor(P, () => (_prf.b && _prf.i === 0 ? { type: _prf.b.type, size: _prf.b.size } : null), { timeout: 15000 });
  check('idlePreloadBlob', !!ready && ready.type === 'video/mp4' && ready.size > 1e6, ready);
  check('preloadAtIdleNotAtBoot', reqs.length > 0 && reqs[0].f === 'joker.mp4' && reqs[0].ms > 2500, reqs.slice(0, 2));
  check('onlyNextClipFetched', reqs.filter((r) => r.f.endsWith('.mp4')).length === 1, reqs.map((r) => r.f));

  const L = await startLogging(P);
  check('foundLift', !!L, L && L.name);
  const typedSi = L.work[L.work.length - 1];
  await P.tap(`input[data-fid="${L.ei}-${typedSi}-w"]`);
  await P.keyboard.type('77.5');
  const a1 = await arm(P, L.ei, L.work[0], 1.06);
  check('armedAboveRecord', a1.e1 > a1.rec, a1);
  const before = await P.evaluate(() => __snap());

  // record 1: a real tap, full cut
  const t1 = Date.now();
  const hit = await tapSdone(P, L.ei, L.work[0]);
  check('realTapOnSwitch', hit === 'own-hx' || hit === 'host', hit);
  const o1 = await waitFor(P, playing, { timeout: 3000, step: 30 });
  check('overlayPlays', !!o1, o1);
  if (o1) {
    check('blobVideo', o1.video.src === 'blob:', o1.video.src);
    check('aboveEverything', o1.full && o1.top && +o1.z >= 10000, { full: o1.full, top: o1.top, z: o1.z });
    check('firstIsJoker', o1.clip === 'joker' && !o1.short, o1.clip);
    check('fullCutFromStart', o1.video.t < 1.0, o1.video.t);
    check('soundTriedFirst', o1.video.muted === false, o1.video.muted);
  }
  await P.evaluate(() => {
    const el = document.getElementById('prfin'), v = el.querySelector('video'); window.__pf = { stampAt: null, ended: false };
    new MutationObserver(() => { if (el.classList.contains('pf-on') && window.__pf.stampAt == null) window.__pf.stampAt = v.currentTime; }).observe(el, { attributes: true, attributeFilter: ['class'] });
    v.addEventListener('ended', () => { window.__pf.ended = true; });
  });
  await sleep(1500); await shot(P, '1-action');
  const during = await P.evaluate(() => __snap());
  check('stampNotYetInAction', !(await P.evaluate(() => window.__probe().on)));
  await waitFor(P, () => window.__probe() && window.__probe().on, { timeout: 7000, step: 40 });
  await sleep(550); await shot(P, '1-stamp');
  const stamp = await P.evaluate(() => {
    const q = (s) => document.querySelector('#prfin ' + s), r = q('.pf-stamp').getBoundingClientRect(), n = q('.pf-num').getBoundingClientRect();
    return { eye: q('.pf-eye').textContent, lift: q('.pf-lift').textContent, num: q('.pf-num').textContent, sub: q('.pf-sub').textContent, font: getComputedStyle(q('.pf-num')).fontFamily,
      hair: getComputedStyle(q('.pf-hair')).transform, fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && n.width <= innerWidth, opacity: getComputedStyle(q('.pf-stamp')).opacity, pf: window.__pf.stampAt };
  });
  check('stampText', /new record/i.test(stamp.eye) && stamp.lift === L.name && stamp.num.startsWith(String(Math.round(a1.e1))) && /\+\d/.test(stamp.sub), stamp);
  check('stampBebas', /Bebas/.test(stamp.font), stamp.font);
  check('stampVisibleAndFits', stamp.fits && +stamp.opacity > 0.9, { fits: stamp.fits, opacity: stamp.opacity });
  check('stampInFinalSecond', stamp.pf != null && stamp.pf >= 4.8 && stamp.pf <= 6.05, stamp.pf);
  const closed1 = await waitFor(P, gone, { timeout: 6000, step: 50 });
  const dur1 = (Date.now() - t1) / 1000;
  const ended1 = await P.evaluate(() => (window.__pf ? window.__pf.ended : null));
  check('closesItself', !!closed1 && dur1 > 6 && dur1 < 9.5 && ended1 === true, { seconds: dur1, ended: ended1 });
  await sleep(300);
  const after1 = await P.evaluate(() => __snap());
  await shot(P, '1-after-crown');
  const want = JSON.parse(JSON.stringify(before.sets)); want[L.ei][L.work[0]][2] = true;
  check('sessionDataIntact', JSON.stringify(after1.sets) === JSON.stringify(want), { before: before.sets[L.ei], after: after1.sets[L.ei] });
  check('typedInputSurvives', after1.inputs.includes('77.5') && after1.sets[L.ei][typedSi][0] === '77.5', after1.inputs.slice(0, 8));
  check('restTimerUntouched', during.restRunning && after1.restRunning && after1.restEnd === during.restEnd, { during: during.restEnd, after: after1.restEnd });
  check('scrollUntouched', Math.abs(after1.scroll - during.scroll) <= 1, { during: during.scroll, after: after1.scroll });
  check('inRowCrownRemains', after1.crowns >= 1 && after1.prRows >= 1, { crowns: after1.crowns, rows: after1.prRows });
  check('stillLogging', after1.step === 'logging');
  check('rotationPersisted', await P.evaluate(() => state.data.prFin.i === 1 && JSON.parse(localStorage.getItem('gt_data')).prFin.i === 1));

  // record 2: starts at the impact; a tap skips; nothing falls through to the page
  await waitFor(P, () => _prf.b && _prf.i === 1, { timeout: 8000 });
  const a2 = await arm(P, L.ei, L.work[1], 1.12);
  const before2 = await P.evaluate(() => __snap());
  await tapSdone(P, L.ei, L.work[1]);
  const o2 = await waitFor(P, playing, { timeout: 3000, step: 30 });
  check('secondPlays', !!o2, o2);
  if (o2) {
    check('secondIsBane', o2.clip === 'bane' && o2.short, { clip: o2.clip, short: o2.short });
    check('secondStartsNearImpact', o2.video.t >= 0.85 && o2.video.t < 2.0, { t: o2.video.t, impact: 1.3 });
  }
  await sleep(700); await shot(P, '2-short');
  const tSkip = Date.now(); await tapMiddle(P);
  const skipped = await waitFor(P, gone, { timeout: 1500, step: 30 });
  check('tapSkips', !!skipped && Date.now() - tSkip < 900, Date.now() - tSkip);
  const after2 = await P.evaluate(() => __snap());
  const want2 = JSON.parse(JSON.stringify(before2.sets)); want2[L.ei][L.work[1]][2] = true;
  check('skipTapFallsThroughNowhere', JSON.stringify(after2.sets) === JSON.stringify(want2), after2.sets[L.ei]);

  // rotation: Two-Face, Penguin, Scarecrow, then Joker again (wrap); each is a short cut, each skipped by a tap
  const seq = ['joker', o2 ? o2.clip : '?'];
  for (let k = 2; k < 6; k++) {
    await waitFor(P, (k) => _prf.b && _prf.i === k % 5, { timeout: 8000 }, k);
    await arm(P, L.ei, L.work[0], 1.05);
    await P.evaluate((ei, si) => toggleDone(ei, si), L.ei, L.work[0]);
    const o = await waitFor(P, playing, { timeout: 3000, step: 30 });
    seq.push(o ? o.clip + (o.short ? '' : '!full') : 'NONE');
    await sleep(500); await tapMiddle(P);
    await waitFor(P, gone, { timeout: 1500, step: 30 });
  }
  check('rotationOrder', JSON.stringify(seq) === JSON.stringify(['joker', 'bane', 'two-face', 'penguin', 'scarecrow', 'joker']), seq);
  check('neverSameTwice', seq.every((c, i) => i === 0 || c !== seq[i - 1]));
  await sleep(300);
  check('rotationWrapsPersisted', await P.evaluate(() => state.data.prFin.i === 1 && JSON.parse(localStorage.getItem('gt_data')).prFin.i === 1));

  // sound refused (autoplay policy): muted + the app's own impact sfx at the impact
  await P.evaluate(() => {
    const op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { return this.muted ? op.call(this) : Promise.reject(new DOMException('blocked', 'NotAllowedError')); };
    const os_ = window.sfx; window.__sfx = []; window.sfx = (k) => { window.__sfx.push([k, performance.now()]); return os_(k); };
  });
  await waitFor(P, () => _prf.b && _prf.i === 1, { timeout: 8000 });
  await arm(P, L.ei, L.work[0], 1.05);
  await P.evaluate((ei, si) => toggleDone(ei, si), L.ei, L.work[0]);
  const om = await waitFor(P, playing, { timeout: 3000, step: 30 });
  const tPlay = await P.evaluate(() => performance.now());
  await sleep(1300);
  const slam = await P.evaluate(() => window.__sfx.filter((x) => x[0] === 'slam'));
  check('refusedSoundFallsBackMuted', !!om && om.video.muted === true && om.clip === 'bane', om && { muted: om.video.muted, clip: om.clip });
  check('ownImpactSfxAtImpact', slam.length === 1 && slam[0][1] - tPlay < 1100, slam);
  await tapMiddle(P); await waitFor(P, gone, { timeout: 1500, step: 30 });

  // a lift with no standing record: the crown, never the finisher
  await P.evaluate((ei) => { window.__savedRec = null; const j = state.session.exercises.findIndex((e, i) => i !== ei && state.data.prs[e.name] && !exFor(e.name).bw && e.sets.some((s) => s.type !== 'W')); window.__j = j; const e = state.session.exercises[j]; window.__savedRec = [e.name, state.data.prs[e.name]]; delete state.data.prs[e.name]; const si = e.sets.findIndex((s) => s.type !== 'W'); window.__sj = si; const s = e.sets[si]; s.w = '60'; s.r = '8'; render(); }, L.ei);
  await P.evaluate(() => toggleDone(window.__j, window.__sj));
  await sleep(900);
  const first = await P.evaluate(() => ({ overlay: !!document.getElementById('prfin'), crown: document.querySelectorAll('.lg2-sr.pr').length, rec: (state.session._prRows || {})[window.__j + ':' + window.__sj] }));
  check('noStandingRecordNoFinisher', !first.overlay && !!first.rec, first);
  await P.evaluate(() => { const [n, r] = window.__savedRec; state.data.prs[n] = r; });

  check('A_noConsoleErrors', ctx.log.errors.length === 0, ctx.log.errors.slice(0, 3));
  check('A_noFailedRequests', ctx.log.failed.length === 0, ctx.log.failed.slice(0, 3));
  await ctx.close();

  // ───────────────────────── B: offline / slow ─────────────────────────
  const cb = await launch({ fixture: FIXTURE, clips: true, width: WIDTH });
  const B = cb.page;
  await B.evaluateOnNewDocument(() => {
    window.__prfMode = 'fail'; const of = window.fetch.bind(window);
    window.fetch = (u, ...a) => {
      if (/assets\/pr\//.test(String((u && u.url) || u))) {
        if (window.__prfMode === 'fail') return Promise.reject(new TypeError('Load failed'));
        if (window.__prfMode === 'slow') return new Promise((r) => setTimeout(r, 1500)).then(() => of(u, ...a));
      }
      return of(u, ...a);
    };
  });
  await open(cb, { settle: 800 });
  await sleep(4200);   // past the idle preload (3.5 s): it must fail quietly
  check('B_offlineWarmFailsQuietly', await B.evaluate(() => _prf.b === null && _prf.i === -1));
  const LB = await startLogging(B);
  await arm(B, LB.ei, LB.work[0], 1.06);
  await tapSdone(B, LB.ei, LB.work[0]);
  let sawOverlay = false;
  for (let k = 0; k < 12; k++) { await sleep(100); if (await B.evaluate(() => !!document.getElementById('prfin'))) sawOverlay = true; }
  let sb = await B.evaluate(() => __snap());
  await shot(B, 'offline-crown');
  check('B_offlineNoOverlayCrownShown', !sawOverlay && sb.crowns >= 1 && sb.sets[LB.ei][LB.work[0]][2] === true, { sawOverlay, crowns: sb.crowns });
  check('B_rotationNotAdvanced', await B.evaluate(() => !state.data.prFin && !state.session._finN));
  await B.evaluate(() => { window.__prfMode = 'slow'; prfWarm(); });
  check('B_slowIsLoading', await B.evaluate(() => _prf.i === 0 && _prf.b === null && !!_prf.p));
  await arm(B, LB.ei, LB.work[1], 1.10);
  await tapSdone(B, LB.ei, LB.work[1]);
  sawOverlay = false;
  for (let k = 0; k < 10; k++) { await sleep(100); if (await B.evaluate(() => !!document.getElementById('prfin'))) sawOverlay = true; }
  sb = await B.evaluate(() => __snap());
  check('B_slowSkipsFinisherKeepsCrown', !sawOverlay && sb.crowns >= 2 && sb.sets[LB.ei][LB.work[1]][2] === true, { sawOverlay, crowns: sb.crowns });
  const rdy = await waitFor(B, () => _prf.b && _prf.i === 0, { timeout: 5000 });
  check('B_readyAfterWaiting', !!rdy);
  await arm(B, LB.ei, LB.work[2], 1.14);
  await tapSdone(B, LB.ei, LB.work[2]);
  const ob = await waitFor(B, playing, { timeout: 3000, step: 30 });
  check('B_nextRecordPlaysJokerFullCut', !!ob && ob.clip === 'joker' && !ob.short && ob.video.t < 1.0, ob);
  await sleep(600); await tapMiddle(B); await waitFor(B, gone, { timeout: 1500, step: 30 });
  check('B_noConsoleErrors', cb.log.errors.length === 0, cb.log.errors.slice(0, 3));
  await cb.close();

  // ───────────────────────── C: reduced motion ─────────────────────────
  const cc = await launch({ fixture: FIXTURE, clips: true, width: WIDTH });
  const C = cc.page; const creqs = [];
  C.on('request', (rq) => { if (rq.url().includes('/assets/pr/')) creqs.push(rq.url().split('/').pop()); });
  await C.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(cc, { settle: 800 });
  const rc = await waitFor(C, () => (_prf.b && _prf.i === 0 ? { still: _prf.still, type: _prf.b.type } : null), { timeout: 15000 });
  check('C_posterOnlyFetched', !!rc && rc.still === true && rc.type === 'image/jpeg' && creqs.every((f) => f.endsWith('.jpg')), { rc, creqs });
  const LC = await startLogging(C);
  await arm(C, LC.ei, LC.work[0], 1.06);
  const tc = Date.now();
  await tapSdone(C, LC.ei, LC.work[0]);
  const oc = await waitFor(C, () => { const p = window.__probe(); return p && p.img ? p : null; }, { timeout: 2000, step: 30 });
  await sleep(150); await shot(C, 'reduced-poster');
  check('C_posterAndStampNoVideo', !!oc && oc.on && oc.video === null && oc.top, oc);
  const gc = await waitFor(C, gone, { timeout: 3000, step: 50 });
  const dc = (Date.now() - tc) / 1000;
  check('C_closesAfterAbout1_2s', !!gc && dc > 1.0 && dc < 2.6, dc);
  check('C_noConsoleErrors', cc.log.errors.length === 0, cc.log.errors.slice(0, 3));
  await cc.close();

  // ───────────────────────── D: with the REAL service worker ─────────────────────────
  // sw.js keeps the clip the first boot fetched (same-origin GET, network-first); the second boot reads it from the Cache API: no network at all.
  const cd = await launch({ fixture: FIXTURE, clips: true, width: WIDTH });
  const D = cd.page;
  await D.setBypassServiceWorker(false);
  await D.evaluateOnNewDocument(() => {
    const of = window.fetch.bind(window); window.__prFetch = 0;
    window.fetch = (u, ...a) => { if (/assets\/pr\//.test(String((u && u.url) || u))) window.__prFetch++; return of(u, ...a); };
  });
  const evalSafe = async (fn, ...args) => { try { return await D.evaluate(fn, ...args); } catch (e) { return null; } };   // the first install reloads the page once
  const waitD = async (fn, timeout) => { const t0 = Date.now(); for (;;) { const v = await evalSafe(fn); if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(150); } };
  await D.goto(cd.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const ctl = await waitD(() => !!navigator.serviceWorker.controller, 20000);
  const boot1 = await waitD(() => (_prf.b && _prf.i === 0 ? { fetches: window.__prFetch, size: _prf.b.size } : null), 20000);
  check('D_firstBootFetchesThroughServiceWorker', !!ctl && !!boot1 && boot1.fetches === 1, { controlled: !!ctl, boot1 });
  const kept = await evalSafe(async () => { const r = await caches.match('assets/pr/joker.mp4', { ignoreVary: true }); return r ? (await r.blob()).size : 0; });
  check('D_serviceWorkerKeptTheClip', kept > 1e6, kept);
  await D.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  const second = await waitD(() => (_prf.b && _prf.i === 0 ? { fetches: window.__prFetch, size: _prf.b.size } : null), 20000);
  check('D_secondBootReadsCacheNoNetwork', !!second && second.fetches === 0 && second.size === (boot1 && boot1.size), second);
  check('D_noConsoleErrors', cd.log.errors.length === 0, cd.log.errors.slice(0, 3));
  await cd.close();
} catch (e) { R.fatal = String((e && e.stack) || e).slice(0, 600); fails.push('fatal'); }

const passed = Object.values(R).filter((v) => v === true || (v && v.ok === true)).length;
console.log(JSON.stringify(R, null, 1));
console.log(fails.length ? `FAIL (${fails.length}): ${fails.join(', ')}` : `PASS (${passed} checks) — shots in ${OUT}`);
process.exit(fails.length ? 1 : 0);
