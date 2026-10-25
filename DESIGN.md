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
Back arrow `.btn-i` + `GP.icon("chevR")` flipped, one "Done" `.btn.sm` at the top right of a settings-style sheet, one X `.btn-i` on a detail sheet).
**Sheet header (wave 8, §19):** every sheet and overlay opens with ONE header, `shHd(title,{ic,sub,back,act})`: an optional Back `.btn-i`, a 34px gold-tint icon chip, the title (17/650) over a one-line sub, and at the right a "Done" `.btn.sm`
(settings-style sheets, multi-step pickers) or an X `.btn-i` (everything else), sticky while the body scrolls. Never a full-width "Close" at the bottom, never an emoji in the title.

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
Other shared pieces: `openSheet(html)` / `closeSheet()`, `shHd(title,opts)` (the one sheet header) + `shSearch(id,placeholder,onInput)` + `pxRow(ex,opts)` (one exercise row for the add and swap pickers) + `tickNum(el,dir)`, `toast(msg)`, `topBar(left)` (brand mark left; search, settings (sliders icon) and the Alfred avatar with a gold hairline ring right),
`gaArt(name,cls)` (cinematic still), `figLayerHtml(ex, fi)` (exactly one base layer per exercise picture: curated PNG or anatomy SVG), `gmFoldRow` (collapsed row that builds on first open),
`gdDock` / `gdJump` (feature docks, §12), `openIndex()` (the Search sheet, §10).

## 7 · Art recipe (cinematic Gotham, behind the hero)
Seven heroes in `assets/art/` (720x480 JPEG, 33-52 KB, ~287 KB total; see `assets/art/README.md`): `logging` (cave gym), `rest` (blue-hour skyline),
`finish` (gold signal beam), `profile` (armoured cowl, crimson kicker), `mission` (war room), `suit-hero` (a bat-suit in a glass vault under one gold shaft; low-key, so it gets a lighter left veil than the standard recipe, see `.ga-suit-hero` in GP:STRENGTH+SUIT; the old `suit.jpg` carbon band now only crops into the Profile Body tile), `allies` (two caped figures), plus the `tile-*.jpg`
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
- Full-screen takeovers (`cinePush`, `playStinger`, the PR finisher §21) are reserved for a PR and the session finish. Everything else is a toast or a haptic. Never on launch, never mid-set. A record's takeover is the PR finisher: a tap skips it, it closes itself, and it never touches the page behind it.
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
| Mark a split day done without logging | The Mark-as-done sheet (`openQuickLog`, §22) | Home Tonight link, the Preview sheet's button (every Mission day row opens the Preview) |
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
| `GP:POLISH (wave 8)` ... `/GP:POLISH` | `.sh-*` the sheet header + search field, `.px-*` picker rows, plate calculator and warm-up ramp, `.cx-*` custom exercise creator, `.rd-*` readiness check-in and option rows, `.rk-*` rank ladder, the micro-moments (`.tickfx`, `.tk-up` / `.tk-dn`, `.gm-cyc`) |
| `GP:STRENGTH+SUIT (wave 8)` ... `/GP:STRENGTH+SUIT` | `.ga-suit-hero` (the Suit hero still + veil), the Strength rows' via line (`.p3-sv`, `.p3-go`) and the variations sheet (`.sv-*`) |
| `GP:PRFIN (wave 9)` ... `/GP:PRFIN` | `#prfin`, the PR finisher overlay: video / poster, bottom scrim, the stamp (`.pf-*`) |
| `GP:QUICKLOG (wave 10)` ... `/GP:QUICKLOG` (sits just before GP:WEEKLY+BODY) | `.ql-*` the Home "Mark as done" link, the Mark-as-done sheet, the green `.tag.ql-tag` and the Profile calendar's `.qk` cell + legend swatch |
**Cascade gotcha:** a rule added in an early block (the wave-7/8 blocks sit before GP:ART) loses to an equal-specificity rule further down, so a per-hero override of `.ga img` / `.ga::after` must use two classes (`.ga.ga-suit-hero img`); check it with `getComputedStyle`, not by eye (the wave-8 first draft silently lost its opacity, mask and veil overrides this way).
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

