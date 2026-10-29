# EFS Learning Academy — equipment exploration and maintenance practice

Soft Services now includes the Junior 103 dry vacuum, Junior 429 wet/dry vacuum and HYPER 2000B scrubber dryer. Hard Services includes six electrical/MEP labs. All nine equipment pages share opt-in spoken part guides, Machine Guide and Page Guide, focused/collapsible panels and controlled auto orbit. Read the [current increment, source register, responsibilities and validation record](docs/guides-and-soft-equipment.md) for the latest delivery. The later sections preserve the earlier module implementation records.

## Run locally

```sh
npm ci
npm run dev
```

Default address: http://127.0.0.1:5173. Set `PORT=5186` to use the current preview port. `npm run dev` builds before serving; rebuild and refresh after edits. `npm run check`, `npm test`, `npm run build` provide syntax, regression and production-build checks. `dist/` is static output: a code-split, content-hashed, brotli/gzip-precompressed build (`npm run build` prints the size of every file). No deployment is performed.

## Navigation

- Soft Services → Equipment → Vacuum Cleaner → Dry → CleanTech → Junior 103.
- Soft Services → Equipment → Vacuum Cleaner → Wet → CleanTech → Junior 429 (wet & dry).
- Soft Services → Equipment → Scrubber Dryers → Lavor → HYPER 2000B.
- Soft Services → Maintenance Checklist → machine selector → lesson-first practice. Each vacuum has its own dry-filter service task; the scrubber opens its isolated observation lesson.
- Hard Services → Equipment → Motors → Induction → 1 Phase / 3 Phase; Alternator.
- Hard Services → Equipment → Instruments → Megger / Multimeter.
- Hard Services → Equipment → HVAC → Cascade.
- Hard Services → Maintenance Checklist → equipment-specific guided observations and practice.

Desktop navigation collapses into a rail. On narrow screens it opens as a drawer with keyboard Escape support and inactive offscreen content. Native details disclose the hierarchy.

## Implemented learning experience

A locally bundled Three.js model replaces the SVG. Hover to identify and highlight a part without selecting it. Scroll up or pinch outward to open the model, and reverse the gesture to reassemble it, matching the Phantas reference. Drag to orbit; +/− buttons zoom the camera independently. The focused canvas also supports Arrow Up/Down to reveal/close, Home to assemble, and End to explode. Seventeen selectable schematic assemblies cover the cover, handle, switch, motor, fan, clips, filter, collector, tank, inlet, hose, extension tube, floor tool, cable, plug, base and wheels. Clicking a mesh selects its explanation. Motor/fan/filter/collector selection opens the assembly or enables the operating cutaway. Four opening presets and a continuous slider separate the parts. Labels, a transparent cutaway and airflow route help explain connections.

The orange cable follows a plug that moves into a schematic UK-style socket. Connecting leaves the motor off. Running requires a connection and a fully assembled model. Opening switches off and disconnects automatically. The operating cutaway shows motor/fan rotation; a separate control demonstrates a short tool/tube stroke. Reduced-motion users receive static states. Leaving the module stops the motor.

The Maintenance Checklist opens an animated lesson followed by interactive practice for each task: weekly filter wash, dust-bag replacement and an isolated external connector observation. The original six operator checks remain in an optional collapsible practice record. Progress is session-only. None of these activities is an approved maintenance schedule, certificate or permanent maintenance record.

All supplied photo images and their UI controls were removed from source and build output. Nameplate transcriptions retain source attribution. The original uploaded files outside the application are untouched.

## Official logo

`src/assets/efs-logo.svg` is the unchanged EFS Facilities Services header logo, downloaded from https://efsme.com/wp-content/uploads/2022/01/logo-2.svg, linked by the [official EFS site](https://efsme.com/). No replacement or generated logo is used.

## Scientific basis and limits

**Fidelity A — conceptual.** This is a functional visual teaching model, not manufacturer CAD, a service drawing, an electrical circuit model or a validated performance simulator. The seventeen assemblies are a major-component teaching breakdown, not an assertion that all internal service parts are documented. Generic motor, fan, collector, filter, plug and accessory geometry is identified as such in the lessons. Rendering coordinates and opening percentages are not physical measurements. The exploded arrangement is not a real disassembly sequence.

