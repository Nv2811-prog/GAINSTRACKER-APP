# QA harness — headless iPhone checks for the single-file app

No build step exists, so this is how changes get verified before shipping. It drives the REAL app
in headless Google Chrome at iPhone size (393x852 @2x), with realistic seeded data and a pinned clock.

## Setup (once per machine)
    cd scripts/qa && npm install --cache /tmp/npm-cache-gt   # puppeteer-core only; uses the installed Google Chrome

## Every change
    node scripts/qa/syncheck.mjs                       # syntax-check the app's inline <script> (exit 1 + line on error)
    node scripts/qa/smoke.mjs                          # real taps through the haptic switches: nav, set ✓, RESUME, finish, Alfred chat
    node scripts/qa/flow.mjs [--width 375|393] [--out dir]  # the whole loop with real touch taps: 5 tabs, start, one-tap ghost ticks, PR row, finish, summary slides, session RPE, Done > Home, Profile "Records" header on one row, Alfred chat (screenshots to --out)
    node scripts/qa/perf.mjs [--throttle 4] [--width 393]   # budget per screen: size, DOM nodes, render() ms, infinite animations (<= 1), backdrop-filter (<= 3), first paint
    node scripts/qa/charm.mjs                          # GP:CHARM (wave 6) pass/fail: light sweep once per tab per session, count-ups + ring draw-ins on the first view only (never on revisit / re-render), section-header icons, hero View Transition <= 220 ms, scroll-driven hero art, art behind the sheets, reduced motion stays quiet
    node scripts/qa/weekly-body.mjs [--width 375|393] [--out dir]  # WAVE 7A pass/fail: one-tap weekly adjust (Sunday card, review sheet, Mission link row: apply, undo restores the exact plan, once per week, trim / add / stretch-lift paths, history untouched) + Profile Body (weigh-in, single writer, trend, relative strength = Strength card, Settings and Fuel hooks)
    node scripts/qa/strength.mjs [--width 375|393] [--out dir]  # WAVE 8A pass/fail: strongest variation per standard lift (leg press x0.50 is the fixture squat, a hack squat or barbell squat overtakes it, dumbbell / cable / single-leg lifts never count, converted lifts capped at Elite), one number across the Strength card, Big-3, Body trend, dock tile and badges, history as-of-week, every library exercise claimed by at most one lift, the variations sheet (with the next tier in your own units), a capped lift sitting ON its tier at any bodyweight, and the Suit hero read from its COMPUTED style (opacity, mask, veil, parallax; a one-class override silently loses to GP:ART) plus the Fuel tile art
    node scripts/qa/layout.mjs [--width 375|393] [--fixture train|rest|none|live] [--shots dir] [--only name]  # QUALITY PASS audit of EVERY tab, page, sub-page and sheet (4 fixtures: training, rest, new user, live session): static dead-handler scan, then per screen overflow / sticks out, clipped text, wrapped headers and labels, unlabeled or tiny tappables, a sheet the backdrop will not close, sub-pages without Back, console errors, and the one-home-per-feature rules (suit figure once, Home exceptions only, no second Hydration, Lab tools, search list once); plus search typing keeps focus, the Fuel tile opens Fuel and counts agree across screens. Exit 1 on any problem
    node scripts/qa/pr.mjs [--width 375|393] [--out dir]  # PR FINISHER (GP:PRFIN, wave 9) pass/fail: next clip preloaded at idle as a Blob, a record by a REAL tap plays a full-screen <video src="blob:..."> above everything, the stamp lands in the final second, it closes itself, record 2+ starts at the impact, a tap skips (nothing falls through), rotation Joker > Bane > Two-Face > Penguin > Scarecrow > Joker persisted, sound refused = muted + own sfx, no standing record = crown only, inputs / rest timer / scroll untouched; offline or slow clip = no overlay + crown; reduced motion = poster + stamp. Only this script lets assets/pr/ through (launch({clips:true})); every other script blocks it so the overlay never interrupts them
    node scripts/qa/quicklog.mjs [--width 375|393] [--out dir]  # WAVE 10 (GP:QUICKLOG) pass/fail: "Mark as done" for a split day without logging it: the Home link and the Mission Preview button open one sheet (day, today / yesterday / a picked date, reason chips, what gets counted); ONE quick:1 workout with the planned sets (est:1, last time's numbers), tonight advances, weekly sets rise by the plan, sessions and streak follow, records / e1RM / progression / last time / strength rows / stall detector stay byte-identical, no XP or tonnage, a toast with Undo and no takeover, undo restores gt_data byte for byte; the tag on the Home last-session row, the Profile calendar and the day detail; an older day (inserted by date, streak / pointer / muscle dates untouched), a lift with no history, a rest day
    node scripts/qa/home.mjs [--tab] / tab.mjs --tab mission|suit [--fixture train|rest|none] [--width 375]  # tap every control on one tab, report console errors
    node scripts/migrations-check (see scripts/test-migrations.cjs)
    node scripts/qa/onboarding.mjs [--out dir]         # new-user flow: welcome > you > goal > experience > Home, guards, persistence, Settings edit mode
    node scripts/qa/photos.mjs [--out dir]             # progress photos (wave 7): failed read-back leaves a photo untouched, move into IndexedDB behind a safety copy (byte-identical), thumbnails + idb flags in gt_data, reboot idempotence, Compare (drag/tap/touch/keys, side by side, pick, fits without scrolling), single view + delete from both stores, add, backup carries FULL photos, restore round-trip + prune, erase, a full phone still moves (safety copy falls back to IndexedDB)
    node scripts/qa/settings.mjs [--out dir]           # Settings + Data control: field validation, archive, restore guards, two-step erase, backup/CSV hooks
    # tab.mjs also taps sheets: --open "openSettings()" --scope "#sheet [onclick]"; --inject-file scripts/qa/seed-allies.js (three seeded allies: one on patrol, one streak at risk, one idle; pair with --tab allies and --open "openAllySheet(0)"); --skip "backupData|exportCSV"
    # Every script defaults to the app file of the repo it lives in (works in worktrees); pass --file <html> (smoke/syncheck: a positional path) to test another build.

## Screenshot any state
    node scripts/qa/shoot.mjs --out /tmp/shots --name home [--js "<page code>"] [--eval "<expr>"] [--width 375|393|430] [--scroller "#sheet"] [--file <html>] [--fixture none]
- --js runs after boot. Helpers: __qa.tab('mission'|'suit'|'case'|'allies'), return __qa.startLogging(3), __qa.finish(), __qa.clear().
- Prints JSON with screenshot files (one PNG per phone screen), console errors and failed requests.

## Fixtures (synthetic, created through the app's own finishWorkout path)
- fixture-train.json — "Bruce", 34 sessions on the 8-day cycle, tonight = Upper C. Default.
- fixture.json — same history, tonight = rest day. `--fixture none` = brand-new user.
- Regenerate: node scripts/qa/seed.mjs; derive variants: node scripts/qa/variant.mjs in.json out.json "<js>".

## Network rules
Everything external is blocked except Google Fonts and the public free-exercise-db JSON. ExerciseDB demo
GIFs are replaced by a placeholder — NEVER let tests hit exercisedb.p.rapidapi.com (tiny monthly quota).
