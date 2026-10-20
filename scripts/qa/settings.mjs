// Settings + Data control behaviour: field validation, in-place segments, Alfred key, archive flow, search, restore guards, two-step erase, backup/CSV hooks.
// Downloads are stubbed (anchor click recorded, nothing written); the restore file chooser is driven for real. node settings.mjs [--file html] [--width 393] [--out dir]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const R = {}; const out = A.out || '';
const ev = (f, ...a) => P.evaluate(f, ...a);
const click = (sel, i = 0) => ev((s, i) => { const e = document.querySelectorAll(s)[i]; if (!e) return false; e.click(); return true; }, sel, i);
const shot = async (n) => { if (out) { fs.mkdirSync(out, { recursive: true }); await P.screenshot({ path: path.join(out, n + '.png') }); } };
const modalOpen = () => ev(() => document.getElementById('modal').classList.contains('on'));
const clearToasts = () => ev(() => { _toastQ.length = 0; _toastBusy = false; clearTimeout(document.getElementById('toast')._t); document.getElementById('toast').textContent = ''; });
const toastTxt = () => ev(() => (document.getElementById('toast') || {}).textContent || '');
try {
  await open(ctx, { settle: 1400 });
  await ev(() => { window.__dl = []; HTMLAnchorElement.prototype.click = function () { window.__dl.push(this.download); }; });
  // ---- settings
  await ev(() => { openSettings(); }); await sleep(250);
  R.settingsRows = await ev(() => document.querySelectorAll('#sheet .st-r, #sheet .gh-row').length);
  await ev(() => { const i = document.querySelectorAll('#sheet .st-i input')[0]; i.value = '5'; i.dispatchEvent(new Event('change')); });
  R.badBodyweightReverted = await ev(() => state.data.u.bodyweight !== 5 && document.querySelectorAll('#sheet .st-i input')[0].value !== '5');
  R.badBodyweightToast = /30 to 300/.test(await toastTxt());
  await ev(() => { const i = document.querySelectorAll('#sheet .st-i input')[0]; i.value = '91.5'; i.dispatchEvent(new Event('change')); });
  R.bodyweightSaved = await ev(() => state.data.u.bodyweight === 91.5);
  await ev(() => { const i = document.querySelector('#sheet .st-name'); i.value = 'Wayne'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); });
  R.nameSaved = await ev(() => state.data.u.name === 'Wayne' && JSON.parse(localStorage.getItem('gt_data')).u.name === 'Wayne');
  await click('#sheet .st-seg button', 1);   // RPE
  R.segInPlace = await ev(() => state.data.u.metric === 'rpe' && document.querySelectorAll('#sheet .st-seg')[0].querySelector('.on').textContent === 'RPE');
  await click('#sheet .st-seg button', 1);   // metric stays; next: voice off
  await ev(() => { document.querySelectorAll('#sheet .st-seg')[1].querySelectorAll('button')[1].click(); });
  R.voiceOff = await ev(() => state.data.u.coachVoice === false);
  await ev(() => { const k = document.getElementById('set-key'); k.value = 'abc123'; k.dispatchEvent(new Event('input')); });
  R.keySaved = await ev(() => localStorage.getItem('gt_gemini') === 'abc123' && state.data.u.aiKeySet === true);
  await ev(() => { const k = document.getElementById('set-key'); k.value = ''; k.dispatchEvent(new Event('input')); });
  R.keyCleared = await ev(() => !localStorage.getItem('gt_gemini'));
  await shot('settings-375');
  await ev(() => { document.querySelector('#sheet .btn.sm').click(); }); await sleep(150);   // Done
  R.doneClosesAndRerenders = await ev(() => !document.getElementById('sheet').classList.contains('on'));
  // ---- data control
  await ev(() => { openDataControl(true); }); await sleep(250);
  R.hasBack = await ev(() => !!document.querySelector('#sheet .st-h .btn-i'));
  await click('#sheet .st-act .btn'); await sleep(150);   // Archive everything -> confirm
  R.archiveAllAsks = await modalOpen();
  await click('#m-ok'); await sleep(200);
  R.archivedAll = await ev(() => Object.keys(state.data.exReset || {}).length > 0 && /Restore all/.test(document.querySelector('#sheet .st-act .btn').textContent));
  await click('#sheet .st-act .btn'); await sleep(150); await click('#m-ok'); await sleep(200);
  R.restoredAll = await ev(() => Object.keys(state.data.exReset || {}).length === 0);
  await P.type('#dc-search', 'leg'); await sleep(250);
  R.searchFilters = await ev(() => { const r = [...document.querySelectorAll('#dc-list .gh-t1')].map((e) => e.textContent.toLowerCase()); return r.length > 0 && r.every((t) => t.includes('leg')) && document.activeElement.id === 'dc-search'; });
  await ev(() => { state._dcQ = ''; refreshDataControl(); });
  await ev(() => { backupData(); exportCSV(); });
  R.downloads = await ev(() => window.__dl);
  R.backupStamped = await ev(() => !!state.data.u.lastBackupAt);
  R.backupLineFresh = await ev(() => /today/i.test(document.querySelector('#sheet .gh-row .gh-t2').textContent));
  // restore guards
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gt-restore-'));
  const bad = path.join(tmp, 'bad.json'); fs.writeFileSync(bad, JSON.stringify({ foo: 1 }));
  const good = path.join(tmp, 'good.json');
  fs.writeFileSync(good, JSON.stringify(await ev(() => Object.assign(JSON.parse(JSON.stringify(state.data)), { u: Object.assign({}, state.data.u, { name: 'Restored' }) }))));
  const pick = async (file) => { const [ch] = await Promise.all([P.waitForFileChooser({ timeout: 4000 }), ev(() => { restoreData(); })]); await ch.accept([file]); await sleep(400); };
  await clearToasts(); await pick(bad);
  R.toastBad = await toastTxt();
  R.badFileRejected = R.toastBad.includes('not a GainsTracker backup') && !(await modalOpen());
  await pick(good);
  R.restoreAsks = await modalOpen();
  await click('#m-cancel'); await sleep(150);
  R.cancelKeepsData = await ev(() => state.data.u.name === 'Wayne');
  await pick(good); await click('#m-ok'); await sleep(400);
  R.restoreApplied = await ev(() => state.data.u.name === 'Restored' && JSON.parse(localStorage.getItem('gt_data')).u.name === 'Restored' && !document.getElementById('sheet').classList.contains('on'));
  // two-step erase
  await ev(() => { openDataControl(); }); await sleep(200);
  await ev(() => { wipeData(); }); await sleep(150);
  R.erase1 = await modalOpen(); await click('#m-cancel'); await sleep(120);
  R.erase1CancelKeeps = await ev(() => state.data.workouts.length > 0);
  await ev(() => { wipeData(); }); await sleep(150); await click('#m-ok'); await sleep(200);
  R.erase2IsTypedPrompt = await ev(() => !!document.getElementById('m-input'));
  await clearToasts(); await P.type('#m-input', 'nope'); await click('#m-ok'); await sleep(200);
  R.toastWrong = await toastTxt();
  R.wrongWordKeeps = (await ev(() => state.data.workouts.length > 0)) && /Nothing erased/.test(R.toastWrong);
  await ev(() => { wipeData(); }); await sleep(150); await click('#m-ok'); await sleep(200);
  await P.type('#m-input', 'erase'); await click('#m-ok'); await sleep(500);
  R.erased = await ev(() => state.data.workouts.length === 0 && state.showOnboarding === true && state.obStep === 0);
  await shot('after-erase');
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 600); }
R.errors = ctx.log.errors; R.failed = ctx.log.failed;
const bad = Object.entries(R).filter(([k, v]) => v === false).map(([k]) => k);
console.log(JSON.stringify(Object.assign({ FAILED: bad }, R), null, 1));
await ctx.close();
