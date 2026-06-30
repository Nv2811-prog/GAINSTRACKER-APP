#!/usr/bin/env node
// GainsTracker image generator — Google Gemini "Nano Banana" image models.
// Usage:
//   node scripts/gen-image.mjs "<prompt>" [outfile.png] [model]
// Examples:
//   node scripts/gen-image.mjs "photoreal grey bodybuilder, front view, solid red worked chest muscle, plain background" figure-chest.png
//   node scripts/gen-image.mjs "Gotham gold app icon, bat-barbell, flat, 512px" icon-512.png gemini-3-pro-image
//
// Models (default = Nano Banana, cheapest):
//   gemini-2.5-flash-image      -> Nano Banana
//   gemini-3-pro-image          -> Nano Banana Pro (higher quality)
//   gemini-3.1-flash-image      -> Nano Banana 2
//   imagen-4.0-generate-001     -> Imagen 4

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// --- load API key from env or .env.local (gitignored) ---
function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const envPath = resolve(root, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].trim();
    }
  }
  return null;
}

const [, , prompt, outArg, modelArg] = process.argv;
if (!prompt) {
  console.error('Fejl: giv en prompt.\n  node scripts/gen-image.mjs "<prompt>" [outfile.png] [model]');
  process.exit(1);
}

const key = loadKey();
if (!key) {
  console.error("Fejl: ingen GEMINI_API_KEY (sæt i .env.local eller som env-variabel).");
  process.exit(1);
}

const model = modelArg || "gemini-2.5-flash-image";
const outFile = resolve(root, outArg || `generated-${Date.now()}.png`);

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const body = {
  contents: [{ parts: [{ text: prompt }] }],
};

console.log(`Genererer med ${model}...`);
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`API-fejl ${res.status}:`, (await res.text()).slice(0, 500));
  process.exit(1);
}

const data = await res.json();
const parts = data?.candidates?.[0]?.content?.parts || [];
const img = parts.find((p) => p.inlineData?.data);

if (!img) {
  const txt = parts.find((p) => p.text)?.text;
  console.error("Intet billede returneret.", txt ? `Model sagde: ${txt}` : JSON.stringify(data).slice(0, 400));
  process.exit(1);
}

writeFileSync(outFile, Buffer.from(img.inlineData.data, "base64"));
console.log(`✅ Gemt: ${outFile}`);
