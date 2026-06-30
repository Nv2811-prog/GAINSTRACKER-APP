# CLAUDE.md — How to work on GainsTracker ("Gotham Iron Protocol")

Read automatically at the start of every conversation in this repo. Follow it WITHOUT being
reminded — the user should never have to re-explain these things.

## What this app is
A Batman / Gotham-themed strength-training **PWA**, personal use only. Installed to the iPhone
home screen via Safari (not the App Store). Offline-capable, hosted on GitHub Pages. Alfred is the
in-app coach. Dark Gotham look: gold/red accents, tactile/embossed gym motifs.

## THE FILE (this is the #1 thing people get wrong)
- **Edit the source file: `Gainstracker app not complete.html`** — single-file vanilla-JS PWA, one
  `<script>`, ~9.5k lines. ALL code changes go here.
- **`index.html` is a GENERATED DEPLOY COPY. Never hand-edit it.**
- **Deploy / ship (run after every shippable change):**
  ```
  cd "/Users/nickivendelbo/Desktop/Gainstracker batman" \
    && cp "Gainstracker app not complete.html" index.html \
    && git add -A && git commit -m "feat: ..." && git push
  ```
  Live ~1–2 min later at https://nv2811-prog.github.io/GAINSTRACKER-APP/
- PWA: the iPhone may need the app swiped-closed and reopened to show the new version. sw.js is
  network-first so it self-updates online.

## Verify before you ship (no app build step — it's plain vanilla JS)
- Syntax check: `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js` (recreate /tmp/synck.js if
  missing — a JXA wrapper that parses the file). Never push a file that fails the syntax check.
- Render/QA: use the chrome-devtools MCP + evaluate_script to check the rendered HTML. Screenshots
  may time out — if so, verify via the DOM and ask the user to eyeball on iPhone.

## ARCHITECTURE FACTS
- Live home = `renderGotham()` @ ~line 9201 (the **gtv2** build: gtv2MissionHero, gtv2ScorePanel,
  gtv2MuscleGrid; CSS ~605–650). There is a DEAD duplicate `renderGotham` @ ~5514 — delete it; edits
  there do nothing.
- 5 tabs: **GOTHAM, MISSION, SUIT, PROFILE, ALLIES** (case key → renderProfile).
- Per-gym PRs: `d.prsByGym[gym]`; `d.prs` re-points to the active gym each load. `u.gyms`,
  `u.activeGym`, `switchGym()`. Machine settings: `d.machineSettings[gym][exName]`.
- Images: keep them tiny (downscale to ≤420px wide). NEVER embed multi-MB images → iOS memory crash.

## HARD RULES (never violate)
- Offline PWA on GitHub Pages • single-file vanilla JS • never break/erase `localStorage` data
  (workouts, PRs, splits, progress live there) • per-gym PRs stay isolated • **NO deload features,
  ever** • **no settings/toggles** — make it great by default • always clear + functional WHILE being
  cinematic • personal use only.

## DESIGN LANGUAGE (this is what the user actually wants)
The user LOVES the tactile, alive hero at the very top of the Home screen and wants that energy
spread to the WHOLE app. The plain flat boxes are what they hate.
- **CRAZY, EYE-POPPING, CINEMATIC — never grey/muted/boring.** The app should look vivid and alive:
  rich Gotham gold/red (and tasteful accents/glow/neon), deep texture, dramatic lighting, motion.
  Tactile-metal is the base feel, but pile vibrant color + glow + energy ON TOP. "Looks grey and
  boring" = FAILED. Every tab should make you go "whoa."
- **Everything should look like a real, physical, tactile object** — knurled bars, weight plates,
  embossed metal, brushed surfaces, depth, lighting, subtle motion. Depth/texture/motion OVER flat
  cards.
- **Eye-catching but instantly clear.** Shrink what's bloated, enlarge what matters.
- Build reusable "tactile surface" CSS primitives early and reuse them everywhere so the app feels
  like one cohesive object.
- **Use real generated images now** (see below) instead of tiny emojis or flat placeholders.
- **GREY IS ONLY for the anatomy/exercise figures** (grey body so the worked muscles read bright
  red). The app chrome around those figures must NOT be grey — it should be vivid and cinematic.

## REQUIRED UX BEHAVIORS (the user asked for these specifically)
- **Compact-by-default + tap-to-expand.** Big bloated sections (splits, split generator, maps,
  records) should be COMPACT cards by default; tapping opens the full detail in a tab/sheet.
- **No launch pop-up pile-up.** Nothing should throw pop-ups the moment the app opens (the user just
  hits "skip"). Surface coaching/notifications CONTEXTUALLY — while using a feature or during a
  workout — not all on launch.
- **Spread content across tabs / into small bites.** Don't bury important things (e.g. the calendar
  is stuck at the bottom of a tab and never gets used). Put each thing where it's reachable.

## IMAGE GENERATION (works — paid Gemini, funded). Use it automatically.
When the app needs any image (muscle figures, icons, textures, backgrounds), generate it — don't
ask, don't hand-fake it:
```
node scripts/gen-image.mjs "<detailed prompt>" assets/<name>.png
```
Then **downscale before wiring in**: `sips -Z 420 assets/<name>.png` (keep it small, ≤~150KB).
- Muscle-figure target (locked): photorealistic full-body bodybuilder, neutral matte GREY skin, the
  worked muscle group SOLID BRIGHT RED, other muscles plain grey, pure black background, clean studio
  lighting, centered, no text. Front AND back. Example: `assets/figures/figure-chest-front.png`.
- Each image ≈ $0.04 (~0.28 DKK). The user is cost-conscious — NEVER generate one image per exercise
  (the library has hundreds → 400+ images is too much money). For exercise demos, generate a CAPPED,
  CURATED set keyed by MOVEMENT PATTERN (~30-40 max, e.g. flat-press / incline-press / row /
  pulldown / squat / hinge / curl / pushdown …) and map many exercises to one figure. Same for the
  Suit anatomy: ~12 muscles × front/back. Generate a few per slot, read the PNG, pick the best,
  reuse widely. Keep a total budget in mind.

## DEFINITION OF DONE for "make it better / 100x / more lively / move things around"
A vague "make it better" is a mandate for a **bold, comprehensive redesign**, never one tweak.
- Change MULTIPLE areas at once: layout, hierarchy, spacing, color, type scale, motion, texture.
- The before/after must look **obviously different at a glance**. If it looks "the same on a prik"
  you FAILED — go bigger.
- Be ambitious by default; err toward too much change, not too little. Don't ask "should I?" — do the
  bold version, ship it, then tell the user exactly what to open/check on iPhone.

## Wave workflow
Larger overhauls are split into "waves" in `GAINSTRACKER-WAVES.md`. The user pastes one wave at a
time. Each wave: do the work boldly → syntax-check → deploy (cp+commit+push) → tell the user what to
eyeball on iPhone → wait for thumbs-up before the next wave.
