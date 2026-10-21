# CLAUDE.md — How to work on GainsTracker ("Gotham Iron Protocol")

Read automatically at the start of every conversation in this repo. Follow it WITHOUT being
reminded — the user should never have to re-explain these things.

## What this app is
A Batman / Gotham-themed strength-training **PWA**, personal use only. Installed to the iPhone
home screen via Safari (not the App Store). Offline-capable, hosted on GitHub Pages. Alfred is the
in-app coach. Dark Gotham look: gold/red accents, tactile/embossed gym motifs.

## THE FILE (this is the #1 thing people get wrong)
- **Edit the source file: `Gainstracker app not complete.html`** — single-file vanilla-JS PWA, one
  `<script>`, ~12.1k lines. ALL code changes go here.
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
- Harness lives in `scripts/qa/` (see its README; one-time `cd scripts/qa && npm install --cache /tmp/npm-cache-gt`).
- Syntax check: `node scripts/qa/syncheck.mjs` — never push a file that fails it.
- Smoke test: `node scripts/qa/smoke.mjs` — real taps (through the haptic switches) on nav, set ✓,
  RESUME, finish, Alfred chat; must report zero console errors.
- Screenshots of any state at iPhone size: `node scripts/qa/shoot.mjs --out /tmp/shots --name x --js "..."`
  (fixtures = synthetic 8-week history; external network blocked; NEVER hit the RapidAPI GIF quota).
- Migrations: `node scripts/test-migrations.cjs "Gainstracker app not complete.html"`.
- The chrome-devtools MCP is optional; the harness above needs only the installed Google Chrome.

## ARCHITECTURE FACTS
- **Design system = Gotham Pro — `DESIGN.md` is the contract** (tokens, S1/S2/S3 surfaces, B1/B2/B3 buttons + the one
  press recipe, the `GP` helper object, art recipe, haptics rule, motion budget, CSS anchors, one-thing-once rule).
  The `<style>` is layered per wave before the anchors `GP:HOME`, `GP:LOGGING`, `GP:PROFILE+FINISH`,
  `GP:MISSION+SUIT`, `GP:ART`, `GP:TABS`, `GP:PRUNE+HOME` — edit a rule in place, never stack an override on it.
- **Home = `renderGotham()`**, composed from `gh*` helpers (there is no gtv2 code left): one hero
  (`ghHeroTonight` / `ghHeroRest` / `ghHeroLive` / `ghHeroFree`, readiness folded in) → `ghWeek` (sessions + only the muscles under MEV / over MRV;
  "All 12 muscles" links to the Suit grid) → `ghSunday` (one volume line + the one-tap weekly adjust buttons) → `ghLifts` → `ghRecap` (Last session) →
  `ghNext` → `ghExtrasRow` (Garage, seasonal events). Each metric appears once. Only one `function renderGotham` exists; a second copy is new drift — delete the unused one.
- **5 tabs:** GOTHAM, MISSION, SUIT, PROFILE, ALLIES (the `case` key → `renderProfile`; `TABS` drives the nav). Mission + Suit are scoped under `.gm`;
  Profile is built by the `p3*` functions; Allies by `renderAllies`; Settings, Data control and onboarding are GP:TABS pages/sheets.
  **Feature docks (GP:DOCKS):** Mission (`gmDock`: Edit plan · New split · Import split · Lab), Suit (`gsDock`: Infirmary · Fuel · Time-lapse · Photos), Profile (`p3Dock`:
  History · Records · Standards · Body · Badges · Backup) and Allies (`alDock`: Add ally · Chat · Duel · Raid · Leaderboard · Manage) each put ONE `gdDock` row of tiles under the hero;
  a tile opens a sheet / sub-page or scrolls to an inline section (`gdJump`). Home has none. Sub-pages (Lab, Infirmary, Garage, Archive) share the `sp-hd` Back header; Fuel and the Alfred page are `go()` pages.
- **One home per feature (DESIGN.md §10 is the ownership map).** Full 12-muscle map = the Suit grid; planned volume = Mission's forecast; stalled-lift detail = the Stalled lifts sheet;
  bodyweight = Profile Body (`bwSet` is the only writer); tape measurements = Suit; tools (Forge, Plate calculator, 1RM test day, Oracle, Strength simulator, Contracts, Bat-Focus) = the Lab;
  the Search sheet (`openIndex`, `INDEX_ITEMS`) lists every destination once with line icons. Before adding a card, grep for the number it shows — if it exists, link to it.
