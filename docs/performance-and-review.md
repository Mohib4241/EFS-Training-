# Performance pass and code review — 28 October 2026

## Result

Measured in headless Chromium 153 with the same harness against the previous build ("before") and this build ("after"): 4× CPU slowdown, 1.6 Mbit/s down, 100 ms latency, software WebGL (SwiftShader), 5 runs per scenario, median shown. The "before" build was served gzip-compressed with ETag revalidation, as a typical static host would; the "after" build is served by `server.mjs`, which sent brotli to this browser (the gzip equivalent of the first load is 57.6 KB, so the conclusion does not depend on the codec).

| Scenario | Before | After |
|---|---|---|
| Home page, cold: app ready | 5.5 s | 0.74 s |
| Home page, cold: first contentful paint | 3.9 s | 0.73 s |
| Home page, cold: bytes transferred | 266 KB | 55 KB |
| Home page, cold: total blocking time | 3.9 s | 0.10 s |
| Home page, revisit: app ready | 6.3 s | 0.36 s |
| Home page, revisit: bytes transferred | revalidates 6 files | 0 KB (hashed files served from cache) |
| Hard Services lab, cold deep link: `load` event | 13.3 s | 0.8 s |
| Hard Services lab, cold deep link: ready | 4.3 s | 2.8 s |
| Junior 103 3D page, cold deep link: `load` event | 8.9 s | 0.9 s |
| Junior 103 3D page, cold deep link: ready | 3.5 s | 3.2 s |

First-load payload (HTML + CSS + JS, gzip): 243 KB of JavaScript alone before; 57.6 KB for everything after (49.7 KB brotli). The 3D engine (146 KB gzip) and each lab download only when their page is opened.

The remaining time on the two 3D pages is not application JavaScript. A main-thread profile of both shows about 85 % of the time in native `(program)` work, which in this harness is software rasterisation and shader linking (the largest JavaScript entry is three.js's shader compile). A real GPU removes most of it, so these two "ready" figures understate the gain on real devices, and the synthetic numbers should not be read as a device benchmark or a Lighthouse score.

## What changed

- **Code splitting.** `build.mjs` now emits an ES-module entry plus chunks. `three.js` and the vacuum viewer, the Hard Services lab, the scrubber lab and the maintenance practice are dynamic imports. The entry keeps only navigation, content data and the guide.
- **Content-hashed output.** Everything under `dist/static/` carries a hash in its name; `index.html` is rewritten to the current names and gets `modulepreload` hints for the shared eager chunks. The three stylesheets are bundled into one, and a small favicon removes the per-load `/favicon.ico` 404.
- **Precompression.** Each text asset is written as `.br` and `.gz` at build time.
- **Server.** `server.mjs` serves exactly the files found in `dist/` (so no request path can reach anything else), negotiates brotli/gzip/identity honouring `q=0`, sends `ETag` with 304 support, `immutable` one-year caching for `/static/` and `no-cache` for HTML. The previous `--dev` flag is gone: it served `src/` unbundled, which cannot work with the bare `three` imports.
- **Render.** `render.yaml` now sets the same cache policy and adds the Content-Security-Policy and Referrer-Policy the local server already sent.
- **Navigation.** Links start fetching their page's code on pointer-over, focus or touch. If a chunk cannot be fetched, the page shows a clear message with a Reload button (Chromium caches a failed `import()` for the lifetime of the page, so reload is the reliable recovery, and it also picks up a newer deployment). The first automatic Page Guide waits until the 3D view exists.
- **Rendering.** The see-through shell materials in both viewers were rewritten every frame; they now update only when "See inside" changes.

## Code review (two passes)

First pass on the existing code, second pass on this change. Each finding was checked against the code.

| Finding | Disposition |
|---|---|
| Hard-lab mode buttons left the guide toolbar and tour hooks on the previous mode | Fixed: a mode change re-applies the guide options; maintenance views register no operating-tour hooks |
| Scrubber and hard-lab maintenance views ran operating-tour setup | Fixed |
| A part moving under a resting cursor paused the tour | Fixed: viewers report whether a hover came from real pointer movement; only that pauses a tour |
| Chromium returns no voices on first call, so Hinglish used the wrong voice | Fixed: waits once (400 ms) for `voiceschanged`; later speech is never delayed; listeners are removed when superseded |
| Manual rotate step had grown to 0.55 rad for every caller | Fixed: 0.55 only for the animated tour step; manual buttons keep their previous 0.28 / 0.30 |
| Wheel, keyboard or orbit input did not cancel a running camera tween | Fixed in both viewers |
| Filter handle highlighted when it could not be grabbed (tap in the wrong state) | Fixed: one `filterGrabbable` rule (now in `filter-care.js`, unit-tested) drives both highlight and grab check; the tap, not the filter, is highlighted in those states |
| Dead filter branches in the bag board and a duplicated grab-handle helper | Removed; helper shared |
| Dead guide API (`onSelect`, `showDetails`, `speakLesson`, `stop`, `tourActive`, `focused`) | Removed |
| An automatic tour could override one the learner started while the 3D view loaded | Fixed |
| `Accept-Encoding: …;q=0` still received that coding | Fixed |
| Compression pass walked `dist/` while writing into it | Fixed: file list collected first |
| Camera tween interpolates along a chord, so a large rotation dips ~4 % toward the target | Left: imperceptible at the tour's 0.55 rad |
| Tour snapshot/restore logic is duplicated across `app.js`, `hard-lab.js`, `scrubber.js` | Left: a shared helper is a worthwhile refactor but not a defect, and is better done with its own tests |
| Rotate constants duplicated in the two viewers | Left: pre-existing, values unchanged |
| `delivery.test.mjs` rebuilds `dist/` | Left: the server reads `dist/` only at startup, so a running preview is unaffected |

## Verification

- `npm test`: 58 tests (51 existing, 7 new: voice loading and cleanup, filter grab rule, and the delivery tests for the bundle graph, a 90 KB first-load budget, caching, compression negotiation and path allowlisting). `npm run check` and the build pass.
- Browser (Chromium, 42 checks, no console or page errors): home boots without fetching the 3D engine; Junior 103 loads it on demand and renders; Junior 429, HYPER 2000B and its maintenance view, Junior 103/429 maintenance, all six Hard Services labs including their maintenance and experiment views, both catalogues and Back navigation; mode switching keeps the guide toolbar correct; a blocked chunk shows the error and Reload recovers; hostile paths, POST and conditional requests behave. Bag and filter practice boards render; a real pointer hover still pauses the tour.

## Not done, and why

- **No comparison with `m-3mdt.onrender.com`.** That host is outside this session's network allowlist (the proxy returns 403), so its features and performance could not be inspected. No features were added on guesswork. To continue, allow the host in the environment's network settings, or list the features to match.
- Not measured on real devices, on a real GPU, or with Lighthouse.
- Nothing is deployed. Render builds from `main`; these changes are on the working branch only.
