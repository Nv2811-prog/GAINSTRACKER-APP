# QA harness — headless iPhone checks for the single-file app

No build step exists, so this is how changes get verified before shipping. It drives the REAL app
in headless Google Chrome at iPhone size (393x852 @2x), with realistic seeded data and a pinned clock.

## Setup (once per machine)
    cd scripts/qa && npm install --cache /tmp/npm-cache-gt   # puppeteer-core only; uses the installed Google Chrome

## Every change
    node scripts/qa/syncheck.mjs                       # syntax-check the app's inline <script> (exit 1 + line on error)
    node scripts/qa/smoke.mjs                          # real taps through the haptic switches: nav, set ✓, RESUME, finish, Alfred chat
    node scripts/migrations-check (see scripts/test-migrations.cjs)

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
