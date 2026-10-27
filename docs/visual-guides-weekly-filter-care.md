# Visual guides, focused models and weekly filter care

## Accepted correction

Machine Guide and Page Guide must be short visual tours over the working 3D scene, replacing the written guide catalogue. Page Guide demonstrates drag/orbit, pinch out/in and camera zoom. Machine Guide demonstrates the virtual operating sequence and what the machine does. A dismissible tour appears whenever an equipment page is opened. The machine occupies the main view; navigation and both information panes start collapsed. Selecting or hovering a component must not expand side content automatically. The sound control is an icon, with English and conversational Hinglish choices. Hover speaks the component name near the cursor.

Startup controls belong in a collapsed “Start the machine” panel at the top right of the scene. Existing plug/power interlocks, reveal controls, cleaning practice, Hard Services equations, official logo and dust-bag practice remain functional.

“Junior 1203” is interpreted as the existing Junior 103, following the user's explicit Junior 103 / Junior 429 descriptions. Both vacuum filter tasks become separate weekly remove → inspect/verify washable → water rinse → air dry/check → refit-the-same-filter routines. The dust-bag replacement task is preserved.

## Work packages

| Objective | Specialist responsibility / skill | Inputs | Output | Dependencies | Acceptance / validation |
|---|---|---|---|---|---|
| Tour behavior | Learning design + frontend / Engineering Intelligence Platform, Ponytail | Current viewer/state API and the Phantas reference | Replayable animated coachmarks over real controls/model | Repository and reference inspection | Entry tour on each visit; no written catalogue; gestures move the model; close/pause/keyboard/reduced-motion behavior |
| Machine focus | Graphics + interaction | Existing Three.js renderers and page structure | Larger scene, collapsed panes, corner startup controls | Shared guide context | Side content stays collapsed on selection; startup sequencing still guarded; desktop and narrow-browser checks |
| Bilingual narration | Education + accessibility | English content and user-defined Hinglish examples | Icon toggle, language selector, bilingual visual-tour captions/speech and immediate name-only hover speech | Existing speech controller | Correct text/voice choice, cancellation on change, no offscreen reading requirement; stub-engine tests and browser checks |
| Weekly filter wash | Domain + education + state modeling | User's site routine; IPC generic care guidance; two filter reference shapes | Separate reusable-filter washing lesson and manual practice for each vacuum | Current maintenance board/reducer | Same filter removed/rinsed/dried/refitted; wrong order, unsuitable media and wet refit rejected; full lesson and practice tests |
| Regression review | Architecture + QA + reliability | Existing test/build/browser workflow | Verified application and source/limit record | Above packages | Syntax/build/tests, operation/pickup regressions, scene/tour/keyboard checks, no supplied-photo assets |

## Evidence and limits

The weekly cadence is the user's **site training schedule**, not a manufacturer service interval. The scenario requires confirming an approved **washable** fitted filter before water is used. It must not suggest rinsing a paper/cartridge medium simply because it looks similar, or wetting an electrical motor head. Filter geometry remains a teaching reconstruction; exact Junior filter part numbers/fitment have not been established.

