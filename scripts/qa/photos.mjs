// Progress photos (wave 7): full photos move into IndexedDB behind a safety copy, gt_data keeps thumbnails, Compare (slide + side by side),
// single view + delete, add, backup export, restore round-trip, erase. Seeds synthetic JPEGs; no network. node photos.mjs [--file html] [--width 393] [--out dir]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const FIXTURE = fileURLToPath(new URL('./fixture-train.json', import.meta.url));
const out = A.out || '';
const R = {}; const errors = []; const warnings = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gt-photos-'));
const DAYS_AGO = [60, 30, 2]; const BW = [86, 84.5, 83]; const IDS = ['phq0', 'phq1', 'phq2'];

// ---- in-page: a synthetic "photo" (gradient, a figure that widens with i, texture so the JPEG has a realistic weight)
const gen = (i, w, h) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${30 + i * 70},45%,24%)`); g.addColorStop(1, `hsl(${200 + i * 40},40%,10%)`); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = `hsl(${25 + i * 10},35%,${52 + i * 5}%)`; const cx = w / 2, bw = w * (0.2 + i * 0.06);
  c.beginPath(); c.ellipse(cx, h * 0.2, w * 0.09, w * 0.11, 0, 0, 7); c.fill(); c.fillRect(cx - bw, h * 0.3, bw * 2, h * 0.42);
  let s = 1234 + i; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 6000; k++) { c.fillStyle = `rgba(${rnd() * 255 | 0},${rnd() * 255 | 0},${rnd() * 255 | 0},.18)`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 2 + rnd() * 5); }
  c.fillStyle = '#fff'; c.font = 'bold 64px sans-serif'; c.fillText('PHOTO ' + (i + 1), 40, h - 50);
  return cv.toDataURL('image/jpeg', 0.72);
};
const dims = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = src; });
const IDB_ALL = () => new Promise(async (res, rej) => {
  const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'gainstracker' }];
  if (!dbs.some((d) => d.name === 'gainstracker')) return res({ photos: {}, meta: {}, absent: true });
  const r = indexedDB.open('gainstracker'); r.onerror = () => rej(r.error);
  r.onsuccess = () => {
    const d = r.result, o = { photos: {}, meta: {} }, t = d.transaction(['photos', 'meta'], 'readonly');
    ['photos', 'meta'].forEach((n) => { t.objectStore(n).openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { o[n][c.key] = c.value; c.continue(); } }; });
    t.oncomplete = () => { d.close(); res(o); }; t.onerror = () => rej(t.error);
  };
});
const IDB_CLEAR = (stray) => new Promise((res, rej) => {
  const r = indexedDB.open('gainstracker'); r.onerror = () => rej(r.error);
  r.onsuccess = () => { const d = r.result, t = d.transaction(['photos', 'meta'], 'readwrite'); t.objectStore('photos').clear(); t.objectStore('meta').clear(); if (stray) t.objectStore('photos').put('data:image/jpeg;base64,AAAA', stray); t.oncomplete = () => { d.close(); res(); }; t.onerror = () => rej(t.error); };
});

const IDB_DEL = (id) => new Promise((res, rej) => {
  const r = indexedDB.open('gainstracker'); r.onerror = () => rej(r.error);
  r.onsuccess = () => { const d = r.result, t = d.transaction('photos', 'readwrite'); t.objectStore('photos').delete(id); t.oncomplete = () => { d.close(); res(); }; t.onerror = () => rej(t.error); };
});

async function mk() {
  const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: FIXTURE, width: A.width || null });
  // QA hook: sessionStorage.__corrupt = "<id>" makes the vault read that photo back with one byte changed (proves a failed verify leaves the photo alone)
  await ctx.page.evaluateOnNewDocument(() => {
    try {
      const og = IDBObjectStore.prototype.get, rd = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result').get;
      IDBObjectStore.prototype.get = function (k) { const rq = og.call(this, k); if (sessionStorage.getItem('__corrupt') === k) Object.defineProperty(rq, 'result', { get() { const v = rd.call(rq); return typeof v === 'string' ? v + '#' : v; } }); return rq; };
    } catch (e) {}
  });
  const P = ctx.page, ev = (f, ...a) => P.evaluate(f, ...a);
  const waitFor = async (f, a = [], ms = 12000) => { const t0 = Date.now(); for (;;) { const v = await ev(f, ...a); if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(120); } };
  const shot = async (n) => { if (out) { fs.mkdirSync(out, { recursive: true }); await P.screenshot({ path: path.join(out, n + '.png') }); } };
  const gtPhotos = () => ev(() => JSON.parse(localStorage.getItem('gt_data')).photos);
  const modalOk = async () => { await waitFor(() => document.getElementById('modal').classList.contains('on'), [], 3000); await ev(() => document.getElementById('m-ok').click()); await sleep(250); };
  return { ctx, P, ev, waitFor, shot, gtPhotos, modalOk, idb: () => ev(IDB_ALL) };
}
const seed = (M, imgs) => M.ev((imgs, ids, ago, bw) => {
  const t = Date.now();
  state.data.photos = imgs.map((img, i) => ({ id: ids[i], date: new Date(t - ago[i] * 864e5).toISOString(), img, bw: bw[i], note: '' }));
  save(); return localStorage.getItem('gt_data').length;
}, imgs, IDS, DAYS_AGO, BW);
const allVaulted = () => state.data.photos.length >= 3 && state.data.photos.every((p) => p.idb === 1);

// =====================================================================================================
const M = await mk(); const { ctx, P, ev, waitFor, shot } = M;
try {
  await open(ctx, { settle: 1200 });
  const orig = []; for (let i = 0; i < 3; i++) orig.push(await ev(gen, i, 615, 820));
  const sizeBefore = await seed(M, orig);
  R.seedFullKB = Math.round(orig.reduce((a, s) => a + s.length, 0) / 1024);

  // ---- boot 1: the vault answers phq1 with a changed byte -> that photo must stay exactly as it was
  await ev(() => sessionStorage.setItem('__corrupt', 'phq1'));
  await open(ctx, { settle: 300 });
  await waitFor(() => state.data.photos.filter((p) => p.idb === 1).length >= 2, [], 15000); await sleep(900);
  const p1 = await M.gtPhotos();
  R.failedVerifyLeavesPhotoUntouched = !p1[1].idb && p1[1].img === orig[1] && p1[0].idb === 1 && p1[2].idb === 1;
  R.safetyCopyWrittenBeforeMove = await ev((o) => { try { const b = JSON.parse(localStorage.getItem('gt_photos_backup')); return ['phq0', 'phq1', 'phq2'].every((id, i) => b.imgs[id] === o[i]); } catch (e) { return false; } }, orig);

  // ---- boot 2: healthy vault -> the rest moves; everything byte-identical in IndexedDB
  await ev(() => sessionStorage.removeItem('__corrupt'));
  await open(ctx, { settle: 300 });
  R.allThreeMoved = !!(await waitFor(allVaulted, [], 15000)); await sleep(500);
  const idb = await M.idb(), gt = await M.gtPhotos();
  R.idbHasThreeByteIdentical = Object.keys(idb.photos).length === 3 && IDS.every((id, i) => idb.photos[id] === orig[i]);
  R.gtDataHoldsThumbsAndFlags = gt.length === 3 && gt.every((p) => p.idb === 1 && p.img.startsWith('data:image/jpeg') && p.img.length < 30000 && p.img !== orig[0]);
  const thumbDims = await ev(async (imgs, dimsSrc) => { const d = eval('(' + dimsSrc + ')'); return Promise.all(imgs.map(d)); }, gt.map((p) => p.img), dims.toString());
  R.thumbsAreSmall = thumbDims.every(([w, h]) => Math.max(w, h) <= 240 && Math.max(w, h) >= 100);
  const sizeAfter = await ev(() => localStorage.getItem('gt_data').length);
  R.gtDataShrank = sizeAfter < sizeBefore - 100000; R.gtDataBytes = { before: sizeBefore, after: sizeAfter };
  R.metadataKept = gt.every((p, i) => p.id === IDS[i] && p.bw === BW[i] && !!p.date);

  // ---- boot 3: the vault lost phq1 in between -> it is restored from the safety copy, then the copy is dropped once every vaulted photo reads back
  await ev(IDB_DEL, 'phq1');
  await open(ctx, { settle: 300 }); await sleep(1800);
  R.lostVaultPhotoRestoredFromSafetyCopy = (await M.idb()).photos.phq1 === orig[1];
  const gt3 = await M.gtPhotos();
  R.idempotentReboot = JSON.stringify(gt3) === JSON.stringify(gt);
  R.safetyCopyDropped = (await ev(() => localStorage.getItem('gt_photos_backup'))) === null && Object.keys((await M.idb()).meta).length === 0;

  // ---- Suit card + dock: one Compare entry, no duplicates
  await ev(() => { __qa.tab('suit'); }); await sleep(500);
  R.cardOnce = await ev(() => document.querySelectorAll('#gs-photos').length === 1 && document.querySelectorAll('#gs-photos .pc-th:not(.pc-add)').length === 3 && document.querySelectorAll('#gs-photos .pc-add').length === 1);
  R.oneCompareButton = await ev(() => [...document.querySelectorAll('#app button')].filter((b) => /^\s*Compare\s*$/.test(b.textContent)).length === 1);
  R.legacyViewsGone = await ev(() => typeof openPhotoTimeline === 'undefined' && typeof compareProgress === 'undefined');
  R.dockTileSaysCompare = await ev(() => { const b = [...document.querySelectorAll('.gd-t')].find((x) => /^Photos/.test(x.getAttribute('aria-label') || '')); return !!b && /Compare/.test(b.textContent); });
  await ev(() => document.getElementById('gs-photos').scrollIntoView({ block: 'center' })); await sleep(500); await shot('1-suit-photos-card');
  R.stripThumbsAreThumbnails = await ev(() => [...document.querySelectorAll('#gs-photos .pc-th img')].every((i) => i.src.length < 30000));

  // ---- Compare opens from the dock tile, starts first vs latest on thumbnails, then swaps to the full photos
  await ev(() => { [...document.querySelectorAll('.gd-t')].find((x) => /^Photos/.test(x.getAttribute('aria-label') || '')).click(); }); await sleep(700);
  R.compareOpensFromDock = await ev(() => !!document.querySelector('#sheet.on .pc[data-mode="slide"]'));
  R.defaultsFirstVsLatest = await ev(() => state._pc.b === 'phq0' && state._pc.a === 'phq2');
  R.stageSwapsToFullPhotos = !!(await waitFor((o) => document.querySelector('#pc-stage .pc-b img').src === o[0] && document.querySelector('#pc-stage .pc-a img').src === o[2], [orig], 6000));
  R.compareStats = await ev(() => [...document.querySelectorAll('#pc-stats .pc-stat')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()));
  R.daysBetweenOk = /^58 days apart/.test(R.compareStats[0]) && /^−3 kg weight/.test(R.compareStats[1]) && /^\d+ sessions/.test(R.compareStats[2]);
  R.compareFitsWithoutScroll = await ev(() => { const s = document.getElementById('sheet'); return s.scrollHeight <= s.clientHeight + 1; });
  R.captionsShowDateAndWeight = await ev(() => [...document.querySelectorAll('#pc-stage figcaption')].every((f) => /\d{4}|\d{2}/.test(f.textContent) && /kg/.test(f.textContent)));
  await sleep(350); await shot('2-compare-slide');

  // ---- the divider: mouse drag, tap, touch drag, keyboard
  const box = await ev(() => { const r = document.getElementById('pc-stage').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const X = (f) => box.x + box.w * f, Y = box.y + box.h * 0.4;
  const near = (a, b, t = 5) => Math.abs(a - b) <= t, px = () => ev(() => state._pc.x);
  R.stageIsPortraitAndFitsPhone = box.w / box.h > 0.74 && box.w / box.h < 0.82 && box.w <= 393 - 32 + 1 && box.h >= 240;
  await P.mouse.move(X(0.5), Y); await P.mouse.down(); await P.mouse.move(X(0.28), Y, { steps: 6 }); await P.mouse.up();
  R.mouseDragMovesDivider = near(await px(), 28);
  R.cssVarFollows = await ev(() => Math.abs(parseFloat(document.getElementById('pc-stage').style.getPropertyValue('--x')) - state._pc.x) < 0.5);
  await P.mouse.click(X(0.8), Y); await sleep(260);
  R.tapJumpsDivider = near(await px(), 80);
  const th = await P.touchscreen.touchStart(X(0.8), Y); await th.move(X(0.6), Y); await th.move(X(0.4), Y + 4); await th.end(); await sleep(120);
  R.touchDragMovesDivider = near(await px(), 40, 8);
  await ev(() => document.getElementById('pc-grip').focus()); await P.keyboard.press('ArrowLeft'); await P.keyboard.press('ArrowLeft');
  R.keyboardMovesDivider = near(await px(), 30, 8) && (await ev(() => document.getElementById('pc-grip').getAttribute('aria-valuenow'))) === String(Math.round(await px()));
  const clipLeft = await ev(() => getComputedStyle(document.querySelector('#pc-stage .pc-a')).clipPath);
  R.afterIsClippedByX = /inset\(/.test(clipLeft);
  await P.mouse.click(X(0.5), Y); await sleep(300); await shot('3-compare-slide-mid');

  // ---- side by side: same two photos, two portrait cards, no divider
  await ev(() => document.querySelectorAll('.pc-seg button')[1].click()); await sleep(300);
  const side = await ev(() => { const f = [...document.querySelectorAll('#pc-stage .pc-ph')].map((e) => e.getBoundingClientRect()); return { f: f.map((r) => [r.left, r.right, r.width, r.height]), grip: getComputedStyle(document.getElementById('pc-grip')).display, mode: document.querySelector('.pc').dataset.mode, on: document.querySelectorAll('.pc-seg button.on').length }; });
  R.sideBySideLaysOutTwoCards = side.mode === 'side' && side.f.length === 2 && side.f[0][1] <= side.f[1][0] + 1 && side.f.every((r) => r[2] > 140 && near(r[2] / r[3], 0.75, 0.03)) && side.grip === 'none' && side.on === 1;
  await shot('4-compare-side'); await ev(() => document.querySelectorAll('.pc-seg button')[0].click()); await sleep(250);

  // ---- picking: any two; Before hands over to After; Before is always the older photo
  await ev(() => document.querySelectorAll('#pc-strip .pc-th')[1].click()); await sleep(150);
  const pk1 = await ev(() => ({ b: state._pc.b, a: state._pc.a, act: state._pc.act, days: document.querySelector('#pc-stats .pc-stat .num').textContent, tags: [...document.querySelectorAll('#pc-strip .pc-th')].map((t) => (t.classList.contains('is-b') ? 'B' : t.classList.contains('is-a') ? 'A' : '-')).join('') }));
  R.pickSetsBeforeThenHandsToAfter = pk1.b === 'phq1' && pk1.a === 'phq2' && pk1.act === 'a' && pk1.days === '28' && pk1.tags === '-BA';
  await ev(() => document.querySelectorAll('#pc-strip .pc-th')[0].click()); await sleep(150);   // After := oldest photo -> older than Before -> they swap
  R.beforeIsAlwaysOlder = await ev(() => state._pc.b === 'phq0' && state._pc.a === 'phq1');
  R.pickSwapsStageImage = !!(await waitFor((o) => document.querySelector('#pc-stage .pc-b img').src === o[0] && document.querySelector('#pc-stage .pc-a img').src === o[1], [orig], 5000));
  await ev(() => document.querySelectorAll('.pc-slot')[0].click()); await ev(() => document.querySelectorAll('#pc-strip .pc-th')[2].click()); await sleep(150);
  R.slotButtonChoosesTarget = await ev(() => state._pc.b === 'phq1' && state._pc.a === 'phq2');
  await shot('5-compare-picked');

  // ---- single photo: opens on the thumbnail, swaps to the full photo, delete asks first and removes it from BOTH stores
  await ev(() => closeSheet()); await sleep(300);
  await ev(() => document.querySelector('#gs-photos .pc-th:not(.pc-add)').click()); await sleep(500);
  R.viewShowsFullPhoto = !!(await waitFor((o) => document.getElementById('pv-img') && document.getElementById('pv-img').src === o[2], [orig], 5000));
  await shot('6-photo-view');
  await ev(() => document.querySelector('.pc-acts .btn.danger').click()); await sleep(250);
  R.deleteAsksFirst = await ev(() => document.getElementById('modal').classList.contains('on'));
  await ev(() => document.getElementById('m-cancel').click()); await sleep(200);
  R.cancelKeepsPhoto = (await ev(() => state.data.photos.length)) === 3 && Object.keys((await M.idb()).photos).length === 3;
  await ev(() => document.querySelector('.pc-acts .btn.danger').click()); await M.modalOk(); await sleep(400);
  const idbDel = await M.idb(), gtDel = await M.gtPhotos();
  R.deleteRemovesFromBoth = gtDel.length === 2 && !gtDel.some((p) => p.id === 'phq2') && Object.keys(idbDel.photos).length === 2 && !('phq2' in idbDel.photos);

  // ---- add: a landscape 1600x1200 camera file is downscaled, vaulted full, thumbnailed in gt_data
  const camPath = path.join(tmp, 'cam.jpg');
  fs.writeFileSync(camPath, Buffer.from((await ev(gen, 5, 1600, 1200)).split(',')[1], 'base64'));
  await ev(() => document.getElementById('gs-photos').scrollIntoView({ block: 'center' })); await sleep(200);
  await (await P.$('#gs-photos .pc-add input')).uploadFile(camPath);
  R.addedPhotoVaulted = !!(await waitFor(() => state.data.photos.length === 3 && state.data.photos.every((p) => p.idb === 1), [], 8000));
  const idbAdd = await M.idb(), gtAdd = await M.gtPhotos(), fresh = gtAdd.find((p) => !IDS.includes(p.id));
  const fd = fresh ? await ev(async (a, b, dimsSrc) => { const d = eval('(' + dimsSrc + ')'); return [await d(a), await d(b)]; }, idbAdd.photos[fresh.id] || '', fresh.img, dims.toString()) : [[0, 0], [0, 0]];
  R.addDownscalesAndThumbnails = !!fresh && Math.max(...fd[0]) <= 820 && Math.max(...fd[0]) >= 600 && Math.max(...fd[1]) <= 240 && fresh.img.length < 30000 && idbAdd.photos[fresh.id].length > fresh.img.length;

  // ---- backup: the file carries every FULL photo inline (the old shape), no vault flags
  await ev(() => { window.__blobs = []; window.__dl = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { window.__blobs.push(b); return o(b); }; HTMLAnchorElement.prototype.click = function () { window.__dl.push(this.download); }; });
  await ev(() => { backupData(); });
  R.backupDownloads = !!(await waitFor(() => window.__blobs.length === 1 && window.__dl.length === 1, [], 8000));
  const bk = JSON.parse(await ev(() => window.__blobs[0].text()));
  const idbNow = await M.idb();
  R.backupHasFullPhotos = bk.photos.length === 3 && bk.photos.every((p) => p.img === idbNow.photos[p.id] && !('idb' in p) && p.img.length > 30000) && bk.photos.filter((p) => IDS.includes(p.id)).every((p) => p.img === orig[IDS.indexOf(p.id)]);
  R.backupKeepsTrainingData = bk.workouts.length > 20 && !!bk.u;
  const bkFile = path.join(tmp, 'backup.json'); fs.writeFileSync(bkFile, JSON.stringify(bk));

  // ---- restore: empty the vault (plus one stray photo of "the replaced data"), restore the file -> photos come back byte-identical, the stray is gone
  await ev(IDB_CLEAR, 'stray');
  R.vaultEmptiedForRestore = Object.keys((await M.idb()).photos).join() === 'stray';
  const [ch] = await Promise.all([P.waitForFileChooser({ timeout: 4000 }), ev(() => { restoreData(); })]); await ch.accept([bkFile]); await sleep(400);
  await M.modalOk();
  R.restoreRebuildsVault = !!(await waitFor(allVaulted, [], 10000)); await sleep(500);
  const idbR = await M.idb(), gtR = await M.gtPhotos();
  R.restoreWritesFullPhotosBack = bk.photos.every((p) => idbR.photos[p.id] === p.img);
  R.restorePrunesStray = !('stray' in idbR.photos) && Object.keys(idbR.photos).length === 3;
  R.restoreKeepsThumbsInGtData = gtR.length === 3 && gtR.every((p) => p.idb === 1 && p.img.length < 30000);
  await ev(() => { __qa.tab('suit'); }); await sleep(300);
  await ev(() => photosOpen()); await sleep(600);
  const fullById = Object.fromEntries(bk.photos.map((p) => [p.id, p.img]));
  R.compareWorksAfterRestore = !!(await waitFor((m) => { const b = document.querySelector('#pc-stage .pc-b img'), a = document.querySelector('#pc-stage .pc-a img'); return !!b && !!a && b.src === m[state._pc.b] && a.src === m[state._pc.a]; }, [fullById], 6000));

  // ---- the vault lost one photo (evicted, say): the single view says "thumbnail only" and the backup toast warns instead of silently shrinking the file
  await ev(() => { closeSheet(); PH_CACHE.clear(); });
  const lostId = await ev(() => state.data.photos[0].id);
  await ev(IDB_DEL, lostId);
  await ev((id) => viewProgress(id), lostId);
  R.missingFullPhotoIsSaid = !!(await waitFor(() => /Thumbnail only/.test((document.querySelector('.pc-solo figcaption') || {}).textContent || ''), [], 4000));
  await ev(() => { closeSheet(); window.__blobs = []; _toastQ.length = 0; _toastBusy = false; const t = document.getElementById('toast'); clearTimeout(t._t); t.textContent = ''; backupData(); });
  R.backupWarnsAboutThumbnails = !!(await waitFor(() => window.__blobs.length === 1 && /thumbnail/.test(document.getElementById('toast').textContent), [], 6000));

  // ---- erase everything: the vault and any safety copy go too
  await ev(() => { closeSheet(); openDataControl(); wipeData(); }); await sleep(200); await M.modalOk();
  await waitFor(() => !!document.getElementById('m-input'), [], 3000); await P.type('#m-input', 'ERASE'); await ev(() => document.getElementById('m-ok').click()); await sleep(700);
  const idbE = await M.idb();
  R.eraseEmptiesVault = Object.keys(idbE.photos).length === 0 && Object.keys(idbE.meta).length === 0 && (await ev(() => localStorage.getItem('gt_photos_backup'))) === null;
  errors.push(...ctx.log.errors); warnings.push(...ctx.log.warnings);
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 700); errors.push(...ctx.log.errors); }
await ctx.close();

// =====================================================================================================
// A phone whose storage is already full must still be able to move its photos: the safety copy falls back to IndexedDB, the move still runs
{
  const F = await mk();
  try {
    await open(F.ctx, { settle: 1200 });
    const imgs = []; for (let i = 0; i < 3; i++) imgs.push(await F.ev(gen, i, 615, 820));
    await seed(F, imgs);
    const left = await F.ev((leave) => {   // fill localStorage until only ~leave chars are free
      let lo = 0, hi = 20000000; while (hi - lo > 2000) { const mid = (lo + hi) >> 1; try { localStorage.setItem('__junk', 'x'.repeat(mid)); lo = mid; } catch (e) { hi = mid; } }
      localStorage.setItem('__junk', 'x'.repeat(Math.max(0, lo - leave))); return lo;
    }, 40000);
    R.fullStorageFillWorked = left > 100000;
    await open(F.ctx, { settle: 300 });
    R.fullStorageStillMoves = !!(await F.waitFor(allVaulted, [], 20000)); await sleep(500);
    const idbF = await F.idb();
    R.fullStorageVaultIdentical = IDS.every((id, i) => idbF.photos[id] === imgs[i]);
    R.fullStorageSafetyCopyInIdb = !(await F.ev(() => localStorage.getItem('gt_photos_backup'))) && !!idbF.meta.gt_photos_backup && IDS.every((id, i) => idbF.meta.gt_photos_backup.imgs[id] === imgs[i]);
    R.fullStorageNoSaveBanner = await F.ev(() => !document.getElementById('savefail'));
    await open(F.ctx, { settle: 300 }); await sleep(1800);
    R.fullStorageCopyDroppedNextBoot = Object.keys((await F.idb()).meta).length === 0;
    await F.shot('7-full-storage-after');
    errors.push(...F.ctx.log.errors); warnings.push(...F.ctx.log.warnings);
  } catch (e) { R.fatalFull = String(e && e.stack || e).slice(0, 700); errors.push(...F.ctx.log.errors); }
  await F.ctx.close();
}

// IndexedDB unavailable (private mode, blocked): photos stay in gt_data exactly as before; adding, Compare and backup all still work
{
  const N = await mk();
  await N.ctx.page.evaluateOnNewDocument(() => { try { Object.defineProperty(window, 'indexedDB', { get: () => undefined, configurable: true }); } catch (e) {} });
  try {
    await open(N.ctx, { settle: 1200 });
    const imgs = []; for (let i = 0; i < 3; i++) imgs.push(await N.ev(gen, i, 615, 820));
    await seed(N, imgs);
    await open(N.ctx, { settle: 300 }); await sleep(2000);
    const g = await N.gtPhotos();
    R.noVaultKeepsPhotosInline = g.length === 3 && g.every((p, i) => !p.idb && p.img === imgs[i]);
    R.noVaultLeavesNoSafetyCopy = (await N.ev(() => localStorage.getItem('gt_photos_backup'))) === null;
    await N.ev(() => { __qa.tab('suit'); }); await sleep(400);
    const cam = path.join(tmp, 'cam2.jpg'); fs.writeFileSync(cam, Buffer.from((await N.ev(gen, 6, 1200, 1600)).split(',')[1], 'base64'));
    await N.ev(() => document.getElementById('gs-photos').scrollIntoView({ block: 'center' })); await sleep(200);
    await (await N.P.$('#gs-photos .pc-add input')).uploadFile(cam);
    R.noVaultAddStillWorks = !!(await N.waitFor(() => state.data.photos.length === 4 && !state.data.photos[3].idb && state.data.photos[3].img.length > 30000, [], 8000));
    await N.ev(() => photosOpen()); await sleep(700);
    R.noVaultCompareWorks = await N.ev(() => { const b = document.querySelector('#pc-stage .pc-b img'); return !!b && b.src.length > 30000 && !document.getElementById('savefail'); });
    await N.ev(() => { window.__blobs = []; URL.createObjectURL = ((o) => (b) => { window.__blobs.push(b); return o(b); })(URL.createObjectURL.bind(URL)); HTMLAnchorElement.prototype.click = function () {}; backupData(); });
    R.noVaultBackupKeepsPhotos = JSON.parse(await N.ev(() => window.__blobs[0].text())).photos.length === 4;
    errors.push(...N.ctx.log.errors); warnings.push(...N.ctx.log.warnings);
  } catch (e) { R.fatalNoVault = String(e && e.stack || e).slice(0, 700); errors.push(...N.ctx.log.errors); }
  await N.ctx.close();
}

R.consoleErrors = errors; R.expectedWarnings = warnings.filter((w) => /photos:/.test(w)).length; R.otherWarnings = warnings.filter((w) => !/photos:/.test(w));
const bad = Object.entries(R).filter(([k, v]) => v === false).map(([k]) => k);
if (errors.length) bad.push('consoleErrors');
console.log(JSON.stringify(Object.assign({ FAILED: bad }, R), null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(bad.length || R.fatal || R.fatalFull || R.fatalNoVault ? 1 : 0);
