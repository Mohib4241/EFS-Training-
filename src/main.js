import { App } from './app.js';

const app = new App(document.getElementById('stage'));

// for tests and screenshots
window.__app = app;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  app.frame(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
