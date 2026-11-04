# Look and controls

Objective: give every 3D equipment page one premium "studio product" look, a switchable holographic look and one set of engineering-style controls, without adding any game, score, timer or race. This is a teaching tool; the geometry and the explanations are unchanged (Fidelity A, conceptual).

Branch: `look-and-controls`. Nothing here is deployed; Render deploys `main`, which this work does not touch.

## What changed

| Area | Change |
|---|---|
| Renderer | One shared rig (`src/look/rig.js`) replaces three separate renderer set-ups: antialias, ACES filmic tone mapping (exposure 1.0), sRGB output, pixel ratio capped at 1.75, image-based light (RoomEnvironment through PMREM), one soft key light with shadows, a hemisphere fill and `FogExp2` matched to the stage colour. |
| Shadows | `PCFShadowMap`. In three 0.186 the separate "soft" mode was removed (it logs a warning) and `PCFShadowMap` is the filtered, soft PCF. |
| Floor | The vacuum's tiled floor patch is an oval (it was a rectangle) and the wall plate behind the plug has rounded corners. A shadow-catching floor that follows the lowest part, so a sealed machine rests on it and opened parts float above it, plus a contact shadow that fades and widens as parts lift apart. |
| Finishes | Lacquered plastic, smoked glass, rubber and brushed steel as `MeshPhysicalMaterial` (`finish()` in the rig), applied to the existing procedural parts without rebuilding any model. Each machine has its own lacquer (the labs use their module colour; the two vacuums have their own). Colours that carry meaning (the orange cable and switch, the amber fault marker) are kept. |
| Motion | Parts move on springs with weight (heavier layers settle slower and overshoot slightly) and camera moves use the exact response of a damped spring. Reduced-motion users get static states, as before. |
| Look | `data-look` on `<html>`, always `studio`: there is **no look switch** (the Hologram button and the word Studio are gone from the parts panel, the phone tabs and the maintenance toolbar) and an old saved choice is forgotten. Studio: a white stage and page (the gradient in the first brief was replaced by white on request), frosted glass panels, accent `#0a8f9c`. The Hologram look (dark HUD, grid floor, UnrealBloom) is still in the rig and the stylesheet but nothing can reach it; it can be removed later without touching anything else. |
| Typography | Chakra Petch (wordmark, big numbers), IBM Plex Sans Condensed (body, labels), IBM Plex Mono (codes, units, keycaps): latin-subset woff2 files from the fontsource packages, hashed by the build and served from `/static/fonts/`. No Google Fonts request. |
| Layout | **Pages open collapsed**: only the machine, "Start the machine", the Machine Guide and Page Guide, and one "Parts & controls" button are visible. That button (or `F`) opens the rest. Expanded, equipment pages are a full-bleed canvas with floating glass panels: parts panel on the left, small part notes on the right, hint card at the top centre and a control dock along the bottom that folds away to one small button ("Hide controls" / "Show controls", remembered). At 768 px and below the parts panel becomes a bottom sheet, the notes sit just above the controls and the dock scrolls sideways. |
| Maintenance practice | The 3D stage takes the look's lighting and colour tokens (`stage.js`), and its HUD follows the look. |

## Defaults

- The default look is Studio on a white background.
- The voice guide is on in English by default (`soundPreference` in `guidance.js`; turning it off is remembered). Browsers refuse speech until the page has had a click or key press; the guide then says "Click or press a key once and the voice will start" and carries on without it.
- Layout and timing: sizes are measured a few times a second instead of every frame, and the fault lists are built once per machine.

## Controls

All nine equipment pages (Junior 103, Junior 429, HYPER 2000B and the six Hard Services labs) use the same module. Each page gives it an adapter; nothing is copied per page.