- **Wave 6-7 systems:** GP:CHARM (`gpEnter` → `gpFirst` / `gpLive` / `gpSweep`, `GP_SEC` section-header icon table, scroll-driven hero art, hero View Transition), GP:WEEKLY+BODY
  (`ghWeekReview`, `wkApply` / `wkUndo`, `d.weekAdj`; the Profile Body section), GP:PHOTOS (full photos in the IndexedDB vault `gainstracker/photos`, thumbnails + `idb:1` in `gt_data`,
  put → read back → byte-compare → swap, safety copy `gt_photos_backup`; Compare is the one before/after view). Details and budgets in DESIGN.md §11-§15.
- **Wave 8 (GP:STRENGTH+SUIT):** the Suit hero is the vault still (`gaArt("suit-hero")`, lighter veil) and the Suit dock Fuel tile has its own still (`tile-fuel`). Strength standards use the user's STRONGEST variation of each pattern
  as a barbell equivalent: `liftEstimate(lift)` / `liftEstimateAt` over the `SV` table are the only readers (Strength card, Big-3, Body trend, dock tile, ally optimality, badges); factors are conservative, documented per row, and capped at
  the Elite tier. A machine or leg press is never counted at face value, a dumbbell / cable / single-leg lift never counts. DESIGN.md §19, `node scripts/qa/strength.mjs`.
- **Alfred = the header avatar (gold-ring) + ONE text-first chat** (`openAlfredChat()`, `#ac-panel`, `.ac-*`) and an Alfred page (`go('alfred')`, reached from Search: today's read, suggestions,
  last conversation). No floating button, no second chat UI. His app knowledge is `ALFRED_APP_GUIDE` (+ `ALFRED_PERSONA`, `ALFRED_CHAT_RULES`): every label in it must exist in the UI, so grep
  the code before changing one and update it whenever a screen or rule changes (docks.mjs checks it names every dock tile).
- **Deleted on purpose (don't resurrect unless asked):** Territory War, Threat, Iron Ledger, Chronicle/Gazette, crate, siege, season pass, villain case files/Arkham/boss fights, Wraith, title
  belts, wardrobe/liveries/frames/prestige, the Home lore fold; and in the quality pass the Wayne Tech hub + 26-week heatmap, Mission's Frequency card, the Mastery suit in the Time-lapse sheet,
  the Alfred page's dossier chips, the Lab's 1RM calculator / Measure rows, Home's 12-tile volume grid and the Sunday card's records / stalled lines. **Still here:** the Garage (vehicles unlock with real
  milestones), seasonal events, and Allies (league, leaderboard, co-op raids, sparring, Fight Night). This is the executed form of the "dial back" bullet in SCIENCE > FLAVOR below; the science systems are untouched.
- Per-gym PRs: `d.prsByGym[gym]`; `d.prs` re-points to the active gym each load. `u.gyms`,
  `u.activeGym`, `switchGym()`. Machine settings: `d.machineSettings[gym][exName]`.
- Images: keep them tiny (downscale to ≤420px wide). NEVER embed multi-MB images → iOS memory crash. Tab heroes use
  `assets/art/*.jpg` via `gaArt()` (see `assets/art/README.md`); exercise pictures are `assets/exfig/<pattern>.png`.
- **QA harness (`scripts/qa`, README there)** drives the REAL app in headless Chrome at iPhone size (393 default, `--width 375` for the small phone) with a seeded fixture, a pinned clock and
  external network blocked. Every script defaults to the repo's own app file, so it works in worktrees. `syncheck.mjs` (parse), `smoke.mjs`, `flow.mjs` (nav → start → one-tap ghost ticks → PR row →
  finish → summary RPE → Home, Records header, Alfred chat), `home.mjs`, `tab.mjs --tab mission|suit|case|allies|alfred|fuel [--inject-file scripts/qa/seed-allies.js]`, `docks.mjs`, `charm.mjs`,
  `photos.mjs`, `weekly-body.mjs`, `onboarding.mjs`, `settings.mjs`, `layout.mjs [--width 375|393] [--fixture train|rest|none|live]` (every tab, page, sub-page and sheet: overflow, clipped or wrapped
  text, unlabeled / tiny tappables, dead handlers, backdrop strands, console errors, plus the one-home-per-feature rules), `shoot.mjs`, `perf.mjs [--throttle 4]` (size, DOM nodes, render ms, infinite
  animations ≤ 1 and backdrop-filters ≤ 3 per screen, first paint) and `node scripts/test-migrations.cjs <file>`. Everything must end green with zero console errors; a missing style is invisible to
  console checks, so also look at a screenshot when you touch CSS.

