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

## Art set 3 - Suit hero + Fuel tile

The Suit tab hero was only the faint carbon-plate band (`suit.jpg`, the most subtle still of set 1, left in place
untouched). `suit-hero.jpg` is the real cinematic replacement in the same film-still language as the other tab heroes,
and `tile-fuel.jpg` is the feature tile for Fuel (the Suit dock). No text, no logos, no faces. 6 generations; total about
57 KB (hero 33 KB, tile 24 KB).

### Hero - `suit-hero.jpg`, 720x480 (3:2) JPEG (33 KB)

| File | Surface | Scene |
|---|---|---|
| `suit-hero.jpg` | Suit tab hero (suit + grey anatomy figure + legend) | Matte black armoured bat-suit seen from behind (cowl and cape, no face) on a headless mannequin stand inside a tall glass display case, on a polished obsidian floor in a dark cave vault; one volumetric warm-gold spotlight falls from the top edge and rim-lights the cowl, shoulder plates and gauntlet fins, gold reflections run down the glass, low gold-lit mist at the base |

Composition: the glass case spans about x 51-83% and y 11-91% of the frame (the suit itself x 59-76%), the gold shaft
enters from the top edge over x 53-81%, and the left ~50% is empty black cave, so the grey figure and the legend sit on
the left and centre. Palette: deep navy/teal black, one warm gold light.

**Use a lighter veil than the standard recipe above.** This still is low-key by design, so the standard left gradient
(fully clear only at 85%) swallows the left half of the case. Tested in headless Chrome with a grey figure + legend on
top: this veil keeps the legend legible and lets the suit, the shaft and the floor mist glow:

```css
background:
  linear-gradient(90deg, #0b0d12 12%, rgba(11,13,18,.5) 40%, rgba(11,13,18,0) 60%),
  linear-gradient(0deg,  #0b0d12 0%,  rgba(11,13,18,0) 28%),
  url(assets/art/suit-hero.jpg) right center / cover no-repeat;
```

Keep `right center`. In a box taller than 3:2, `cover` scales by height and crops the left side, which moves the case
toward the middle (a 1:1 box shows only the right 67% of the frame, so the case lands at about x 27-75%); the cropped
part is only dark void. On a very wide, short banner (wider than about 1.8:1) `cover` starts clipping the case base.

### Tile - `tile-fuel.jpg`, 360x360 JPEG (24 KB)

Same rules as the set-2 tiles: shown about 110 px with the subtle dark vignette, `center / cover`, no left/bottom
gradient, a rounded-corner clip is safe.

| File | Feature | Scene |
|---|---|---|
| `tile-fuel.jpg` | Fuel | Premium athlete meal prep: fanned seared steak, a mound of white rice and steamed greens in a dark matte rounded-square bowl on a dark slate counter, one warm gold key light from the upper left and a wisp of steam |

The bowl is centred and spans about 80% of the width, the corners are dark and expendable, and it holds up at 110 px
beside `tile-lab` and `tile-history` (checked with the vignette, an icon chip and a label on top).

### Provenance (set 3)

Same pipeline as above (`scripts/gen-image.mjs`, gemini-2.5-flash-image, about $0.04 per draft, 1024x1024 output).
6 generations: 4 for the hero, 2 for the tile.

- Hero: draft A (case too tall for a 3:2 window), B (clean and matte but dim, with a lamp fixture in frame), C (a nice
  beam, but the suit turned bronze and two gold slivers floated inside the glass), D picked. Cropped to a hand-chosen
  1024x683 window starting at row 270 of the 1024x1024 draft (keeps the beam in and leaves floor under the base),
  resized to 720x480 and exported at quality 72 (`sips -c 683 1024 --cropOffset 270 0`, `sips -z 480 720`,
  `sips -s format jpeg -s formatOptions 72`).
- Tile: draft A (bowl seen edge-on, the food hidden behind the rim), B picked; cropped to a 1000x1000 window at
  (12, 12), resized to 360x360 and exported at quality 72.
