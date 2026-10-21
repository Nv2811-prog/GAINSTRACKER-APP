# PR finisher clips (Veo 3.1)

Five AI-generated cinematic takedowns for the PR celebration. A caped vigilante in a matte black armored
bat-suit beats one of five Gotham villains (Joker, Bane, Two-Face, Penguin, Scarecrow) on a rain-soaked rooftop or
alley, then stands over the defeated villain as a caped silhouette. Made 2026-10-21 with `scripts/gen-video.mjs`.
The hero and villains are *described* in the prompts, never named.

## Files

All clips: portrait 720x1280 (9:16), 6.00 s, 24 fps, H.264 High + AAC-LC stereo 44.1 kHz, faststart (moov before
mdat), so iPhone Safari plays them inline. Posters: 540x960 JPEG of the first-impact frame.

| villain | clip | MB | impact (s) | calm hold from (s) | poster (frame, KB) |
|---|---|---|---|---|---|
| Joker | `joker.mp4` | 2.74 | 1.4 | 4.0 | `joker.jpg` (1.5 s, 53) |
| Bane | `bane.mp4` | 2.74 | 1.3 | 4.2 | `bane.jpg` (1.4 s, 54) |
| Two-Face | `two-face.mp4` | 2.70 | 1.3 | 4.0 | `two-face.jpg` (1.4 s, 42) |
| Penguin | `penguin.mp4` | 2.73 | 1.3 | 4.0 | `penguin.jpg` (1.5 s, 52) |
| Scarecrow | `scarecrow.mp4` | 2.69 | 1.4 | 4.2 | `scarecrow.jpg` (1.5 s, 56) |

Total: 13.6 MB of video, 0.25 MB of posters.

```js
const PR_CLIPS = {            // impact = first contact (matches the audio hit, peak 1.38-1.46 s in every clip)
  joker:      { src: "assets/pr/joker.mp4",     poster: "assets/pr/joker.jpg",     duration: 6, impact: 1.4, calmFrom: 4.0 },
  bane:       { src: "assets/pr/bane.mp4",      poster: "assets/pr/bane.jpg",      duration: 6, impact: 1.3, calmFrom: 4.2 },
  "two-face": { src: "assets/pr/two-face.mp4",  poster: "assets/pr/two-face.jpg",  duration: 6, impact: 1.3, calmFrom: 4.0 },
  penguin:    { src: "assets/pr/penguin.mp4",   poster: "assets/pr/penguin.jpg",   duration: 6, impact: 1.3, calmFrom: 4.0 },
  scarecrow:  { src: "assets/pr/scarecrow.mp4", poster: "assets/pr/scarecrow.jpg", duration: 6, impact: 1.4, calmFrom: 4.2 },
};
```

## Every clip has the same beats

| time | what happens |
|---|---|
| 0.0 - impact | the camera sits behind the hero's shoulder; he lunges at the villain (about 1.3 s of approach) |
| impact (1.3 - 1.4) | one punch lands: flash, water burst, camera arcs around the hit; the villain is flung back |
| ~2.5 - 4.0 | the villain lands and stays down in frame; the camera settles behind the hero |
| calm hold (4.0 or 4.2 - 6.0) | the hero stands motionless, seen from behind, cape hanging, rain falling. Motion energy sits at the rain-and-grain floor from here on, including the last 1.0 s (5.0 - 6.0) |

- **Shorter cut:** start playback at `impact - 0.3` (about 1.0 s) and let it run to the end, about 5 s. Beats are measured, not guessed: impact from the visual flash cross-checked with the audio thump; calm-from from frame-to-frame motion energy.
- **Text:** the hero's head sits at about 16 - 23 % from the top and the cape hem at about 85 - 89 %, centered or slightly left. The top ~15 % (sky) and bottom ~10 % (wet ground) are free; light text also reads well over the near-black cape. Put a scrim behind it, the skyline behind the headline is bright.
- **Audio:** stereo AAC, rain bed, one deep bass hit at about 1.4 s, and (Joker, Penguin, Scarecrow) a low sub-150 Hz rumble under the hold; Bane and Two-Face hold on rain only. No dialogue was requested. Checked by waveform and spectrum only (no sustained speech-band energy), not listened to: listen once before shipping with sound on. Muted autoplay (`muted playsinline`) always works on iOS; unmuted needs a user gesture.
- **Offline cache:** do not precache all five (13.6 MB). Cache the posters (257 KB total) and fetch the rotated clip on first use.

