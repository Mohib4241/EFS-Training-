# EFS Learning Hub — Junior 103 equipment lab

Soft Services is the implemented learning area. Hard Services contains the requested catalogue names only.

## Run locally

```sh
npm ci
npm run dev
```

Default address: http://127.0.0.1:5173. Set `PORT=5186` to use the current preview port. `npm run dev` builds before serving; rebuild and refresh after edits. `npm run check`, `npm test`, `npm run build` provide syntax, regression and production-build checks. `dist/` is static output. No deployment is performed.

## Navigation

- Soft Services → Equipment → Vacuum Cleaner → CleanTech → Junior 103.
- Soft Services → Maintenance Checklist (all registered Soft Services equipment; currently Junior 103).
- Hard Services → Equipment → Motors → Induction → 1 Phase / 3 Phase; Alternator.
- Hard Services → Equipment → Instruments → Megger / Multimeter.
- Hard Services → Equipment → HVAC → Cascade.
- Hard Services → Maintenance Checklist (category names only; no technical checklist or lessons).

Desktop navigation collapses into a rail. On narrow screens it opens as a drawer with keyboard Escape support and inactive offscreen content. Native details disclose the hierarchy.

## Implemented learning experience

A locally bundled Three.js model replaces the SVG. Hover to identify and highlight a part without selecting it. Scroll up or pinch outward to open the model, and reverse the gesture to reassemble it, matching the Phantas reference. Drag to orbit; +/− buttons zoom the camera independently. The focused canvas also supports Arrow Up/Down to reveal/close, Home to assemble, and End to explode. Seventeen selectable schematic assemblies cover the cover, handle, switch, motor, fan, clips, filter, collector, tank, inlet, hose, extension tube, floor tool, cable, plug, base and wheels. Clicking a mesh selects its explanation. Motor/fan/filter/collector selection opens the assembly or enables the operating cutaway. Four opening presets and a continuous slider separate the parts. Labels, a transparent cutaway and airflow route help explain connections.

The orange cable follows a plug that moves into a schematic UK-style socket. Connecting leaves the motor off. Running requires a connection and a fully assembled model. Opening switches off and disconnects automatically. The operating cutaway shows motor/fan rotation; a separate control demonstrates a short tool/tube stroke. Reduced-motion users receive static states. Leaving the module stops the motor.

The checklist is a session-only learning aid with six basic operator checks, progress, and reset. It does not claim to be an approved maintenance schedule, certificate or permanent maintenance record.

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
| `src/index.html`, `src/style.css` | Semantic layout, responsive navigation, controls and styling |
| `src/assets/efs-logo.svg` | Original official EFS logo |
| `build.mjs`, `package.json`, lockfile | Reproducible local Three.js bundle and clean static build |
| `server.mjs` | Loopback-only preview, explicit asset allowlist, MIME types and security headers |
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

No network model or texture download is needed at runtime: geometry is procedural, label texture is generated locally, and the logo is local. Device pixel ratio is capped at 1.75; shadows use one 1024 map. Idle scenes render on demand. Animation scheduling stops while the canvas is offscreen or the document is hidden. Cable geometry changes only during connector motion. Motion is disabled for reduced-motion preferences. This describes the implementation, not a device benchmark or guaranteed frame rate.

## Verification for this increment

Syntax checks, seven Node regression tests and the bundled build were executed. The tests cover all assembly lessons, source attribution, fault explanations, the exact names-only Hard Services taxonomy, connection/operation/opening invariants, invalid inputs, reset and checklist structure.

Browser checks exercised: WebGL rendering; official logo and nested sidebar; names-only 3 Phase page; six-item checklist and 2/6 progress, clear and return; blocked power-on while unplugged; connected/off state; running cutaway and airflow toggle; opening a running machine disconnects/stops it; exploded framing. A removed Three.js shadow-mode warning was found during QA and corrected to PCFShadowMap. The browser retains earlier log history, so old entries are distinguished from new errors.

Not claimed: manufacturer geometry validation, quantitative scientific validation, complete screen-reader/automated accessibility audit, broad device frame-rate benchmarks, production deployment or permanent maintenance records.

## Phantas interaction update

Scope: cursor hover name/group card and temporary highlight; scroll/pinch-driven opening; camera zoom preserved through buttons; keyboard alternatives. Hover is separate from the selected part and never changes opening or power. Wheel/touch opening goes through the same authoritative application transition as the slider, including automatic isolation. Gesture changes clamp to 0–100 and do not issue state transitions at a limit. OrbitControls camera dolly is disabled for those gestures to avoid two simultaneous responses.

The renderer reuses a raycaster, coalesces mouse movement into scheduled rendering, caches tooltip content/size, and clears hover on leave, drag, cancellation, reset, hidden canvas/document and navigation. Bounds checks prevent tooltips outside the canvas. Multi-touch does not select parts; a latched drag flag suppresses selection even if a drag returns to its starting point. Two-touch orbit mapping is disabled while pinch reveal is handled by the viewer.

Verification: nine Node tests, syntax checks and build executed successfully. Browser checks confirmed scroll-up reveal to 73%, reverse scroll to assembled, a hover name without changing selection, continued operation while hovering at the assembled limit, and opening a running machine switching off/disconnecting it. The actual Phantas reference was inspected: its scroll-up reveal and cursor part tooltip were observed. Physical multi-touch/pinch testing on a touch device and broad performance benchmarking were not performed.

Files for this update: `src/viewer.js`, `src/machine-state.js`, `src/app.js`, `src/index.html`, `src/style.css`, `tests/content.test.mjs`, and this README. Scientific content, taxonomy and model fidelity are unchanged.
