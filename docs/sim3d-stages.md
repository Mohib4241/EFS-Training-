# 3D maintenance simulation: staged record

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
