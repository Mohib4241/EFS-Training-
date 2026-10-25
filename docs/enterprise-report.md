# EFS Academy implementation and validation report

Audit started 25 October; validation completed 26 October 2026 (Asia/Dubai).

## Architecture and implementation

Preserved vanilla JavaScript, Three.js, esbuild, procedural equipment, the skinned character, generator-driven Director, Web Speech narration and local practice records. No runtime dependencies or backend were added. React/R3F, TypeScript and a new state framework would add migration cost without addressing the observed problems.

The shell and content screens now start independently of WebGL. The renderer, shared materials, meshopt body and lesson/lab modules load on demand through hashed ESM chunks. Cached aliases reuse their canonical laboratory instances. Route tokens prevent a late asynchronous screen from replacing a newer navigation. Asset errors offer retry, the complete text library and original PDFs. Content routes and hidden tabs do not run the 3D animation loop.

The Stage remains shared for the lifetime of the application. Screens are deliberately cached; revisiting a module does not rebuild its model. World resets dispose owned geometry, materials, textures, skeleton textures and instanced resources, preserving shared body geometry and nested clothing materials. A traced leak in Head._cheeks was fixed: the shared cheek material now reuses its texture rather than orphaning one texture on each character reconstruction.

## Visual and interaction changes

- Neutral off-white/gray workspace, existing EFS green with restrained lime accents, readable typography, standardized spacing, six-pixel panel corners, clear focus and status treatments. Existing reusable base styles remain; enterprise.css owns the active workspace tokens and responsive presentation.
- Desktop SOP: persistent procedure sequence, unobstructed center viewport, source-linked instruction panel, transcript and bottom controls. Mobile: 320-pixel viewport followed by readable guidance and a scrollable sequence, with sticky transport controls.
- Labs: task demonstrations in a separate column; component controls below the equipment; practical decisions in the right panel. Mobile stacks these regions without horizontal overflow. Anatomy, demonstrations and assessed decisions remain separate.
- Removed bloom, GTAO and their full-screen render targets. Neutral light colors, reduced shadow intensity, satin plastic, rougher floor/metal finishes, and a neutral base replace teal rim lighting and the luminous platform ring. Equipment selection uses a restrained tint/opacity treatment. Wireframe inspection remains available without the holographic color treatment.
- Automatic perspective framing fits the operator and equipment in the actual viewport. Zoom is bounded; mouse/touch pan and rotate remain available. Keyboard arrows rotate, +/- zoom and Home resets the lab camera. Reset returns toward the assembled state. Selected parts show their identity, function and scenario safety context.
- Retained and tested the earlier uncommitted red canister vacuum geometry and its corrected bag-contact anchors. These are an illustrative reconstruction, not manufacturer CAD. Removed unsupported C16/18V labels; PAT stickers say DEMO rather than claiming a real inspection result.
- Reduced motion disables hero autoplay and camera easing. The introduction has a pause control and stops on leaving home. A skip link, main landmark, route focus, accessible names and persistent written instructions support keyboard and sound-off use.

## SOP content and assessment

The vacuum viewer reuses the supplied 16-step dataset and all existing choreography. It adds a live transcript from the same narration beats in English/Hindi/Nepali, English source actions, provenance and source-page links, overview, prerequisites, tools and safety context. Supplementary brief-derived instructions are explicitly labeled as general education rather than BU3 text.

Sixteen contextual knowledge checks cover the existing procedure: work-area preparation, document selection, cuts/dressings, assessed PPE, bag handling, pests, damage, debris, brush selection, connection, edge/corner cleaning, traffic lanes, final checks, warning signs, hand hygiene and secure storage. Incorrect choices explain the source-derived action and do not earn a check. Correct checks persist separately under efs-sop-review-v1. Watching animations and clicking Next do not award knowledge or competence. Lab decision/scoring rules and existing progress keys are preserved. Storage-write failures now report session-only progress.

The original PDFs identify BICSc BU3 / BICSc_EDU_D022, version 3.0, October 2020. No current EFS/site approval or effective date was supplied. The documented two-thirds versus above-70% bag threshold conflict remains visible. The PPE dataset now follows the source's risk-assessment requirement; depicted gloves and glasses are examples.

