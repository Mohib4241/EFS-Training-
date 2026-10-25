# EFS guide reconstruction

The shared `Worker` and `Head` provide the guide in all 16 vacuum SOP chapters and the existing
instructions/lab screens. The geometry, eyelids, eye tracking, jaw, brows, PPE and hands remain animated
in Three.js. This is an approximation made from the supplied video references, not an extracted or
original rigged character asset. The supplied video is not used for SOP playback.

## Visual work

- Sculpted nose bridge, tip, cheeks, eye sockets, jaw and chin in a continuous surface.
- Curved eye surfaces and closing eyelids; the pupil stays behind the lids during blinking.
- Generated skin detail fitted onto the front of the real geometry and blended into side/back skin.
  Painted eyes/lips are excluded; independent eyes and lips respond to gaze and speech.
- Brow and jaw morphs, fitted EFS cap, shorter visible neck, higher-resolution shirt and arms.
- Millimetre-scale cloth bump, warm lesson lighting, camera-focused shadows, and contact occlusion
  at High graphics quality. Automatic graphics quality remains active on slower devices.

## Generated material

Asset: `src/media/guide-face-albedo.png` (1254 × 1254 RGB PNG).

Generated with the built-in ImageGen tool. Reference: a frame at 0.7 seconds from the supplied
`gemini_generated_video_65dfabcc.mp4`.

Final generation prompt:

> Use case: stylized-concept. Asset type: frontal facial diffuse/albedo texture for a real-time rigged 3D character reconstruction, NOT a portrait scene or a website mockup. Reference image: the supplied EFS uniform presenter; preserve this same young adult man's likeness, facial proportions, warm peach skin, blond/light brown hairline, full brown eyebrows, blue-green eyes and friendly understated expression. Create one square 1024x1024 texture: strictly front-facing orthographic face, symmetrical, no tilt, closed relaxed lips, eyes looking straight ahead. Face fills the texture; forehead at top edge, chin at bottom edge, cheek/temple skin extends to left/right edges. Important placement: eye centres at (30%,40%) and (70%,40%); eyebrows about y=26%; tip of nose at (50%,59%); mouth centre at (50%,78%); chin bottom at y=98%. The texture background is continuous warm skin colour extending across the ENTIRE square, no white margin, no outline, no external silhouette, no ears, no hair, no neck, no clothes, no cap, no logo, no text. Film-quality stylized skin detail: subtle pores and peach fuzz, warm cheeks, delicate eyelid creases, soft lip texture. Flat diffuse albedo illumination, remove directional lighting and cast shadows, no specular highlights and no ambient occlusion baked in. This will be mapped onto an already sculpted head with separate animated eyes and mouth, so keep surface tone smooth and clean. Keep the character appealing and recognisably based on the reference.

The actual generated feature positions were measured and the material projection calibrated to them.

## Checks

`npm test` checks the complete 16-step sequence, language-independent actions, deterministic chapter
jumps, hand contact, PPE order, blinks, speech closure, and finite eye geometry. `npm run build`
generates the higher-detail compressed body. Browser reviews inspect front, three-quarter, profile,
full-body and chapter views; they supplement automated checks rather than claiming an exact visual match.
