# DESIGN.md — GainsTracker visual contract

Single source of truth for the app's visual language. Audited from the live file 2026-07-05.
If a decision isn't answerable here, add it here FIRST, then build.

## Color tokens (`:root`, top of file)
| Token | Value | Use |
|---|---|---|
| `--bg` | #030508 | page canvas (near-black) |
| `--bg2/3/4` | #0b1018 / #121826 / #1b2234 | raised surfaces, inputs, chips |
| `--gold` / `--gold2` / `--gold3` | #E8A820 / #FFD048 / #FFF09A | THE brand accent — triumph, primary actions, focus |
| `--gold-dim` / `--gold-bg` | #A06E14 / #180F00 | borders / tinted backgrounds |
| `--red` #FF3622 | danger, villains, failure sets | |
| `--green` #22E87A | GO / success / ready | |
| `--blue` #3C96FF | recovery, rest, intel | |
| `--yellow --orange --purple --steel` | see :root | muscle/status accents |
| `--text/2/3` | #F6F2E6 / #98A4B4 / #606872 | text hierarchy (3 = de-emphasis only, never body) |
| `--border/2` | #181D28 / #282F42 | hairlines |

**Meaning rules:** gold = triumph/primary · blue = recovery/rest · red = danger/PR-chase · green = go/done-positive. App chrome is NEVER grey/muted — only anatomy figures are grey (so red muscles pop).

## Typography
- `--disp: 'Bebas Neue'` — headers, numbers, stingers. Used via `h1-h3`, `.disp`, `.num` (tabular-nums).
- `--body: 'DM Sans'` — everything else. Base 16px, line-height 1.5.
- Scale in use: `.mini` 11-12px · body 16 · `.ttl` 15 (letterspaced label) · `.big` 58 hero number · stinger ~40+.

## Spacing, radii, depth
- Spacing rhythm: 4 / 8 / 12 / 16 / 24 / 32. Cards pad ~15-19px. `#app` max-width 560px, page pad 14px.
- Radii: chips 7-10 · inputs/buttons 9-13 · cards 16-22 · pills 999.
- Tactile depth recipe: layered `box-shadow` (outer drop `0 20px 60px -28px #000`, inner `inset 0 1px 0 rgba(255,255,255,.07)` top-light) + 1px tinted border + vertical gradient surface. Every interactive card glows a gold ring on press (global `.card[onclick]` affordance).

## Components (reuse these — never invent parallels)
- `.card` / `.card glow` — standard surface. `.banner` — icon + text strip (Alfred).
- `.btn` (block) + variants `.gold` (primary, one per view), `.ghost` (secondary), `.sm`.
- `.chip` — small action pill. `.splitday` — tactile day card w/ embossed `.splitday-start`.
- `.tbox` — fixed timer boxes in workout header (`.timers` bar).
- `.stype` / `.sdone` — 36px set-type + check tiles (44px+ effective touch with padding).
- gtv2 home tokens: `.gtv2-tonight` focal plate, `.gtv2-track/step` stepper, `.gtv2-idrow` identity row.
- `.exwrap` — small/list exercise thumbnail (`.sm` 74px, `.xs` 46px, default 86px). Exactly one base
  visual layer (curated photo `.exfigimg` OR the anatomy `<svg>`) plus an optional animated `.exgif`
  demo layered on top; `.hasgif` on the wrapper hides the base layer. Build the base layer with
  `figLayerHtml(ex, fi)` — never hand-roll the img/svg pair, it's what makes "one layer only" hold.
