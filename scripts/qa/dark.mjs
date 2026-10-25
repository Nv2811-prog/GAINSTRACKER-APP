import { fileURLToPath } from 'node:url';
// THE DARK SIDE (GP:DARK, 2026-10-25): one line at workout start (the briefing) and one at the finish (moment + summary), picked by the moment,
// stable per session, never one of the last 8. Plus the rebuilt briefing. Real app, fixture-train. node dark.mjs [--v 1]
import { launch, open, sleep, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture: fileURLToPath(new URL('./fixture-train.json', import.meta.url)), width: A.width || null });
const P = ctx.page; const checks = [];
const ok = (name, pass, info) => checks.push({ name, pass: !!pass, ...(pass ? {} : { info }) });
const ev = (f, ...a) => P.evaluate(f, ...a);
const ids = (k) => ev((k) => DARK_LINES[k].map((x) => x.id), k);
try {
  await open(ctx, { settle: 1400 });
  const deck = await ev(() => { const all = Object.values(DARK_LINES).flat(); return { n: all.length, uniq: new Set(all.map((x) => x.id)).size, long: all.filter((x) => x.t.length > 130).map((x) => x.id), credited: all.filter((x) => x.by).length }; });
  ok('the deck: unique ids, short lines, a few credited real lines among originals', deck.uniq === deck.n && !deck.long.length && deck.credited >= 8 && deck.credited < deck.n, deck);
  /* ---------- start: the briefing ---------- */
  const brief = await ev(() => {
    const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); __qa.clear(); startWorkout(sp.id, 6); setReadiness('okay');
    const a = document.querySelector('.pi .dk blockquote'); const t1 = a && a.textContent; render(); const t2 = (document.querySelector('.pi .dk blockquote') || {}).textContent;
    return { t1, t2, stored: state.session.dark && state.session.dark.id, begin: !!document.querySelector('.pi-cta [onclick="beginPatrol()"]'), fig: !!document.querySelector('.pi .pi-fig svg use'), gamey: /DEPLOY|ABORT|IRON PROTOCOL|TARGET SYSTEMS/i.test(document.getElementById('app').textContent) };
  });
  ok('briefing: one dark line, the same after a re-render, stored on the session', brief.t1 && brief.t1 === brief.t2 && brief.stored, brief);
  ok('briefing: pro layout (anatomy targets, Begin), none of the old game copy', brief.begin && brief.fig && !brief.gamey, brief);
  const tired = await ev(() => { endSession(); const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); startWorkout(sp.id, 6); setReadiness('tired'); return state.session.dark.id; });
  ok('a tired check-in picks from Alfred\'s tired lines', (await ids('tired')).includes(tired), tired);
  const back = await ev(() => { endSession(); const keep = state.data.workouts; window.__qaSetNow(now() + 9 * 864e5); const sp = state.data.splits.find((s) => s.id === state.data.activeSplitId); startWorkout(sp.id, 6); setReadiness('okay'); const id = state.session.dark.id; endSession(); window.__qaSetNow(now() - 9 * 864e5); return id; });
  ok('coming back after days away picks a comeback line (Why do we fall …)', (await ids('back')).includes(back), back);
  const seen = await ev(() => state.data.darkSeen);
  ok('recently shown lines are remembered (never one of the last 8)', Array.isArray(seen) && seen.length >= 3 && seen.length <= 8 && seen[0] === back, seen);
  /* ---------- finish: the moment + the summary carry the same line ---------- */
  const fin = await ev(() => { __qa.startLogging(4); __qa.finish(); const f = document.getElementById('p3fin'); const a = f && (f.querySelector('.dk blockquote') || {}).textContent; return { a, id: state.lastResult.dark && state.lastResult.dark.id }; });
  await sleep(2100);
  const sum = await ev(() => { const f = document.getElementById('p3fin'); if (f) f.remove(); state.sumCard = 0; render(); return (document.querySelector('.dk.sum blockquote') || {}).textContent; });
  ok('finish: the moment shows a line and the summary keeps the same one', fin.a && fin.a === sum && fin.id, { fin, sum });
  const pr = await ev(() => { const R = { prsThis: [{ name: 'x', orm: 100 }], wk: { id: 'qa-pr', readiness: 'okay' } }; return darkFinish(R).id; });
  ok('a session with a record picks from the record lines', (await ids('pr')).includes(pr), pr);
  const hard = await ev(() => darkFinish({ prsThis: [], wk: { id: 'qa-hard', readiness: 'tired' } }).id);
  ok('a session started tired picks an "endure" line', (await ids('hard')).includes(hard), hard);
  const art = await ev(() => { __qa.tab('gotham'); const im = document.querySelector('.ga img,.gh-art'); return im ? getComputedStyle(im).filter : ''; });
  ok('the hero art is graded darker and colder', /brightness\(0\.[6-8]/.test(art) && /saturate\(0\.[67]/.test(art), art);
} catch (e) { checks.push({ name: 'fatal', pass: false, info: String(e && e.stack || e).slice(0, 700) }); }
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ passed: checks.length - failed.length, ...(A.v ? { names: checks.map((c) => (c.pass ? 'ok  ' : 'FAIL ') + c.name) } : {}), failed, consoleErrors: ctx.log.errors, failedRequests: ctx.log.failed }, null, 1));
await ctx.close();
process.exit(failed.length || ctx.log.errors.length || ctx.log.failed.length ? 1 : 0);
