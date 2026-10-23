// Shared materials: one studio look for the whole scene (soft, slightly glossy, lit by the room
// environment), so the room, the worker and the vacuum belong together.
import * as THREE from 'three';
import { canvasTex, rng } from './tex.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, metalness: 0, ...o });

// A faint noise, used as a bump so flat paint is not perfectly flat.
function noiseTex(seed, size = 128, scale = 1) {
  return canvasTex(size, size, (g, w, h) => {
    const r = rng(seed), d = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 128 + (r() - 0.5) * 120 * scale; d.data.set([v, v, v, 255], i * 4); }
    g.putImageData(d, 0, 0);
  }, { repeat: [6, 6], srgb: false });
}

export function makeMaterials() {
  const grain = noiseTex(7, 128, 0.7);
  const tile = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9dcdd'; g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const v = 214 + Math.floor(r() * 14);
      g.fillStyle = `rgb(${v},${v + 1},${v + 3})`; g.fillRect(x * 256 + 3, y * 256 + 3, 250, 250);
    }
    g.strokeStyle = 'rgba(70,80,90,.55)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
  }, { repeat: [8, 6] });
  const carpet = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#44556b'; g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 5200; i++) { const v = 52 + r() * 40; g.fillStyle = `rgb(${v * 0.9},${v * 1.1},${v * 1.5})`; g.fillRect(r() * w, r() * h, 2, 2); }
  }, { repeat: [10, 10] });
  const carpetBump = noiseTex(21, 128, 1);
  if (carpetBump) carpetBump.repeat.set(14, 14);

  return {
    // room
    floorHard: phys(0xffffff, { map: tile, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    carpet: std(0xffffff, { map: carpet, bumpMap: carpetBump, bumpScale: 1.4, roughness: 1 }),
    wall: std(0xd8d5cd, { bumpMap: grain, bumpScale: 0.25, roughness: 0.92 }),
    skirting: std(0xe9e8e3, { roughness: 0.5 }),
    slab: std(0x2c3641, { roughness: 0.7 }),
    wood: std(0xb98a5e, { roughness: 0.55 }),
    woodDark: std(0x6f4e33, { roughness: 0.6 }),
    door: std(0x2e6f8a, { roughness: 0.5 }),
    metal: std(0xb8c0c6, { metalness: 1, roughness: 0.28 }),
    steel: std(0x8d969d, { metalness: 0.9, roughness: 0.35 }),
    white: std(0xe6e8ea, { roughness: 0.45 }),
    black: std(0x15181b, { roughness: 0.5 }),
    dark: std(0x2a3036, { roughness: 0.55 }),
    rubber: std(0x16181a, { roughness: 0.92 }),
    glass: phys(0xcfe6ee, { roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.35 }),
    // light-giving
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff1cc }),
    corridor: new THREE.MeshBasicMaterial({ color: 0xf2f7ff }),
    green: new THREE.MeshBasicMaterial({ color: 0x35e07a }),
    redLed: new THREE.MeshBasicMaterial({ color: 0xff4a3a }),
    // vacuum
    vacRed: phys(0xd6322b, { roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    vacGrey: phys(0x3a4148, { roughness: 0.4, clearcoat: 0.4 }),
    vacLid: phys(0x2a2f35, { roughness: 0.38, clearcoat: 0.5 }),
    chrome: std(0xdfe5ea, { metalness: 1, roughness: 0.12 }),
    hoseMat: std(0x2d3238, { roughness: 0.6 }),
    fabric: std(0xf1efe8, { roughness: 1 }),
    brushHair: std(0x1e1f21, { roughness: 1 }),
    // people
    skin: std(0xc08a62, { roughness: 0.62 }),
    hair: std(0x171412, { roughness: 0.8 }),
    shirt: std(0x0f7f8c, { roughness: 0.78 }),
    trousers: std(0x1f2a3b, { roughness: 0.85 }),
    shoe: std(0x15181b, { roughness: 0.6 }),
    vest: std(0xffb320, { roughness: 0.7 }),
    reflect: std(0xe8ecee, { roughness: 0.35, metalness: 0.4 }),
    glove: std(0x2a7fe0, { roughness: 0.5 }),
    eyeWhite: std(0xf7f7f7, { roughness: 0.3 }),
    plaster: std(0xf0c9a8, { roughness: 0.7 }),
    plasterBlue: std(0x3b8fe0, { roughness: 0.6 }),
    mouth: std(0x8c3a36, { roughness: 0.6 }),
    // signs and things
    signYellow: std(0xffd21f, { roughness: 0.5 }),
    red: std(0xd23a32, { roughness: 0.5 }),
    blue: std(0x2e7bd6, { roughness: 0.55 }),
    green2: std(0x2fa866, { roughness: 0.55 }),
    yellow: std(0xf2c230, { roughness: 0.55 }),
    paper: std(0xf3efe6, { roughness: 0.9 }),
    bag: std(0x23262a, { roughness: 0.4 }),
    plant: std(0x3f8f4e, { roughness: 0.7 }),
    pot: std(0xcfd3d6, { roughness: 0.6 }),
    grit: std(0x3a2f25, { roughness: 1 }),
  };
}
