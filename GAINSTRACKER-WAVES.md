# GAINSTRACKER — WAVES (the crazy redesign, one paste at a time)

Hero (#1), Alfred card (#2), Frequency coach (#6), Split day-cards (#7), barbell nav (#14), the PWA
install, and the streak wiring are **already shipped**. These 7 waves give the WHOLE app a crazy,
eye-popping redesign and finish the rest of THE 14 (#3,#4,#5,#8,#9,#10,#11,#12,#13), the +25 feature
additions, Gym Campaigns, and a clean exercise database with real movement figures.

---

## ▶ THE DESIGN BAR (applies to EVERY wave — this is the whole point)

- Make it **crazy, eye-popping, cinematic** — vivid Gotham gold/red with glow/neon accents, deep
  texture, dramatic lighting, motion. **Never grey, flat, or boring.** If a tab looks muted or
  "the same on a prik," it FAILED — go bigger.
- Tactile-metal is the base feel; pile vibrant color + glow + energy ON TOP of it.
- **GREY is ONLY for the anatomy/exercise figures** (grey body so worked muscles read bright red).
  Everything around those figures must be vivid.
- Reuse the existing tactile tokens so the app stays one object: `.gtv2-tonight`, `.gtv2-track`,
  `.gtv2-idrow`, `.gtv2-alfred-top`, `.freq2-*`, `.splitday`.
- Eye-catching but always instantly clear: compact the bloated, enlarge what matters.
- Hard rules: no settings/toggles, no deload, never wipe localStorage, per-gym PRs isolated, offline
  single-file PWA. **ALLIES is online via Firebase — never break its data layer.**

## ▶ HOW YOU USE THIS (your steps)

For each wave: in the VS Code Claude Code chat type `/clear` (this wipes context, same as a new
session, and CLAUDE.md reloads) → open this file → **copy one whole wave** (from `### WAVE n` to the
end of its `STEP 6`) → **paste it into the chat** → enter. It builds, syntax-checks, deploys, and
tells you what to check. On your **iPhone** (on wifi): swipe the app fully closed, reopen, check.
Reply 👍 to continue, or say what's wrong. One wave at a time.

---

### WAVE 1 — Crazy design system + exercise database overhaul + movement figures

**WHAT TO DO:** Lay the vivid new look down everywhere, clean up the exercise database, and generate a
small CAPPED set of grey-figure exercise images (worked muscles red) reused across many exercises.

**STEP 1 — Orient.** Read CLAUDE.md (esp. DESIGN LANGUAGE + IMAGE GENERATION). In
`Gainstracker app not complete.html` read: the global CSS variables / theme block (top of `<style>`),
the gtv2 token CSS (~605–650), `CORE_EX` (~755, exercise shape is
`{n,id,eq,p:[primary],s:[secondary],c:[cues],tgt,sub}`), `EXDB` (~1374), `indexEx()`/`mergeCustomEx()`
(~1830).

**STEP 2 — Build, in order:**
1. **Vivid theme upgrade:** push the global color system from muted/grey toward crazy eye-popping
   Gotham — richer gold + red, tasteful glow/neon accents, deeper textured backgrounds, stronger
   lighting and shadow. Update the CSS variables once so every tab inherits the new energy. Keep
   text legible.
2. **Exercise DB cleanup:** trim the library HARD — remove kettlebell clutter and near-duplicate
   variants, merge "lever/machine" duplicates, and fix wrong categorization (e.g. chest exercises
   miscategorized under triceps). Keep `p`/`s` muscle data accurate.
3. **Movement-figure image set (CAPPED — do NOT make one per exercise):** define ~30–40 movement
   "figure keys" by pattern + primary muscle (flat-press, incline-press, chest-fly, row, pulldown,
   pull-up, overhead-press, lateral-raise, biceps-curl, triceps-pushdown, squat, hinge/deadlift,
   leg-press, leg-curl, leg-extension, calf-raise, ab-crunch, etc.). Generate ONE photoreal grey
   bodybuilder image PER KEY performing that movement with the worked muscles solid bright red:
   `node scripts/gen-image.mjs "<prompt>" assets/exfig/<key>.png` then `sips -Z 420 assets/exfig/<key>.png`.
   Add a small lookup that maps each exercise (by `p` + equipment/name) to a figure key, so hundreds
   of exercises share these ~40 images. Read a few PNGs to confirm quality. Respect the budget — never
   loop the whole DB into the generator.
4. **Eye-popping exercise picker/detail UI:** redesign the exercise picker and the per-exercise detail
   to show the mapped figure prominently with cues, in the new vivid tactile style (no tiny emojis,
   no flat rows).

**STEP 3 — Rules:** capped image generation only; grey is for figures, vivid everywhere else; reuse
tokens; never wipe localStorage (`state.data.customEx` must survive).

**STEP 4 — Verify:** read 2–3 generated PNGs, then `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat: vivid theme + exercise DB cleanup + movement figure set" && git push`

**STEP 6 — Report:** Check on iPhone: the whole app looks more vivid/eye-popping; open the exercise
picker → cleaner library with a grey figure (red worked muscles) per exercise; no duplicate clutter.

---

### WAVE 2 — Workout/logging experience: intro, screen redesign & power tools (THE 14: #9)

**WHAT TO DO:** Turn the whole workout flow into a cinematic, tactile, powerful in-session experience.

**STEP 1 — Orient.** Read CLAUDE.md. Read `renderReadiness()` (~3293), `renderLogging()` (~3614),
`renderSummary()` (~4029), `beep()` (~2244), the `.gtv2-tonight`/`.gtv2-track` CSS (~607–631), and the
PR / e1RM code.

**STEP 2 — Build, in order:**
1. **Start-Patrol intro:** a short cinematic "begin patrol" moment before logging — tonight's target,
   muscles, split position using `.gtv2-tonight` + `.gtv2-track`. One tap to begin.
2. **Logging screen redesign:** rebuild `renderLogging()` as a vivid focused current-exercise view
   showing the exercise's movement figure (from Wave 1), with the set list below.
3. **Big +/- tap pads** (plate-styled steppers for weight & reps, one-handed).
4. **Plate-loading visual:** draw the bar loaded with correct plates per side for the entered weight.
5. **"Previous" delta arrows:** each set shows last time's value with up/down/equal vs today.
6. **Target-vs-actual:** compact planned-vs-done readout for the session.
7. **Rest-timer auto-start:** after saving a set, auto-start a tactile countdown with a `beep()` cue
   at zero; tap to skip/extend; per-exercise rest preference remembered.
8. **AMRAP/failure marker → fresh e1RM:** mark a set to failure, recompute estimated 1RM, feed PR
   detection.
9. **Inline PR celebration:** beating a PR celebrates immediately in-session (contextual, never a
   launch pop-up), tied to the active gym.
10. **Supersets** (group exercises) and **in-session swap** (to another exercise the active gym's
    equipment supports).

**STEP 3 — Rules:** all set data keeps writing to the same localStorage structures, per active gym;
reuse tokens; no toggles, no deload.

**STEP 4 — Verify:** `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat(#9): cinematic logging — intro, plate visual, rest timer, supersets, inline PRs" && git push`

**STEP 6 — Report:** Check on iPhone: start a workout → intro plays; log with +/- pads; plate visual
matches weight; rest timer + beep; mark AMRAP; beat a PR → inline celebration; superset + swap work.

---

### WAVE 3 — Splits, split generator & Gym Campaigns (THE 14: #8)

**WHAT TO DO:** Compact split generator, guarantee per-gym data isolation, and build Gym Campaigns.

**STEP 1 — Orient.** Read CLAUDE.md. Read `renderStrategy()` (~6732), `renderCustomCreator()` (~3886),
`switchGym()`, and uses of `d.prsByGym`, `d.machineSettings`, `u.gyms`, `u.activeGym`.

**STEP 2 — Build, in order:**
1. Collapse the split generator to ONE compact tactile entry tile (style like `.splitday`); tapping
   opens the full generator in a bottom-sheet. Don't render it all inline by default.
2. **Per-gym isolation:** route every PR/weight-suggestion/machine-setting shown in a split through
   the ACTIVE gym only (`d.prsByGym[u.activeGym]`, `d.machineSettings[u.activeGym]`). Opening the same
   split under a different gym must never leak another gym's numbers — fix every offending read path.
3. **Gym Campaigns:** current gym = active "base"; each past gym = a closed chapter with frozen
   PRs/sessions/volume as read-only look-back history. Add a compact vivid timeline ("Fitness X — 142
   sessions, chapter closed → now at PureGym"). Switching starts a clean per-gym record book; old gyms
   never mix into live data.
4. **Per-gym equipment list:** each gym stores its equipment/machines; generator + suggestions respect
   it. Add a small "My Gym — equipment" editor on the base card.

**STEP 3 — Rules:** reuse tokens; keep per-gym PRs isolated; never wipe localStorage; no toggles.

**STEP 4 — Verify:** `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat(#8): compact generator + per-gym isolation + Gym Campaigns + equipment" && git push`

**STEP 6 — Report:** Check on iPhone: generator is compact and expands; switching gym changes numbers
correctly and old gyms show as history; equipment editor works.

---

### WAVE 4 — SUIT tab: animated Batsuit muscle map (THE 14: #10)

**WHAT TO DO:** Make the Suit tab the showpiece — a big animated, eye-popping muscle map.

**STEP 1 — Orient.** Read CLAUDE.md (muscle-figure target). Read `renderSuit()` (~4437), the shared
suit shading defs (~4191), `assets/figures/figure-chest-front.png`.

**STEP 2 — Build, in order:**
1. **Generate the anatomy figure set** (front AND back) per the locked target: photoreal grey
   bodybuilder, worked muscle solid bright red, black bg, no text. ~12 muscles × front/back. Generate
   a few per slot, read PNGs, pick best, `sips -Z 420`. (Reuse Wave-1 figures where they fit; only
   generate what's missing — respect the budget.)
2. **Big central Batsuit / body map** colored by recent muscle **freshness** (fresh → fatigued
   gradient) from history, with a subtle alive idle animation (breath/sheen/glow).
3. **Freshness forecast:** when each muscle is recovered/ready.
4. **Per-muscle weekly-set rings:** small ring per muscle = weekly sets vs target.
5. **Tap a muscle → dossier sheet** (recent work, freshness, sets this week, suggested next work),
   compact, expands on tap.

**STEP 3 — Rules:** generated images not emojis; images ≤420px (never multi-MB → iOS crash); vivid
chrome around the grey figures; reuse tokens.

**STEP 4 — Verify:** read a couple PNGs, then `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat(#10): animated Batsuit muscle map + freshness + set rings + dossier" && git push`

**STEP 6 — Report:** Check on iPhone: open SUIT → big animated map; colors reflect recent training;
tap a muscle → dossier with recent work + forecast + ring.

---

### WAVE 5 — Profile, calendar & the record systems (THE 14: #11 + +25)

**WHAT TO DO:** Rebuild Profile, rescue the buried calendar onto it, and build the rewarding
record/PR systems.

**STEP 1 — Orient.** Read CLAUDE.md. Read `renderProfile()` (~5648, the `case` tab), `patrolCalendar()`
(~8807) and `renderTech()` (~8774, where the calendar is currently buried behind the "more" sheet),
and the PR / e1RM code with `d.prsByGym`.

**STEP 2 — Build, in order:**
1. **Calendar onto Profile** as a prominent vivid month heat-grid (training days filled/glowing,
   intensity by volume); tap a day → that day's session detail sheet. Keep a compact 26-week heatmap
   too. No more digging into Wayne Tech for it.
2. **Profile redesign** with the tactile tokens; top: identity, rank (fuller + clearer than the small
   home emblem), current campaign/base gym.
3. **MMA Fight Record / scoreboard polish** — clean cinematic stat scoreboard.
4. **PR record-book feed** (chronological, per gym, tactile cards).
5. **Volume PRs** (sets×reps×weight), not just 1RM.
6. **Strength standards** — each main lift as ×bodyweight mapped to a level (novice→elite) with a
   vivid gauge.
7. **Shareable PR card image** — compose a Gotham-styled PR card for a new PR.
8. **"On this day" throwback** — what you lifted on this date in past months, surfaced contextually.
9. **Beat-the-boss preview** — next boss/rank challenge tied to upcoming PRs.

**STEP 3 — Rules:** reuse tokens; keep per-gym PR isolation visible; contextual surfacing only; no
toggles.

**STEP 4 — Verify:** `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat(#11/+25): Profile + calendar heat-grid + PR feed + strength standards + share card" && git push`

**STEP 6 — Report:** Check on iPhone: open PROFILE → calendar right there and vivid; tap a training
day → detail; see the PR feed, a strength-standard gauge, a shareable PR card, and an "on this day".

---

### WAVE 6 — GOTHAM home, Allies, command search & corner buttons (THE 14: #3/#4/#5/#12/#13)

**WHAT TO DO:** Finish the home screen, make Allies far better (without breaking Firebase), and add a
real global search + tactile corner controls.

**STEP 1 — Orient.** Read CLAUDE.md. Read `renderGotham()` (~9309, live home), `renderGarage()`
(~5488), Wayne Towers + Most Wanted render code, `renderAllies()` (~7260, note every Firebase
read/write), `renderNav()` (~3169), the `go()` router (~3274).

**STEP 2 — Build, in order:**
1. **#3 home muscle map:** a compact, eye-popping mini muscle map on Gotham (tap → Suit), with subtle
   effects.
2. **#4 rank + Most Wanted:** small rank with a tiny tactile emblem on home (full rank lives on
   Profile); compact Most Wanted.
3. **#4 Garage:** more compact + better placed — a tactile tile that expands, not a big inline block.
4. **#5 Wayne Towers:** better placement, less scrolling — a compact tactile entry, not buried.
5. **#12 Allies redesign:** clearer, easier, vivid — wrap the existing Firebase calls UNCHANGED.
6. **#13 command search:** a command-style global search from a consistent corner control that finds
   exercises, splits, PRs, days, gyms, tabs — type-to-jump anywhere.
7. **#13 corner buttons:** replace tiny emoji controls with proper tactile buttons (Alfred + search),
   consistent across all tabs.

**STEP 3 — Rules:** never break the Firebase data layer; reuse tokens; keep home clear and fast; no
toggles.

**STEP 4 — Verify:** `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat(#3/#4/#5/#12/#13): home tweaks + Allies redesign + command search + corner buttons" && git push`

**STEP 6 — Report:** Check on iPhone: GOTHAM → mini muscle map (tap → Suit), small rank emblem,
compact Garage + Wayne Towers; ALLIES cleaner and still loads data; corner search jumps from any tab.

---

### WAVE 7 — Cinematics, kill launch pop-ups & final eye-popping QA (+25 + wrap)

**WHAT TO DO:** Add the alive moments/motion, remove all launch pop-ups, and do a final consistency +
data-safety sweep.

**STEP 1 — Orient.** Read CLAUDE.md. Read the `go()` router (~3274), `renderOnboarding()` (~9424),
`weeklyStreak()` (~5585), the rank logic, and everything that fires on open: the Two-Face / Calendar
Man daily popup (~2894), any boss cinematic, any onboarding nag.

**STEP 2 — Build, in order:**
1. **Rank-up ceremony** (short cinematic on rank up) + **rank-themed accent** (app accent shifts with
   rank) + **weekly-streak milestones** (uses `weeklyStreak()`).
2. **"Rest day done right" affirmation** — positive note on a planned rest day. NO deload logic.
3. **Smooth tab transitions** via the `go()` router so the app feels like one continuous device.
4. **Cinematic onboarding** — upgrade `renderOnboarding()`.
5. **Empty-state polish** — every empty list/section gets a vivid, on-brand empty state.
6. **Kill launch pop-ups:** convert every on-open pop-up to CONTEXTUAL surfacing (during relevant
   use, or an inline dismissible banner). Cold-opening the app must show ZERO modals.
7. **Consistency sweep:** bring any remaining grey/flat boxes onto the vivid tactile tokens; consistent
   spacing, type scale, gold/red accents across all tabs.
8. **Data-safety check:** confirm localStorage shapes (`d.prsByGym`, `d.machineSettings`, splits,
   history, `customEx`) are intact and per-gym PRs still isolated.

**STEP 3 — Rules:** contextual only (never on launch); never wipe localStorage; offline must still
work; no deload, no toggles.

**STEP 4 — Verify:** `export LC_ALL=C; osascript -l JavaScript /tmp/synck.js`

**STEP 5 — Deploy:** `cp "Gainstracker app not complete.html" index.html && git add -A && git commit -m "feat(+25): cinematics + contextual popups + final eye-popping QA" && git push`

**STEP 6 — Report:** Give me a short "what changed across all 7 waves" changelog. Check on iPhone:
force-close + cold-open a few times → no pop-ups; switch tabs → smooth transitions; walk every tab →
consistent crazy eye-popping look; my existing PRs/history all still there.
