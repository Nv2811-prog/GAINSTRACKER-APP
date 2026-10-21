#!/usr/bin/env node
// GainsTracker video generator — Google Veo through the Gemini API (predictLongRunning).
//
// Usage:
//   node scripts/gen-video.mjs "<prompt>" <out.mp4> [--image start.png] [--aspect 9:16] [--seconds 6]
//                              [--model veo-3.1-generate-preview] [--resolution 720p] [--seed N]
//                              [--negative "text to avoid"] [--resume <operation name>]
//
// Examples:
//   node scripts/gen-video.mjs "slow-motion rain over a Gotham rooftop, push-in" assets/pr/test.mp4
//   node scripts/gen-video.mjs "the hero lands one decisive takedown" out.mp4 --image keyframe.png
//
// Defaults suit the phone app: portrait 9:16, 6 s, 720p. Allowed: 4 / 6 / 8 s (1080p and 4k need 8 s), 16:9 or 9:16.
// --image makes the picture the FIRST frame (image-to-video). Veo only allows adult people there (allow_adult).
// Veo always renders a sound track; it is included in the price.
//
// Billing: USD per generated second (paid tier only, no free tier) — Veo 3.1 standard 0.40 (720p/1080p), 0.60 (4k);
// fast 0.10 / 0.12 / 0.30; lite 0.05 / 0.08. A clip blocked by the safety filter is not billed.
//
// Safety net: the operation name is printed the moment the job is accepted. If this script dies while polling,
// finish with --resume <that name> (the video is kept on Google's side for ~2 days; the job is billed either way).
//
// Exit codes: 0 ok, 1 error / timeout, 2 blocked by the safety filter (rephrase the prompt, try again).
//
// NOTE: the Veo 3.1 *-preview models are scheduled to shut down on 2026-10-22. After that pass --model <successor>.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const API = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULTS = { model: "veo-3.1-generate-preview", aspect: "9:16", seconds: "6", resolution: "720p" };
const FLAGS = ["image", "aspect", "seconds", "model", "resolution", "seed", "negative", "resume"];
const ASPECTS = ["16:9", "9:16"];
const DURATIONS = [4, 6, 8];
const POLL_INTERVAL_MS = 10_000;
const MAX_WAIT_MS = 8 * 60_000;
const MAX_POLL_FAILURES = 5;
const EXIT_ERROR = 1;
const EXIT_BLOCKED = 2;
const DKK_PER_USD = 7; // same rule of thumb as CLAUDE.md (0.04 USD ~ 0.28 DKK)
const USD_PER_SECOND = {
  "veo-3.1-generate-preview": { "720p": 0.4, "1080p": 0.4, "4k": 0.6 },
  "veo-3.1-fast-generate-preview": { "720p": 0.1, "1080p": 0.12, "4k": 0.3 },
  "veo-3.1-lite-generate-preview": { "720p": 0.05, "1080p": 0.08 },
};
const IMAGE_MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

// --- load API key from env or .env.local (gitignored). Never printed. ---
function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].trim();
  }
  return null;
}

const key = loadKey();
const redact = (text) => (key ? String(text).split(key).join("<KEY>") : String(text));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function fail(message, code = EXIT_ERROR) {
  console.error(redact(message));
  process.exit(code);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (!FLAGS.includes(name)) fail(`Unknown flag --${name}. Known: ${FLAGS.map((f) => "--" + f).join(" ")}`);
    const value = argv[++i];
    if (value === undefined) fail(`--${name} needs a value.`);
    flags[name] = value;
  }
  return { positional, flags };
}

function readOptions() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const resuming = Boolean(flags.resume);
  const [prompt, outArg] = resuming && positional.length === 1 ? [null, positional[0]] : positional;
  if ((!prompt && !resuming) || !outArg) {
    fail('Usage: node scripts/gen-video.mjs "<prompt>" <out.mp4> [--image start.png] [--aspect 9:16] [--seconds 6] [--model id] [--resolution 720p]');
  }
  const options = {
    prompt,
    outFile: resolve(root, outArg),
    imagePath: flags.image ? resolve(root, flags.image) : null,
    aspect: flags.aspect ?? DEFAULTS.aspect,
    seconds: Number(flags.seconds ?? DEFAULTS.seconds),
    model: flags.model ?? DEFAULTS.model,
    resolution: flags.resolution ?? DEFAULTS.resolution,
    seed: flags.seed === undefined ? null : Number(flags.seed),
    negative: flags.negative ?? null,
    resume: flags.resume ?? null,
  };
  validate(options);
  return options;
}

