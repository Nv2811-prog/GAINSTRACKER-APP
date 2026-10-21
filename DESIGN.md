# DESIGN.md — Gotham Pro (the visual contract)

Single source of truth for how the app looks and moves. Rewritten after the Gotham Pro overhaul (waves 1-5), extended for waves 6-7 and
the quality pass (one home per feature, identifiable buttons).
If a decision isn't answerable here, add it here FIRST, then build. Grep the code before trusting any name below.

**One sentence:** a professional, CEO-grade dark interface (calm matte surfaces, SF Pro text, Bebas numerals, gold only
where something is an action, a selection or a record) with cinematic Gotham stills behind each tab's single hero.
Science first: the numbers are the product, the Batman skin is the atmosphere. Quality over quantity: 1 or 2 of the best of a thing, never 10 of the same.

## 1 · The one-thing-once rule
Every metric, state and action appears **once per screen**; everywhere else it is a link into the place that owns it. A visual or feature that shows up in
3+ places, or twice where one copy is plainly worse, keeps its best home and the rest become a one-line link (or go). The ownership map is §10.
- Home: readiness lives inside the Tonight hero (no separate readiness card); one This-week card owns sessions + the volume **exceptions** (muscles under MEV or over MRV,
  plus an "All 12 muscles" link to the Suit grid); one Lifts card owns records + stalled lifts; the Sunday card is one volume line + next week's one-tap changes;
  everything else sits behind the "Gotham extras" row.
- One S3 hero per screen. One B1 (gold) button per view. One moving thing per screen (see Motion).
- Compact by default, tap to expand: folds (`gmFoldRow` + `toggleAcc`), sheets (`openSheet`), sub-pages and the feature docks (§12) hold the detail.
- If you are about to add a second place that shows the same number, link to the first instead. The suit figure exists on the Suit tab only (the day briefing's target figure is a different thing: tonight's muscles).

## 2 · Tokens (`:root`, top of the `<style>`)
| Token | Value | Use |
|---|---|---|
| `--g0` `--g1` `--g2` `--g3` `--g4` | #05070C #0C121C #111925 #182234 #202C40 | elevation by **luminance**: canvas, S1 rows/tiles, cards, raised, controls/buttons |
| `--hair` `--hair2` | rgba(150,178,222,.10 / .18) | 1px borders and inset rings (never a grey solid) |
| `--hl` | inset 0 1px 0 rgba(255,255,255,.05) | top-light on every raised surface |
| `--sh1` `--sh2` | small drop / `0 16px 36px -16px #000` | card shadow |
| `--gold` `--gold-hi` `--gold-lo` | #F2C14E #FFDD8A #D9A033 | action / selection / record (primary-button gradient) |
| `--gold-ink` `--on-gold` | #F5CD72 #1A1305 | gold **text** on dark / dark text on a gold fill |
| `--ok` `--warn` `--bad` `--rest` | #34D27F #FFB224 #FF5A4E #5BB4FF | in range-or-done / under target / over limit-or-danger / recovery. One meaning each. |
| `--tint-gold/ok/warn/bad/rest` | the colour at .13 alpha | chip and tag fills |
| `--tx1` `--tx2` `--tx3` | #F3F0E8 #A8B3C6 #8C97AC | text hierarchy; tx3 is lifted to clear 4.5:1 on every surface incl. g4 (6.0 on g2, 4.8 on g4) |
| `--r-s` `--r-m` `--r-l` | 10 / 16 / 22 px | controls, rows/tiles, cards and heroes |
| `--spring` `--d-in` `--d-out` | `linear(0,.38 9%,.88 20%,1.06 30%,1.03 40%,.995 55%,1)` · 90ms · 280ms | the press recipe |
| `--body` `--disp` `--num` | SF Pro Text / SF Pro Display stacks / `'Bebas Neue'` | type families |

Legacy names (`--bg*`, `--gold2/3`, `--red/green/yellow/orange/blue/purple/steel`, `--text*`, `--border*`) are **remapped onto
this palette** so old inline styles inherit it. New code uses the Gotham Pro names. Meaning rules: gold = action/selection/record,
green = done/in range, amber = under target, red = over/danger, blue = recovery. App chrome is never muted grey; grey exists
only in the anatomy figures so worked muscles read bright red.

