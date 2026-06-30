---
name: taste-frontend
description: Use whenever generating, editing, or reviewing UI/frontend for GainsTracker (HTML/CSS/JS in index.html). Enforces a high-taste, "anti-slop" bar so the UI looks intentional, premium and consistent instead of generic AI output. Trigger on any visual change — new components, layouts, colors, spacing, animations, or styling.
---

# Taste — Anti-Slop Frontend

Your job is to stop "AI slop" UI before it ships. GainsTracker is a premium, tactile, Gotham-themed fitness PWA used on an iPhone in Safari. Every visual change must clear the bar below.

## The Anti-Slop Checklist (run before finishing any UI work)

1. **No generic defaults.** Never ship unstyled buttons, default blue links, `border: 1px solid black`, or stock system fonts where a themed treatment is expected. Match the existing Gotham aesthetic (dark surfaces, gold/red accents, embossed/tactile depth).
2. **Spacing is a system, not random.** Use a consistent scale (e.g. 4/8/12/16/24/32px). No one-off `margin: 13px`. Align to the rhythm already used in the file.
3. **Hierarchy is obvious.** One clear primary action per view. Size, weight, and color must communicate importance. If everything is bold, nothing is.
4. **Contrast & legibility (mobile-first).** Text must be readable in sunlight on a phone. Meet WCAG AA (4.5:1 body, 3:1 large). Never gray-on-dark that disappears.
5. **Touch targets ≥ 44×44px.** This is used by thumbs on an iPhone. No tiny tap zones.
6. **Motion has purpose.** Animations should clarify state or reward an action, never decorate for its own sake. Keep them fast (120–250ms), eased, and respect `prefers-reduced-motion`.
7. **Consistency over cleverness.** Reuse existing components, tokens, and patterns from index.html. Don't invent a third button style when two already exist.
8. **Detail finish.** Rounded corners, shadows, borders, and focus states must be deliberate and consistent. Embossed/knurled/weight-plate motifs are part of the brand — lean into them.

## Workflow

1. Before coding, scan index.html for the existing tokens, component patterns, and theme variables. Reuse them.
2. Make the change.
3. Self-review against the 8 points above. Name any point you might be violating and fix it.
4. If the result looks like it could come from any generic template, it fails. Redo it with more intent.

## Hard "no" list
- No emoji as UI icons unless the brand already does it.
- No lorem-ipsum or placeholder colors left in.
- No inline `style="..."` when a class/token exists.
- No layout that breaks at iPhone widths (~390px) — always sanity-check narrow.
