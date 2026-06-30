---
name: knip
description: Use when finishing a feature/wave or when the file feels bloated in GainsTracker — to find and remove dead code. Hunts unused functions, unreachable branches, orphaned CSS classes, and unused image assets in the single-file app. Trigger after big edits, during cleanup, or when something "edits do nothing" (a sign of a dead duplicate).
---

# Knip — dead-code hygiene (adapted for a single-file app)

The real Knip tool scans multi-file JS/TS projects for unused exports/files/deps. This app is ONE
vanilla-JS file with no imports, so do the same job manually and carefully.

## What to hunt

1. **Dead functions** — defined but never called. (A dead DUPLICATE of a live function is the worst
   kind: edits to it silently do nothing — exactly what bit us with the old `renderGotham`.)
2. **Unreachable branches** — code after early returns, `if(false)`, stale feature paths.
3. **Orphaned CSS** — classes/`@keyframes` in `<style>` not referenced anywhere in markup or JS.
4. **Unused assets** — files in `assets/` not referenced by the HTML/JS (waste, and bloat).

## How to verify before deleting (CRITICAL — never guess)

- For a function `foo`: Grep the whole file for `foo(` and `foo` references. Zero call sites (and not
  exposed on `window`/an `onclick=`) → safe to remove.
- For a CSS class: Grep for the class name in template strings and `classList`. None → remove.
- For an asset: Grep its filename. None → remove the file.
- Always re-run the syntax check after removing, and confirm the app still renders.

## Rules

- Delete completely — no commented-out corpses, no `_unused` renames, no "// removed" notes
  (CLAUDE.md anti-backwards-compat rule).
- Never touch localStorage shapes or anything that *looks* unused but is referenced via string keys
  (`d.prsByGym`, `onclick="..."`, dynamic dispatch like the `go()` router map). Check string usage too.
- Pairs with Ponytail: deleting dead code is the highest form of "write less code".