## 3 · Type
- Body: SF Pro (system stack), 16px/1.5. Bebas Neue is embedded as a base64 woff2 (`.num`, tabular numerals; offline, never blocks paint) and is used for **numbers and hero titles only**.
- Helpers (under `.gh`): `.eyebrow` 11px/600 caps +.08em · `.t-s` 13/18 tx2 · `.t-xs` 11/14 tx3 · `.num` line-height .88 · colour `.c-ok .c-warn .c-bad .c-rest .c-gold .c-2 .c-3`.
- Row title `.gh-t1` 15/20 600 · row sub `.gh-t2` 13/17 tx2 · card header `.gh-lh h3` 17/1.2 650 · section header `.gh-sec h2` 20/1.2 700 · hero title `.gh-title` clamp(30px, 9.6vw, 37px) Bebas.
- Inputs are 16px+ (iOS zoom). Touch targets >= 44px (48px hit via a `::after` inset on small controls).

## 4 · Surfaces (scoped under `.gh`, the Home primitives that every tab reuses)
- **S1** `.s1` row/tile: `--g1`, `--r-m`, `--hl`. Lists are S1 rows inside an S2 card, divided by hairlines.
- **S2** `.s2` card: vertical gradient #131B29 -> #0F1621, 1px `--hair`, `--r-l`, `--hl` + `--sh2`.
- **S3** `.s3` hero (one per screen): gold radial top-right + crimson bottom-left, a 1px gold hairline across the top, a faint grain overlay, `is-live` adds a 1.5px gold ring. Cinematic art sits inside it (see 7).
- Rows: `.gh-row` (46px min, 30px `.lead` icon chip) · card header `.gh-lh` (title left, action right) · sub-header `.gh-sub` · **section header `.gh-sec`** (h2 left, caption `.t-xs` or action `.gh-more` right, always ONE row; the action keeps a 44px hit without growing the row) · `.tag` (+ `.ok/.warn/.bad`) · `.gh-chip`.
- Spacing rhythm 4 / 8 / 12 / 16 / 24; page pad 14px; `#app` max-width 560px; safe-area insets via `env()` on fixed bars.

## 5 · Buttons and the ONE press recipe
| Tier | Class | Look |
|---|---|---|
| B1 primary | `.btn-1` (alias `.btn.gold`) | gold gradient fill, `--on-gold` text, 52px, 17/650. **One per view.** |
| B2 secondary | `.btn` (default) | `--g4` fill, inset `--hair2` ring, 44px, 15/600. Variants `.ghost`, `.sm` (38px), `.danger` (red tint) |
| B3 tertiary | `.btn-3` / `.gh-more` | no fill, gold-ink text, 44px, gold-tint on press |
| chip / icon | `.chip` (30px pill) / `.btn-i` (40px visual, 48px hit) | filters, toggles / header and row icons |
| dock tile | `.gd-t` | art still + icon chip + label + live sub, 124px wide (§12) |

**Every tappable is identifiable** (the quality-pass rule, enforced by `node scripts/qa/layout.mjs`): a text label, or a line icon **and** an `aria-label`; never a bare glyph
("−", "‹", "▶", an emoji) as the only content. Rows pair a `.lead` icon chip with a title and a one-line sub. The same action looks the same everywhere (one chevron icon, one
Back arrow `.btn-i` + `GP.icon("chevR")` flipped, one "Done" `.btn.sm` at the top right of a settings-style sheet, one X `.btn-i` on a detail sheet). Known legacy: the older `.ttl` sheets
(Batcomputer, Forge, Stalled lifts, Tips ...) still end in a full-width B2 "Close", and a few legacy overlays keep an emoji in their title; convert one to the Done / X pattern whenever you touch it.

**Press recipe (the only one):** `scale(.97)` + `brightness(1.08)` in 90ms (`--d-in`), released on `--spring` over 280ms (`--d-out`);
big surfaces (`.card[onclick]`, `.exrow`, `.acc-head`, `.tap.big`) use `.985`. No glow, no ripple, no per-component `:active` scale.
Disabled = `opacity:.38` + desaturate + `pointer-events:none`. Focus ring = 2px gold (`:focus-visible`).