## How they were made

**Model:** `veo-3.1-generate-preview` (Veo 3.1 standard, highest quality of the three Veo models the key can see; the
other two are `-fast-` and `-lite-`, all `predictLongRunning`). Image-to-video, 9:16, 6 s, 720p. Veo price, USD per
second of video, audio included, no free tier: standard 0.40 (720p and 1080p), 0.60 (4k); fast 0.10 / 0.12 / 0.30;
lite 0.05 / 0.08 (ai.google.dev/gemini-api/docs/pricing). 720p at 6 s was chosen over 1080p at 8 s: same price per
second, but 8 s costs a third more and the phone file has to be about 3 MB anyway.

**Shutdown notice:** Google's docs say the Veo 3.1 preview models shut down on **2026-10-22**, the day after these were
made. Recommended successors are Gemini Omni Flash (`gemini-omni-1.1-flash`, `generateContent`) or GA Veo 3.1 on the
Gemini Enterprise Agent Platform. `scripts/gen-video.mjs` only speaks `predictLongRunning` (`--model` swaps the id,
not the API), so it needs a small change before it can drive those.

**Keyframes:** `node scripts/gen-image.mjs "<prompt>" <png> gemini-3-pro-image` (Nano Banana Pro, 768x1376, true
9:16 straight from the prompt, $0.134 each). Not committed; frame 0 of each clip is the keyframe, because Veo starts
exactly from it. Shared blocks, then a villain slot:

```
STYLE: Vertical 9:16 portrait orientation (tall phone-screen frame, 1080x1920), full-bleed cinematic still. Photorealistic AAA video-game cutscene, Unreal Engine 5 cinematic quality, anamorphic lens, fine 35mm film grain, ultra-detailed skin, fabric, armor and wet materials. Night, heavy rain, wet reflective surfaces, volumetric fog. Warm gold rim light from behind and deep teal shadows.
HERO:  FOREGROUND, lower left: a caped vigilante seen from a low three-quarter rear angle, in a matte black armored bat-suit (layered armor plates, segmented chest armor with a bat emblem, a cowl with pointed ears, utility belt, gauntlets with fins), a long heavy wet cape billowing in the wind, knees bent in a coiled combat stance, fists clenched.
TAIL:  Both characters fully visible head to toe. Dramatic low camera angle, shallow depth of field, rain streaks catching the gold backlight. No blood, no gore, no text, no logos, no watermark, no captions.
```

Composed as `STYLE Setting: <setting>. HERO FACING HIM about <5 or 6> meters away, center-right: the villain, <villain>. TAIL`
(the Joker one is the same text with its setting folded into STYLE: "Night on a rain-soaked Gotham City rooftop with gothic stone gargoyles, a huge art-deco skyline glowing in the background, heavy rain, wet reflective puddles, volumetric fog").

| villain | setting | villain description |
|---|---|---|
| Joker | rain-soaked rooftop, gargoyles, art-deco skyline | a grinning clown-faced criminal with chalk-white greasepaint skin, wild slicked-back green hair, a wide painted red smile, a long purple tailcoat suit with an orange and green waistcoat, gloves, arms spread wide in a mocking pose |
| Bane | rain-soaked alley between towering gothic brick buildings, steam from street grates, rusted fire escapes, deep puddles, distant gold glow of the city | a hulking, enormously muscular masked brute almost twice the hero's width, in a worn dark leather and canvas tactical vest, bare massive arms with wrapped fists, a leather mask covering the lower face and skull with thick rubber tubes running from the mask over his shoulders to his back, heavy boots, planted menacingly with fists clenched |
| Two-Face (kept, keyframe 2) | rain-soaked gothic courthouse rooftop, huge weathered stone statue of Lady Justice holding scales, gargoyles, glowing skyline | a tall gaunt man in a sharply tailored split suit, the left half pure black and the right half pure white, wearing a black fedora hat tilted low that shadows his eyes, his weathered face turned three-quarters away and mostly hidden in shadow, the right half of his face severely scarred and burned (stylized, not gory) with a pale milky eye, flipping a large silver coin in one hand so it glints, standing calm and menacing |
| Penguin | rain-soaked dockside alley, wet cobblestones, crates, hanging lamps, dim neon with no legible text, harbor fog | a stout short mob boss in a black tuxedo with tails and a white shirt, a tall black top hat, a monocle over one eye, a long pointed pale nose, slicked black hair, holding a black umbrella like a weapon, smirking confidently |
| Scarecrow | rain-soaked rooftop shrouded in eerie sickly-green fear-gas mist drifting low, crows on gargoyles and antennas | a gaunt, very tall and thin figure in a stitched burlap sack mask with a crooked stitched mouth and dark hollow eyes, a rope noose around his neck, a tattered brown trench coat and ragged dark clothes with straw poking out of the sleeves, long thin gloved fingers, arms hanging loosely, head tilted unnaturally |