- `.scanpanel` — the "Batcomputer target-scan" HERO picture (exercise dossier + the active lift's
  focus card during logging). Built by `scanPanelHtml(o)` — never hand-roll the markup. A physical
  instrument, not a flat photo crop: brushed-metal bezel (`.scanpanel` outer, gradient + padding),
  a glass `.scanpanel-screen` (holds the id used by `attachExGif`/pickers), a faint blueprint
  `.scanpanel-grid`, a slow ambient `.scanpanel-scan` sweep, gold `.scanpanel-c.tl/tr/bl/br` corner
  reticles, and a `.scanpanel-cap` HUD readout (pulsing-dot tag + name + muscle/equipment line).
  Same single-layer contract as `.exwrap` (`figLayerHtml`). ExerciseDB demo GIFs ship on a flat
  WHITE background that clashes badly with this dark UI — do NOT try to fix that with a dark
  overlay/vignette (tried, doesn't work: the white is the image's *center*, not just its edges).
  The real fix is the shared `.exgif` filter: `grayscale→brightness→contrast→sepia→hue-rotate→
  saturate` retints the whole plate into a cool steel-blue "scan" tone (the standard CSS-filter
  duotone recipe). This loses the source's red muscle-highlight, but the panel's own muscle-coloured
  glow (`--fg`) and the caption text already carry that information, so nothing is actually lost.
  `.scanpanel img.exfigimg` (the curated PNGs, which already look great on their own black bg) only
  gets a mild contrast/saturate bump, no retint.
- `.mission-briefing` (`missionBriefingHero()`) — the Mission tab's hero: tonight's operation pulled
  OUT of the day list into its own dramatic card (blueprint grid, pulsing "TONIGHT'S OPERATION" tag,
  big title, muscle chips, exercise thumbnail strip, one huge glowing `.mb-start` DEPLOY button).
  The day-list row for tonight stays a plain compact row (chip only, no duplicate thumbnail strip —
  that would just repeat the hero) since the hero above already owns that spotlight.
- `.picp-grid` / `.picp-tile` — the picture-picker gallery (`openPicPicker`): a searchable, filterable
  grid of every candidate demo the Batcomputer can find, plus an "Anatomy figure" tile. Never fall
  back to a blind "cycle to next" control — always let the user see and choose. Tiles intentionally
  show the RAW un-retinted image (functions as a contact sheet for picking, not the in-app display).
- Sheets: `openSheet(html)` bottom sheet; `openSheetTall` for full content. Toast: `toast(msg)`.
- Cinematics: `playStinger(title, sub, accent)` 1.5s full-screen bat-slam (rewards only), `prFlash()` flashbulb, `sfx(kind)` WebAudio, `haptic(kind)`.
- Nav: barbell bottom bar (`.nav-bar` knurled steel, active tab = loaded gold plate).

## Scroll discipline
`render()` preserves scroll position automatically when the view key (`state._vk`) hasn't changed —
never call `window.scrollTo(0,0)` from an in-place action (set toggles, exercise focus, sheet edits).
Reserve hard scroll-to-top for genuine navigation (tab switch, opening a subpage, minimising/resuming
a workout). If a focused element needs to be brought into view, scroll THAT element into view (account
for the fixed `#timerbar` height), never the whole page. Bottom sheets (`#sheet`) scroll independently
via their own `scrollTop` — mutating sheet content must repaint the sheet in place and restore its
`scrollTop`, since `render()` only repaints `#app` underneath it.

## Motion
- Durations 120-350ms UI, easings `--ease-out` / `--ease-spring`. View transitions via `#app.view-enter*`.
- `prefers-reduced-motion` globally kills animation (already wired — keep it).
- Full-screen moments (stinger, GO flash, KO cam) are REWARDS: ≤1.5s, pointer-events:none or tap-through, never block input, never on app launch.
- Ambient motion (skyline, breathing hero) must be GPU-cheap: transform/opacity only.

## Mobile rules (iPhone Safari PWA first)
- Design at 390px width; `#app` caps at 560px. Safe-area insets via `env()` on fixed bars.
- Touch targets ≥44px. Inputs `font-size:16px`+ (blocks iOS zoom). `inputmode` set on numeric fields.
- Text readable in daylight: body on bg ≥ AA; `--text3` only for de-emphasis labels.

## Hard don'ts
- No grey app chrome, no flat borderless boxes, no settings/toggles, no deload features.
- No multi-MB images (iOS crash) — `sips -Z 420`, ≤~150KB.
- No pop-ups on launch; celebration/coaching surfaces contextually during use.
- Emoji are allowed as brand icons where already used, but prefer drawn SVG/gen'd images for hero surfaces.
