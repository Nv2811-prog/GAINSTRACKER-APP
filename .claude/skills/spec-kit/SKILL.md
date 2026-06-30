---
name: spec-kit
description: Use before any non-trivial build or redesign in GainsTracker (a new tab, a feature, a wave). Writes a short spec FIRST — goal, what changes, acceptance criteria — so the work is aimed before code is written and "done" is unambiguous. Trigger on feature requests, waves, or anything bigger than a small fix.
---

# Spec-Kit — spec before you build

Mirrors the spec-driven-development idea. For anything bigger than a tiny fix, write a tight spec
FIRST (in chat or a scratch note), get it straight, then build to it. Keep it short — this is a
personal single-file app, not enterprise.

## The mini-spec (5 lines, no more)

1. **Goal** — what the user actually wants, in one sentence.
2. **Changes** — the specific files/functions/areas you'll touch (e.g. `renderSuit()` ~4437).
3. **Acceptance** — how we'll know it's done (the "Check on iPhone" list).
4. **Constraints** — the hard rules in play (no toggles, per-gym isolation, never wipe localStorage…).
5. **Out of scope** — what you're deliberately NOT doing (keeps scope tight; pairs with Ponytail).

## Rules

- Don't over-spec. Five lines, then build. No multi-doc PRD for a single-file PWA.
- The spec is a contract for "done" — build to the acceptance criteria, nothing more, nothing less.
- For waves (see `GAINSTRACKER-WAVES.md`), the wave text IS the spec — follow its STEP list instead
  of writing a new one.
- If the request is vague ("make it better"), the spec must still be bold per CLAUDE.md's DEFINITION
  OF DONE — a comprehensive redesign, not one tweak.
