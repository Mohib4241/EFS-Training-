// Loads the narrator's body (made at build time), then starts the app.
import { App } from './app.js';
import { loadHuman } from './scene/human/body.js';

const wait = document.getElementById('boot');
loadHuman('human.bin').then(() => {
  const app = new App(document.getElementById('stage'));
  window.__app = app;
  if (wait) wait.remove();
  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; app.frame(dt); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}).catch((e) => {
  console.error(e);
  if (wait) wait.textContent = 'The training could not load. Please reload the page.';
});