Hard-services modules remain draft educational scenarios. Review of their existing references included [HSE work near electricity](https://www.hse.gov.uk/electricity/nearelectric.htm), [HSE electrical FAQs](https://www.hse.gov.uk/electricity/faq.htm) and [Trane chiller plant controls](https://www.trane.com/commercial/north-america/us/en/products-systems/smart-building-technology/building-controls-solutions/tracer-sc-plus/chiller-plant-control.html). These public references do not establish approved EFS procedures. Do not infer manufacturer ratings, isolation authority, permits, staging setpoints or certification from the diagrams. Native-speaker review of Hindi/Nepali narration and competent engineering/safety review of site content remain required.

## Measured performance

Initial page text (HTML plus its static JavaScript dependency graph, excluding unchanged fonts/media) fell from 1,168,332 bytes to 176,679 bytes (84.9% smaller). The new HTML is 78,043 bytes and initial JavaScript is 98,636 bytes. Total JavaScript across all deferred chunks is 1,077,434 bytes, versus 1,111,741 inline JavaScript bytes before. Gzip estimates for initial text are 308,629 bytes before / 49,499 bytes after; actual HTTP compression depends on hosting. See performance-results.json for raw samples and bundle measurements. Same headless Chromium/ANGLE SwiftShader implementation, high graphics mode, fixed 800 × 600 drawing buffer, no real camera or audible speech. Frame cadence used 18 requestAnimationFrame intervals per module after warm-up. It is a short software-renderer test, not a representative desktop/mobile benchmark or a p75 field metric. Render submission durations are kept separate from actual frame cadence; their reciprocal is not reported as FPS.

| View | Before draw calls | After draw calls | Before software frame cadence | After software frame cadence |
| --- | ---: | ---: | ---: | ---: |
| Vacuum SOP | 797 | 421 | 3.27 fps | 3.58 fps |
| Drill lab | 304 | 163 | 6.21 fps | 12.41 fps |
| MCB lab | 240 | 131 | 6.47 fps | 12.86 fps |
| Chiller lab | 542 | 261 | 4.74 fps | 9.91 fps |

The direct renderer reduced sampled draw counts by 45–52% in these views. Lab frame cadence improved in this software test; the SOP remains expensive on SwiftShader. **The 60 fps desktop / 30 fps mobile targets are not established by this run.** Framing now includes the previously clipped operator, so individual geometry counts are not uniformly lower. Retained cache inventory also varies by the routes visited.

The first SOP route in the isolated run reached its built screen in 11,563 ms before and 6,565 ms after. This includes code/asset loading and scene initialization, not just model download; it is one local cold-navigation sample. Local human.bin request duration in the broader route audit was 3 ms before / 1 ms after, with the same 430,375-byte payload. Localhost transfer timing is not a production network claim. The body is no longer requested on the home/library startup path.

Six repeated resets stabilized at 228 GPU geometry objects and 27 texture objects after warm-up (validation-results.json). These are renderer.info object counts, **not GPU bytes**, and do not prove the absence of every possible leak. The earlier monotonically increasing cheek-texture count was directly traced and corrected. Shared geometry is no longer disposed under cached screens.

## Validation and scope

- npm test: 57 tests passed; no failures, skips or cancellations.
- npm run check: syntax checks on 82 JavaScript files passed. This is not an ESLint or TypeScript check; the project has neither configuration.
- npm run build: passed, with ESM chunks, media, human.bin and the existing hand worker/WASM assets.
- Browser: all twelve route addresses, both lessons, all sixteen SOP chapters, four labs, source actions/transcripts, wrong/correct answers, exploded/reset controls, reload persistence, cached aliases, route focus and reduced-motion behavior checked.
- Mobile emulation: 390 × 844, home/library/SOP/drill; no horizontal overflow or unlabelled buttons in the inspected screens. Desktop: 1440 × 1000.
- Failure recovery: a deliberately failed human.bin request displayed a useful error and allowed navigation into the full text library.
- Runtime page errors: none in the successful regression run. The intentionally failed asset request is isolated from this result.
- Original 51-test baseline passed before edits. Existing full-procedure simulation, PPE choreography, hand contact, interlocks, narration logic and assessment tests remain included.

Not executed: physical mid-range mobile performance, Safari/Firefox, Lighthouse, real camera gestures, human review of audio/translation, current site safety approval, field LCP/CLS/INP or GPU memory-byte profiling. No scores or pass claims are supplied for these.

## Important modified files

| Files | Purpose |
| --- | --- |
| src/app.js, src/main.js, build.mjs, render.yaml | Lazy runtime, guarded routes, animation lifecycle, ESM chunks and cache policy |
| src/enterprise.css, src/shell.js | Shared tokens, responsive workspace layouts, navigation focus and loading/recovery UI |
| src/screens/home.js, library.js | Introduction control, readable catalog/library and source access |
| src/screens/lesson.js, src/data/procedure.js, src/data/steps.js | Persistent guidance/transcript, contextual checks, provenance and source-faithful PPE |
| src/screens/simulation.js, src/scene/framing.js | Task/decision layout, component context, camera fitting, controls and progress-save feedback |
| src/scene/stage.js, mat.js, lab-models.js, vacmodel.js | Neutral direct rendering, material/inspection treatment and illustrative labels |
| src/scene/world.js, human/body.js, character.js | Owned-resource disposal, shared geometry/material protection and cheek-texture reuse |
| src/scene/vacuum.js, src/steps/instructions.js, s05.js, s13_16.js | Existing reference-vacuum geometry work retained, bag-contact anchors and satin finish |
| tests/enterprise.test.mjs, reference-vacuum.test.mjs | Route races, framing, resource ownership, texture reuse, source checks, storage and vacuum geometry |
| tools/browser-audit.mjs, browser-validation.mjs, render-benchmark.mjs, check.mjs | Reproducible baseline, functional browser QA, benchmark and syntax checks |

## Remaining work and practical limits

Equipment and character geometry remain procedural reconstructions. Exact likeness/manufacturer geometry requires original licensed assets and equipment references; no such CAD/rig was added. Chiller internals and sequencing are explanatory. High scene draw counts and procedural hose/cable rebuilds still merit hardware profiling before further optimization. Cache resources are intentionally retained until page exit; device testing should establish the supported memory envelope. New technical panels are English, while original lesson titles/narration/transcripts retain three languages. Site document control, practical sign-off, LMS integration, authentication and cross-device progress require real business requirements and infrastructure; none are fabricated here.
