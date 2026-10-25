// Bundles src/ into one self-contained page (dist/index.html), and copies src/media/ beside it
// (narration audio and animation files, when there are any). The hand-tracking runtime (WebAssembly,
// about 27 MB) is copied from node_modules to dist/mediapipe/wasm, so the camera page can load it from
// the same site; it is built here and kept out of Git.
import { build } from 'esbuild';
import fs from 'node:fs';
import { writeHuman } from './tools/human.mjs';

const TITLE = 'EFS Academy | Facility Services Training';

// Shown in the page so you can tell which build you are looking at (Render sets RENDER_GIT_COMMIT).
function buildStamp() {
  const when = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const sha = process.env.RENDER_GIT_COMMIT;
  return sha ? `Render build ${sha.slice(0, 7)} · ${when}` : `Local build · ${when}`;
}
// Noto has Latin and Devanagari, so English, Hindi and Nepali share one look.
const FONTS = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap';
const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS}">`;

function copyWasm() {
  const from = 'node_modules/@mediapipe/tasks-vision/wasm', to = 'dist/mediapipe/wasm';
  if (!fs.existsSync(from)) { console.warn('skipping hand-tracking runtime: @mediapipe/tasks-vision is not installed'); return; }
  fs.mkdirSync(to, { recursive: true });
  for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) fs.copyFileSync(`${from}/${f}`, `${to}/${f}`);
}

async function assemble() {
  const out = await build({
    entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2020',
    write: false, legalComments: 'none', logLevel: 'warning',
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = fs.readFileSync('src/style.css', 'utf8');
  const body = fs.readFileSync('src/body.html', 'utf8').replace('__BUILD__', buildStamp());
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/index.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="color-scheme" content="light dark">
<meta name="description" content="Explore, practise and learn facility services with narrated 3D training: vacuum cleaning, drilling, electrical safety and cascade chiller systems.">
${fontLinks}
<style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`);
  if (fs.existsSync('src/media')) fs.cpSync('src/media', 'dist/media', { recursive: true });
  copyWasm();
  await build({ entryPoints: ['src/interaction/hand-worker.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', outfile: 'dist/hand-worker.js', logLevel: 'warning' });
  await writeHuman('dist/human.bin');
  console.log(`built dist/index.html (${(fs.statSync('dist/index.html').size / 1024).toFixed(0)} KB)`);
}

if (process.argv.includes('--watch')) {
  let t;
  const run = () => assemble().catch((e) => console.error(e.message));
  await run();
  fs.watch('src', { recursive: true }, () => { clearTimeout(t); t = setTimeout(run, 120); });
  console.log('watching src/ …');
} else {
  await assemble();
}
