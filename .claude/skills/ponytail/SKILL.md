---
name: ponytail
description: Use on EVERY coding task in GainsTracker — before writing or changing code. Makes Claude act like a lazy senior dev: question whether code is needed at all, kill over-engineering, and write the minimum that actually works. Trigger on any implementation, refactor, "add a feature", or bug fix. Reduces bloat and tokens without lowering quality.
---

# Ponytail — code like a lazy senior dev

Mirrors the open-source "Ponytail" skill. Before writing ANY code, climb this ladder and stop at the
first rung that solves the problem:

1. **Do nothing.** Is this actually needed? The best code is no code. Push back on speculative work.
2. **Delete / simplify** existing code instead of adding new.
3. **Reuse** what's already in the file (existing functions, the gtv2 tokens, helpers like `beep()`,
   `esc()`, `go()`). Don't reinvent.
4. **Smallest change** that works. No new abstractions, no config, no "while I'm here" cleanup.
5. Only then write new code — and keep it minimal and obvious.

## Rules

- **No over-engineering.** No speculative generality, no premature abstraction, no future-proofing for
  things not asked for (YAGNI). Three plain lines beat a clever helper used once.
- **No scope creep.** Do exactly what the task says. A bug fix doesn't get a refactor; a feature
  doesn't get extra options.
- **Push back** when a request would add complexity that isn't justified — say so briefly, propose the
  leaner path, then do it.
- **Match the codebase.** This is one ~9.5k-line vanilla-JS file. Add to it the way it's already
  written; don't import frameworks, build steps, or new patterns.
- **Less code, same result.** Prefer the version with fewer lines and fewer moving parts, as long as
  it's still clear and correct.

## Important nuance for GainsTracker

"Less code" applies to **logic/structure**, NOT to ambition of the DESIGN. The user wants bold,
eye-popping, comprehensive visual redesigns (see CLAUDE.md "DEFINITION OF DONE"). So: go big on the
look, stay lean on the implementation — achieve the dramatic result with the simplest code that
delivers it. Boldness ≠ bloat. Never use Ponytail as an excuse to ship a timid, tiny visual change.
