---
name: design-system
description: Use before building or changing any frontend in GainsTracker. Loads and enforces the project's design system from DESIGN.md (colors, type, spacing, components, motion) so Claude produces on-brand, consistent UI instead of guessing. Trigger on new screens, components, or restyling work.
---

# Design System (DESIGN.md driven)

GainsTracker has a single source of truth for its visual language: **`DESIGN.md`** in the project root. Treat it like a contract.

## Workflow

1. **Read `DESIGN.md` first** at the start of any UI task. If it doesn't exist, create it by auditing the current index.html (extract the real colors, fonts, spacing scale, radii, shadows, and recurring components) and write them down.
2. **Build to the spec.** Use only the tokens and patterns defined there. If you need something new, add it to DESIGN.md *first*, then use it — never introduce undocumented one-offs.
3. **Keep DESIGN.md current.** When you intentionally change a token or add a component, update DESIGN.md in the same change so it never drifts from the code.

## What DESIGN.md must contain
- **Color tokens** — backgrounds, surfaces, text, accents (Gotham gold/red), states (success/warn/error), with hex values and usage rules.
- **Typography** — font families, the type scale, weights, line-heights.
- **Spacing scale** — the allowed spacing steps (e.g. 4/8/12/16/24/32).
- **Radii, borders, shadows** — including the embossed/tactile depth treatments the app uses.
- **Components** — buttons (primary/secondary), cards (split day-cards), the barbell bottom-nav, dials/chips, the muscle figure. Each with do/don't notes.
- **Motion** — durations, easing, and the reduced-motion rule.
- **Mobile rules** — iPhone Safari first; ≥44px touch targets; safe-area insets.

## Rule of thumb
If a design decision isn't answerable from DESIGN.md, that's a gap — fill the doc, then build. The doc makes every future frontend prompt produce consistent, on-brand results.