## 19 · Polish layer (GP:POLISH, wave 8)
The older surfaces now speak the same language as the tabs: one header, one picker row, option rows with a lead icon, no emoji in chrome.
- **Sheet header** (§5): `shHd(title,{ic,sub,back,act:"x"|"done"|"none",fn,doneHtml,closeLabel})`, sticky inside `#sheet`. A legacy sheet or overlay that still opens with `<div class="ttl">` (or a `.row` holding it) is upgraded the moment it lands (`shHead`: header, X, the bottom "Close" removed);
  `iconize` swaps a leading emoji in titles, and in chips and buttons inside sheets, for a GP line icon from `EMO_ICON` (a new emoji gets a row there, never a bare glyph). `node scripts/qa/layout.mjs` fails a sheet that opens with a bare title row, ends in a full-width "Close" or has an emoji title.
- **Readiness check-in** (`renderReadiness`): the Tonight hero (day, lifts, sets, minutes, the gym chips) over one card of three one-tap rows (Fresh / Okay / Tired, `.rd-o`); one tap sets the readiness and starts. The recovery line is real (`patrolReadiness`), never an invented sleep number. The compact row `.rd-o.sm` is the skip reasons.
- **Pickers**: Add exercise and Swap lift share `shSearch` + `pxRow` and a fixed-height list (`.px-list`) so the sheet never jumps while filtering; an empty search offers "Create <typed name>". The custom exercise creator is three grouped cards, an optional fold and one sticky Save, and it keeps its draft across the picture picker (`_picPickBack`).
- **Tools**: the plate calculator has steppers (`_plateStep`, one step = twice the smallest plate), a to-scale bar and the real plate colours (`PLATE_COL`: content, not chrome); the warm-up ramp lists four steps with plate chips per side (the Forge reuses the same rows; its frame draws once and only the results redraw, so typing keeps focus); the rank ladder shows the current rank in a ring with the levels to the next, then nine rungs (You / Reached / N to go).
- **Micro-moments** (each has a purpose; transform / opacity only, <= 400 ms, silent under `prefers-reduced-motion`): the set tick draws its check and the row takes one gold edge pulse (`.tickfx`, set by `toggleDone` for that one render); a record from the last 24 h wears the crown and "New record 3h ago" in Profile Records (`p3Records`);
  the Mission hero shows the cycle position as a ring (`.gm-cyc`, `GP.ring`); a number moved by a stepper slides in from the direction it moved (`tickNum`, `.tk-up` / `.tk-dn`: the Mission plan editor and the plate calculator).
