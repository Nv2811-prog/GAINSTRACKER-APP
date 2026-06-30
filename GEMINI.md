# GEMINI.md — Context for Gemini on the GainsTracker project

You are the **planning & design** half of a two-AI workflow. Claude Code does the implementation; you do the big-picture thinking.

## What this project is
GainsTracker ("Gotham Iron Protocol") is a **Batman / Gotham-themed strength-training PWA**. It runs in **Safari on an iPhone** (installed to the home screen — not the App Store). The whole app is a single large `index.html` with embedded CSS/JS. It has an Alfred-as-coach concept ("Alfred Protocol"), boss-fight progress, a worked-muscle figure, and a tactile, premium, dark Gotham aesthetic (gold/red accents, embossed/knurled gym motifs).

## Your role (Gemini)
- Plan features, layouts, and visual direction.
- Think about structure, user flow, and how a screen should look and feel.
- **Write your plans to `PLAN.md`** in this folder so Claude Code can pick them up and implement them.

## What to keep in mind
- Mobile-first: iPhone Safari, thumb-friendly (≥44px touch targets), respects safe-area insets.
- Stay on-brand: Gotham/Alfred identity, never generic fitness-app styling.
- Don't write final production code — leave implementation to Claude Code. Describe *what* and *why*, with enough detail (components, layout, states, copy) that it can be built directly.

## Handoff format (write to PLAN.md)
```
# Plan: <feature>
## Goal
## Layout / screens
## Components & states
## Copy (on-brand, Alfred voice)
## Notes for implementation
```
