// Derive a new fixture: load one, run page JS through the real app, save storage as another.
// node variant.mjs <in.json> <out.json> "<page js>" [nowMs]
import fs from 'node:fs';
import { launch, open, sleep } from './lib.mjs';
const [inF, outF, js, nowArg] = process.argv.slice(2);
const fx = JSON.parse(fs.readFileSync(inF, 'utf8'));
const now = nowArg ? +nowArg : fx.now;
const ctx = await launch({ fixture: inF, fakeNow: now });
await open(ctx, { settle: 1400 });
const r = await ctx.page.evaluate(`(async()=>{ __qa.clear(); ${js} ; await new Promise(r=>setTimeout(r,400)); __qa.clear(); save(); return __qa.info(); })()`).catch((e) => 'ERR ' + e.message);
await sleep(500);
const storage = await ctx.page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('gt_') && k !== 'gt_session') o[k] = localStorage.getItem(k); } return o; });
fs.writeFileSync(outF, JSON.stringify({ now, storage }));
console.log(JSON.stringify({ r, errors: ctx.log.errors }));
await ctx.close();
