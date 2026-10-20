# assets/art - cinematic Gotham stills for tab heroes

Seven photoreal film-still backdrops, one per surface. All are 720x480 (3:2) JPEG, 33-52 KB each, about 287 KB in total.
Palette: deep navy/teal shadow, warm gold light, one crimson accent (profile). The subject always sits in the right
~40% of the frame and the left ~60% is dark and empty, so text goes on the left.

## Use them darkened, never raw

Each image is placed right-aligned behind its card/header and **darkened by a left and bottom gradient** - the same
recipe the old Batman.jpg tonight card used. Example (swap in the card's own background colour):

```css
background:
  linear-gradient(90deg, #0b0d12 20%, rgba(11,13,18,.55) 55%, rgba(11,13,18,0) 85%),
  linear-gradient(0deg,  #0b0d12 0%,  rgba(11,13,18,0) 45%),
  url(assets/art/logging.jpg) right center / cover no-repeat;
```

Keep `right center` so the subject stays visible. On very wide, short banners `cover` crops top and bottom, and the
subject is vertically centred in every file, so that is safe.

## Files

| File | Surface | Scene |
|---|---|---|
| `logging.jpg` | Workout / logging screen header | Cave gym: steel rack and loaded barbell under one gold light shaft from a skylight, bats against the opening, floor mist |
| `rest.jpg` | Rest-day hero | Calm Gotham skyline at blue hour, moon behind a spire, low fog, faint gold glow on the horizon |
| `finish.jpg` | Session-finish moment | Gold signal beam from a gothic tower lighting a pool of light on low storm clouds, rain |
| `profile.jpg` | Profile identity hero | Matte black armoured cowl from behind (no face), fine gold rim line, crimson kicker, studio black |
| `mission.jpg` | Mission plan hero | War room: pendant lamp over a lit city map with red routes, rain on tall gothic windows |
| `suit.jpg` | Suit / recovery hero | Overlapping matte carbon armour plates with thin gold seams on pure black - the most subtle of the set |
| `allies.jpg` | Allies hero | Two caped figures from behind on a gothic rooftop ledge, rain, city lights below |

## Provenance

Generated with `scripts/gen-image.mjs` (gemini-2.5-flash-image, about $0.04 per draft; 13 drafts for these seven).
The model returns 1:1 frames, so each pick was cropped to a hand-chosen 3:2 window (which also removes baked-in
letterbox bars) and exported with
`sips -s format jpeg -s formatOptions 72 -Z 720`.
`sw.js` caches same-origin files at runtime, so the art works offline after the first online load.