## HARD RULES (never violate)
- Offline PWA on GitHub Pages • single-file vanilla JS • never break/erase `localStorage` data
  (workouts, PRs, splits, progress live there) • per-gym PRs stay isolated • **NO deload features,
  ever** • **no settings/toggles** — make it great by default • always clear + functional WHILE being
  cinematic • personal use only.

## PRO / "CEO VIBE" DIRECTION (user, 2026-10-19 — SUPERSEDES the "crazy eye-popping" wording below)
The user now wants the app **professional, executive and useful** — "more professional and CEO vibe than
gaming vibe". Calibration: Whoop, Apple Fitness/Health, Hevy/Strong. Gotham/Batman stays only as SMALL
hints (dark gold palette, Alfred, bat glyph, tab names).
- Fonts: SF Pro system stack for ALL text incl. titles; Bebas Neue (embedded, offline) ONLY for big numerals.
- Surfaces: matte tiers (row / card / ONE hero per screen); no neon outline-glow boxes; gold = action,
  selection, records — thin accents, never glow decoration. Line SVG icons, no emoji as UI chrome.
- Data first: rings, landmark bars (MEV/MAV/MRV), sparklines, honest numbers (no invented inputs).
- Motion: short + physical (one press spring); full-screen only at session finish; PRs = in-row moment.
- Haptics: iOS 26.5+ only buzzes on a FINGER tap of a real `<input type=checkbox switch>` — the taptic
  module injects invisible `.hx` switches into key tappables; keep them working.
- Alfred: header avatar + one-line tips (no floating FAB); approachable but terse; speaks only on PRs,
  session finish, or when spoken to. His app knowledge lives in `ALFRED_APP_GUIDE` — update it when
  features change.
- Progression rule (2026-10-19, replaces the old 9+ rule): plan ranges 5–10; add weight only when a
  WORKING set hits 10; 5–9 → build reps; warm-ups never count. Weekly volume is counted per split cycle
  (8-day cycle) and shown per week. Readiness never invents sleep (optional 2-tap sleep log).

## DESIGN LANGUAGE (older — read through the PRO direction above)
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
  records) should be COMPACT cards by default; tapping opens the full detail in a tab/sheet. Gotham
  home applies this to the whole narrative/gamification layer, not just splits — see SCIENCE > FLAVOR
  below.
- **No pop-up pile-up, launch OR mid-workout.** Nothing should throw an unprompted full-screen
  takeover just from opening the app or finishing a set/exercise. Reserve `cinePush`/`playStinger`
  for things the user actually earned and will want to see (a PR, a session finishing) — acknowledge
  everything else with a toast/haptic instead. If you're about to add a new auto-triggered popup, the
  default answer is no — make it a toast.
- **Spread content across tabs / into small bites.** Don't bury important things (e.g. the calendar
  is stuck at the bottom of a tab and never gets used). Put each thing where it's reachable.

## SCIENCE > FLAVOR (user direction, 2026-07-22 — supersedes anything below that conflicts)
The user still likes the Batman theme (branding, nav tabs, Alfred, dark gold aesthetic — don't strip
that), but wants the app **simpler, quicker, and more science-first**: less time in narrative
gamification, more of what's actually backed by training science (RIR/RPE, MEV/MAV/MRV volume
landmarks, per-muscle recovery windows, progressive overload, muscle-head bias), surfaced passively
(inline cards, ambient labels) rather than through pop-ups.
- **Keep:** the core theme/branding, Alfred as coach, all real training-science systems (recovery
  model, volume landmarks, RIR intel, progressive-overload suggestions, strength standards) — these
  ARE the product, don't touch their logic.
- **Dial back, don't delete:** pure-narrative gamification layers (Territory War, Season Chronicle,
  GCPD Crate, Siege, Wraith, Title Belts/Fight Night, Garage/vehicles, Wardrobe skins) — fold them
  behind collapsed accordions or move them out of the primary flow instead of ripping them out. The
  user explicitly does not want them gone, just not in the way.
- **Cut outright** anything that's 100% flavor with zero informational value and fires automatically
  (e.g. a voice line comparing tonnage to a fictional car's weight) — those add nothing and just cost
  time.
- **Relabel toward plain science language where a villain/narrative label was standing in for a real
  metric** (e.g. "Most Wanted · [Villain]" → "Furthest behind MEV") — keep the underlying mechanic,
  drop the narrative wrapper when it obscures rather than adds.
- **Animations:** keep them short everywhere — this is a standing preference, not a one-time ask. When
  in doubt, cut a one-shot animation/timeout duration down, don't leave it "as designed." Full-screen
  moments belong to PRs and session completion, nothing else.

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