**Video prompt, template v3** (Joker, Two-Face, Penguin, Scarecrow). Slots: `{SETTING}` and `{AFTERMATH}`.

```
Cinematic AAA video-game cutscene, photoreal, Unreal Engine 5 quality, anamorphic lens, fine film grain. Starting exactly from the supplied frame: {SETTING} The camera stays behind the vigilante's shoulder for the whole shot.
0.0 to 1.2 seconds: the vigilante explodes forward in one fast, fluid lunge, his long black cape snapping behind him, the camera pushing in low behind his shoulder.
1.2 to 3.0 seconds: SLOW MOTION. He lands one decisive, powerful punch on the villain. Rain droplets hang in the air, a ring of water bursts off the wet stone, the cape surges forward, the camera pushes in and arcs around the impact. {AFTERMATH} The vigilante stays upright and in control; he never falls.
3.0 to 6.0 seconds: everything settles into calm real time. The camera rests behind the vigilante, looking over his shoulder: he stands tall and motionless, seen from behind as a dark caped silhouette against the glowing skyline, his long black cape hanging from his shoulders down to the ground and rippling in the wind; the defeated villain lies on the ground in the distance.
The cape stays attached to the suit and visible in every shot. Warm gold rim light, deep teal shadows, volumetric fog, heavy rain, shallow depth of field. Both characters and their costumes stay perfectly consistent throughout. No text, no subtitles, no logos. Audio: heavy rain, one deep bass impact thump, a low cinematic rumble; no dialogue, no voices.
```

| villain | `{SETTING}` | `{AFTERMATH}` |
|---|---|---|
| Joker | on a rain-soaked Gotham rooftop at night, the caped vigilante in the matte black armored bat-suit faces the grinning clown-faced villain in the purple suit, who taunts him with arms spread wide. | The villain is knocked off his feet and thrown backward, falling away across the rooftop, defeated. |
| Two-Face | on a rain-soaked Gotham courthouse rooftop at night beneath a huge stone statue of Lady Justice, the caped vigilante in the matte black armored bat-suit faces the man in the black fedora and the split black-and-white suit, who flips a silver coin. | The silver coin flies from his hand spinning through the rain, and the villain is knocked off his feet and thrown backward, defeated; his fedora stays on his head. |
| Penguin | in a rain-soaked Gotham dockside alley at night, the caped vigilante in the matte black armored bat-suit faces the stout mob boss in a tuxedo, top hat and monocle, who holds a black umbrella like a weapon. | His top hat and umbrella spin away through the air and he is knocked off his feet and tumbles backward onto the wet cobblestones, defeated. |
| Scarecrow | on a rain-soaked Gotham rooftop with low green fear-gas mist, the caped vigilante in the matte black armored bat-suit faces the gaunt figure in a stitched burlap sack mask and tattered brown trench coat. | The gaunt villain is knocked off his feet and thrown backward through the mist, landing flat on his back on the wet rooftop, defeated. |

**Template v2** (Bane only, its first take was kept). Same as v3 except: no "The camera stays behind..." sentence; the middle beat is
"1.2 to 3.8 seconds: ULTRA SLOW MOTION, like a high-speed camera." with no "stays upright" sentence; the last beat is "3.8 to 6.0 seconds: everything settles into calm real time. The camera glides back and rests on the vigilante standing tall and motionless as a dark silhouette against the glowing skyline, his long black cape hanging from his shoulders down his back and rippling in the wind; the defeated villain lies far behind him, open sky above."
Bane `{SETTING}`: "in a rain-soaked Gotham alley at night, the caped vigilante in the matte black armored bat-suit faces the hulking masked brute with tubes on his mask, who stands planted with clenched fists."
Bane `{AFTERMATH}`: "The huge brute is knocked off his feet and crashes backward onto the wet cobblestones, defeated."
Template v1 (rejected Joker take 1) had beats 0-1.5 / 1.5-4.0 / 4.0-6.0 and no cape or "never falls" clauses.

