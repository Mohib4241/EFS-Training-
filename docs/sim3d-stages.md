# 3D maintenance simulation: staged record

> **Current state (October 2026).** The 2D board, the 2D | 3D toggle and the bridge described below have been removed. The checklist is 3D only: tasks live in `src/sim3d/tasks/` (filter, bag, terminals) on a shared stage, interaction and demonstration framework; hand tracking runs in a Web Worker and tracked hands are shown first person. Browsers without WebGL2 get written steps (`src/maintenance-text.js`). The stages below are kept as the historical record.

Goal: a Jarvis-style 3D mode for the Maintenance Checklist, hands performing every step, with the existing 2D simulation left as it is. Built in six stages with a checkpoint after each.

## Discovery (stage 0)

- Checklist: `#checklist` in `src/index.html`. 2D simulation: `src/maintenance.js` (lazy chunk). Authored step data: `LESSONS` in `src/maintenance-lessons.js` (bag 11, hands 8, terminals 5, filter 16, wet-filter 16 frames; each has duration, reducer actions, full `from`/`to` states and a gesture hint). Reducers: `maintenance-state.js`, `filter-care.js`.
- Not present in this repository: 3D hands or a hand rig, hand-control input, GLB/KTX2/Draco assets, bloom or post-processing. The existing 3D (`viewer.js`, `hard-viewer.js`) is procedural Three.js with X-ray, callouts and emissive glow. `m-3mdt.onrender.com` could not be inspected from this environment (blocked), so nothing from it was reused.
- Three.js 0.186 already ships the GLTF, Meshopt, KTX2, EffectComposer, SMAA and bloom addons, so no dependency is needed.

## Decisions

- **One additive touch of the 2D module.** `mountMaintenance` accepts an optional `bridge` and, only if given, exposes its state objects, reducers, `LESSONS`, step lists and an `adopt()`. Without it nothing runs. This is the only change to `maintenance.js`, and it is the minimum that makes two-way state sharing possible.
- **The 3D chunk imports nothing the 2D chunk imports.** It receives reducers and `LESSONS` through the bridge, so the bundler cannot create a shared chunk on the 2D load path. A test asserts the 2D chunk still has no static imports.
- **Steps are the 2D checklist rows.** Authored frames are grouped into the row whose phase they start in (e.g. two clip frames under "Release both clips"). `buildSteps` throws if frames and rows ever disagree, and a test checks every task.
- **Step checkpoints come from the authored `from`/`to` states**, so jumping or rewinding in 3D is exact and cannot drift.
- **`sim3d` choreography blocks will live in a separate lazy module keyed by task and frame**, not inside `maintenance-lessons.js`, which would grow the 2D chunk. A coverage test will require a block for every frame.
- **Models are procedural**, merged per rigid part, rather than GLB with meshopt and KTX2, because no source models or authoring pipeline exist. The loaders can be added if models are supplied.

## Stage 1: toggle, lazy shell, shared state (done)

- Segmented 2D | 3D toggle in the checklist header; 2D is the default; the choice is remembered in `localStorage` (guarded).
- Falls back to 2D with a notice when WebGL2 is missing (probed before any 3D download), renderer creation fails, or the context is lost. Progress is kept.
- Teardown is one `dispose()`: listeners through an `AbortSignal`, GPU resources, observers, the render pump, the injected stylesheet, and `forceContextLoss()` on the renderer.
- Placeholder, to be replaced in stage 3: the "Mark step done" button and the "3D SIMULATION · SHELL" badge. The step list is already the real shared checklist (click a step to jump or rewind).
- Semantics to confirm: progress made in 3D reopens that task in 2D **Practice with progress kept**; rewinding in 3D rewinds the shared checklist.

### Measured (headless Chromium, software GL)

| | Before | After |
|---|---|---|
| 2D chunk, raw / gzip | 77,476 / 24,511 B | 77,770 / 24,647 B (+294 / +136) |
| 2D chunk static imports | none | none |
| App entry, raw / gzip | 44,944 / 14,301 B | 46,809 / 14,973 B (+1,865 / +672) |
| Stylesheet, gzip | 16,733 B | 16,850 B (+117) |
| 3D chunk | n/a | 6,841 B raw / 3,200 B gzip, plus the existing shared three.js chunk |
| Checklist page, 2D: bytes, requests | 77 KB, 8 | 77 KB, 8 |
| Checklist page, 2D: cold interactive (median of 15, 4× CPU, 1.6 Mbit/s) | 1053 ms (A/A control 1074) | 1114 ms |
| Checklist page, 2D: warm interactive | 58 ms (A/A 66) | 72 ms |

The cold difference is inside the measured noise (the same build differs from itself by about 21 ms at the median, interquartile range about 115 ms); the theoretical cost of the extra bytes is under 10 ms. It is not proof of zero change. The +672 B gzip on the entry applies to every page; moving the switch controller into a lazy chunk would remove it at the price of one small extra request on the checklist page.

