# Guides and Soft Services increment

Objective: spoken component explanations on every machine, consistent help and focused viewing, ordered maintenance feedback, and separate dry vacuum, wet/dry vacuum and scrubber-dryer learning modules. The supplied photographs are reference evidence only and are not application assets.

## Responsibilities and independently verifiable work

| Objective | Specialist responsibility / skill | Required input | Output | Dependencies | Acceptance and validation |
|---|---|---|---|---|---|
| Confirm equipment | Electrical/MEP domain + research / Engineering Intelligence Platform | Supplied unit labels; supplier/manufacturer documents | Bounded specifications, correct categories, reference register | Repository inspection | No invented battery percentage, filter rating or dimensions; source links visible |
| Voice and help | Education + accessibility + frontend / Engineering Intelligence Platform, Ponytail | Component content; current browser controls | Shared native speech controller, Machine Guide, Page Guide, sound toggle | Existing component IDs | Hover/focus debounce, cancellation, unsupported-browser fallback, readable text, keyboard dialog; unit and browser checks |
| New vacuum | Graphics + frontend | Junior 429 sources; current vacuum viewer | Reused renderer with two motors, larger tank, caged filter and wet squeegee | Equipment research | Separate route and state, wet/dry media distinction, isolation on mode change; browser and reducer tests |
| Filter practice | Education + interaction | Two reference filter shapes and generic IPC guidance | Lesson before ordered hold/move/refit practice | Existing bag board and reducer | Wrong order blocked with top notice, correct isolated completion, keyboard alternative; full authored-lesson and reducer tests |
| Scrubber dryer | MEP + graphics | HYPER 2000B label and technical sheet | Selectable assemblies, separate brush/suction/solution demonstration, observation lesson and practice | Shared equipment renderer, guides | Correct category, no fabricated measured performance; all parts selectable; browser walkthrough |
| Regression review | QA + reliability | Existing build, tests, navigation and model invariants | Verified local application | All above | Syntax, build, scientific/state regressions, browser/keyboard/mobile, runtime logs and resource review |

## Scientific scope

Geometry and floor pickup are conceptual (Fidelity A). Existing educational Hard Services equations remain unchanged. No new engineering-performance model is claimed. Rotational animation is slowed, coordinates are arbitrary scene units, and marker counts are virtual objects rather than efficiency or recovery rate. Initial state is assembled, isolated and stopped; wet/dry configuration changes isolate the vacuum. Dry tool states are hard/soft with the brush extended/retracted. Auto orbit is a viewing aid, pauses on interaction and respects reduced motion.

Filter lessons teach identification, isolation, removal, observation, selection and reseating. The textile basket and white caged filter reproduce reference shapes without claiming confirmed fitment, HEPA performance, washability or a certified wet-compatible medium. Both filter service tasks restore a **dry** collection configuration. A wet vacuum is not a dry vacuum with a different nozzle. The exact unit manual must govern media and float configuration. No real terminal work, charging procedure or electrical safety certification is taught.

## Reference register