- **Staged teardown.** One slider with four named stops: Assembled (0), Head open (35), Inside (70), Exploded (100). The percentage and stage name are shown large. Every part has a layer 0-3 (`src/look/layers.js`): 0 shell and covers, 1 tanks, filters and sensors, 2 deep internals, 3 base-level and innermost parts. The layers separate in waves as the slider moves. The existing interlocks are unchanged: opening a powered machine isolates it first (the reducers in `machine-state.js`, `hard-models.js` and `scrubber-state.js`).
- **Layer dock.** Show inside (the old X-ray shell: the shell turns see-through), Callouts (leader lines, spread so names never overlap), Flow path (air on the vacuums, water on the scrubber, conceptual flow on the labs), Guides (dashed lines from each part to its resting place), Glow (highlight glow and bloom), Orbit, Focus view (the collapsed layout: hides the panels, the hint, the dock and the name tags), zoom out, zoom in, reset. They reuse and unify the existing `xray`, `callouts`/`labels` and `autoRotate` state; the Machine Guide toolbar and the dock stay in step through `setAutoRotate` and `setFocused` on the guidance module.
- **Parts panel.** The list as it was before the redesign: "Parts" with a count, "Whole machine", then every part under its own group heading with its number (parts that sit inside the shell carry a small "inside" tag). The category chips, colour dots and layer tags are gone. Selecting a part reveals it if it is hidden inside and flies the camera to it.
- **Part notes.** Choosing a part (in the list, on the model, with `[` `]` or by hand) floats a small note on the right: its group, name, what it is, what it does and a one-line safety reminder, cut from the existing content to a sentence or two (`brief` in `src/look/info.js`). Each note **removes itself after ten seconds** (a thin bar runs down), up to three stack with the newest first, choosing the same part again starts its ten seconds afresh, and resting the pointer or keyboard focus on a note pauses its clock. `×` closes one at once and `Esc` clears them. Whole machine gets a note too. All text comes from the existing content files; no numbers are invented.
- **Starting a machine shows the flow, from the outside.** Pressing "Start the machine" (or the lab's run button) shows the flow path and the moving parts but **keeps the shell closed**: the outside is the default while running, on every machine. A "Show inside" button (beside "Parts & controls" in the collapsed view while it runs, and in the dock) turns the shell see-through when the learner asks; stopping puts the flow path back as it was (`runView` in `motion.js`). Selecting a part that sits inside, or the fault finder or a checklist step that points inside, still reveals it, because the learner asked to see it. Only the HYPER 2000B also travels, in a zigzag floor pass while it runs (`zigzagPose`); reduced-motion users get no travel.
- **Hard Services maintenance checklists.** Every Hard Services machine has three checklists (`src/hard-checklists.js`; the first is the original inspection), each in the Soft Services style: watch the lesson, isolate the virtual machine, identify three areas in order, then report the concern the last one shows. They are visual and qualitative: no measured limits, torques or intervals, and nothing that tells the learner to work on real equipment (tested). A chooser at the top of the maintenance view switches checklist (progress is kept per checklist), the Hard Services Maintenance page lists all three for each machine, and `#equipment/<id>/maintenance/<n>` opens one directly. Parts hidden inside the shell are shown by turning the shell see-through while that area is the target, and the amber concern marker follows the checklist's last part. The fault finder lists every checklist's areas. The Megger's Start panel carries its "item isolated and proved dead" interlock so the test can be started from there.
- **Keyboard.** `[` and `]` step through the parts, `F` toggles Focus view, `R` resets, the left and right arrows orbit, up and down open and close, `Esc` deselects and clears the notes. They work when focus is in the stage, or when nothing is focused and the stage is on screen, so the arrow keys still scroll the page when you read below it.
- **Fault finder.** A dropdown of qualitative conditions per machine, built from content that already exists: clear air path, hose restriction and loaded filter (`airflowLesson`) for the vacuums, and the inspection findings in `src/hard-content.js` and `src/soft-content.js` for the other machines. Picking one highlights the related parts with a pulsing glow, shows a banner with the cause and what to check with power isolated, and marks the parts in the list. No error codes, pressures or other numbers.

## Hand control

The Hand control button opens a panel; **the camera is asked for only when the learner presses Start camera**, and nothing is uploaded or recorded (the model runs on the device, and the Content-Security-Policy allows only this site). Starting switches to Focus view; stopping restores the previous layout.

The tracker is the one the maintenance practice already uses (`src/sim3d/hand-tracking.js` and its worker); `hand.js` adds the gestures and the drawing. In mirror view:

| Gesture | Action |
|---|---|
| Two open hands apart or together | Open or close the machine (a tether line with a live "% open" label joins the palms) |
| Thumb-index pinch and drag | Orbit |
| A quick pinch | Click: select a part, press a button, set the slider |
| A fist, then an open hand | Open fully |
| An open hand, then a fist | Close |
| A sideways palm flick | Next machine (right to left) or the previous one (left to right) |

**Only your hands are shown.** The camera picture is never drawn (there is no video backdrop); the hands appear as glowing joints and bones in the 3D scene with real depth, a pulsing orb on pinch and a beam from the wrist to the part being pointed at. Once the camera is on, the hand card shrinks to its status line and the stop button, so the stage holds just the machine and your hands.

**Smooth movement.** The tracker delivers a new reading a few dozen times a second and not at an even pace, so readings only set where each joint is heading and every drawn frame moves a fraction of the way there (`FOLLOW`, about 45 ms; a frame-rate independent exponential follow, tested). Joints are kept as a screen position plus depth and placed with the camera of the moment, so the hands stay put on the screen while the model orbits. A hand stays drawn for 160 ms after its last reading, so one empty reading cannot flicker it. Orbit steps go into a glide (`createGlide`, 60 ms) that the viewer spends at the start of each frame, before the camera is aimed, so a pinch-drag turns the model evenly instead of in bursts; the "% open" label is only rewritten when its text or place changes. The gesture recogniser (`gestures.js`) is pure and tested.

## Performance and lifetime

- Rendering stops when the tab or the canvas is hidden (unchanged) and the hand overlay only keeps frames coming while hands are visible.
- Leaving a page disposes its geometry, textures, materials, the bloom composer and the renderer (`destroy()` on the viewers; the labs call `release()`); coming back rebuilds them.
- If frames run slow (a rolling mean over 28 ms while animating), the rig drops bloom first, then shadows, then lowers the pixel ratio, and does not bring them back during the visit (`createQuality`, tested).
- The first load is 66 KB gzip (budget 90 KB). The look rig, the controls, bloom, hand control and the tracker are separate lazy chunks; only the look state (`look.js`) and the small pure tables are eager.

## What was tested

- `npm run check`, `npm test` and `npm run build` pass: **137 of 137 tests** (the 51 earlier ones plus 86 new or extended) and a full-quality production build. The first load is **66.1 KB gzip** (budget 90 KB).
- New tests: springs, waves, layers and categories of all nine machines, fault conditions, the quality ladder and camera easing (`tests/look.test.mjs`); the gesture recogniser and the hand drawing, which must glide, hold through one empty reading and stay on screen while the camera orbits (`tests/look-hands.test.mjs`); and in `tests/delivery.test.mjs` that the look rig, controls, bloom, hand control and the tracker stay lazy, that the seven fonts are self-hosted, latin-subset and hashed and the stylesheet loads nothing from another origin, and that `.woff2` is served as `font/woff2` with immutable caching. No existing assertion was weakened. The assertion that named the maintenance practice as the only importer of the tracker now names the shared lazy tracker chunk instead, because hand control uses it too, and it still checks that exactly one chunk knows the worker's location and that no page load fetches it.
- In a browser at 1280x800 and 390x844: all nine equipment pages open collapsed and the expand button and `F` open the controls; the parts list shows its group headings and numbers with no look switch, chips or Hologram button anywhere; choosing parts floats up to three notes on the right (on a phone, just above the controls) and they were gone after ten seconds; the bottom dock folds to "Show controls" and back on all nine pages; starting the Junior 103 and the HYPER 2000B leaves the shell closed with the flow path on, shows "Show inside" in the collapsed view, and pressing it turns the shell see-through; no console errors in a sweep of all nine pages. Earlier rounds: the slider and four stops, hidden parts opening the model, the fault finder, the maintenance practice, the "Cleaning on tiles" pass (40 of 40 markers) and leaving and returning to a page (the renderer is rebuilt without errors).
- The ten-second removal was timed in a browser pane whose animation frames are throttled; the timer is a plain `setTimeout`, so it is not affected, but the sliding-in motion could not be judged for smoothness there.
- Hand control was driven with synthetic landmark frames in the browser: two-hand spread (with the "% open" tether label), a quick pinch pressing a dock button, pinch-and-drag orbit, fist-then-open and open-then-fist, and a palm flick that moved the session across the vacuum, scrubber and lab pages.

## Known limits

- **Hand control has not been tried with a live webcam and a real hand in this environment.** The gesture engine is unit-tested with synthetic hands and the whole path (gestures, overlay, tether label, clicks, flick navigation) was exercised in the browser with synthetic frames, but thresholds such as the spread gain, click timing and flick speed are reasoned values that may need tuning on real hands. The landmark depth direction used for the 3D hands is assumed from the model's documentation.
- No frame-rate benchmark on a mid-range phone was run; the quality ladder exists to protect those devices but is not measured on one.
- The Hologram look and its bloom are unreachable (no switch); the code is kept in the rig and stylesheet and can be deleted separately.
- `PCFShadowMap` is used for shadows because three 0.186 removed the separate soft mode.
- The detail sheet's "source and fidelity" line is the existing evidence note for the vacuums and a fidelity line built from each module's reference and first source for the labs; per-part sources do not exist in the content, so none were invented.
- Machine Guide and Page Guide wording was adjusted for the collapsed start, and the guided tour opens the controls for its zoom steps and collapses them again when it ends.