### Verified

- 65 tests pass (7 new: step mapping for every task against the real `LESSONS`, state-chain integrity, checkpoint immutability, lifecycle, pump, and chunk isolation).
- 33 browser checks pass, including: 2D markup byte-identical to the previous build for all 16 task/mode/machine combinations; two-way sync in both directions and rewind; each fallback path; persistence across reload; machine switch; leaving the page; rapid toggling that cancels mid-load.
- 20 toggles: nodes 1360 to 1360, listeners 139 to 139, no console errors or warnings, no "too many WebGL contexts"; JS heap 3.80 to 4.18 MB, all of it in the first cycles (a 30-cycle run was flat to 0.01 MB per 10 cycles after warm-up).
- Not yet tested: Safari, Firefox, mid-range Android, a real GPU, Lighthouse (all planned for stage 6).

## Hand-controlled dust-bag change (3D, camera, two hands)

Requested after stage 1: in 3D the learner is asked for the camera, the machine stands in front of them in a real tiled room (no grid, no graph), both hands are tracked, they are asked to stand about 0.75 m from the camera, and the dust-bag change is first shown by hands and then done by the learner, the same nine steps as the 2D simulation. Scope is **dust-bag change on the Junior vacuum only** (Junior 103; Junior 429 shows the same geometry under its own label). The other tasks keep the 2D simulation.

### What the learner sees

1. **Preflight** over the live room: "Allow camera and use my hands", "Use mouse or touch", "Watch how first". It states the 0.75 m distance and that video stays on the device. Nothing (camera, model, WebAssembly) is requested before this choice.
2. **Watch how**: two rendered hands perform the nine steps while the camera dollies in on each step's area. Play, pause, previous/next step, a scrubber and 0.5x/1x/2x. The demonstration is a pure function of time (`sampleDemo(demo, t)`), so scrubbing is exact in both directions; it never touches the learner's progress.
3. **Practise**: the learner's own hands (or mouse/touch) do it. A pinch or closed hand carries a part; a fingertip resting on a latch or the tape presses it. Wrong moves are refused with a reason ("Not yet — first use the left clip."). "Do this step for me", Reset, full screen and a side-panel toggle are always available.
4. **Camera panel** with the mirrored preview, the detected skeleton and a distance meter (red / amber / green band around 0.75 m). The scene is a mirror: your right hand is on the screen's right.
5. Failure paths each end in the mouse: camera blocked, no camera, camera busy, model failed to load, WebGL2 missing, context lost. Stopping the camera, leaving the page or switching to 2D ends every camera track.

### How it is built

| Piece | Where | Notes |
|---|---|---|
| Orchestrator, HUD, controls | `src/maintenance3d.js`, `src/maintenance3d.hud` | Stage on the left, side column (camera, coach, checklist) and controls bar outside it, so no panel ever covers the scene or the hands |
| Room and machine | `src/sim3d/bag-scene.js`, `tiles.js`, `layout.js`, `parts.js` | Procedural PBR: lathe-turned tank and head, canvas-generated tile/brick/paper/label textures, one image-based light and one directional light, no shadow maps (contact blobs). Floor and wall are far larger than the stage so a tall phone view never sees the edge of the room |
| Camera per step | `FOCUS`, `cameraPose`, `focusFor`, `cameraAt` | A framing names the area a step is about; the camera glides between them (practice) or is a pure function of time (demo) |
| Hands | `hand-rig.js`, `hand-poses.js`, `hand-frame.js`, `hand-placement.js` | Skinned procedural hand (16 bones, mirrored left rig, short fading sleeve), five authored poses, landmark-to-rig retargeting that round-trips within 1.5 mm; drawn last with a fresh depth buffer so the machine never hides them |
| Hand tracking | `hand-tracking.js`, `tracking-math.js`, `oneeuro.js` | MediaPipe HandLandmarker (GPU delegate, CPU fallback), One Euro smoothing, pinch (thumb-index distance over palm length, Schmitt 0.34 / 0.60) and closed-hand detection, distance from palm size (palm 78 mm x 98 mm, 65 degree field of view, good band 0.62-0.90 m, target 0.75 m), per-hand handedness vote so one wrong frame cannot flip a hand |
| Interaction | `bag-interaction.js`, `bag-task.js` | Everything in screen space, so webcam depth noise never decides what you touch. Rules mirror the 2D board exactly and the shared 2D reducer decides every action. Releases and losses are judged by tracker results as well as time, so slow devices never act on one stale reading. A mouse click is latched so it cannot fall between two frames |
| Demonstration | `bag-demo.js` | Authored frames from `LESSONS.bag`, hands approach, act and leave; distance-parameterised splines, peak speed under 2 m/s |
| Quality governor, render-on-demand pump | `governor.js`, `pump.js` | Pixel ratio 1.75, 1.25, 1, 0.8 by rolling p95; frames only while something moves; hidden or off-screen stops |

### One new dependency, one asset

