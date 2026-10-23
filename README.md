# EFS-Training-

Training for soft-services vacuum cleaning. A worker (animated) goes through the cleaning procedure step by step while a narrator speaks, in English, Hindi or Nepali, with no subtitles and a switch between the three. Each step shows the checks it needs (the PAT test label, the cable check, the bag check and so on) and, for the vacuum, only the parts you need to operate it.

This is the first piece: the page is set up and deploys on Render. It lists the 16-step procedure and the six job-card checks, written from the two documents supplied for the project. The narration and the animated worker come next.

## What is in it

| | |
| --- | --- |
| `src/data/steps.js` | The procedure: 16 steps, their checks, the six job-card steps they cover, and the vacuum parts each step shows. |
| `src/main.js`, `src/body.html`, `src/style.css` | The page. |
| `build.mjs` | Bundles the page into one file, `dist/index.html`, and copies `src/media/` (audio and animation files, later) to `dist/media/`. |
| `render.yaml` | The Render setup. |
| `tests/steps.test.mjs` | Checks the procedure data (all 16 steps in order, all six job-card steps covered, every part named exists). |

## Run it here

```bash
npm install
npm run build     # writes dist/index.html
npm run serve     # builds and serves it on http://localhost:5173
npm test
```

## Deploy on Render

The page is a static site, so there is no server to run.

1. In Render, choose **New > Static Site** and pick this repository, branch `main`.
2. Build Command: `npm install && npm run build`. Publish Directory: `dist`.
   (Or choose **New > Blueprint**, which reads `render.yaml` and fills these in.)
3. Deploy.

Auto-deploy on each push depends on the setting in Render; if it is off, use **Manual Deploy > Deploy latest commit**. To check you are looking at the latest build, read the stamp at the bottom of the page: it shows `Render build`, the first seven characters of the commit and the build time.

## Next

- The narrator: one script per step in English, Hindi and Nepali, and a language switch.
- The animated worker doing each step, with the vacuum parts shown only when the step uses them.

Open decisions: how the voices are produced (the browser's own voices, or recorded audio files, which are more dependable for Nepali), whether the worker is 3D or 2D, and which bag-change figure the narrator says (the procedure says two-thirds full, the job card says above 70%).