## 6 · The GP helper object (`const GP`, "GOTHAM PRO icon set + data-viz helpers")
Pure functions that return SVG/HTML strings. Use them; never hand-roll a ring or a sparkline.
`GP.icon(name,cls)` inline stroke icons (`currentColor`, 20px `.gi`) — **never emoji in new chrome** · `GP.ring(v,max,{size,stroke,c1,c2})` ·
`GP.recRing(pct)` 14px recovery glyph (blue everywhere) · `GP.muscleRing(pct,size)` · `GP.zone(sets,{mev,mav,mrv})` -> `warn | ok | bad` ·
`GP.landmark(sets,L,plan)` MEV/MAV/MRV bar `.lmk` with sweet band, over-MRV hatch and a ghost for tonight's plan · `GP.muscleTile(m)` ·
`GP.spark(pts,{min,max})` (pass min/max so a flat lift LOOKS flat) · `GP.bars(vals,{goal})` · `GP.weekDots(days)` · `GP.seg(items)` per-exercise progress ·
`GP.e1rm(kg,reps)` Epley, must equal the app's `setE1RM()` · `GP.fmt(n,d)`.
Icon names: search calendar play chevR chevD check plus x timer moon pulse bolt up flat trophy skip more flame map flag ramp swap gotham mission suit profile allies bat sliders
target flask bulb dumbbell book note drop image link lock crown chart scan cross alert wrench news film chat down share star scale plateau (Mission adds `gmIc`: up down minus copy trash).
Other shared pieces: `openSheet(html)` / `closeSheet()`, `toast(msg)`, `topBar(left)` (brand mark left; search, settings (sliders icon) and the Alfred avatar with a gold hairline ring right),
`gaArt(name,cls)` (cinematic still), `figLayerHtml(ex, fi)` (exactly one base layer per exercise picture: curated PNG or anatomy SVG), `gmFoldRow` (collapsed row that builds on first open),
`gdDock` / `gdJump` (feature docks, §12), `openIndex()` (the Search sheet, §10).

