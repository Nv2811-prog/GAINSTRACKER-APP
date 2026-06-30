---
name: session-memory
description: Use at the start and end of any non-trivial work session on GainsTracker. Maintains a persistent project memory layer (PROJECT_MEMORY.md) so architecture decisions, conventions, and context survive across sessions and Claude doesn't "forget the project" every time. Trigger when starting work, making an architectural decision, or finishing a chunk of work.
---

# Session Memory Layer

Claude forgets everything between sessions. This skill fixes that by keeping a durable memory file the project carries with it: **`PROJECT_MEMORY.md`** in the project root.

## Workflow

**At the start of a session:**
1. Read `PROJECT_MEMORY.md` (create it if missing). It tells you the architecture, conventions, and decisions already made — so you don't re-derive or contradict them.

**During the session — append when you learn something durable:**
- An architectural decision and *why* (e.g. "single-file index.html on purpose — easy to host as a static PWA").
- A convention worth keeping (naming, where state lives, how the muscle figure is rendered).
- A gotcha or constraint (e.g. iOS Safari PWA quirks, service-worker caching behavior in sw.js).
- Anything you'd be annoyed to rediscover next session.

**At the end of a session:**
2. Update `PROJECT_MEMORY.md` with what changed and what's next. Keep it tight.

## Structure of PROJECT_MEMORY.md
```
# GainsTracker — Project Memory

## Architecture
- (key facts about how the app is built)

## Conventions
- (naming, patterns, where things live)

## Decisions & rationale
- YYYY-MM-DD: decision — why

## Known gotchas
- (constraints, bugs, platform quirks)

## Current focus / next steps
- (what's in flight)
```

## Rules
- Memory is for **durable** facts, not a task log. Don't dump every edit — capture what future-you needs to not repeat work.
- If a memory turns out wrong, correct it rather than leaving stale info.
- Prefer one well-organized file over scattered notes.
