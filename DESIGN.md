# DESIGN.md — Gotham Pro (the visual contract)

Single source of truth for how the app looks and moves. Rewritten after the Gotham Pro overhaul (waves 1-5).
If a decision isn't answerable here, add it here FIRST, then build. Grep the code before trusting any name below.

**One sentence:** a professional, CEO-grade dark interface (calm matte surfaces, SF Pro text, Bebas numerals, gold only
where something is an action, a selection or a record) with cinematic Gotham stills behind each tab's single hero.
Science first: the numbers are the product, the Batman skin is the atmosphere.

## 1 · The one-thing-once rule
Every metric, state and action appears **once per screen**; everywhere else it is a link into the place that owns it.
- Home: readiness lives inside the Tonight hero (no separate readiness card); one This-week card owns sessions + the volume
  map; one Lifts card owns records + stalled lifts; everything else sits behind the "Gotham extras" row/sheet.
- One S3 hero per screen. One B1 (gold) button per view. One moving thing per screen (see Motion).
- Compact by default, tap to expand: folds (`gmFoldRow` + `toggleAcc`), sheets (`openSheet`) and sub-pages hold the detail.
- If you are about to add a second place that shows the same number, link to the first instead.

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
| B3 tertiary | `.btn-3` | no fill, gold-ink text, 44px, gold-tint on press |
| chip / icon | `.chip` (30px pill) / `.btn-i` (40px visual, 48px hit) | filters, toggles / header and row icons |

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
Other shared pieces: `openSheet(html)` / `closeSheet()`, `toast(msg)`, `topBar(left)` (brand mark left; search, settings and the Alfred avatar with a gold hairline ring right),
`gaArt(name,cls)` (cinematic still), `figLayerHtml(ex, fi)` (exactly one base layer per exercise picture: curated PNG or anatomy SVG), `gmFoldRow` (collapsed row that builds on first open).

## 7 · Art recipe (cinematic Gotham, behind the hero)
Seven stills in `assets/art/` (720x480 JPEG, 33-52 KB, ~287 KB total; see `assets/art/README.md`): `logging` (cave gym), `rest` (blue-hour skyline),
`finish` (gold signal beam), `profile` (armoured cowl, crimson kicker), `mission` (war room), `suit` (carbon plates, the quietest), `allies` (two caped figures).
- Subject lives in the right ~40% of the frame; the left ~60% is dark so text sits on it.
- Placed by `gaArt(n,c)` as `.ga` (absolute, `z-index:-2`, `pointer-events:none`) -> `<img>` with `object-position:right center`, opacity via `--o`, and a **left + bottom gradient mask** — never raw. A missing file drops its own layer (`onerror` removes the node).
- Static: no layout, no animation except Home's single `ghDrift`. The two stills the live flow needs (`finish`, `logging`) are pre-warmed 4s after boot; `sw.js` caches the rest at runtime.
- Figures: `assets/exfig/*.png` (exercise pictures keyed by movement pattern) and `assets/figures/*` (muscle front/back). Photoreal grey body, worked muscle solid red, black background, <=420px wide and ~150 KB. Generate with `node scripts/gen-image.mjs "<prompt>" assets/<name>.png` then `sips -Z 420`; never one image per exercise. No multi-MB images (iOS memory crash). `assets/veh/*` serve the Garage, `assets/alfred.png` the coach, `assets/entrance/bat-city.png` the Garage hero.

## 8 · Haptics rule (do not break)
Real iOS haptics need a **finger tap on a real `<input type="checkbox" switch>`**. `hxHost` lays an invisible one (`.hx`, `opacity:.01`) over exactly `HX_SEL = "#nav button,.sdone"` — the five tab buttons and the set tick — and nothing else.
`data-hx` in templates is inert on purpose. **Never add more overlays**: any scrollable row or button with one turns a scroll drag into a tap on iOS. The overlay has a scroll guard (moved > 8px or page scrolled = revert, nothing opens). Everything else uses `haptic(kind)`.