- Junior 103 label supplied by user: 220–240 V AC, 50–60 Hz, 950 W / 1150 W max, Class II symbol. [Supplier sheet](https://www.cleantech-gulf.com/wp-content/uploads/2022/09/Junior-103.pdf).
- Junior 429 label supplied by user: 220–240 V AC, 50–60 Hz, 2000 W / 2400 W max, IPX4, Class II symbol. [Supplier sheet](https://www.cleantech-gulf.com/wp-content/uploads/2023/03/Junior_429-1.pdf) confirms wet/dry classification, two two-stage bypass motors, gross 62 L tank, 2.5 m hose and 8 m cable. Maximum catalogue airflow and shutoff water lift are not a simultaneous operating point and are not used to predict floor pickup.
- HYPER 2000B label supplied by user: 24 V DC, 39.5 A, IPX3, 550 W brush, 400 W suction, 62 kg, maximum slope 2%. [Lavor manufacturer technical sheet hosted by supplier](https://www.saudicleaningequipment.com/saudicleaningequipmentdemo/wp-content/uploads/2024/10/8.527.0037-HYPER-2000B.pdf) describes the solution/recovery tanks and functional systems. Battery capacity, chemistry and state of charge remain unverified.
- [IPC generic wet/dry instructions](https://www.ipcworldwide.com/it/wp-content/uploads/sites/2/2016/11/PLDC03966-03-WD-PRIMARIO-14.pdf): dry polyester media and optional dust bag are distinct from the wet-pickup setup; float protection and a squeegee have different roles. This is generic family guidance, not proof of Junior 429 filter fitment.
- [Web Speech API specification](https://wicg.github.io/speech-api/) and [Mozilla speech synthesis documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis): user-activated browser/system narration, asynchronous voices and cancellation. Voice availability, pronunciation and audio output depend on the device/browser; written guidance remains available.

The user authorised pushing this completed increment to `origin/main` after local validation.

## Delivered implementation

All nine equipment pages now have shared Sound on/off, debounced cursor/focus narration, readable component transcripts, Machine Guide and Page Guide. Native browser/system voices avoid adding audio downloads or an external speech service. The guide dialogs support keyboard dismissal and stop narration on close/navigation/visibility change. Opening help pauses maintenance playback and handwashing timing. Machine side panels initially collapse; auto orbit can be disabled, pauses over the canvas and follows reduced-motion preferences.

Junior 103 and Junior 429 reuse the existing vacuum renderer and operating state. The dry tool's orange rocker and brush strip change together. Tool names, tooltips, explanations and narration also follow the wet/dry selection. The wet variant has a taller tank, twin motor/fan assemblies, wide rubber floor tool, liquid markers, a separately illustrated dry filter and float guard. Changing wet/dry mode stops and isolates the model. Selecting a dry-only internal component on the wet/dry unit selects the dry teaching configuration. The HYPER reuses the equipment renderer with its own content and authoritative operation state; solution, brush and suction functions are independent and their consequences are explained.

Both vacuums have a lesson-first filter task alongside the existing bag, handwashing and connector tasks. Learners hold/move/release the head and filter, inspect the media/rim/seal, choose a matching clean, dry replacement, refit it, close the head and secure both clips. Keyboard/tap alternatives use the same reducer. The two filter tasks restore **dry pickup**, including on the wet/dry machine. The HYPER has a separate lesson and ordered isolated observation exercise. Skipped actions, incorrect media/inspection decisions and out-of-order operator checks show top notifications without crediting progress; accepted actions dismiss stale warnings.

## Changed-file map

| Files | Change |
|---|---|
| `src/guidance.js` | Shared narrator, machine/page guide dialogs, transcript, view preferences and top notifications |
| `src/soft-content.js` | Separate dry/wet reference facts, filter/tool lessons and HYPER component/inspection content |
| `src/scrubber-state.js`, `src/scrubber.js` | Pure scrubber function/isolation state and its explorer/lesson/practice UI |
| `src/viewer.js`, `src/hard-viewer.js` | Variant/filter/tool/scrubber geometry, hover hooks, camera aiming, auto orbit and active/offscreen scheduling |
| `src/machine-state.js` | Authoritative floor setting, wet/dry configuration and isolation on configuration changes |
| `src/maintenance-state.js`, `src/maintenance-lessons.js`, `src/maintenance.js` | Two filter tasks, authored demonstrations from permitted transitions, direct manipulation, blocked-action feedback |
| `src/hard-models.js`, `src/hard-lab.js` | Explicit blocked inspection results and shared guidance integration; existing engineering equations unchanged |
| `src/app.js`, `src/index.html`, `src/style.css` | Library hierarchy, routes/history, academy entry points, machine focus, configuration controls, ordered operator record and responsive guide styling |
| `tests/guides-soft.test.mjs`, `tests/maintenance-lessons.test.mjs` | Speech/state/filter regressions and all five authored lesson outcomes |
| `package.json` | Syntax checks include each new source module; no new dependencies |
| `README.md`, `docs/working-brief.md`, this record | Current scope, routes, ownership, scientific basis and validation evidence |

The official EFS logo asset is unchanged. `src/assets/` contains only that SVG. No supplied photographs, generated raster artwork, credentials, production data or deployment configuration were added.

## Executed validation

- **48 Node tests passed.** New coverage checks opt-in speech, debounce/deduplication, cancellation and voice errors, chunked speech, separate equipment content, wet/dry isolation, both filter sequences and wrong selections, blocked existing maintenance paths, ordered HYPER inspections and independent scrubber functions. Existing analytical induction, alternator, leakage-current, DC-circuit, RC-discharge and HVAC accounting cases passed.
- **Syntax checks, esbuild production bundle and `git diff --check` passed.** JavaScript output is approximately 0.84 MB before compression. This is a bundle-size measurement, not a device benchmark.
- **Browser component checks passed for all 51 Soft Services assemblies:** 17 Junior 103, 18 Junior 429 and 16 HYPER component controls selected a populated explanation without browser errors. All six Hard Services Machine Guide dialogs exposed the expected 77 component transcripts. The shared speech engine actually emitted its start event for activation, keyboard-focused part narration, a pointed motor-frame component and Page Guide reading. Physical sound quality and pronunciation were not independently measured.
- **Full held-object wet/dry filter practice passed:** head to rest, filter to tray, correct selection, clean filter into the tank, head back and both clips secured. Wrong early head movement and wrong media choice were blocked and produced a visible top notification. Both filter lesson endpoints also passed automated state validation; the textile-filter lesson was visually checked separately.
- **Maintenance browser checks passed:** HYPER lesson review, isolation, three observations, rejection of returning a damaged unit to use; existing HVAC inspection rejected a later observation before isolation and before earlier observations. Operator checks rejected step 6 before step 1 and recorded valid progress. Notifications cleared after a correct action. Help paused a running lesson, Escape closed its dialog, and a maintenance-guide link opened the requested 3D component.
- **Operation/navigation checks passed:** unpowered vacuum pass rejected; powered Junior 103 and Junior 429 wet passes each collected 40/40 virtual markers; a direct 3D orange-rocker click changed the dry floor setting and identified the combination tool correctly; floor-setting state changed; wet/dry component selection changed the teaching configuration; independent HYPER suction-off feedback; HYPER assembled/inside/exploded presets and maintenance route; Dry/Wet/Scrubber hierarchy, menu collapse, Back/Forward, machine selector and home entry points. Narrow layouts were visually inspected with no horizontal overflow on the checked HYPER page.
- **Seven local HTTP/security checks passed:** index, JavaScript HEAD, CSS and unchanged logo returned 200 with expected CSP/nosniff headers; unknown and traversal-style paths returned 404; POST returned 405. Runtime assets remain local. Rendering lifecycle/resource handling and the reduced-motion branches were reviewed in source.

## Remaining limitations and next evidence

These are learning reconstructions, not manufacturer CAD or approved service procedures. Exact installed filter fitment, washable/wet-rated media, actual float arrangement, usable tank limits and battery capacity/charge remain unverified. No HEPA, pathogen removal, actual cleaning rate, suction operating point, runtime or engineering performance validation is claimed. Practice progress is temporary, not a certified maintenance record.

System voices and speech availability vary by browser/device. Written guides remain usable when speech fails. Broad FPS/thermal/device benchmarking, physical multi-touch and a complete screen-reader/accessibility audit were not performed. Reduced-motion logic was source-reviewed; no OS preference was changed for testing. The next useful engineering input is the exact supplied-unit operator manuals and accessory/filter part numbers, followed by measured data if quantitative performance modules are required.

The user requested publication of the completed changes to `origin/main`. The release commit records this increment; a Git push alone does not verify the hosted application deployment.