- Still on the old pattern (a card dropped into a sheet with its own title row and a bottom "Close"): the Allies Fight Night / Fight Card sheets and the seasonal event sheet. Give them `shHd` (and drop the card's own title) the next time they are touched; `layout.mjs` does not open them because no fixture has an active event or fight.
- Skipping a lift stores a plain-text reason (`SKIP_WHY`); the session summary strips a leading emoji from reasons stored by older builds.

## 20 · Strongest variation (GP:STRENGTH+SUIT, wave 8)
Strength standards read movement PATTERNS, not single exercises. `liftEstimate(lift)` (now, from the PR records of the active gym) and `liftEstimateAt(lift, t, svRows(lift))` (history) are the ONLY readers of "how strong is your squat / bench / deadlift / press / row":
both rank every logged variation through `svRank` and return the strongest barbell equivalent. The Strength card, the Big-3 total (`p3BigThree`), the Body trend (`bdRel`, whose last point is the same sum), the Standards dock tile, the ally
optimality score (`myPatrolCard`) and the bodyweight badges (`achStats().bwRatio`) all call it. Before adding another strength ratio anywhere, call it too (§1: one number, one source).
- **The `SV` table** (one entry per lift): `yes` = names in the pattern, `no` = dumbbell / cable / kettlebell / band / single-leg / unilateral / accessory lifts, which never count (their load is not comparable to a barbell), and ordered rows `[test, factor, label]`, first match wins.
  The comment above the table documents every factor and why. Factor = barbell-equivalent / logged e1RM.
- **Conservative by construction:** a conversion may understate a lift, never flatter it, and a converted lift (factor != 1) is capped at the Elite tier x bodyweight (shown as "capped at Elite"); a real barbell lift is never capped.
  Leg press x0.50 (45°, horizontal, plate-loaded, lying squat machine), hack / V-squat / belt squat x0.85, pendulum x0.75, Smith x0.90, front squat x1.15; machine presses and rows x0.85, incline x1.12, floor press x0.95;
  RDL / stiff-leg x1.10, rack pull x0.80, trap bar x0.92, hip-hinge machines x0.85; push press x0.80. Every factor is documented, with its reason, in the comment above `SV`.
- **UI:** a Strength row is a `role=button` that says `est. · via <exercise> · <raw> kg × <factor>` and opens `openStrengthLift(lift)` (strongest first, then the rest with their conversion). That sheet is the only place the table is visible; its lede also names the next tier in kg and in the units you train (target / factor: "Advanced at 166 kg, about 332 kg on the Leg Press (45°)").
  Tier comparisons carry `SV_EPS` (a capped lift sits exactly ON its tier, and `(tier x bw) / bw` can land a hair under it in floating point).
  `node scripts/qa/strength.mjs` covers the ranking, the exclusions, the cap, one-number-everywhere and the sheet.

## 20b · Alfred chat (GP:ALFRED2, wave 10)
The chat answers **what was asked, shortly, from his own logs**: 1-3 sentences, under about 80 words unless he asks to explain or plan. No new surface and no CSS: it reuses the `.ac-*` panel. The JS banner is `LOCAL ANALYSIS ENGINE (GP:ALFRED2)`.
- **Model chain** (`GEM_MODELS`, probed against the key's own model list): gemini-3.8-flash, 3.5-flash, 2.5-flash, 2.5-flash-lite, flash-latest. `_gemRun` is the one call path (chat, pings, post-workout read): a gone, off-tier or busy model hands over to the next; only a permanent miss is remembered (`gt_gem_model2`); a thinking setting a model rejects is retried without it; used-up credits (402) and a bad key stop with a plain message. Chat: temperature 0.4, `maxOutputTokens` 360 (+600 thinking room on Gemini 3).
- **Prompt:** persona + `ALFRED_CHAT_RULES` + his data are the system instruction. Rules: decide the intent first, answer exactly that, ground every number in the data or the PRE-COMPUTED line, never change topic or add tips, ask ONE short clarifying question when unclear, follow-ups only when they genuinely help.
- **Engine** (`alfIntel(q)`, pure reads, never writes): readiness, tonight's plan, a muscle's recovery, weekly sets against MEV / MAV / MRV, furthest behind MEV, a lift's last / best / next target (`liftIntel` + the one progression rule), stalled lifts, this week's records, sessions and streak, standing, bodyweight, fuel targets. Returns `{id,text,hint}` or null. No key or no connection: `text` is the answer. With a key: `hint` rides to the model as a PRE-COMPUTED line (data questions only, never for a how-to or an unclear lift). Several lifts tie on the words he used: ONE question, "Which one: A, B?".
- **How-to** with no AI: only the 1-2 guide clauses that carry the question's words (a section title AND a clause must match), never the manual page. Nothing recognised: said honestly ("That one needs my AI line") with three tappable examples; a refused call says why (credits, free-tier limit) and still answers what the logs can.
- **Commands** (`open…`, `start…`, `add … to …`, `set weekly goal…`) still run locally; every question goes to the engine or to Alfred. Do not add a keyword template that fires on a common word ("train", "this week"): that was the bug.
- **QA:** `node scripts/qa/alfred.mjs [--width 375|393] [--live] [--print]`: 30+ questions typed into the real chat with no key, with a key but no connection, with a refused key, and through a stubbed request path (system instruction, PRE-COMPUTED, temperature, model hand-over). `--live` runs the real chain with the key from .env.local (it stays in node) and skips itself when the key's credits are used up.

## 21 · PR finisher (GP:PRFIN, wave 9)
A new **e1RM record over a standing one** plays one of five Veo takedown clips (`assets/pr/`, prompts and timings in its README) full-screen, above everything. It overrides the old "a PR is only an in-row moment" rule; the in-row crown, chime and PR chip stay. The JS banner is `PR FINISHER (GP:PRFIN)`.
- **Trigger:** `liveCheckPR` remembers the e1RM hit (`state._prE1`: lift, value, previous best, this session's earlier records included); `lgPrMoment` > `prfStart` runs inside the ✓ tap. A weight / volume / rep record, or a lift with no standing record yet, gets the crown only.
- **Overlay:** `#prfin` on `<body>` (outside `render()`, so inputs, set data, the rest timer and scroll are never touched), `z-index` 100000, a `<video playsinline>` from a `blob:` URL, `object-fit:cover`. It stays invisible (`.pf-hold`) until the first frame is really playing; a paused, errored or never-started video closes it (never a blank or frozen screen).
- **Close:** no Done button. A tap anywhere skips (`click`, after a 250 ms grace, so nothing falls through to the page); otherwise it closes itself 0.8 s after the end (the last frame and the stamp hold a beat).
- **Sound:** tried unmuted inside the tick's gesture; if the browser refuses, it plays muted and the app's own `sfx("slam")` lands at the impact. Alfred is silent while a clip plays: `prfSay` skips his spoken record line when a clip shows (or may show inside the 400 ms wait; if it does not, he speaks it then), `prfShow` cancels any speech already running, and `alfredVoiceLine`, the chat's mic reply and the rank-up line refuse to speak while `prfBusy()`. With no clip (offline, slow, no standing record) the short spoken line stays.
- **Stamp** (`.pf-stamp`): "NEW RECORD" (gold-ink eyebrow), a gold hairline, the lift name, the new e1RM in Bebas, "e1RM +delta kg" (vs the last best). It rises in the clip's calm final second (`PRF_STAMP_S`) over a bottom scrim and fades with the overlay.
- **Cut:** the 1st finisher of a session is the whole clip; the 2nd and later start 0.3 s before the impact (`session._finN`), about 5 s. `PRF_CLIPS` holds each clip's impact second (from the README).
- **Rotation:** Joker, Bane, Two-Face, Penguin, Scarecrow, index `data.prFin.i` (optional field, absent = 0): advanced when a clip starts, saved when it closes. Never the same clip twice in a row.
- **Preload:** `prfWarm` fetches only the NEXT clip: at idle ~3.5 s after boot, after a finisher closes, when logging starts, and when the phone comes back online. It is held as a Blob (a `blob:` URL sidesteps iOS Safari's byte-range trouble with service-worker-served video). `prfGet` reads the service worker's Cache API entry first, so later boots cost no network. A record that lands before it is ready waits `PRF_WAIT_MS` (400 ms), then shows nothing but the in-row crown, and the rotation does not advance.
- **Reduced motion:** only the poster is fetched; poster + stamp for 1.2 s, no video.
- **Budget:** each clip is 2.7 MB (never precache all five); transform / opacity only, nothing infinite, no backdrop-filter. A re-made clip needs a new filename (the service worker keeps the old bytes until `RUNTIME` in sw.js is bumped) and its impact second in `PRF_CLIPS`.
- **QA:** `node scripts/qa/pr.mjs` (the preload, the real tap, blob video, stamp timing, auto-close, short cut, rotation, refused sound, offline / slow, reduced motion). Every other QA script blocks `assets/pr/` so the overlay never interrupts them; `launch({clips:true})` lets them through.

## 22 · Mark a day done (GP:QUICKLOG, wave 10)
You trained but could not log it (a dead battery, a trial session, forgot): any training day of the ACTIVE split can be marked done from its plan. One home, the Mark-as-done sheet (`openQuickLog(splitId, dayIdx)`); the entry points are links into it: the Home Tonight card ("Mark as done · trained without logging", a B3 line under Start Patrol / Preview) and the button under "Start this day" in the Preview sheet (every Mission day row opens the Preview). A rest day offers nothing.
- **Sheet** (`qlSheet`, state `state._ql`): which day (chips, prefilled), when (Today · Yesterday · Other date, at most `QL_BACK_DAYS` = 60 back; the day at the current time of day), why (Low battery · Trial session · Forgot to log · Other; optional, a second tap clears it) and the counted summary (lifts, sets, the date, the muscles with their sets, the same credit rule as `weeklySets`). One B1 "Mark as done". A date that already holds that day shows an amber "Already in history" note, never a block.
- **What it writes** (`qlCommit`, the finishWorkout-equivalent): ONE workout, `quick:1`, `why` (code), `notes` "Marked done · reason", `splitId` + `dayIdx` (so `computeNextDay` advances from the stable identity), `totalVol:0`, `duration:0`, `xp:0`, `prs:[]`. Its exercises are the day's lifts with the PLANNED set count (`ghSetsOf`, the number the Preview shows); every set is `done:true, est:1`, with weight / reps copied from last time's working set at that index (blank when the lift has no history). It is inserted by date, so history stays newest-first.
  `muscleVol` / `muscleLastTrained` / `muscleLastVol` follow finishWorkout's credit rule (primary 1, secondary 0.4; the dates only move forward), `u.totalWorkouts` +1. Only a session that is the NEWEST also moves the streak, `lastTrainedDate` and the stored `_nextDay` pointer; an older date never touches them.
  Not touched: records, XP, lifetime volume / time, the patrol feed, badges, achievement banners. No summary, no PR finisher: the feedback is `toastUndo("Upper C marked done · counted from your plan")`.
- **Undo** (`qlUndo`): before writing, `qlSnap` keeps the JSON of every top-level key of `state.data`; afterwards `qlDiff` keeps the keys that changed (their old JSON) or were added. Undo puts exactly those back (or deletes them), so `gt_data` is byte-identical.
- **The est rule (the pattern to keep):** a set with `est:1` counts for anything that is a COUNT (weekly sets, MEV / MAV / MRV, fatigue and recovery, consistency, time-lapse, stimulus-to-fatigue) and is never a PERFORMANCE number. Every reader of weight / reps skips it: `lastSetFor` (a workout holding est sets is never "last time"), `lastBestSet`, `exerciseRows` (so `liftIntel`, `stalledLifts`, `progressionFor`, `svRows` and every chart),
  `loggedExerciseNames` (+ByRecency), `lgLast`, `prevExercise`, `p3RepBook`, `rirIntel`, `gmTopLifts`, the week review's best set, the ally card and the CSV (`EST`, no e1RM). A NEW reader of workout sets must skip `s.est` too; `node scripts/qa/quicklog.mjs` fails when records, e1RM, progression, last time, strength rows or the stall detector move.
- **Display:** a quick workout never shows a number it does not have. Home's last-session row and the day detail say "Marked done" (the green `.tag.ql-tag`) + the reason and "N sets from your plan"; the Profile calendar lights the day as `.qk` (dashed ring, aria "marked done", a legend swatch) and "On this day" says Marked done; Alfred's last-session line and the calendar (.ics) export say "marked done" instead of "0 kg". Tonnage is 0, so volume heat and weekly tonnage stay real lifts only.
- **QA:** `node scripts/qa/quicklog.mjs [--width 375|393] [--out dir]`: the Home link, the sheet, the write, the cycle, weekly sets, the byte-identical undo, the tag everywhere, an older day from Mission with a picked date, a lift with no history, a rest day.

## 23 · Training focus (GP:FOCUS, 2026-10-22)
Mission dock tile **Focus** → sheet: tap up to 5 muscles in priority order (gold rank coins), live preview of sets per week (before → after on the landmark bar) and each day's new opening lifts, one gold Apply (undo toast). Engine `fcBuild(days, ranks)`:
- **Order:** on a muscle's home days (≥ half its biggest day's direct sets) its lifts move to the front in rank order; everything else keeps the written order (strength favours what goes first, growth is order-independent — Nunes 2021).
- **Volume:** rank 1 first, toward VL MAV + (MRV − MAV) × `FOCUS_PUSH[rank]`; each added set is paid by a non-focus lift on the same day while its muscles stay ≥ MEV (sessions keep their length). Caps: `FOCUS_DAY_CAP` 20 working sets a day (abs not counted), `FOCUS_SESSION_CAP` 11 per muscle per session, `FOCUS_LIFT_MAX` 4, ceiling = personal MRV (`zoneOf`).
- **Storage:** `split.focus = {ranks, base, sig}` — always rebuilt from `base` (no compounding); a plan edited afterwards no longer matches `sig` and becomes the new base; Clear restores `base`. Workouts never touched.
- **QA:** `node scripts/qa/focus.mjs [--width 375|393] [--out dir]` (23 checks).

## 24 · Tonight's day + last outing (GP:HISTORY, 2026-10-25)
- **Tonight's day** (`computeNextDay` → `lastSplitDay`): derived from history per split, never from a stored pointer (the old global `_nextDay` drifted: +1 on every finished session of any split, reset on a split switch, trusted after any logged rest → "wrong day tonight"). The newest session of THIS split by date decides (splitId + dayIdx; legacy / lineage `sp.from` / deleted-split sessions by day name); the rest days after it pass one per calendar day, or at once when logged; a training day is never skipped. Other splits and Free sessions never move it. `logRestDay` refuses on a day you trained; the rest hero's Train anyway starts the next plan day. Migration v4 tags `cycle8v2.from`.
- **Last outing** (`lastOuting(name, {before})`): the one "last time" lookup (`lastSetFor`, `lastBestSet`, `lgLast`, `prevExercise`, `seedSets`/`withPrev`, `addSet`, `swapExercise`): newest real outing by date, this gym first (another gym only when this one has none, flagged `otherGym`), exact name case/space-insensitive — never through `EX_ALIAS` (an alias shares a library entry, not the weights), after `exReset`, `est` quick-log sets never count. Index cached per history version (`save()` bumps `_histVer`).
- **Logging rows**: boxes keep the target ghosts; under every working set `.lg2-last` shows that set's numbers from the newest outing ("last 90 × 7", amber "other gym" chip).
- **QA:** `scripts/qa/cycle.mjs` (26), `scripts/qa/lastweight.mjs` (16).

## 25 · Warm-up ramp (GP:RAMP, 2026-10-25)
One engine `warmRamp(name, topW, topR, n, eqOver)` for the logging card's sheet (`openRamp`, the Warm-up ramp button and ⋯ menu; `quickRamp` opens it) and the Forge. Top set in (prefilled from the first set: typed, else its target ghost, else the newest best set), 1–5 warm-up sets as chips (remembered per lift in `d.warmPrefs`, not a setting), weights round DOWN to what can be loaded (bar + plate pairs via `forgeLoadable` for barbell / Smith / EZ / trap bar, 2.5 kg machines and cables, 2 / 2.5 kg dumbbells); heavy top sets (≤5 reps) ramp ~4% closer, light ones (10+) ~5% lower and shorter; equal weights merge; never at the top or under the bar; bodyweight lifts get none. Add replaces un-done W sets, keeps logged ones. QA: `scripts/qa/ramp.mjs` (16).
