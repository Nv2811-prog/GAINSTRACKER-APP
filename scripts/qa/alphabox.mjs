// Alpha bounding box of transparent PNGs (how much of the canvas the artwork really fills).
// node alphabox.mjs assets/veh/*.png   -> "name WxH  bbox x0,y0-x1,y1 (pct of height)"
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const files = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { w: c.width, h: c.height, x0, y0, x1, y1 };
  }, b64);
  console.log(path.basename(f), r.w + 'x' + r.h, `bbox ${r.x0},${r.y0}-${r.x1},${r.y1}`, `(y ${(r.y0 / r.h * 100).toFixed(0)}%-${(r.y1 / r.h * 100).toFixed(0)}%, x ${(r.x0 / r.w * 100).toFixed(0)}%-${(r.x1 / r.w * 100).toFixed(0)}%)`);
}
await browser.close();
