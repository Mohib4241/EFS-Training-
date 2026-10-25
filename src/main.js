// Loads the narrator's body (made at build time), then starts the app.
import { App } from './app.js';
import { loadHuman } from './scene/human/body.js';

const wait = document.getElementById('boot');
loadHuman('human.bin').then(() => {
  const app = new App(document.getElementById('stage'));
  window.__app = app;
  if (wait) wait.remove();
  let last = performance.now();
  function frame(now) { const dt = (now - last) / 1000; last = now; app.frame(dt); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}).catch((e) => {
  console.error(e);
  if (wait) {
    wait.classList.add('boot-error');
    wait.innerHTML = `<div><h1>The 3D workspace could not start.</h1><p>Reload the page or try a browser with WebGL enabled. Your learning sources are still available.</p><button onclick="location.reload()">Try again</button><a href="media/vacuum-sop.pdf">Open vacuum SOP</a><a href="media/vacuum-job-card.pdf">Open job card</a><a href="media/reference-presenter.mp4">Watch your EFS guide</a></div>`;
  }
});