function validate({ aspect, seconds, resolution, seed, imagePath }) {
  if (!ASPECTS.includes(aspect)) fail(`--aspect must be one of ${ASPECTS.join(", ")} (got ${aspect}).`);
  if (!DURATIONS.includes(seconds)) fail(`--seconds must be one of ${DURATIONS.join(", ")} (got ${seconds}).`);
  if (resolution !== "720p" && seconds !== 8) fail(`${resolution} needs --seconds 8 (Veo rule).`);
  if (seed !== null && !Number.isInteger(seed)) fail(`--seed must be an integer (got ${seed}).`);
  if (imagePath && !existsSync(imagePath)) fail(`Start image not found: ${imagePath}`);
  if (imagePath && !IMAGE_MIME[extname(imagePath).toLowerCase()]) fail("Start image must be .png, .jpg or .webp.");
  if (!key) fail("No GEMINI_API_KEY (set it in .env.local or as an env variable).");
}

function buildBody({ prompt, imagePath, aspect, seconds, resolution, seed, negative }) {
  const instance = { prompt };
  if (imagePath) {
    const data = readFileSync(imagePath).toString("base64");
    instance.image = { bytesBase64Encoded: data, mimeType: IMAGE_MIME[extname(imagePath).toLowerCase()] };
  }
  const parameters = {
    aspectRatio: aspect,
    durationSeconds: seconds,
    resolution,
    ...(imagePath ? { personGeneration: "allow_adult" } : {}),
    ...(negative ? { negativePrompt: negative } : {}),
    ...(seed === null ? {} : { seed }),
  };
  return { instances: [instance], parameters };
}

async function api(path, init = {}) {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API error ${res.status}: ${redact(text).slice(0, 900)}`);
  return JSON.parse(text);
}

async function submit(options) {
  const op = await api(`models/${options.model}:predictLongRunning`, {
    method: "POST",
    body: JSON.stringify(buildBody(options)),
  });
  if (!op.name) throw new Error(`No operation name returned: ${redact(JSON.stringify(op)).slice(0, 400)}`);
  return op.name;
}

async function waitForOperation(name) {
  const started = Date.now();
  let failures = 0;
  while (Date.now() - started < MAX_WAIT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const elapsed = Math.round((Date.now() - started) / 1000);
    try {
      const op = await api(name);
      failures = 0;
      if (op.done) return op;
      console.log(`  ... ${elapsed}s, still rendering`);
    } catch (err) {
      failures += 1;
      console.log(`  ... ${elapsed}s, poll hiccup ${failures}/${MAX_POLL_FAILURES}: ${err.message.slice(0, 200)}`);
      if (failures >= MAX_POLL_FAILURES) throw new Error(`Polling kept failing. Resume with: --resume ${name}`);
    }
  }
  throw new Error(`Still not done after ${MAX_WAIT_MS / 60_000} min. It may finish server-side — resume with: --resume ${name}`);
}

function videoUriOf(op) {
  if (op.error) fail(`Generation failed: [${op.error.code}] ${op.error.message}`);
  const result = op.response?.generateVideoResponse;
  const uri = result?.generatedSamples?.[0]?.video?.uri;
  if (uri) return uri;
  const reasons = (result?.raiMediaFilteredReasons ?? []).join(" | ") || "no reason given";
  fail(
    `BLOCKED by Google's safety filter (${result?.raiMediaFilteredCount ?? "?"} video filtered): ${reasons}\n` +
      "Not billed. Rephrase: fewer violence / trademark words, describe characters instead of naming them.",
    EXIT_BLOCKED,
  );
}

async function download(uri, outFile) {
  const host = new URL(uri).hostname;
  if (!host.endsWith(".googleapis.com")) throw new Error(`Refusing to send the API key to unexpected host ${host}`);
  const res = await fetch(uri, { headers: { "x-goog-api-key": key }, redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${redact(await res.text()).slice(0, 300)}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, bytes);
  return bytes.length;
}

function costLine({ model, resolution, seconds }) {
  const rate = USD_PER_SECOND[model]?.[resolution];
  if (!rate) return "cost: unknown model, check the pricing page";
  const usd = rate * seconds;
  return `cost: ~$${usd.toFixed(2)} (~${(usd * DKK_PER_USD).toFixed(1)} DKK) at $${rate}/s x ${seconds}s`;
}

async function main() {
  const options = readOptions();
  const name = options.resume ?? (await submit(options));
  console.log(`${options.resume ? "Resuming" : "Accepted"} operation: ${name}`);
  console.log(
    options.resume
      ? "  (resumed job: its settings and cost were fixed when it was submitted)"
      : `  model=${options.model} ${options.aspect} ${options.seconds}s ${options.resolution}${options.imagePath ? " image-to-video" : ""}`,
  );
  const op = await waitForOperation(name);
  const bytes = await download(videoUriOf(op), options.outFile);
  console.log(`Saved ${options.outFile} (${(bytes / 1048576).toFixed(2)} MB)`);
  if (!options.resume) console.log(costLine(options));
}

main().catch((err) => fail(err.message));