The motor drives the fan; fan-driven pressure difference causes airflow through the tool, hose and collection/filter system. Increased resistance usually reduces flow at a fixed-speed fan operating point. The three conditions (clear path, hose restriction, loaded filter) explain this qualitative relationship. No fan curve, suction pressure, power factor, motor speed, dust-removal efficiency, flow-rate prediction or calibrated dynamic model is claimed. Particle motion shows a route, not a measured speed or flow rate. No numerical governing-equation solver is used.

Initial state: assembled, disconnected, switched off, clear path, labels enabled. The interaction state rejects non-finite or out-of-range opening values, prevents operation while unplugged/open, and resets reproducibly. Opening a powered model automatically isolates it. The transparent operating cutaway is a visualization, not permission to run real equipment with covers removed.

**Unit nameplate transcription:** Junior 103; 220–240 V AC; 50–60 Hz; 950 W / 1150 W max; Class II marking; Made in Italy. Original photo is no longer included in the application.

**Supplier information:** [product listing](https://www.cleantech-gulf.com/product/junior-103-made-in-italy/) and [technical sheet](https://www.cleantech-gulf.com/wp-content/uploads/2022/09/Junior-103.pdf): dry vacuum; 15 L tank; 195 m³/h airflow; 2 m hose; 8 m cable; two-stage motor. These catalogue values are not measurements of this unit. The listing's 220 V / 1150 W differs in specificity from the actual nameplate; the interface preserves this distinction.

No HEPA, pathogen-removal, liquid-pickup, safe fill fraction or measured noise claim is made. Correct service instructions and intervals require the manufacturer manual and actual fitted configuration.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `src/content.js` | Part lessons, specifications, catalogue names, operator checks and qualitative fault explanations |
| `src/machine-state.js` | Testable connection/power/opening state transitions and interlocks |
| `src/viewer.js` | Procedural geometry, selection, camera, part motion, lighting and render scheduling |
| `src/app.js` | Authoritative interaction state, UI rendering, navigation and checklist |
| `src/index.html`, `src/style.css`, `src/styles.css` | Semantic layout, responsive navigation, controls and styling; `styles.css` is the single stylesheet entry that bundles the three CSS files |
| `src/assets/efs-logo.svg`, `src/assets/favicon.svg` | Original official EFS logo; tab icon |
| `build.mjs`, `package.json`, lockfile | Reproducible local Three.js bundle; code-split, content-hashed, precompressed static build |
| `server.mjs` | Loopback-only preview serving exactly the files in `dist/`; compression negotiation, ETag, cache and security headers |
| `src/maintenance3d.js`, `src/maintenance3d.hud`, `src/sim3d/`, `src/sim3d/tasks/`, `src/maintenance-text.js` | The Maintenance Checklist, in 3D only (see [the record](docs/sim3d-stages.md)): every task for both Junior machines (weekly filter wash, dust bag, connector inspection), each shown by two hands and then practised with the learner's own hands (webcam, MediaPipe in a Web Worker, first-person view, 0.75 m distance coach) or the mouse/touch (click to pick up and click to put down, or drag). Browsers without WebGL2 get the written steps instead. |
| `tests/delivery.test.mjs` | Bundle graph (3D and labs stay lazy), first-load budget, caching, compression and path-allowlist checks |
| `tests/content.test.mjs` | Meaningful content, taxonomy, provenance and state regressions |

Logical specialist roles covered: architecture, engineering education, domain review, graphics, frontend, QA and reliability. An independent QA subagent reviewed hover/gesture handling read-only during the Phantas interaction update; implementation remained with the main agent.

## Bounded work and acceptance

| Objective / specialist | Inputs | Output | Dependencies | Acceptance / validation |
|---|---|---|---|---|
| Restructure library / architecture | User hierarchy and current application | Two department roots with equipment and checklist branches | Existing content | Exact requested Hard Services taxonomy tested; names-only leaf checked in browser |
| Explain and animate assemblies / graphics + education | Reference appearance, documented limits, part lessons | Selectable 3D parts, motion and causally accurate explanations | Three.js and content | Visible assembled/exploded views, connection sequence, internal lessons and camera controls |
| Enforce operating sequence / scientific computing + reliability | Disconnected initial state, opening isolation rule | Independent state transitions | UI integration | Unit regressions plus browser unplugged-power/opening checks |
| Supply checklist and branding / frontend | Six operator checks and official asset | Soft Services checklist, original logo, no photo gallery | Navigation | Browser logo/tree and checklist progress/reset; built photo assets absent |

## Performance approach

**Delivery.** The first load carries only navigation, content and the guide (about 58 KB gzip including HTML and CSS). Three.js, the vacuum viewer, the Hard Services lab, the scrubber lab and the maintenance practice are separate chunks fetched when their page opens, and started early when a link is hovered, focused or touched. Hashed files are cached for a year; HTML is revalidated. Measured before/after figures, method and limits are in [the performance and review record](docs/performance-and-review.md).

**Rendering.** No network model or texture download is needed at runtime: geometry is procedural, label texture is generated locally, and the logo is local. Device pixel ratio is capped at 1.75; shadows use one 1024 map. Static scenes render on demand; optional auto orbit renders only while active and visible. Animation scheduling stops while the canvas is offscreen or the document is hidden. Cable geometry changes only during connector motion. Motion is disabled for reduced-motion preferences. This describes the implementation, not a device benchmark or guaranteed frame rate.

## Verification for this increment

Syntax checks, seven Node regression tests and the bundled build were executed. The tests cover all assembly lessons, source attribution, fault explanations, the exact names-only Hard Services taxonomy, connection/operation/opening invariants, invalid inputs, reset and checklist structure.

Browser checks exercised: WebGL rendering; official logo and nested sidebar; names-only 3 Phase page; six-item checklist and 2/6 progress, clear and return; blocked power-on while unplugged; connected/off state; running cutaway and airflow toggle; opening a running machine disconnects/stops it; exploded framing. A removed Three.js shadow-mode warning was found during QA and corrected to PCFShadowMap. The browser retains earlier log history, so old entries are distinguished from new errors.

Not claimed: manufacturer geometry validation, quantitative scientific validation, complete screen-reader/automated accessibility audit, broad device frame-rate benchmarks, production deployment or permanent maintenance records.

## Phantas interaction update

Scope: cursor hover name/group card and temporary highlight; scroll/pinch-driven opening; camera zoom preserved through buttons; keyboard alternatives. Hover is separate from the selected part and never changes opening or power. Wheel/touch opening goes through the same authoritative application transition as the slider, including automatic isolation. Gesture changes clamp to 0–100 and do not issue state transitions at a limit. OrbitControls camera dolly is disabled for those gestures to avoid two simultaneous responses.

The renderer reuses a raycaster, coalesces mouse movement into scheduled rendering, caches tooltip content/size, and clears hover on leave, drag, cancellation, reset, hidden canvas/document and navigation. Bounds checks prevent tooltips outside the canvas. Multi-touch does not select parts; a latched drag flag suppresses selection even if a drag returns to its starting point. Two-touch orbit mapping is disabled while pinch reveal is handled by the viewer.

Verification: nine Node tests, syntax checks and build executed successfully. Browser checks confirmed scroll-up reveal to 73%, reverse scroll to assembled, a hover name without changing selection, continued operation while hovering at the assembled limit, and opening a running machine switching off/disconnecting it. The actual Phantas reference was inspected: its scroll-up reveal and cursor part tooltip were observed. Physical multi-touch/pinch testing on a touch device and broad performance benchmarking were not performed.

Files for this update: `src/viewer.js`, `src/machine-state.js`, `src/app.js`, `src/index.html`, `src/style.css`, `tests/content.test.mjs`, and this README. Scientific content, taxonomy and model fidelity are unchanged.


## Academy and maintenance increment

### Entry points and focus

The default welcome page is `#home`, titled “Welcome to EFS Learning Academy”. Clicking the official EFS logo returns home. Cards lead to the Junior 103 equipment lab (`#junior-103`), cleaning practice or Maintenance Checklist (`#maintenance`). The left navigation collapses when opening equipment or maintenance, and expands again on home; a mobile drawer remains available. Browser Back/Forward restores the routed page. Hard Services now opens researched equipment labs; see the Hard Services expansion below.

### Interactive practices

- **Dust bag:** an 80% full schematic bag exceeds the user-supplied 70% training trigger. The sequence gates isolation → release both retaining clips → lift head to its rest → lift used bag to tray → seal → bin at bottom right → fit clean bag from top left → return head → secure both clips. Hold/move/release pointer gestures move the illustrated objects themselves. Explicit keyboard/tap actions provide the same sequence. The actual fitted bag and manufacturer service threshold remain unverified. Disposal follows the actual waste stream and site procedure.
- **Connector observation:** isolation first; inspect pins/casing, cable entry and visible heat damage; choose removal from use/reporting. A “no concern” answer cannot pass the illustrated defect. This teaches external observation only; internal terminals, wiring, tightening, repairs and live tests are excluded and require task-appropriate competence and the correct equipment instructions.

Sources: the filter-wash and connector tasks link their references in the 3D view under “Learning scope & sources”.

### Tiled-floor pickup model contract

Fidelity A — conceptual scene interaction. Forty deterministic virtual debris markers are placed near the nozzle lane (x 1.05–1.51, z 1–2.05, in arbitrary scene coordinates). The nozzle footprint is 0.65 × 0.3 scene units. Its previous-to-current swept rectangle collects intersecting markers only when the virtual machine is assembled, connected, running and in the clear-air-path scenario. Fault-specific pickup performance is not modelled. The grip and rigid tube move with the tool; the flexible hose and displayed air route follow them.

Initial state: all 40 markers on the tiles, machine off/unplugged, no cleaning motion. Moving the tool manually while off does not collect debris. The pickup display counts virtual markers, not dust mass, cleanliness, efficiency, suction, hygiene or a measured cleaning rate. Rendering coordinates are not manufacturer dimensions. Reset restores the identical dust pattern. A full-pass button provides a discrete result for reduced-motion users and an animated pass otherwise. Scene motion is paused offscreen/hidden; rAF steps are capped at 0.05 s. No engineering-performance validation is claimed.

### Bounded tasks and ownership

| Objective | Specialist / skill | Inputs | Output | Dependency | Acceptance and validation |
|---|---|---|---|---|---|
| Academy welcome, routes and focused layout | Architecture + frontend / Engineering Intelligence Platform, Ponytail, existing local Sites workflow | Current layout, official logo, user hierarchy | Home cards, logo home link, collapsed machine navigation | Existing application | Browser home/machine/maintenance navigation, visible layouts, no existing feature removal |
| Maintenance practice | Education + interaction specialist / Engineering Intelligence Platform | User scenarios, CDC/WHO/HSE evidence | Separate state/UI/style files for three practices | DOM integration | Correct sequence gates, accessible alternatives, reset; ten state tests and browser completion checks |
| Dust pickup | Scientific computing + 3D frontend / Engineering Intelligence Platform | Existing Three.js scene and fixed debris lane | Deterministic state helper, tiles, visible pickup and reset | Nozzle state/position | Five footprint/invalid-input tests; browser off/on comparison and 40/40 virtual marker result |
| Independent review | Domain/QA specialists | State transitions and primary sources | Safety/sequence and integration review | Implementation | Scrub timing and towel order, fault decision, sweep gating, airflow synchronisation, paused/offscreen behavior |

Files added: `src/maintenance.js`, `src/maintenance-state.js`, `src/maintenance.css`, `src/cleaning-state.js`, `tests/maintenance.test.mjs`, `tests/cleaning.test.mjs`. Existing UI, viewer, styles, build, server asset allowlist and syntax-check script were updated. No new runtime dependencies or framework migration.

### Verification and remaining limits

Executed: syntax checks, all 24 Node tests, static bundle build. Browser checks completed the bag sequence through disposal/clean replacement/closure, rejected an incorrect connector outcome and completed the report decision, observed 0/40 pickup while moving unplugged and 40/40 after powered movement, and inspected the academy home, practice layouts and hands-only scene. Browser verification also completed the real-time handwashing sequence: all named areas plus a genuine20-second scrub gate, running-water rinse, clean towel, drying, then towel tap-off. Native drag-and-drop was verified for both the sealed used bag into the bin and the fresh bag into the machine, alongside the tap-source/destination alternative. No browser errors were observed during these checks.

Not established: exact Junior 103 bag/terminal internals, manufacturer-approved 70% service threshold, real equipment safety, hygiene effectiveness, quantitative cleaning performance, broad device FPS benchmarks or full assistive-technology certification. No publication or production deployment is part of this increment. The next evidence needed for equipment-specific service lessons is the correct manual and fitted collection-system identification.

## Lesson first, then manual practice

Objective: demonstrate each maintenance task before asking the learner to reproduce it. Every task opens its own animated lesson, with play/pause, replay, previous/next steps and captions. Practice unlocks after playback finishes or all lesson steps have been reviewed manually. A demonstration cannot complete the learner's checklist. Lesson playback and practice state are separate, and starting practice begins a fresh sequence. Session progress is not saved after reload.

The bag lesson has eleven illustrated actions. Practice has nine stages; the two clip stages each require both clips. Hold the highlighted head or bag, move it to the outlined destination and release. An incorrect drop snaps the object back without advancing. The head is parked at the top right before the bag can be removed. The used bag goes onto the left tray for sealing, then into the bottom-right bin. The clean bag comes from the top-left shelf; the head and both clips must be restored before completion. Keyboard/tap alternatives remain available in a disclosure beside the scene.

### Interaction model and fidelity

This is a conceptual finite-state teaching game, not a force, dust-containment or fitment simulation. Drop acceptance is an object-centre test against the named target rectangle, gated by the current task phase. The board is 1000 × 625 arbitrary display units. Initial conditions are a seated head, two locked clips, fitted 80% used bag, clean bag on the shelf, and incomplete practice. Power isolation is the first required action. No bag/head action bypasses the sequence. Retaining clips and bag coupling remain schematic until the correct equipment manual is available.

Lesson frames are authored from the same permitted state transitions as practice. Native Web Animations move the head and bags, rotate clips and show connector isolation. Handwashing shows running water and rubbing hands. Its scrub preview explicitly represents 20 seconds in 5 seconds (4×); actual practice still requires at least 20,000 ms of elapsed scrub time and all four named areas. Paused, hidden, offscreen or navigated-away lessons stop advancing. Reduced-motion users can review steps without automatic playback. Pointer movement updates are coalesced into animation frames; no runtime dependency was added.

### Work packages and ownership

| Objective | Specialist responsibility / skill | Inputs | Expected output | Dependencies | Acceptance and validation |
|---|---|---|---|---|---|
| Lesson before each task | Education + frontend / Engineering Intelligence Platform | Existing reducers and sourced lesson content | Three captioned demonstrations and separate practice gate | Current maintenance module | Lesson completion unlocks practice without completing it; automated playback and step-review tests, browser checks |
| Manual bag handling | Interaction + graphics / Engineering Intelligence Platform, Ponytail | Existing schematic cleaner and user sequence | Movable head/bags, visible drop targets, clip gates and keyboard alternative | Bag practice state | Correct drops advance; wrong drops snap back; both clips required; state tests and full browser gesture sequence |
| Integration and review | Architecture + QA / existing repository conventions | Routes, motion preferences and prior practices | Focused layout, paused lifecycle, documented model limits | Above tasks | Syntax, build and regression checks, browser sequence and focus checks |

Files: `src/maintenance-lessons.js` and `tests/maintenance-lessons.test.mjs` added; `src/maintenance.js`, `src/maintenance-state.js`, `src/maintenance.css`, `src/app.js`, `tests/maintenance.test.mjs`, `package.json` and this README updated. The maintenance learning sequence is the engineering principle involved: isolation, controlled disassembly, dust containment, clean replacement, reassembly and inspection, with a demonstration → practice → feedback learning loop.

Executed validation: all 29 Node regression tests, syntax checks, bundled build and whitespace checks passed. Browser checks reviewed all three lessons and their separate practice gates, pause/resume, manual lesson-step review, all five held-object bag movements, rejection/snap-back of an incorrect head drop, completion only after both clips are secured, and the keyboard/tap disclosure. Handwashing practice was completed using its real 20-second scrub timer after watching the separate preview; connector practice rejected the clear-inspection answer and completed after reporting the illustrated concern. No browser errors were observed. The narrow responsive layout was visually checked. Physical touch input, a full assistive-technology audit, broad FPS benchmarks and manufacturer fitment validation were not performed.


## Hard Services expansion — 27 October 2026

Objective: populate every existing Hard Services equipment leaf with the same core exploration features as the Junior 103, plus bounded mathematical experiments and lesson-first observation practice. The user's clarification defines HVAC Cascade as staged plant control. The representative system is a parallel heat-pump cascade.

| Equipment | Reference | Major teaching assemblies | Main experiment |
|---|---|---:|---|
| Single-phase induction motor | WEG W22 capacitor-start/run family | 17 | Forward-field speed/slip; failed start-branch inhibition |
| Three-phase induction motor | ABB M3BP family | 14 | Frequency, poles, slip, rotor power balance and phase-loss interlock |
| Brushless alternator | STAMFORD UC274 / UCI274H reference | 14 | Four-pole speed/frequency and relative open-circuit EMF |
| Insulation tester | Megger MIT420/2 | 10 | Ideal leakage current and separately authored RC discharge |
| Digital multimeter | Fluke 87V | 10 | DC voltage/current/resistance, correct input jack and source isolation |
| HVAC cascade control | Mitsubishi Electric Ecodan CAHV-R multi-unit reference | 12 | Three assumed 40 kW stages, demand, order, unavailable unit and water-flow balance |

Each lab provides component selection and hover identification, drag orbit, camera rotation/zoom/focus, wheel/pinch reveal, keyboard reveal controls, an opening slider, see-inside view, labels, reset, synchronized component motion, manufacturer reference facts, a causal explanation, model limits, primary-source links and a reasoning question. Major assemblies total **77**; this is not an exhaustive manufacturer spare-parts catalogue.

Routes: `#hard-services` opens the equipment cards; `#equipment/motor-1ph`, `#equipment/motor-3ph`, `#equipment/alternator`, `#equipment/megger`, `#equipment/multimeter` and `#equipment/cascade` open labs directly. `#hard-maintenance` opens all inspection cards; append `/maintenance` to an equipment route for its guide. Navigation collapses in the labs and the official EFS logo remains the home entry point.

Maintenance learning has five guided stages: isolation, three observations, and response to a concern. The guide highlights components and moves the view; captions are visible on the scene. Playback or step-by-step review unlocks practice without completing it. Practice requires recorded virtual isolation, identification in order, and reporting the illustrated concern. Named controls provide an alternative to selecting the actual 3D part. Re-energising is blocked in maintenance mode. This is an observation lesson, not a live test, terminal service procedure, refrigerant task or maintenance certificate.

### Architecture, responsibilities and model limits

Electrical and power-system domain, MEP, education, scientific computing, graphics/frontend, QA and reliability responsibilities were applied within this task. The [compact working brief](docs/working-brief.md) records work packages, inputs, dependencies, acceptance criteria and preserved context. The [research and model record](docs/hard-services-research.md) includes manufacturer evidence, all parameter ranges/defaults, equations, units, initial states, assumptions, analytical reference cases and remaining limits.

Content lives in `src/hard-content.js`, calculations and transition guards in `src/hard-models.js`, 3D geometry/rendering in `src/hard-viewer.js`, and interaction/lessons in `src/hard-lab.js`. This extends the existing JavaScript/Three.js stack with one reusable Hard Services renderer. Changing equipment releases the previous module's geometry, materials and textures; only the current model is rendered. Pixel ratio is capped at 1.75, shadows at 1024², hover movement is coalesced, static scenes render on demand, and hidden/offscreen scenes stop animation. Reduced-motion settings suppress illustrative movement. No new runtime dependency or remote asset loading was introduced.

The geometry is conceptual (Fidelity A). Stated equations are educational (Fidelity B), checked against analytical examples, with no manufacturer performance validation (Fidelity C). Motor curves, physical transients, product-specific load behaviour, calibrated instrument accuracy, actual insulation acceptance limits, proprietary HVAC sequencing, minimum on/off times, COP prediction, defrost and plant design are not represented. User-selected values are teaching assumptions and never written into real equipment. The correct variant manuals and site procedures remain necessary for real work.

### Files and verification

Added: `src/hard-content.js`, `src/hard-models.js`, `src/hard-viewer.js`, `src/hard-lab.js`, `src/hard-lab.css`, `tests/hard-services.test.mjs`, `docs/working-brief.md`, and `docs/hard-services-research.md`. Updated: `src/app.js`, `src/index.html`, `build.mjs`, `server.mjs`, `package.json`, `tests/content.test.mjs`, and this README.

Executed automated checks: all **41 Node tests**, syntax checks and bundled build passed. Twelve new tests cover six-module completeness, known induction/alternator cases, power conservation, instrument units and interlocks, HVAC stage capacity/flow accounting, invalid inputs, isolation/reveal and all six lesson/practice state machines. The 29 existing Soft Services regressions also pass. The generated JavaScript bundle is about 780 kB before compression; this is a size measurement, not a device frame-rate benchmark.

Executed browser checks: all 77 component buttons opened matching lessons without browser errors. The six models rendered, reference/experiment controls updated, motor opening isolated operation, scroll and keyboard reveal worked, insulation testing rejected a non-isolated item and held reveal until its illustrative discharge ended, multimeter jack/resistance interlocks worked, and the HVAC 100 kW / unavailable-stage example displayed 80 kW served with 20 kW unmet. The HVAC guide unlocked practice after playback, a real 3D pipework selection recorded an observation, keyboard alternatives preserved focus, an incorrect clear decision was rejected and reporting completed the sequence. Manual guide stepping, camera controls, incorrect/correct reasoning feedback, catalogue/checklist entry points, logo/home and Back/Forward navigation were also checked. Existing vacuum operation collected 40/40 virtual markers, and its original bag lesson still gated practice. Narrow responsive layouts were visually inspected. Five local HTTP checks confirmed CSS/HEAD responses, CSP/nosniff headers, POST rejection and rejection of unknown/traversal paths.

Physical multi-touch, broad FPS/device benchmarking, a complete assistive-technology audit, manufacturer CAD or internal instrument circuit validation, site commissioning and production deployment are not claimed. Further engineering depth should use exact selected variants and measured/reference operating data rather than invented performance curves.

## Shared guides and Soft Services equipment — previous increment

See [guides-and-soft-equipment.md](docs/guides-and-soft-equipment.md) for the current work packages, changed-file map, reference evidence, executed checks and remaining limits. Direct routes are `#junior-103`, `#junior-429`, `#hyper-2000b`, `#maintenance/junior-103`, `#maintenance/junior-429` and `#hyper-2000b/maintenance`. Sound starts off and requires a user action. Narration uses an available system/browser voice, cancels on navigation or hiding, and has written transcripts. The wet/dry vacuum is a separate teaching configuration, not permission to use dry filters for liquid collection. Supplied photos remain outside the source and build assets.


## Visual tours and weekly filter care — current correction

Machine Guide and Page Guide are now short animated tours over the working model. Equipment opens with navigation and both side panes collapsed; startup controls sit at the top right. The speaker icon enables immediate part-name narration, with English and conversational Hinglish choices. Tours demonstrate orbit, pinch reveal/assembly and camera zoom, and appear on each equipment visit.

Junior 103 and Junior 429 have separate weekly filter-wash lessons and practice: remove the same filter, confirm washable media, rinse it, turn the tap off, air-dry/check it, refit it and secure the head. Dust-bag replacement is still a separate activity. Weekly is the user's site training schedule; exact filter media/fitment/washability require confirmation. The drying preview does not predict real drying time.

See [the complete correction record](docs/visual-guides-weekly-filter-care.md) for the logical specialist responsibilities, changed files, evidence, validation and remaining limits. This correction passed **51 tests**, syntax/build validation and focused desktop/narrow-browser checks, including complete filter routines and 40/40 virtual floor pickup. The changes were validated locally; publication is recorded in Git history. No production deployment verification is claimed.
