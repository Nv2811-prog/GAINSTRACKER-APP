// Alfred chat (GP:ALFRED2, wave 10) — pass/fail with REAL typing into the chat panel.
//   node scripts/qa/alfred.mjs [--width 393|375] [--out dir] [--live]
// A  NO KEY: realistic questions typed in the chat are answered by the local analysis engine — on topic, short, numbers straight from the
//    fixture's logs; an unclear lift gets ONE clarifying question; how-to questions get 1-2 guide clauses (not the page); anything else is
//    said honestly (no guess) with tappable examples.
// B  STUB AI (the real request path, fetch stubbed): the engine's exact numbers ride along as a PRE-COMPUTED line for data questions only,
//    the rules go out as the system instruction, temperature 0.4, a tight token cap, gemini-3.8-flash first; a gone model hands over to the
//    next and is remembered, a passing 429 is not.
// C  KEY BUT OFFLINE (fetch fails): the same engine answer, never a guess.
// D  --live: the same questions through the real model chain (the key is read from .env.local into node and never reaches the page or the log).
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, sleep } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', process.env.QA_SHOTS || os.tmpdir());
const WIDTH = +arg('--width', 393);
const LIVE = process.argv.includes('--live');
fs.mkdirSync(OUT, { recursive: true });
const FIXTURE = fileURLToPath(new URL('./fixture-train.json', import.meta.url));
const R = {}; const fails = []; const QA = [];
const check = (name, ok, info) => { R[name] = info === undefined ? !!ok : { ok: !!ok, info }; if (!ok) fails.push(name + (info === undefined ? '' : ' ' + JSON.stringify(info))); };
const words = (t) => t.trim().split(/\s+/).length;

// Type a question into the open chat with the real keyboard, wait for the answer, read what the screen shows.
async function ask(P, q) {
  await P.evaluate(() => { ALFRED_MSGS.length = 0; _alfPersist(); _alfRender(); document.getElementById('ac-in').value = ''; });
  await P.click('#ac-in');
  await P.type('#ac-in', q, { delay: 0 });
  await P.keyboard.press('Enter');
  const t0 = Date.now();
  for (;;) {
    const done = await P.evaluate(() => !_alfBusy && ALFRED_MSGS.length >= 2);
    if (done) break;
    if (Date.now() - t0 > 60000) break;
    await sleep(40);
  }
  await sleep(60);
  return P.evaluate(() => {
    const rows = [...document.querySelectorAll('#ac-log .ac-row.a')], r = rows[rows.length - 1], m = ALFRED_MSGS[ALFRED_MSGS.length - 1];
    return { text: r ? r.querySelector('.ac-b').innerText.trim() : '', chips: r ? [...r.querySelectorAll('.ac-chip')].map((c) => c.textContent) : [], loc: !!(m && m.loc) };
  });
}

