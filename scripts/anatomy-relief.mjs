// Relief "clay sculpt" renderer (dev tool, 2026-10-26; regenerates assets/anatomy/shade-*.png — then convert to grey+alpha PNG): our own anatomy paths -> height map (rounded muscle domes on a rounded body) -> per-pixel lighting -> grey PNG.
import fs from 'node:fs';
import puppeteer from '/Users/nickivendelbo/Desktop/Gainstracker batman/scripts/qa/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const anaTxt = fs.readFileSync('../anat/out/ana-data.js', 'utf8'), ana = JSON.parse(anaTxt.slice(anaTxt.indexOf('{'), anaTxt.lastIndexOf('}') + 1));
const view = process.argv[2] || 'f', out = process.argv[3] || 'relief-' + view + '.png', S = +(process.argv[4] || 1);
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.setContent('<html><body></body></html>');
const MODE0 = process.argv[5] || 'grey';
const dataUrl = await p.evaluate((ANA, view, S, MODE) => {
  const VB = view === 'f' ? [40, 80, 650, 1290] : [760, 80, 650, 1290];
  const W = Math.round(VB[2] * S), H = Math.round(VB[3] * S);
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const ctxOf = (c) => c.getContext('2d', { willReadFrequently: true });
  const tr = (ctx) => { ctx.setTransform(S, 0, 0, S, -VB[0] * S, -VB[1] * S); };
  // height accumulation (float)
  const Hm = new Float32Array(W * H);
  const addBlurred = (paths, blurPx, weight) => {
    const c = mk(), x = ctxOf(c); x.filter = `blur(${blurPx}px)`; tr(x); x.fillStyle = '#fff';
    paths.forEach((d) => x.fill(new Path2D(d)));
    const px = x.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) Hm[i] += weight * px[i * 4 + 3] / 255;
  };
  const P = ANA[view].p, body = [ANA[view].o].concat(P.filter((q) => !q[0]).map((q) => q[2]));
  addBlurred(body, 30 * S, 1.1);            // the body: a soft rounded mass
  addBlurred(body, 10 * S, 0.5);            // tighter edge roll-off
  P.forEach((q) => { const w = q[0] ? 1 : 0.45; addBlurred([q[2]], 4 * S, 0.22 * w); addBlurred([q[2]], 9 * S, 0.34 * w); addBlurred([q[2]], 17 * S, 0.32 * w); });   // each muscle a multi-scale dome; grooves where domes meet
  // fibre striations: inside every big muscle, faint grooves along its own principal axis (PCA of its outline), clipped to the muscle
  const svgNS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(svgNS, 'svg'); document.body.appendChild(sv);
  P.forEach((q) => {
    if (!q[0]) return;
    const pe = document.createElementNS(svgNS, 'path'); pe.setAttribute('d', q[2]); sv.appendChild(pe);
    const L0 = pe.getTotalLength(), n = 60, pts = []; for (let k = 0; k < n; k++) { const pt = pe.getPointAtLength(L0 * k / n); pts.push([pt.x, pt.y]); }
    pe.remove();
    const cx = pts.reduce((a, p) => a + p[0], 0) / n, cy = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0; pts.forEach(([x, y]) => { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); });
    const mid = view === 'f' ? 364 : 1084, sd = cx < mid ? -1 : 1, deg = Math.PI / 180;
    const FIB = { chest: [15, -1], back: q[1] === 'lat' ? [55, -1] : null, glutes: [40, 1], abs: q[1] === 'obl' ? [50, 1, true] : null };   // [angle from horizontal, up(-1) / down(+1), runs toward the midline]
    const fo = FIB[q[0]];
    const th = fo ? Math.atan2(fo[1] * Math.sin(fo[0] * deg), (fo[2] ? -sd : sd) * Math.cos(fo[0] * deg)) : 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; pts.forEach(([x, y]) => { const a = (x - cx) * ux + (y - cy) * uy, b = (x - cx) * vx + (y - cy) * vy; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); });
    const wid = b1 - b0; if (wid < 34 || (a1 - a0) < 60) return;          // small muscles stay smooth
    const lines = Math.min(5, Math.max(2, Math.round(wid / 26)));
    const c = mk(), x = ctxOf(c); x.filter = `blur(${1.1 * S}px)`; tr(x); x.save(); x.clip(new Path2D(q[2]));
    x.strokeStyle = '#fff'; x.lineWidth = 2.2; x.lineCap = 'round';
    for (let k = 1; k <= lines; k++) { const b = b0 + wid * k / (lines + 1), bend = wid * 0.06 * (k % 2 ? 1 : -1);
      const p0 = [cx + ux * a0 * 0.92 + vx * b, cy + uy * a0 * 0.92 + vy * b], p1 = [cx + ux * a1 * 0.92 + vx * b, cy + uy * a1 * 0.92 + vy * b], pm = [cx + vx * (b + bend), cy + vy * (b + bend)];
      x.beginPath(); x.moveTo(p0[0], p0[1]); x.quadraticCurveTo(pm[0], pm[1], p1[0], p1[1]); x.stroke(); }
    x.restore();
    const px = x.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) Hm[i] -= 0.035 * px[i * 4 + 3] / 255;
  });
  sv.remove();
  // smooth the height field (separable box blur, 2 passes) so 8-bit mask steps never show as banding
  const tmp = new Float32Array(W * H), R = Math.max(1, Math.round(2.2 * S));
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) { let acc = 0; for (let x = -R; x <= R; x++) acc += Hm[y * W + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { tmp[y * W + x] = acc / (2 * R + 1); acc += Hm[y * W + Math.min(W - 1, x + R + 1)] - Hm[y * W + Math.max(0, x - R)]; } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -R; y <= R; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { Hm[y * W + x] = acc / (2 * R + 1); acc += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x]; } }
  }
  // silhouette alpha (crisp, slightly softened)
  const ca = mk(), xa = ctxOf(ca); xa.filter = `blur(${0.6 * S}px)`; tr(xa); xa.fillStyle = '#fff'; body.forEach((d) => xa.fill(new Path2D(d))); P.forEach((q) => xa.fill(new Path2D(q[2])));
  const A = xa.getImageData(0, 0, W, H).data;
  // lighting
  const outC = mk(), xo = ctxOf(outC), img = xo.createImageData(W, H), o = img.data;
  const L = [-0.45, -0.62, 0.64], ln = Math.hypot(...L); L[0] /= ln; L[1] /= ln; L[2] /= ln;
  const Hh = [0.0, 0.0, 1.0]; // view vector for specular (Blinn half vector with L)
  const hv = [L[0] + 0, L[1] + 0, L[2] + 1], hn = Math.hypot(...hv); hv[0] /= hn; hv[1] /= hn; hv[2] /= hn;
  const k = 46 * S;   // height scale in px
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = A[i * 4 + 3]; if (!a) continue;
    const dx = (Hm[i + 1] - Hm[i - 1]) * k / 2, dy = (Hm[i + W] - Hm[i - W]) * k / 2;
    let nx = -dx, ny = -dy, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const dot = nx * L[0] + ny * L[1] + nz * L[2], diff = Math.max(0, (dot + 0.3) / 1.3);   // wrapped diffuse: soft matte clay
    const spec = Math.pow(Math.max(0, nx * hv[0] + ny * hv[1] + nz * hv[2]), 30) * 0.16;
    const rim = Math.pow(Math.max(0, nx * 0.92 + nz * 0.08), 3) * 0.14;   // cool rim from the right
    const ao = Math.min(1, 0.62 + 0.38 * Math.min(1, Hm[i] / 1.5));
    const f = (0.2 + 0.86 * diff) * ao + spec + rim;          // luminance factor over the base colour (1 = unchanged)
    if (MODE === 'grey') { const base = 172; o[i*4] = Math.min(255, base*f); o[i*4+1] = Math.min(255, (base+4)*f); o[i*4+2] = Math.min(255, (base+12)*f); o[i*4+3] = a; }
    else { if (f < 1) { o[i*4] = o[i*4+1] = o[i*4+2] = 0; o[i*4+3] = Math.round(a * Math.min(1, 1 - f)); } else { o[i*4] = 236; o[i*4+1] = 242; o[i*4+2] = 255; o[i*4+3] = Math.round(a * Math.min(1, (f - 1) * 1.6)); } }
  }
  xo.putImageData(img, 0, 0);
  return outC.toDataURL('image/png');
}, ana, view, S, MODE0);
fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
await b.close();
console.log(errs.length ? errs.join('\n') : 'ok ' + out);