## 7 · Art recipe (cinematic Gotham, behind the hero)
Seven heroes in `assets/art/` (720x480 JPEG, 33-52 KB, ~287 KB total; see `assets/art/README.md`): `logging` (cave gym), `rest` (blue-hour skyline),
`finish` (gold signal beam), `profile` (armoured cowl, crimson kicker), `mission` (war room), `suit` (carbon plates, the quietest), `allies` (two caped figures), plus the `tile-*.jpg`
dock stills (one per feature tile, small crops; a tile without its own still reuses another with `pos:` to crop it differently).
- Subject lives in the right ~40% of the frame; the left ~60% is dark so text sits on it.
- Placed by `gaArt(n,c)` as `.ga` (absolute, `z-index:-2`, `pointer-events:none`) -> `<img>` with `object-position:right center`, opacity via `--o`, and a **left + bottom gradient mask** — never raw. A missing file drops its own layer (`onerror` removes the node).
- Static except for the two motions in §11 (Home's single `ghDrift`; the scroll-driven push-in). The two stills the live flow needs (`finish`, `logging`) are pre-warmed 4s after boot; `sw.js` caches the rest at runtime.
- Figures: `assets/exfig/*.png` (exercise pictures keyed by movement pattern) and `assets/figures/*` (muscle front/back). Photoreal grey body, worked muscle solid red, black background, <=420px wide and ~150 KB. Generate with `node scripts/gen-image.mjs "<prompt>" assets/<name>.png` then `sips -Z 420`; never one image per exercise. No multi-MB images (iOS memory crash). `assets/veh/*` serve the Garage, `assets/alfred.png` the coach, `assets/entrance/bat-city.png` the Garage hero.

## 8 · Haptics rule (do not break)
Real iOS haptics need a **finger tap on a real `<input type="checkbox" switch>`**. `hxHost` lays an invisible one (`.hx`, `opacity:.01`) over exactly `HX_SEL = "#nav button,.sdone"` — the five tab buttons and the set tick — and nothing else.
`data-hx` in templates is inert on purpose. **Never add more overlays**: any scrollable row or button with one turns a scroll drag into a tap on iOS. The overlay has a scroll guard (moved > 8px or page scrolled = revert, nothing opens). Everything else uses `haptic(kind)`.

## 9 · Motion rules
- Timing: UI motion 90-300 ms; press 90 in / 280 spring out; tab switch is a View Transition (old view fades 90 ms, new one rises 6px over 200 ms, tab bar stays put, the hero morphs as its own group, <= 220 ms); cards stagger in with `.gh-c` + `--i` (40 ms steps) only when the view changed (`state._same` false).
- **Budget per screen: <= 1 infinite animation** (Home: the hero art drift, which holds still while a session is live so the pulsing live dot is the one moving thing; every other tab: none) and **<= 3 `backdrop-filter`s** (the tab bar only; the sheet backdrop blurs only while a sheet is open). Check with `node scripts/qa/perf.mjs`.
- Full-screen takeovers (`cinePush`, `playStinger`) are reserved for a PR and the session finish. Everything else is a toast or a haptic. Never on launch, never mid-set.
- Animate `transform` / `opacity` only. `prefers-reduced-motion` kills animation (wired; keep it). Keep one-shot durations short; when in doubt, cut.

## 10 · One home per feature (the ownership map)
The quality pass inventoried every tab, sub-page and main sheet. What stays full-size lives in one place; everywhere else is a one-line link or nothing.
| Feature | Its one home | Elsewhere |
|---|---|---|
| Suit figure + recovery per muscle (12 tiles: recovery %, hours, sets vs landmarks) | Suit tab | Home shows only the under/over muscles + an "All 12 muscles" link; the muscle dossier sheet (`muscleDrill`) opens from both |
| Planned sets per muscle per week (with one-tap trim) | Mission · Volume forecast | — (the Frequency card is gone: the forecast already tags UNDER and Suit shows hours since) |
| Time-lapse and coverage radar | Suit dock · Time-lapse sheet | — (the second "Mastery" suit figure is gone; mastery is the Lv chip in each dossier) |
| Stalled lifts (detail + one suggested change) | Stalled lifts sheet (`openStalledLifts`) | Home Lifts rows open it; the Lab keeps one "Plateau breaker" row; the Mission Lab tile carries the count |
| Records list, strength standards, calendar | Profile (History · Records · Standards) | Home Lifts shows the 3 newest; the 26-week heatmap (Wayne Tech) is gone, the month calendar shows volume heat |
| Bodyweight + trend + relative strength | Profile · Body (`bwSet` is the only writer) | Fuel row, Profile dock tile, Settings |
| Tape measurements, symmetry, progress photos | Suit · Measurements / Progress photos | Search |
| Sleep, soreness, workload, injuries | Infirmary (Suit dock) | Home ring and Sleep chip |
| Nutrition, hydration, supplements | Fuel page (Suit dock tile, Back returns to Suit) | Search; Hydration is tracked once (the Hydration card), not again in the Daily stack |
| Split share / import | Mission dock · Import split | the plan editor's own Share; the Allies "Manage" sheet no longer repeats it |
| Tools: Forge (1RM, percentages, ramp, plate jumps), Plate calculator, 1RM test day, Oracle, Strength simulator, Contracts, Bat-Focus | Lab (Mission dock) | Search; the separate 1RM calculator and Measure rows are gone |
| Weekly adjust (apply / undo) | Home Sunday card + Week-in-review sheet | Mission "Suggested this week" row opens the sheet |
| Allies: invite, snapshot code, remove | Allies dock · Add ally / Manage | — |
| Settings | header sliders icon | the Profile identity strip |
| Find anything (`openIndex`) | header magnifier | every destination listed once, line icons, the field keeps focus while typing |
Rules of thumb: a tab hero is followed by its dock; a sheet is opened from one obvious tile or row; an empty section collapses to one "Add ..." row (Suit measurements, the physique review appears only after a photo).

## 11 · The charm layer (GP:CHARM, wave 6)
Hero art that lives, a one-shot sweep, an icon on every section header, live numbers and the tab-switch morph. All of it is feature-detected and quiet under `prefers-reduced-motion`.
- **First view** — `gpFirst(vk)` is true the first time a view shows in a session and for `GP_FIRST_MS` = 800 ms after (a quick second render keeps the moment alive). `gpEnter()` runs at the end of `render()` / `renderSummary()`,
  once per freshly rendered root (`root.dataset.gp`).
- **`gpLive(root, first, vk)`** — rings and bars draw in (`.gp-first` CSS) and key numbers count up (`rollUp`, <= `GP_ROLL_MS` = 560 ms) on the first view only; afterwards a number moves only when its value changed. Never replays on an in-place re-render.
  Selectors: `GP_NUM` (`.gh-mt-t .num`, `.mc-v .num`, `.gm-nums .num`, `.p3-g4 .num`, `.p3-vol .num`, `[data-roll]`); any number opts in with `data-roll`.
- **`gpSweep(root)`** — one gold glint (`<i class="gp-sw">`, removes itself on `animationend`) across the hero, once per tab per session; transform/opacity only; never takes a tap.
- **Scroll-driven hero art** — `@supports (animation-timeline:scroll())`: the still lags and pushes in (`gpPar`: translateY 7% + scale 1.1 around its lower right, over the first 340 px of scroll). Driven by scroll, not a clock, so it does not count against the infinite-animation budget; elsewhere the still holds.
- **Tab switch** — `go()` names the hero as its own View Transition group (`gpVtTag`, `viewTransitionName:"gp-hero"`) for the length of the transition and only while it is on screen.
- **Section header icons** — `gpSec()` (a MutationObserver on `.gh-lh h3`, `.gh-sec h2`, `.p3-ch2 h3`) prepends one line icon and sets `data-ac` (the accent area) from the title's own words, **first hit wins** (`GP_SEC`). Areas: `rec` records gold · `vol` volume green · `rcv` recovery blue · `pln` plan amber · `n` steel.
  | Title words | Icon | Area |
  |---|---|---|
  | stimulus | bolt | vol |
  | stall, plateau | plateau | rec |
  | record, mastery, standard, belt, PR | trophy | rec |
  | strength, e1rm, target, progress | up | rec |
  | lift(s), exercise | dumbbell | rec |
  | sleep | moon | rcv |
  | hydrat | drop | rcv |
  | infirm, injur | cross | rcv |
  | recover, sore, readiness, fatigue | pulse | rcv |
  | effort, rpe, rir, intensity | bolt | vol |
  | dossier | scan | n |
  | muscle, coverage, sets, volume, forecast, landmark | chart | vol |
  | frequen | calendar | vol |
  | calendar, cycle, day(s), schedule, next up, week, patrol | calendar | pln |
  | plan, split, lab, generator, import | map | pln |
  | fuel, intake, stack, nutrition, macro | flask | pln |
  | body, weight, measure | scale | n |
  | league, duel, ally, allies, invite | allies | n |
  | try asking, suggest | bulb | n |
  | alfred, conversation | chat | n |
  | tool | wrench | n |
  | history, session, archive, log | book | n |
  | cue, form, tip | bulb | n |
  | anything else | note | n |
  A new section picks its icon up by name: pick a title that matches a row, or add a row (before the generic ones). `node scripts/qa/charm.mjs` checks all of §11.

## 12 · Feature docks (GP:DOCKS, wave 6)
ONE reusable row of art tiles directly under each tab hero: every feature the tab owns is one tap away, nothing is searched for or folded. `gdDock(label, tiles)` where a tile is
`{art, ic, t, s, fn, pos?}`: `art` = `assets/art/<art>.jpg`, `ic` = a `GP.icon` name, `t` = the label, `s` = a **live** one-line sub (a number or a state, about 16 characters, bold the number), `fn` = the onclick, `pos` = an optional crop.
- Tiles are 124 px wide (>= 112 x 44), always label + sub + icon; the row scrolls sideways (`scroll-snap`), so 4+ tiles must overflow. They are plain `<button>`s with **no `.hx` overlay** (a scrolling row must stay a scroll on iOS).
- A tile either opens its feature (sheet, sub-page, page) or, for a section that lives inline, scrolls to it with `gdJump(sel)` (smooth scroll, 76 px `GD_JUMP_TOP`, a gold `gd-hit` ring for 1.4 s). A dock replaces the folds and tool lists it came from: a feature appears once per tab.
| Tab | Dock (function) | Tiles |
|---|---|---|
| Mission | `gmDock` | Edit plan · New split · Import split · Lab |
| Suit | `gsDock` | Infirmary · Fuel · Time-lapse · Photos |
| Profile | `p3Dock` | History · Records · Standards · Body · Badges · Backup |
| Allies | `alDock` | Add ally (when you have allies) · Chat · Duel · Raid · Leaderboard · Manage |
Home has no dock (its extras row holds the Garage and the seasonal event). `node scripts/qa/docks.mjs` taps every tile with a real touch and checks that each opens something, has label + sub + icon and is not under 112 x 44; it also checks that Alfred's guide names every tile.

## 13 · Weekly adjust and Body (GP:WEEKLY+BODY, wave 7)
- **One-tap weekly adjust.** `ghWeekReview(vol)` is the one computation behind the Sunday card (Sundays from 16:00, under the week card), the Week-in-review sheet (`openCaveReview`) and Mission's "Suggested this week" row. `wkActions` gives 1-3 buttons (`WK_ACTIONS`),
  each an `.wk-act`: tinted icon chip + what changes + where, "Apply" in gold; after the tap the row turns green with a check and an Undo. A button edits the ACTIVE split's plan targets (`day.plan[lift] = {s,r,opt}`, the plan editor's own data; Mission's trim writes the same shape),
  snapshots every day it touches so Undo restores the exact previous day, and is remembered for the calendar week in `d.weekAdj` so a second tap cannot stack the same change. Sets only: 2..10 per lift (`GM_MIN_SETS` / `GM_MAX_SETS`), at most `WK_STEP` = 3 sets per tap,
  a lift added from the library starts at `WK_NEW_SETS` = 2 sets of the 5-10 default. Never a deload, never a logged session. Colours keep their one meaning: amber = under target, red = over limit, green = done, gold = the action word.
- **Body (Profile, `#p3-body`).** ONE home for bodyweight: a one-tap weigh-in prefilled with the current value (`bdStep`, `bdLog`), the 12-week trend of weekly averages (`BD_WEEKS`), and relative strength = Big-3 barbell-equivalent e1RM / that week's bodyweight.
  `bwSet(kg)` is the only writer (Settings uses it too): `d.bwLog` keeps its `{date, kg}` shape with one entry per local day, `u.bodyweight` follows the newest weigh-in. Other screens link in with `bdOpen()`. Suit's matching section is **Measurements** (tape, in cm), never "Body".

## 14 · Progress photos (GP:PHOTOS, wave 7)
- **IndexedDB vault**: database `gainstracker`, store `photos` (key = photo id) plus a `meta` store. `gt_data` keeps only a small thumbnail (`p.img`, `PH_THUMB` = 240 px) and `p.idb = 1`, so photos can no longer fill localStorage; full photos are `PH_FULL` = 820 px; the last `PH_CACHE_MAX` = 6 are cached in memory.
- **Safe move**: put -> read back -> byte-compare -> only then swap the thumbnail in and save, behind a one-time safety copy (`gt_photos_backup`). Any error leaves that photo exactly as it was and it retries next launch. If the phone is full the safety copy falls back to IndexedDB.
- **Backups** carry the FULL photos inline (the old file shape, so older builds can still restore them); a restore parks them back in the vault.
- **UI**: the Suit "Progress photos" card (Add tile + one thumbnail strip) -> single-photo sheet (delete from both stores) -> Compare (slide / side by side, drag / tap / keys, pick two). `photosOpen()` opens Compare with 2+ photos and otherwise scrolls to the card. Compare is the one before/after view.
  The "Alfred physique review" stub appears only after the first photo. `node scripts/qa/photos.mjs` covers the vault, restore round-trip and Compare.

## 15 · Perf budget
Checked per screen by `node scripts/qa/perf.mjs [--throttle 4]` (4x CPU throttle ~ a mid-range phone):
- **Infinite animations <= 1 per screen** (in view or fixed) and **backdrop-filters <= 3** (the tab bar; the sheet backdrop only while a sheet is open).
- First paint ~120 ms at x1; `render()` a few ms on every tab (Home ~4 ms, 8 ms worst with a live session); DOM nodes 130-750 per screen (Suit is the heaviest, Home ~620).
- HTML ~1.2 MB (~380 KB gzip) in one file; images <= 420 px wide and ~150 KB; hero stills 33-52 KB; photos live in IndexedDB, never in localStorage; no multi-MB image ever (iOS memory crash).
- A cheap change is a cheap render: build a sheet's body when it opens (`gmFoldRow`, `openSheet`), not when its tab renders.

## 16 · CSS anchors (the `<style>` is layered per wave; find an area by its anchor comment)
| Anchor | Owns |
|---|---|
| top of `<style>` + "4 · BUTTONS" block | tokens, legacy remaps, base/reset, the button tiers and the press recipe, sheet/overlay/modal chrome, `.hx` |
| `GP:HOME (wave 2)` | Home primitives: `.gh .s1/.s2/.s3`, rows, `.gh-lh/.gh-sec/.gh-sub`, rings/`.lmk`/`.seg`/`.wk`, the Tonight hero, `.gh-allok` / `.gh-mall` |
| `GP:PRUNE+HOME (wave 5)` ... `/GP:PRUNE+HOME` | Home below the hero (Sunday review, last session, next up, extras), week-review sheet, seasonal event card |
| `GP:LOGGING (wave 2)` | the live workout: header strip, focus card, set grid (`.lg2-*`), up next, rest, PR chip |
| `GP:MISSION+SUIT (wave 3)` | Mission (plan hero, cycle days, forecast, `.gm-sfr` / `.gm-tier` in the Lab) and Suit (recovery figure, 12-muscle grid, Measurements), scoped under `.gm`; muscle dossier, plan editor |
| `GP:PROFILE+FINISH (wave 3)` | Profile tab (`.p3-*`), exercise detail sheet, finish moment + summary slides |
| `GP:ART (wave 4)` | `.ga` stills and the per-tab crops/veils |
| `GP:TABS (wave 5)` | Allies (`.al-*`), the Alfred page (`.af-*`), Settings + Data control (`.st-*`), onboarding, the Alfred chat panel (`.ac-*`), the Find-anything sheet (`.ix-*`) |
| `GP:DOCKS (wave 6)` | `.gd` row, `.gd-t` tiles, `.gd-hit` |
| `GP:CHARM (wave 6)` ... `/GP:CHARM` | scroll-driven hero art, `.gp-sw` sweep, `.gp-first` draw-ins, section header icons (`.gp-ic`, `data-ac`), tab-switch morph |
| `GP:WEEKLY+BODY (wave 7)` ... `/GP:WEEKLY+BODY` | `.wk-*` one-tap adjust buttons and `.bd-*` the Profile Body section |
| `GP:PHOTOS (wave 7)` ... `/GP:PHOTOS` | `.pc-*` Suit photo card, single-photo sheet, Compare |
The JS has matching banners (`/* ===== ... (GP:TABS, wave 5) ===== */`, `GP:CHARM`, `FEATURE DOCK (GP:DOCKS)`, `ONE-TAP WEEKLY ADJUST`, `BODY (Profile, wave 7)`, `PROGRESS PHOTOS (GP:PHOTOS)`). Scoped primitives live under `.gh` (+ `.gm` / `.p3-pf` / `.al-pg` ...) so a tab can restyle without leaking. Do not add a new wave-layer that overrides an old rule: edit the rule in place and delete what it replaced.

## 17 · Mobile rules (iPhone Safari PWA first)
- Design at 375-393px; verify at 375 and 393 (`node scripts/qa/flow.mjs --width 375`, `node scripts/qa/layout.mjs --width 375`). `#app` caps at 560px. Safe-area insets on fixed bars.
- Nothing wider than the viewport (no page-level horizontal scroll), no clipped text; long names ellipsize by design (`.gh-t1`); no header or label wraps onto a second line.
- Text readable in daylight: body on bg >= AA; `--tx3` is for de-emphasis only.

## 18 · Hard don'ts
- No grey app chrome, no flat borderless boxes, no second gold button in a view, no emoji as chrome in new code, no new colour meaning.
- No settings/toggles to "make it nicer" (great by default), no deload features, no unprompted pop-ups.
- No overlay haptic hosts beyond `#nav button` and `.sdone`. No more than one infinite animation or three backdrop-filters per screen.
- No second copy of something that already has a home (§10); no icon-only control without an `aria-label`; no glyph-only button.
- Never edit `index.html` (generated deploy copy) and never break or erase `localStorage` data.