Request: `--aspect 9:16 --seconds 6 --resolution 720p --image <keyframe.png>`, negative prompt
`text, subtitles, captions, logos, watermark, blood, gore, cartoon, deformed face, extra limbs, melted face, missing cape`
(accepted by the API; whether it is honored is unknown). Image-to-video forces `personGeneration: allow_adult`.

**Re-encode:** Veo returned 3.9 - 4.6 MB per kept take (about 5 - 6 Mbps video). Each was re-encoded with a throwaway
AVFoundation script (not committed): H.264 High CABAC, 3.6 Mbps average, AAC 96 kbps stereo, 720x1280, 24 fps, faststart;
the source's colour tags (709 primaries, sRGB transfer, 601 matrix) are carried over unchanged. Compared with the
source at native resolution on the Joker clip: only slightly smoother micro-detail in the splash frames. `avconvert`
could not do this: `Preset1280x720` keeps 720x1280 but stays at about 4.5 MB, `PresetMediumQuality` drops to 320x568.

**Review:** every take was inspected in headless Chrome as contact sheets (0.1 - 0.5 s steps, extra detail around the
hit and the hold), plus audio onset and motion analysis.

## Generation log and cost

Cap was 2 video generations per villain; 9 were submitted (8 billed, 1 blocked before billing).

| # | villain | take | result |
|---|---|---|---|
| 1 | Joker | take 1 (v1) | rejected: the cape vanishes after the hit (back view from 2.4 s has none), villain only at the frame edge |
| 2 | Bane | take 1 (v2) | **kept** |
| 3 | Two-Face | take 1 (keyframe 1) | blocked by the safety filter: "can't create videos with real people's names or likenesses" (the keyframe face was too photographic); not billed |
| 4 | Penguin | take 1 (v2) | rejected: when the camera swings frontal (3 - 6 s) the cape is gone and the hero stands in a stiff action-figure pose |
| 5 | Scarecrow | take 1 (v2) | rejected: from 3 to 4.5 s a dark armored figure with the hero's gold belt lies face down in the gas, then the hero is standing again, so it reads as the hero falling |
| 6 | Two-Face | take 2 (keyframe 2, v3) | **kept** (new keyframe: fedora shadowing the eyes, heavy scarring) |
| 7 | Scarecrow | take 2 (v3) | **kept** |
| 8 | Joker | take 2 (v3) | **kept** |
| 9 | Penguin | take 2 (v3) | **kept** |

Not billed, not counted: one HTTP 429 (the 4th of 4 jobs launched within seconds, probably a concurrency limit, so keep
to 3 at a time) and one HTTP 402 ("prepayment credits are depleted") that cleared on retry about 10 minutes later. The
prepay balance may be close to zero, worth a look in AI Studio.

| item | count | unit | USD |
|---|---|---|---|
| Veo 3.1 standard, 720p, 6 s | 8 | $2.40 | 19.20 |
| keyframe stills (gemini-3-pro-image) | 6 | $0.134 | 0.80 |
| **total** | | | **20.00 (about 140 DKK at 7 DKK/USD)** |

Per villain, redo included: Joker $4.93 (35 DKK), Bane $2.53 (18 DKK), Two-Face $2.67 (19 DKK), Penguin $4.93 (35 DKK),
Scarecrow $4.93 (35 DKK).

## Re-making a clip

```
node scripts/gen-image.mjs "<keyframe prompt>" /tmp/kf.png gemini-3-pro-image
node scripts/gen-video.mjs "<video prompt>" /tmp/raw.mp4 --image /tmp/kf.png --aspect 9:16 --seconds 6
```

Generation is not deterministic, so the same prompt gives a different clip. If the script dies while polling, finish with
`--resume <operation name>` (printed right after submit; the video is kept about 2 days, billed once).
