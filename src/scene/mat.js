// Shared materials: one studio look for the whole scene (soft, slightly glossy, lit by the room
// environment), so the room, the worker and the vacuum belong together.
import * as THREE from 'three';
import { canvasTex, rng } from './tex.js';
import { characterMaterials } from './character.js';

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
  // for the big room: carpet tiles half a metre square, with a faint check, and large floor tiles
  const carpetTiles = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#44556b'; g.fillRect(0, 0, w, h);
    const r = rng(15);
    for (let i = 0; i < 4200; i++) { const v = 52 + r() * 40; g.fillStyle = `rgb(${v * 0.9},${v * 1.1},${v * 1.5})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = 'rgba(20,28,40,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  }, { repeat: [28, 16] });
  const bigTile = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9dcdd'; g.fillRect(0, 0, w, h); g.fillStyle = '#e4e7e9'; g.fillRect(4, 4, w - 8, h - 8);
    g.strokeStyle = 'rgba(70,80,90,.5)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  }, { repeat: [14, 10] });

  // a hi-vis vest: orange-yellow with silver bands (drawn on the torso's box-mapped faces)
  const vestTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffb320'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e6eaed';
    for (const y of [0.3, 0.64]) g.fillRect(0, h * y, w, h * 0.075);
    for (const x of [0.2, 0.28, 0.7, 0.78]) g.fillRect(w * (x - 0.02), 0, w * 0.04, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (const y of [0.3, 0.64]) { g.fillRect(0, h * y, w, 2); g.fillRect(0, h * (y + 0.075) - 2, w, 2); }
  }, { aniso: 8 });

  return {
    // room
    floorHard: std(0xffffff, { map: tile, roughness: 0.7 }),
    carpet: std(0xffffff, { map: carpet, bumpMap: carpetBump, bumpScale: 1.4, roughness: 1 }),
    carpetBig: std(0xffffff, { map: carpetTiles, bumpMap: carpetBump, bumpScale: 1.2, roughness: 1 }),
    floorHardBig: std(0xffffff, { map: bigTile, roughness: 0.7 }),
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
    vacRed: std(0xb8322d, { roughness: 0.58 }),
    vacGrey: std(0x3a4148, { roughness: 0.65 }),
    vacLid: std(0x2a2f35, { roughness: 0.65 }),
    chrome: std(0xdfe5ea, { metalness: 1, roughness: 0.32 }),
    hoseMat: std(0x2d3238, { roughness: 0.6 }),
    fabric: std(0xf1efe8, { roughness: 1 }),
    brushHair: std(0x1e1f21, { roughness: 1 }),
    // people (the face, hair, cap and polo are in character.js)
    ...characterMaterials(),
    trousers: std(0x1f2a3b, { roughness: 0.85 }),
    belt: std(0x14171a, { roughness: 0.5 }),
    shoe: std(0x15181b, { roughness: 0.6 }),
    vest: std(0xffffff, { map: vestTex, roughness: 0.65 }),
    reflect: std(0xe8ecee, { roughness: 0.35, metalness: 0.4 }),
    glove: std(0x2a7fe0, { roughness: 0.5 }),
    plaster: std(0xf0c9a8, { roughness: 0.7 }),
    plasterBlue: std(0x3b8fe0, { roughness: 0.6 }),
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
