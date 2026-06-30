---
name: task-master
description: Use on any multi-step work in GainsTracker (a wave, a feature with several parts, a redesign touching multiple areas). Breaks the work into a tracked task list with TodoWrite and works them one at a time so nothing is dropped and progress is visible. Trigger when a request has 3+ distinct steps.
---

# Task-Master — break it down, track it, finish it

Mirrors the task-master idea using Claude Code's built-in TodoWrite. For any job with several parts,
turn it into a visible task list and march through it.

## How

1. At the start, list the concrete steps as todos (one per real deliverable, not per keystroke).
2. Mark exactly ONE task `in_progress` at a time; complete it before starting the next.
3. Mark a task `completed` the moment it's actually done (built + verified), not in a batch later.
4. If new work appears mid-task, add it as a new todo rather than silently expanding the current one.

## Rules

- Right granularity: a wave's STEP 2 sub-points make good todos. Don't create a todo for "open file".
- Keep it honest — don't mark something done until it passes the syntax check / works.
- Pair with spec-kit (spec first → tasks from the spec) and Ponytail (don't invent tasks that aren't
  needed).
- For waves, the STEP list in `GAINSTRACKER-WAVES.md` is the task list — track those steps.