## 9 · Motion rules
- Timing: UI motion 90-300 ms; press 90 in / 280 spring out; tab switch is a View Transition (old view fades 90 ms, new one rises 6px over 200 ms, tab bar stays put); cards stagger in with `.gh-c` + `--i` (40 ms steps) only when the view changed (`state._same` false).
- **Budget per screen: <= 1 infinite animation** (Home: the hero art drift, which holds still while a session is live so the pulsing live dot is the one moving thing; every other tab: none) and **<= 3 `backdrop-filter`s** (the tab bar only; the sheet backdrop blurs only while a sheet is open). Check with `node scripts/qa/perf.mjs`.
- Full-screen takeovers (`cinePush`, `playStinger`) are reserved for a PR and the session finish. Everything else is a toast or a haptic. Never on launch, never mid-set.
- Animate `transform` / `opacity` only. `prefers-reduced-motion` kills animation (wired; keep it). Keep one-shot durations short; when in doubt, cut.

## 10 · CSS anchors (the `<style>` is layered per wave; find an area by its anchor comment)
| Anchor | Owns |
|---|---|
| top of `<style>` + "4 · BUTTONS" block | tokens, legacy remaps, base/reset, the button tiers and the press recipe, sheet/overlay/modal chrome, `.hx` |
| `GP:HOME (wave 2)` | Home primitives: `.gh .s1/.s2/.s3`, rows, `.gh-lh/.gh-sec/.gh-sub`, rings/`.lmk`/`.seg`/`.wk`, the Tonight hero |
| `GP:PRUNE+HOME (wave 5)` ... `/GP:PRUNE+HOME` | Home below the hero (Sunday review, last session, next up, extras), week-review sheet, seasonal event card |
| `GP:LOGGING (wave 2)` | the live workout: header strip, focus card, set grid (`.lg2-*`), up next, rest, PR chip |
| `GP:MISSION+SUIT (wave 3)` | Mission (plan hero, cycle days, forecast, Lab fold) and Suit (recovery figure, 12-muscle grid, Body), scoped under `.gm`; muscle dossier, plan editor |
| `GP:PROFILE+FINISH (wave 3)` | Profile tab (`.p3-*`), exercise detail sheet, finish moment + summary slides |
| `GP:ART (wave 4)` | `.ga` stills and the per-tab crops/veils |
| `GP:TABS (wave 5)` | Allies (`.al-*`), the Alfred page (`.af-*`), Settings + Data control (`.st-*`), onboarding, the Alfred chat panel (`.ac-*`) |
The JS has matching banners (`/* ===== ... (GP:TABS, wave 5) ===== */`). Scoped primitives live under `.gh` (+ `.gm` / `.p3-pf` / `.al-pg` ...) so a tab can restyle without leaking. Do not add a new wave-layer that overrides an old rule: edit the rule in place and delete what it replaced.

## 11 · Mobile rules (iPhone Safari PWA first)
- Design at 375-393px; verify at 375 and 393 (`node scripts/qa/flow.mjs --width 375`). `#app` caps at 560px. Safe-area insets on fixed bars.
- Nothing wider than the viewport (no page-level horizontal scroll), no clipped text; long names ellipsize by design (`.gh-t1`).
- Text readable in daylight: body on bg >= AA; `--tx3` is for de-emphasis only.

## 12 · Hard don'ts
- No grey app chrome, no flat borderless boxes, no second gold button in a view, no emoji as chrome in new code, no new colour meaning.
- No settings/toggles to "make it nicer" (great by default), no deload features, no unprompted pop-ups.
- No overlay haptic hosts beyond `#nav button` and `.sdone`. No more than one infinite animation or three backdrop-filters per screen.
- Never edit `index.html` (generated deploy copy) and never break or erase `localStorage` data.