[IPC's wet/dry vacuum operating instructions](https://www.ipcworldwide.com/us/wp-content/uploads/sites/7/2017/11/Wet-Dry-Vacuum-Parts-Operating-Instructions-1-2020-1.pdf) describe removing the head/filter and thoroughly air drying washed filters before returning them to the machine. This is generic family guidance and supports the drying gate, not an exact Junior-specific washing interval. The user supplied the water-cleaning requirement and weekly cadence. Drying animation is an illustrative preview, not a prediction of real drying time or a cleanliness measurement.

The [Phantas reference](https://m-3mdt.onrender.com/) was inspected in the browser with its panels hidden: a large central model, compact bottom controls and an animated pinch instruction above it. The application retains its current Three.js/native JavaScript architecture.

Hinglish uses conversational Hindi grammar with English technical terms; visible captions use Roman Hinglish. Where available, a Hindi/Indian system voice receives mixed-script speech for pronunciation. Browser voice availability remains device dependent. Written captions and silent gesture demonstrations remain available. No microphone, external speech API or new runtime package is required.

## Implemented behavior and engineering scope

Page Guide now has six short animated actions over the scene: orbit, reveal, assemble, camera closer, camera farther, and speaker/hover. Machine Guide animates the virtual connection, operation, working system and isolation, then points to maintenance. Tours appear on equipment entry and can be replayed, paused, stepped or closed with Escape. A learner's own pointer interaction pauses the automatic sequence. Translation and pause controls do not reapply camera or power actions. On wide screens the guide card sits beside the model so it does not hide the lifted head.

The speaker is an SVG icon. Hover narration contains the selected component's name, with a short Hinglish sentence when selected, rather than its full explanation. English and Roman Hinglish captions are authored separately. A Hindi voice receives mixed-script Hindi grammar and English technical words; without one, an available Indian/English voice reads Roman Hinglish. Available speech voices and pronunciation depend on the device. Sound stays opt-in; language is the only new persisted preference. Navigation, speech cancellation, pointer de-duplication and fallback captions remain available.

The weekly filter model is independent of the dust-bag model. It has twelve practice phases and sixteen demonstration actions. Initial conditions: isolated state not yet recorded, both clips locked, head seated, one dust-loaded filter in the tank, tap off and no completion. The learner isolates, releases clips, parks the head, removes this filter to the tray, confirms approved washable media, opens clean water, rinses, turns water off, moves the filter to the rack, reviews air drying, confirms a dry and undamaged condition, refits that same filter, returns the head and locks both clips. The virtual machine remains isolated. Paper/unconfirmed media, wet refitting and out-of-order actions are blocked. Both Junior references use different schematic filter shapes; neither task adds a fresh filter or waste bin. Dust-bag replacement remains a separate task with its existing waste handling.

This is a conceptual workflow demonstration (Fidelity A), not a mathematical washing/drying simulation. Board coordinates are SVG drawing units, not real dimensions; animation seconds are playback timings, not physical wash/dry times. No drying equation, filtration efficiency, contamination removal, actual dryness measurement or OEM service interval is asserted. The causal teaching point is that dust loading affects the air path, while damp media can restrict airflow and introduce moisture toward the suction head; condition and approved configuration must be checked before return to use. Existing electrical/thermal equations and numerical ranges were not changed.

## Changed files

| Files | Purpose |
|---|---|
| `src/guide-content.js` (new), `src/guidance.js` | Authored bilingual visual tours, shared compact toolbar, speech and tour lifecycle |
| `src/app.js`, `src/index.html`, `src/style.css` | Focused vacuum entry, collapsed drawers/panes, floating startup and selected-part card; floor movement grouped with cleaning practice |
| `src/viewer.js`, `src/hard-viewer.js` | Smooth camera demonstrations; improved narrow vacuum framing |
| `src/hard-lab.js`, `src/scrubber.js` | Shared tours, corner startup panels and context-appropriate observation guides |
| `src/filter-care.js` (new), `src/maintenance-state.js` | Same-filter wash/dry/refit state machine and guarded holding/drop targets |
| `src/maintenance-lessons.js`, `src/maintenance.js`, `src/maintenance.css` | Weekly lessons, rinse station, inspection tray, drying rack, two shapes, English/Hinglish filter captions and keyboard alternatives |
| `src/soft-content.js` | Updated care lesson links and explicit fitment/washability limits |
| `tests/guides-soft.test.mjs`, `package.json` | Guide/voice and filter-care regressions; syntax coverage of new modules |
| `README.md`, `docs/working-brief.md`, this record | Accepted correction, delivery evidence and remaining work |

Logical specialist responsibilities involved: architecture, engineering education, electrical/MEP domain review, scientific modeling, graphics/frontend, accessibility, QA and reliability. This increment used the existing implementation and pure state transitions, without additional runtime packages or separate agents editing shared files.

## Executed validation

- `npm run check`: passed JavaScript syntax validation, including both new modules.
- `npm run build`: passed; the build contains bundled JavaScript, the existing CSS and the official EFS SVG. No supplied photo was included.
- `npm test`: all **51 tests passed**. New/updated cases exercise bilingual tour frames, name-only speech, Hindi/English voice fallback, immutable filter transitions, invalid order, paper-media rejection, required water control, wet-refit blocking, explicit dryness confirmation, same-filter identity/locations, holding targets and both complete authored filter lessons. Existing bag, handwashing, connector, pickup and scientific calculation cases also pass.
- `git diff --check`: passed after removing a trailing-space issue.
- Browser checks at 1910×1074 and 538×1118: automatic entry tour, English/Hinglish captions, pinch-reveal action reaching 70%, reassembly, pause/manual review, Escape dismissal, sound/rotation icons, collapsed panels on actual motor-head selection and the top-right startup panel. Manual startup rejected switch-on without a plug; normal connection/start worked. Motor and HYPER guides used their actual virtual operating controls; maintenance guides retained observation-specific language.
- Junior 103 filter care completed through actual held-object drags for head, tray, rinse basin, rack, refit and head return, plus clip/tap/check controls. Junior 429's separate filter shape completed through the keyboard/tap path on the narrow layout. Lesson review unlocked practice without completing it. Early head movement, unsuitable wash media and a damp-filter response produced top notifications.
- Existing powered floor movement collected **40/40** virtual debris markers. Both checked browser tabs had no captured warning/error console entries.
- Performance scope: no runtime dependency or external visual asset was added. Existing capped pixel ratio, static-frame scheduling and offscreen/reduced-motion handling remain. The generated bundle is approximately **877 kB raw / 243 kB gzip**; this is a file-size measurement, not an FPS benchmark.
- Security/accessibility review: narration and tour text use text nodes, stored language is allowlisted, operating reducers remain authoritative, no microphone/credentials/backend or production-data write was introduced, icon buttons have accessible labels, and lessons retain keyboard/tap alternatives. Escape/focus behavior and responsive layouts were checked. A full screen-reader audit was not performed.

Visual evidence is saved locally under `output/visual-guides-weekly-filter-care/`: `hinglish-page-guide.png` and `weekly-filter-drying-lesson.png`. These are ignored delivery artifacts, not application assets.

## Remaining limits and recommended next actions

Confirm the exact Junior filter part numbers, media, approved wash method and wet/dry configurations against the fitted items and model-specific manuals before treating the workflow as site-authorised training. Have a site trainer review the weekly schedule and Hinglish phrasing. Real drying time/cleanliness, audible voice quality on every target device, physical multi-touch, broad device FPS testing, manufacturer CAD fidelity and a full assistive-technology audit remain unverified. The correction was delivered locally first. The user subsequently requested a push to `main`; publication is recorded in Git history. Production deployment verification remains outside this correction.
