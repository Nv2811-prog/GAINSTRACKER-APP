import { fileURLToPath } from 'node:url';
// Screenshot any app state at iPhone size. Prints a JSON report (files, console errors, eval result).
// node shoot.mjs --out DIR --name home [--file HTML] [--fixture F] [--js "<page code, may await>"]
//                [--width 375|393|430] [--wait 900] [--max 6] [--eval "<expression returning JSON-able>"] [--scroller "#sheet"] [--now ms]
// --js runs AFTER boot. Useful: __qa.tab('mission'), __qa.startLogging(3), __qa.finish(), openSheet(...)
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, sleep, shootScreens, DEFAULT_FILE } from './lib.mjs';
const A = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { A[av[i].slice(2)] = av[i + 1]; i++; }
const out = A.out || '.'; fs.mkdirSync(out, { recursive: true });
const fixture = A.fixture === 'none' ? null : (A.fixture || fileURLToPath(new URL('./fixture.json', import.meta.url)));
const ctx = await launch({ file: A.file || DEFAULT_FILE, fixture, fakeNow: A.now ? +A.now : null, width: A.width || null });
let report = {};
try {
  await open(ctx, { settle: 1400 });
  await ctx.page.evaluate(() => { try { __qa.clear(); } catch (e) {} });
  if (A.js) report.js = await ctx.page.evaluate(`(async()=>{ ${A.js} })()`).catch((e) => 'JS ERROR: ' + e.message);
  await sleep(+(A.wait || 900));
  await ctx.page.evaluate(() => { try { __qa.clear(); } catch (e) {} });
  await sleep(250);
  if (A.eval) report.eval = await ctx.page.evaluate(`(()=>{ return (${A.eval}); })()`).catch((e) => 'EVAL ERROR: ' + e.message);
  if (A.max !== '0') report.shots = await shootScreens(ctx.page, path.join(out, A.name || 'shot'), { max: +(A.max || 6), scroller: A.scroller || null });
} catch (e) { report.fatal = String(e && e.stack || e); }
report.errors = ctx.log.errors; report.failed = ctx.log.failed;
console.log(JSON.stringify(report, null, 1));
await ctx.close();
