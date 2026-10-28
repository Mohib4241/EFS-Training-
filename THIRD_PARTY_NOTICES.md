# Third-party notices

| Component | Used for | Licence | Where it lives |
|---|---|---|---|
| `three` 0.186 | All 3D rendering | MIT | npm dependency, bundled |
| `@mediapipe/tasks-vision` 1.2.0 | On-device hand tracking for the 3D dust-bag change | Apache-2.0 (the package's `license` field) | npm dependency; its JavaScript is bundled and its WebAssembly (`vision_wasm_internal.*`) is copied to `dist/static/mediapipe-1.2.0/` |
| `hand_landmarker.task` (HandLandmarker, float16) | The hand-landmark model | Published by Google for MediaPipe under Apache-2.0 (per the MediaPipe documentation and model card, as read when it was added; re-check before redistributing outside this project) | `src/assets/models/hand_landmarker.task`, served as `dist/static/hand_landmarker-<hash>.task` |

The model was downloaded from
`https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
and has sha256 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.

MediaPipe contains code that can upload anonymous usage logs. The build removes that call (`build.mjs`, plugin `mediapipe-no-telemetry`), the Content-Security-Policy forbids any origin except this site's own, and a test checks both. Camera video is processed in the browser only.
