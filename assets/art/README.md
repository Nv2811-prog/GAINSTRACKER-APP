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

## Art set 2 - feature tiles + sheet headers

Eleven square feature tiles and two sheet headers in the same film-still language as the tab heroes above: deep
navy/teal shadow, warm gold light, one subject, dark negative space, no text, no logos, no faces. The point is to make
each feature easy to spot at a glance (Apple-style tile) and to carry the hero look into sheets. 19 drafts for these
thirteen; total about 313 KB (tiles 220 KB, headers 93 KB).

### Tiles - `tile-<name>.jpg`, 360x360 JPEG (14-33 KB each)

Shown **small (about 110 px, so 360 is the 3x asset) with a subtle dark vignette**: clear in the centre, about 45% black
at the edge, so a label or icon on top stays readable and the tile sits in the dark UI. The subject is centred and the
corners are expendable, so a rounded-corner clip is safe. Use `center / cover`, no left/bottom gradient on tiles.

```css
.tile {
  background:
    radial-gradient(circle at 50% 50%, rgba(11,13,18,0) 55%, rgba(11,13,18,.45) 100%),
    url(assets/art/tile-lab.jpg) center / cover no-repeat;
  border-radius: 22%;
}
```

| File | Feature | Scene |
|---|---|---|
| `tile-split-new.jpg` | New split | Blank cream dossier folder open on a dark desk, gold pen across the pages, one pool of warm light |
| `tile-split-import.jpg` | Import a split | Slim matte-black data drive with a glowing gold edge and port on dark brushed metal, city bokeh behind |
| `tile-plan-edit.jpg` | Edit plan | Tactical case board in 3/4 view: blank cards on gold-headed pins joined by bold gold twine, warm light raking across |
| `tile-generator.jpg` | Split generator | Black console projecting a floating gold holographic lattice above a glass panel |
| `tile-lab.jpg` | Lab | Three glass vials of glowing gold liquid on a black lab bench, teal bokeh behind |
| `tile-history.jpg` | History | Worn leather logbook with a gold ribbon under a brass desk lamp, pool of warm light on the desk |
| `tile-records.jpg` | Records | Gold laurel medallion on a black stone pedestal, rim lit, a thin gold shaft from above (tightest crop of the set) |
| `tile-standards.jpg` | Strength standards | Five-tier stepped stack of black steel plates, thin gold edge light, Gotham skyline and light beams behind |
| `tile-infirmary.jpg` | Infirmary | Dark medical bay, round surgical lamp flooding a steel exam bed with soft blue light (the one cool-blue tile) |
| `tile-chat.jpg` | Chat | Matte-black tactical earpiece with a glowing gold status ring on carbon fibre, light shafts and bokeh behind |
| `tile-duel.jpg` | Duel | Two wrapped fists bumping under a single spotlight with dust in the beam, dark arena, forearms only |

### Headers - `head-<name>.jpg`, 720x480 (3:2) JPEG (36-56 KB)

Same recipe as the hero files above: **right-aligned behind the sheet header, darkened by the left + bottom gradient**
(`right center / cover`). The subject sits in the right ~45% of the frame and the left ~45% is dark and empty, so the
sheet title goes on the left.

| File | Sheet | Scene |
|---|---|---|
| `head-exercise.jpg` | Exercise detail | Plate-loaded chest-press machine alone in a dark training cave, gold light pouring in from the cave mouth and rim lighting the frame and plates, floor mist |
| `head-muscle.jpg` | Muscle detail | Headless classical marble torso fragment (cut just below the navel, no face) in low light with a warm gold key from the upper right |

### Provenance (set 2)

Same pipeline as above (`scripts/gen-image.mjs`, gemini-2.5-flash-image, about $0.04 per draft, 1024x1024 output). Tiles
were cropped to a hand-chosen square and exported with `sips -s format jpeg -s formatOptions 72 -Z 360`; headers were
cropped to a hand-chosen 1024x683 window, resized to 720x480 and exported at quality 72. 13 first-pass drafts plus 6
redos (standards, exercise header, infirmary, split-new, plan-edit, muscle header) = 19 generations.