- `@mediapipe/tasks-vision` 1.2.0 (Apache-2.0): Three.js has no hand tracking, and writing a palm detector and landmark network is not realistic. It is loaded only when the learner allows the camera.
- `src/assets/models/hand_landmarker.task` (7.8 MB, Apache-2.0, Google): `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, sha256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- Both are served from this origin (content-hashed model, versioned WebAssembly folder). No CDN, no remote font or script. MediaPipe's built-in usage-logging upload (`odml.pa.googleapis.com`) is patched out at build time; the build fails loudly if the library's code ever changes under the patch, and a test checks the shipped chunk.
- Security headers (server and `render.yaml`, kept identical by a test): `script-src 'self' 'wasm-unsafe-eval'` (WebAssembly compilation only; scripts are not widened) and `Permissions-Policy: camera=(self), microphone=(), geolocation=()`.

### Weight (what loads when)

| Step | Download (brotli) |
|---|---|
| Any page, including the 2D checklist | unchanged: first load 58.5 KB gzip; the 2D maintenance chunk is byte-identical to stage 1 (77,770 B raw) and imports nothing |
| Opening 3D | `maintenance3d` chunk 25.9 KB (73.3 KB raw) plus the existing three.js chunk |
| Allowing the camera (once, then cached for a year) | `vision_bundle` 38.4 KB + WebAssembly loader 65.3 KB + WebAssembly 2,764 KB + model 5,245 KB = about 8.1 MB |

### Measured and verified (headless Chromium, software GL)

- **113 unit and delivery tests pass.** New ones cover pure task rules, hand retargeting, the demonstration timeline, screen-space interaction (grab, carry, press, drop, two-hand carry, debounce, dropouts), tracking maths, the governor, camera framing (every step's part and destination stays in view at five stage shapes) and the delivery rules above.
- **Per rendered frame:** at most 40 draw calls (budget 60) and 21,944 triangles (budget 150,000), with hands in view.
- **Mouse end-to-end (30 checks):** preflight, camera and model not requested before consent, demonstration plays and scrubs, previous/next and speed, a short plug pull is refused, all nine steps completed by dragging and clicking, each wrong move refused with a reason, 2D adopts the finished state and 3D reopens as complete, Reset, "Do this step for me", panel toggle, no external requests, no console problems.
- **Fake-camera end-to-end (17 checks), through the real MediaPipe model:** computer-generated hand frames (made with the project's own hand rig) are fed through the page's own `getUserMedia`. Verified: blocked and no-camera messages, camera and model loaded only after consent and from this origin, one hand detected with a distance of 0.78 m for a hand rendered at 0.75 m, two hands detected, the skeleton drawn in the preview, a pinch on the plug followed by a pull and an open hand unplugs the machine (step 2), Stop camera and switching to 2D end every track, no CSP violation, no console problem. MediaPipe prints a few C++ log warnings to the console (`W... gl_context.cc`); they are filtered in the test and are the library's, not the app's.
- **20 toggles:** live DOM nodes 663 to 663, heap +1.3 MB (6.5 to 7.8 MB), no canvas left behind, no console problems.
- **Phone (390 px):** no horizontal scroll, touch-sized controls; the preflight and demo were reviewed in screenshots.

### Things found by testing, now fixed

- Side panels covered the scene and the hands: moved beside the stage.
- The machine was small: per-step camera framing (the machine is about 60% of the stage height in close steps).
- The demonstration crawled on slow frames and clicks could fall between frames: the demo and interaction timers use the wall clock (capped at 250 ms), the mouse press is latched.
- Hands vanished behind the machine: drawn last with a fresh depth buffer.
- A tracked pinch that flickers for one reading dropped the part, and on a slow device every reading looked like a new hand: releases and losses now need several results, and "new hand" means absent from the previous result.
- Pinch was normalised by palm width, which collapses when the hand is side-on (how people pinch): now palm length.

### Not verified, and why it matters

- **A real webcam and real hands.** The model was only shown computer-generated hands. Its handedness call was unreliable on them (palm-on views flipped), which is why a per-hand vote smooths it; with real hands it should be better, but this is untested. Pinch thresholds (0.34 on, 0.60 off) are reasoned, not calibrated on people.
- **Distance is an estimate** from palm size, 65 degrees assumed for the camera's field of view (most laptop webcams are 60-75), so "0.75 m" is "about 0.75 m", and real palms vary by about 10%.
- **Speed on real hardware.** Software GL cannot show frame times. In this sandbox the model returned a result about every 1.8 seconds while the scene rendered on the same CPU, which is why the interaction is result-based. On a normal laptop expect 30 results per second with the GPU delegate.
- Not run: Safari, Firefox, Android, a real GPU, Lighthouse, screen readers on the 3D view (the checklist and controls are real buttons with names, and the whole task is also doable with the mouse or the "Do this step for me" button).
- `m-3mdt.onrender.com` was not reachable from this environment, so "the same effect" is implemented from the request, not from the reference.
