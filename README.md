# EFS Training

An interactive facility services training hub with a source-linked vacuum SOP and practice labs for vacuum cleaning, drilling, MCB safety, and cascade chiller systems.

The vacuum SOP includes the supplied procedure and job card PDFs, searchable steps, and local learning progress. The hard-services labs are draft training scenarios requiring company review; no hard-services SOP documents were supplied.

Each lab includes selectable parts, exploded views, task demonstrations, guided decisions, and optional hand controls. Hand tracking starts only on request, processes camera frames on device in a worker, and stops when leaving the lab. The camera-free model initialization and inference were verified; real-hand tracking still needs device testing. The procedural worker is an approximation, not an exact replica of the supplied video character.

The 3D **vacuum cleaning** lesson follows all sixteen steps with narration and a current-beat transcript in **English, Hindi or Nepali**. A persistent procedure sequence and English source-linked guidance stay beside the model. Each SOP step has a source-derived knowledge check. Checks are saved separately from lab practice; neither playback nor answers certify practical competence. PPE shown is illustrative: the task risk assessment determines actual PPE.

It is a static web application with no backend. Home, library and practice records work without WebGL. The 3D runtime, body and route modules load only when a lesson or lab is opened; the library remains available if graphics or asset loading fails.

## How it is built

- **The procedure.** The 16-step Standard Operating Procedure is what is taught, in its order and with its figures. The company's six-step job card is used only where the procedure is silent (today that is body posture while cleaning edges and corners). Where the two disagree, the procedure wins: the dust bag is changed when it is **two-thirds full**, not at the job card's 70%. `src/data/steps.js` records every check with its source (`sop`, `sop+card` or `card`), and a test makes sure every check is covered by a narrated beat and the job card's figure is never spoken.
- **The scene.** Three.js PBR with neutral studio illumination, restrained shadows and adaptive pixel resolution. No bloom or postprocessing passes. `G` cycles Auto, High, Medium, Low; `P` shows measured frame cadence. Camera framing respects the actual viewport. Reduced-motion preferences disable introductory autoplay and camera easing; procedure playback remains explicitly available.
- **The worker.** A person built from code, with a walk cycle, crouching, two-bone inverse kinematics so hands really reach what they touch, blinking, and protective equipment that is put on and taken off. No model files.
- **The vacuum.** A canister machine with its casing, wheels, on/off switch, cable and plug, PAT label, dust bag, hose, wand, a floor head whose brush can be switched on and off, and accessories. The cable follows the machine, the dirt disappears where the head goes over it, and the floor keeps the stripes of the passes.
- **The narration.** One sentence or two per *beat*, written in all three languages next to the action it goes with (`src/steps/`). A beat ends when both the action and the speech have finished, so picture and voice stay together in every language even though the sentences take different times.

## The narrator and its voices

The voice is the browser's own (the Web Speech API): no audio files, no cost, nothing to host.

- **English and Hindi** have voices on most phones and computers.
- **Nepali** has a voice on many Android phones, but often not on a computer. When there is none, a **Hindi voice reads the Nepali text** (the two share a script, so it can read it) and the page says that the pronunciation will be approximate. If the device has no voice at all for a language, the scene still plays, without sound, and says so.
- Chrome only speaks after the page has been touched, so the language buttons on the start screen also start the lesson.
- The Hindi and Nepali narration was written for this project and **should be read by a native speaker** before it is used for real training.

## Controls

| | |
| --- | --- |
| Start | Choose the narrator's language |
| Space | Play or pause |
| ← and → | Previous or next step |
| `L` | Switch language |
| `M` | Sound on or off (the lesson carries on without sound) |
| Steps button, or the bar at the bottom | Jump to any step |
| `P`, `G` | Frame rate, graphics level |

Jumping to a step rebuilds the scene and runs every earlier step at once without drawing, so the world is exactly as it would have been, not a guess.

## Run it

```bash
npm install
npm run build     # writes dist/index.html plus media, model and worker assets
npm run serve     # builds and serves it on http://localhost:5173
npm test
npm run check     # JavaScript syntax checks; no lint or TypeScript toolchain is configured
```

The tests (`npm test`, no browser needed) check the voice choice and text splitting, that the 16 steps are in order with narration in all three languages, that the procedure's checks are all covered, that only the parts a step uses are pointed at, that a hand reaches what it is sent to, that the whole training plays through to the end, and that jumping to a step gives the same scene as playing up to it.

## Deploy on Render

A static site:

1. In Render, **New > Static Site**, pick this repository, branch `main`.
2. Build Command `npm install && npm run build`, Publish Directory `dist`. (Or **New > Blueprint**, which reads `render.yaml`.)
3. Deploy. If auto-deploy is off, use **Manual Deploy > Deploy latest commit**.

Build metadata is retained in the generated HTML footer and dist/build-metadata.json. The build emits hashed ESM chunks under assets/; deploy the entire dist directory. Hashed scripts are immutable; source media uses revalidation rather than a year-long immutable cache under mutable filenames.

See [engineering audit](docs/enterprise-audit.md) and [implementation and validation report](docs/enterprise-report.md) for the architecture, content boundaries, measured results and remaining device checks. Browser QA scripts in tools/ use an existing Playwright installation via PLAYWRIGHT_MODULE; no new runtime dependency is required.

## Layout

```
src/
  main.js           starts everything
  director.js       plays the beats; keeps picture and voice together; jumping
  narrator.js       browser voices, picking a voice, splitting and timing speech
  i18n.js           words on the controls and the part names, in three languages
  ui.js             start screen, language switch, bar, step list, labels on parts
  quality.js        graphics level and render scale from the frame rate
  data/steps.js     the procedure: checks, sources, parts shown
  steps/            the 16 steps: narration in three languages beside each action
  scene/            stage (renderer, lights), room, worker, vacuum, props, world, camera shots
tests/              node --test
```

## Honest limits

- It was checked headless: the logic and the 16 steps run end to end, and the scene was looked at in screenshots on a software renderer. The spoken audio could not be heard here, so voices, timing against real speech and the Hindi and Nepali pronunciation are untested.
- The room, the machine and the worker are stylised, not a particular model of vacuum. The parts shown follow the procedure and the job card; check them against the machine used.