// Realistic questions for this lifter (machines + cables, 8-day cycle). re = what a correct, on-topic answer must contain.
const CASES = [
  ['Am I ready to train today?', /Readiness \d+ \((PRIMED|READY|GUARDED|DEPLETED)\)/, 'ready'],
  ['Should I rest today?', /Readiness \d+/, 'ready'],
  ['What should I hit tonight?', /^Tonight/, 'tonight'],
  ['Is my chest recovered?', /^Chest is \d+% recovered/, 'rec'],
  ['Should I train legs today?', /Quads \d+%.*Hamstrings \d+%.*Calves \d+%/, 'rec'],
  ['Which muscles are still sore?', /^(Least recovered:|Every muscle)/, 'rec'],
  ['How many sets for chest?', /^Chest: \d+ hard sets this week, .*\(MEV \d+ · MAV \d+ · MRV \d+\)\.$/, 'sets'],
  ['how many sets of biceps did i do this week', /^Biceps: \d+ hard sets this week/, 'sets'],
  ["How's my triceps?", /^Triceps: \d+% recovered, [^;]*; \d+ hard sets this week/, 'muscle'],
  ['Which muscles are behind on volume?', /^(Furthest behind MEV: |Every muscle is at or above)/, 'behind'],
  ["What's my last lat pulldown?", /^Lat Pulldown \(Wide Grip\): last \d/, 'lift'],
  ['What weight next on machine shoulder press?', /^Next on Machine Shoulder Press: .*Last time /, 'lift'],
  ["What's my PR on leg press?", /^Leg Press \(45°\): best \d+ kg e1RM/, 'lift'],
  ['Is my press stalling?', /(Stalled: |None of those is stalled)/, 'stall'],
  ['Any lifts stalled?', /^(Stalled: |Nothing is stalled)/, 'stall'],
  ['Any PRs this week?', /(\d+ records? this week|No new records this week)/, 'prs'],
  ['How many sessions this week?', /^\d+ of \d+ sessions this week/, 'week'],
  ['chest press next weight', /^Which one: .*Chest Press.*Chest Press/, 'ask'],
  ['show my PRs this week', /(\d+ records? this week|No new records this week)/, 'prs'],
  ['Should I add weight on lat pulldown?', /^Next on Lat Pulldown \(Wide Grip\): [\d.]+ kg × \d+\+? \(/, 'lift'],
  ['calf raise last time', /^Standing Calf Raise: last [\d.]+ kg × \d+/, 'lift'],
  ["What's my best incline press?", /^Incline Machine Chest Press: best \d+ kg e1RM/, 'lift'],
  ['Which muscle should I prioritise?', /^Furthest behind MEV/, 'behind'],
  ["What's my streak?", /Streak: \d+ days?\./, 'week'],
  ['How strong am I?', /(top \d+%|Log your big lifts)/, 'misc'],
  ['What are my macros?', /(Daily target:|No fuel protocol set)/, 'misc'],
  ['What does readiness mean?', /Readiness is built only from what is known/, 'guide', /^Readiness \d+ \(/],
  ['How do I archive old machine weights?', /archiv/i, 'guide'],
  ['Am I hitting my protein?', /(Daily target:|No fuel protocol set)/, 'misc'],
  ['Should I train or rest tonight?', /^Readiness \d+/, 'ready'],
  // not random: a question the logs cannot answer is said so, never answered with the nearest template
  ['What should I eat tonight?', /(needs my AI line|can't reach my AI line)/, null],
  ['Should I go heavier today?', /(needs my AI line|can't reach my AI line)/, null],
  ['How many reps should I do?', /(needs my AI line|can't reach my AI line)/, null],
  ['What muscles does leg press work?', /(needs my AI line|can't reach my AI line)/, null],
  ["What's the capital of France?", /(needs my AI line|can't reach my AI line)/, null],
  ['thanks', /^Anytime\.$/, null],
];

async function typedRun(P, label) {
  for (const [q, re, id, notRe] of CASES) {
    const a = await ask(P, q);
    const got = await P.evaluate((q) => { const r = alfIntel(q); return r ? r.id : null; }, q);
    const n = words(a.text);
    // guide answers quote the manual (up to ~50 words); engine answers are 1-2 sentences
    const cap = id === 'guide' ? 60 : id === 'stall' ? 60 : 48;
    const ok = re.test(a.text) && !(notRe && notRe.test(a.text)) && n <= cap && (id === null || id === 'guide' || got === id);
    QA.push({ mode: label, q, a: a.text.replace(/\s+/g, ' '), words: n, chips: a.chips });
    check(`${label}: ${q}`, ok, ok ? undefined : { a: a.text.slice(0, 200), words: n, intent: got });
  }
}

(async () => {
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const ctx = await launch({ fixture: FIXTURE, width: WIDTH });
  const P = ctx.page;
  await open(ctx);
  const shot = (name) => P.screenshot({ path: path.join(OUT, `alfred-${WIDTH}-${name}.png`) });
  const openChat = async () => { await P.evaluate(() => { try { closeSheet && closeSheet(); } catch (e) {} openAlfredChat(); }); await sleep(450); };

  // ---------- A: no key ----------
  await P.evaluate(() => { localStorage.removeItem('gt_gemini'); try { state.data.u.coachVoice = false; } catch (e) {} });
  await openChat();
  check('A: status line says answers come from the logs', await P.evaluate(() => /No key · answers from your logs/.test(document.getElementById('ac-sub').textContent)));
  await shot('empty-nokey');
  await typedRun(P, 'A no key');
  const fb = await ask(P, "What's the capital of France?");
  check('A: honest fallback offers tappable examples (and Settings)', fb.chips.length === 3 && fb.chips.every((c) => c.length < 40), fb.chips);
  const chipAns = await P.evaluate(async () => { document.querySelector('#ac-log .ac-fu .ac-chip').click(); await new Promise((r) => setTimeout(r, 200)); const rows = [...document.querySelectorAll('#ac-log .ac-row.a .ac-b')]; return rows[rows.length - 1].innerText; });
  check('A: tapping an example chip is answered from the logs', /Readiness \d+/.test(chipAns), chipAns.slice(0, 120));
  const cl = await ask(P, 'chest press next weight');
  check('A: the clarifying question offers each candidate as a tap', cl.chips.length === 2 && cl.chips.every((c) => /^Next weight on .*Chest Press$/.test(c)), cl.chips);
  const clAns = await P.evaluate(async () => { document.querySelector('#ac-log .ac-fu .ac-chip').click(); await new Promise((r) => setTimeout(r, 200)); const rows = [...document.querySelectorAll('#ac-log .ac-row.a .ac-b')]; return rows[rows.length - 1].innerText; });
  check('A: tapping a candidate answers that lift', /^Next on (Plate-Loaded|Incline Machine) Chest Press: /.test(clAns), clAns.slice(0, 120));
  await ask(P, 'Is my chest recovered?'); await shot('answer-recovery');
  await ask(P, 'What weight next on machine shoulder press?'); await shot('answer-lift');
  await ask(P, 'chest press next weight'); await shot('answer-clarify');
  await ask(P, "What's the capital of France?"); await shot('answer-honest');
  // commands still work: a short imperative navigates and closes the chat
  await ask(P, 'open the leaderboard');
  await sleep(700);
  check('A: "open the leaderboard" is still a command (chat closes, screen opens)', await P.evaluate(() => !document.getElementById('ac-panel').classList.contains('on')));
  await P.evaluate(() => { try { go('gotham'); } catch (e) {} });

  // ---------- B: stubbed AI, real request path ----------
  await P.evaluate(() => {
    localStorage.setItem('gt_gemini', 'x'); try { localStorage.removeItem('gt_gem_model2'); } catch (e) {}
    window.__req = []; window.__plan = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: 'Fine.\n[FOLLOWUPS: Why? | And legs?]' }] } }] } });
    window.fetch = async (u, o) => {
      if (!/generativelanguage/.test(String(u))) return new Response('{}', { status: 404 });
      const model = String(u).match(/models\/([^:]+)/)[1], body = JSON.parse(o.body);
      window.__req.push({ model, body });
      const p = window.__plan(model, window.__req.length);
      return new Response(JSON.stringify(p.body), { status: p.status });
    };
  });
  await openChat();
  const last = () => P.evaluate(() => window.__req[window.__req.length - 1]);
  const turn = (r) => r.body.contents[r.body.contents.length - 1].parts[0].text;
  let a = await ask(P, 'How many sets for chest?');
  let r = await last();
  check('B: the chat goes out to gemini-3.8-flash first', r.model === 'gemini-3.8-flash', r.model);
  check('B: a data question carries the engine\'s exact numbers as PRE-COMPUTED', /\[PRE-COMPUTED[^\]]*Chest: \d+ hard sets this week/.test(turn(r)), turn(r).slice(0, 300));
  check('B: temperature 0.4 and a tight token cap', r.body.generationConfig.temperature === 0.4 && r.body.generationConfig.maxOutputTokens <= 1000, r.body.generationConfig);
  check('B: Gemini 3 thinks at "low"', (r.body.generationConfig.thinkingConfig || {}).thinkingLevel === 'low', r.body.generationConfig.thinkingConfig);
  const sys = r.body.systemInstruction && r.body.systemInstruction.parts[0].text || '';
  check('B: persona + chat rules + his data are the system instruction', /Alfred Pennyworth/.test(sys) && /INTENT FIRST/.test(sys) && /under 80 words/.test(sys) && /ONE clarifying question/.test(sys) && /MUSCLE STATUS/.test(sys), sys.length);
  check('B: the conversation opens with his turn and holds only the question', r.body.contents.length === 1 && r.body.contents[0].role === 'user', r.body.contents.map((c) => c.role));
  check('B: the model\'s reply and follow-ups are shown', a.text === 'Fine.' && a.chips.length === 2, a);
  await ask(P, 'What does readiness mean?');
  r = await last();
  check('B: a how-to question carries no PRE-COMPUTED line', !/PRE-COMPUTED/.test(turn(r)), turn(r).slice(0, 200));
  await ask(P, 'chest press next weight');
  r = await last();
  check('B: an unclear lift is left to the coach (no wrong numbers pushed)', !/PRE-COMPUTED/.test(turn(r)), turn(r).slice(0, 200));
  await ask(P, "What's the capital of France?");
  r = await last();
  check('B: an unrecognised question still goes to the model, unmodified', turn(r) === "What's the capital of France?", turn(r));
  await ask(P, 'What should I eat tonight?');
  r = await last();
  check('B: a food question is not answered with a training template', turn(r) === 'What should I eat tonight?', turn(r));
  await ask(P, 'Is my chest recovered?');
  r = await last();
  check('B: recovery question carries its number', /PRE-COMPUTED[^\]]*Chest is \d+% recovered/.test(turn(r)), turn(r).slice(0, 240));
  // follow-up turn keeps the history (user/model alternate)
  await P.evaluate(() => { ALFRED_MSGS.length = 0; });
  await P.type('#ac-in', 'Is my chest recovered?'); await P.keyboard.press('Enter'); await sleep(250);
  await P.type('#ac-in', 'and my back?'); await P.keyboard.press('Enter'); await sleep(250);
  r = await last();
  check('B: a follow-up sends the earlier turns (user, model, user)', r.body.contents.map((c) => c.role).join() === 'user,model,user', r.body.contents.map((c) => c.role));
  check('B: the short follow-up "and my back?" carries back\'s own numbers', /^and my back\?[\s\S]*PRE-COMPUTED[^\]]*Back: \d+% recovered/.test(turn(r)), turn(r).slice(0, 240));

  // model chain: a gone model hands over and is remembered; a passing 429 is not
  await P.evaluate(() => { localStorage.removeItem('gt_gem_model2'); window.__req.length = 0; window.__plan = (m) => m === 'gemini-3.8-flash' ? { status: 404, body: { error: { message: 'models/gemini-3.8-flash is not found' } } } : { status: 200, body: { candidates: [{ content: { parts: [{ text: 'Chain ok.' }] } }] } }; });
  a = await ask(P, "What's the capital of France?");
  const models = await P.evaluate(() => window.__req.map((x) => x.model));
  check('B: 404 on the first model hands over to the next (and answers)', models[0] === 'gemini-3.8-flash' && models[1] === 'gemini-3.5-flash' && a.text === 'Chain ok.', { models, a: a.text });
  check('B: the model that answered after a permanent miss is remembered', await P.evaluate(() => localStorage.getItem('gt_gem_model2')) === 'gemini-3.5-flash');
  await P.evaluate(() => { localStorage.removeItem('gt_gem_model2'); window.__req.length = 0; window.__plan = (m) => m === 'gemini-3.8-flash' ? { status: 429, body: { error: { message: 'Resource has been exhausted (e.g. check quota).' } } } : { status: 200, body: { candidates: [{ content: { parts: [{ text: 'Busy ok.' }] } }] } }; });
  a = await ask(P, "What's the capital of France?");
  check('B: a passing 429 hands over but is NOT remembered', a.text === 'Busy ok.' && await P.evaluate(() => localStorage.getItem('gt_gem_model2')) === null, a.text);
  await P.evaluate(() => { window.__req.length = 0; window.__plan = () => ({ status: 200, body: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '' }] } }] } }); });
  a = await ask(P, 'Is my chest recovered?');
  check('B: an empty MAX_TOKENS reply is retried with more room, then handled', (await P.evaluate(() => window.__req.length)) >= 2 && a.text.length > 0, { n: await P.evaluate(() => window.__req.length), a: a.text });
  await P.evaluate(() => { window.__plan = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: 'Fine.' }] } }] } }); });

  // ---------- C: key, but no connection ----------
  await P.evaluate(() => { window.fetch = async () => { throw new TypeError('Failed to fetch'); }; });
  await typedRun(P, 'C key offline');

  // ---------- E: the AI refuses (used-up credits, rate limit): the logs still answer what they can, and the reason is told ----------
  await P.evaluate(() => { window.fetch = async () => new Response(JSON.stringify({ error: { message: 'Your prepayment credits are depleted.' } }), { status: 402 }); });
  a = await ask(P, 'Is my chest recovered?');
  check('E: 402 (credits used up) still answers a data question from the logs', /^Chest is \d+% recovered/.test(a.text), a.text);
  a = await ask(P, "What's the capital of France?");
  check('E: 402 on an open question says the credits are used up (not "offline")', /credits are used up/.test(a.text) && a.chips.length === 3, a.text);
  await P.evaluate(() => { window.fetch = async () => new Response(JSON.stringify({ error: { message: 'Resource has been exhausted (e.g. check quota).' } }), { status: 429 }); });
  a = await ask(P, "What's the capital of France?");
  check('E: 429 on an open question says the free-tier limit was hit', /free-tier limit/.test(a.text), a.text);
  await P.evaluate(() => { window.fetch = async () => new Response(JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } }), { status: 400 }); });
  a = await ask(P, 'Is my chest recovered?');
  check('E: a rejected key points to Settings', /isn't being accepted/.test(a.text), a.text);

  // ---------- D: live ----------
  if (LIVE) {
    const env = fs.readFileSync('/Users/nickivendelbo/Desktop/Gainstracker batman/.env.local', 'utf8');
    const KEY = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
    if (!KEY) { check('D: key available in .env.local', false); } else {
      await P.exposeFunction('__gem', async (url, body) => {
        const u = new URL(url); u.searchParams.set('key', KEY);
        const rr = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        return { status: rr.status, body: await rr.text(), model: (u.pathname.match(/models\/([^:]+)/) || [])[1] };
      });
      await P.evaluate(() => { window.__models = []; window.fetch = async (u, o) => { const r = await window.__gem(String(u), o && o.body); window.__models.push(r.model + ':' + r.status); return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json' } }); }; });
      const probe = await P.evaluate(() => window.__gem('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ok' }] }], generationConfig: { maxOutputTokens: 8 } })));
      if (probe.status === 402) { R['D live'] = 'SKIPPED: the key in .env.local has depleted prepayment credits (HTTP 402 on every model)'; } else {
      const LIVEQ = ['Am I ready to train today?', 'What should I hit tonight?', 'Is my chest recovered?', 'How many sets for chest?', 'What weight next on machine shoulder press?', "What's my PR on leg press?", 'Is my press stalling?', 'Any PRs this week?', 'chest press next weight', 'Which muscles are behind on volume?', "Should I do more triceps? I'm sore", 'Why does MEV matter?', 'What does readiness mean?', 'Write me a poem about the moon', "What's the capital of France?", 'how long should i rest between sets on lat pulldown'];
      for (const q of LIVEQ) {
        const t0 = Date.now(); const x = await ask(P, q); const ms = Date.now() - t0;
        const m = await P.evaluate(() => window.__models.pop());
        QA.push({ mode: 'D live', q, a: x.text.replace(/\s+/g, ' '), words: words(x.text), ms, model: m, chips: x.chips });
        check(`D live: ${q}`, x.text.length > 0 && words(x.text) <= 110 && /:200$/.test(m || ''), { words: words(x.text), model: m });
      }
      }
    }
  }

  await shot('final');
  check('zero console errors', ctx.log.errors.length === 0, ctx.log.errors.slice(0, 4));
  fs.writeFileSync(path.join(OUT, `alfred-${WIDTH}-qa.json`), JSON.stringify(QA, null, 2));
  console.log(JSON.stringify({ width: WIDTH, pass: fails.length === 0, fails, checks: Object.keys(R).length }, null, 1));
  if (process.argv.includes('--print')) QA.forEach((x) => console.log(`[${x.mode}] ${x.q}\n   -> ${x.a}  (${x.words}w${x.model ? ', ' + x.model + ', ' + x.ms + 'ms' : ''})${x.chips && x.chips.length ? '  chips: ' + x.chips.join(' | ') : ''}`));
  await ctx.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
