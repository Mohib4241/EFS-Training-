# EFS Academy engineering audit — 25 October 2026

## Existing architecture and baseline

Vanilla JavaScript ES modules, Three.js 0.186.1, esbuild 0.28.2, MediaPipe 1.1.1. Hash routing has twelve addresses; aliases reuse four simulation definitions. A shared Stage owns WebGL, lighting and the camera. Cached screen instances own scene groups and DOM. Two lessons share a World; generator-driven Director synchronizes procedures and Web Speech narration. Procedural equipment and a meshopt-compressed skinned human are generated locally. No React, TypeScript, authentication service, server API, LMS, or remote progress store exists. Practice decisions and retries persist in localStorage. Playback does not award competence.

Inspected: app/main/shell/UI and styles; home/catalog/progress, library, both lessons, all four active labs; inactive legacy parts/chiller/soon pages; training and instruction datasets, narration and generator choreography; Stage/quality/materials, World lifecycle, equipment geometry, Worker/Presenter/TaskPerformer, camera and gesture code; build, source PDFs, existing tests and dependencies. The public Render URL could not be fetched by the web tool; browser validation uses the local production build.

Baseline: 51 automated tests pass. dist/index.html is 1,168,332 bytes (inline JS/CSS, measured before changes); human.bin is 430,375 bytes. Exact browser observations are retained in tmp/audit-baseline/results.json. Headless timings do not establish representative hardware FPS or Core Web Vitals.

## Findings and implementation priority

| Area | Existing problem | Targeted approach | Expected impact | Priority |
| --- | --- | --- | --- | --- |
| Startup | Home/library wait for human data and create WebGL; all scene code bundled inline | Lazy 3D runtime and route modules, ESM chunks, retain document access on failure | Content routes usable without WebGL; less initial JS and no initial body fetch | P0 |
| SOP workspace | Animation controls without persistent instructions; navigation in hidden menu; no written beat transcript | Persistent step sequence, source-linked instructions/checks and transcript, distinct review acknowledgements | Full procedure accessible with sound off; clear step context | P0 |
| Training provenance | Source metadata only in library; demonstrations show specific PPE | Show exact source revision; identify PPE animation as illustrative and RA-controlled | Avoid presenting depicted PPE as a universal requirement | P0 |
| Graphics | Bloom/GTAO/MSAA postprocessing; teal rim, luminous platform ring, exaggerated gloss | Direct PBR render, neutral lights, muted stage and satin materials | Fewer render passes and clearer industrial presentation | P1 |
| Laboratory layout | Task, toolbar and components cover the model; tiny low-contrast copy | Dedicated task column and instruction panel; readable tokens and mobile stacking | Clear separation of anatomy, demonstration and scored decisions | P1 |
| Selection/camera | Emissive selection, vacuum focus dims almost everything; ray coordinates use whole canvas despite controls overlay | Restrained selection tint; viewport-aligned canvas and controls, bounded camera | Predictable picking and legible geometry | P1 |
| Lifetime | World reset disposes shared human geometry and leaves unique materials/textures/skeleton resources | Preserve shared cache, dispose owned graph resources once; retain bounded screen cache | Avoid stale resources and repeated GPU allocation | P1 |
| Accessibility | Small text, looping hero video, no reduced-motion policy, no skip link | Shared focus/contrast/sizing, video pause, reduced-motion defaults, landmarks | Keyboard and motion-sensitive users can complete learning | P1 |
| Assessment | Decision engine already rejects incorrect answers and separates playback | Preserve scoring; add objective context and source-derived verification prompts | Reinforce understanding without creating certificates | P2 |

## Content boundaries

Vacuum source: BICSc BU3, BICSc_EDU_D022, version 3.0, October 2020, plus supplied EFS job card. No current EFS approval, named approver, site permit policy or effective date has been supplied. Keep the documented bag conflict visible: SOP two-thirds versus job card above 70%. Source requires PPE according to the task risk assessment; gloves/glasses animation is an example. Supplementary machine-care guidance contains brief-derived general explanations, distinguishable from document text. Drilling, MCB and chiller scenarios remain draft educational material requiring competent subject-matter and site review; equipment internals and control thresholds are illustrative, not manufacturer specifications. No new mandatory permits, standards, ratings, isolation methods or plant setpoints are introduced.

## Validation approach

Run the existing Node suite, meaningful lifecycle/content tests, production build and JS syntax checks. Use the same headless browser for before/after navigation, high-quality render submission/draw counts, resource inventory and screenshots at 1440×1000 and 390×844. Check all routes, all sixteen SOP chapters, assessments, selection, exploded/reset controls, keyboard operation, reduced motion, storage reload and repeated resets/navigation. Renderer.info counts GPU objects rather than bytes. Report retained cache growth separately from reset leaks. Physical mid-range mobile, Safari/Firefox, Lighthouse and field p75 Web Vitals require separate measurement; do not substitute emulation or synthetic render-submit timing for those claims.
