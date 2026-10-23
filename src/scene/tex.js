// Small helpers for drawn textures. In Node (the tests) there is no canvas, so every helper returns
// null and the materials simply go without a map: the scene graph still builds and runs.
import * as THREE from 'three';

export const hasDOM = typeof document !== 'undefined';

/** A texture drawn with the 2D canvas API: draw(ctx, w, h). */
export function canvasTex(w, h, draw, { repeat, srgb = true, aniso = 8, wrap } = {}) {
  if (!hasDOM) return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat || wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** A small seeded random generator, so the scene looks the same every time. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Round-rect path on a 2D context. */
export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
