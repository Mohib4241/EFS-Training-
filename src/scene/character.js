// The person: a friendly, soft-looking cartoon man built from code. This file has the parts that make
// him look like himself: the head (a shaped skull, big eyes with lids that blink, brows, a nose, ears,
// swept blond hair and a mouth that really opens), the white EFS cap, the polo collar and chest logo,
// and a hand with fingers that can curl round a handle.
//
// The head is in its own frame: the origin is where the chin meets the neck, +y is up and +z is
// forward, in metres. The mouth is drawn as a few thin shapes laid on the skin (inside of the mouth,
// teeth, tongue and two lips) that are rebuilt when the mouth moves, and the jaw is a morph target, so
// the chin drops with it.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng, hasDOM } from './tex.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Where the features are on the head.
export const FACE = { eyeX: 0.034, eyeY: 0.143, eyeR: 0.022, browY: 0.167, noseY: 0.104, mouthY: 0.061, top: 0.246 };

export const BRAND = { blue: '#20468f', blueHex: 0x20468f, collar: 0x365975 };

/**
 * The EFS mark: the three letters in navy blue with a small arrow after them, green going to yellow.
 * Draws on a 2D canvas, centred on (cx, cy); `h` is the height of the letters in pixels.
 */
export function drawEFS(c, cx, cy, h, { arrow = true } = {}) {
  c.save();
  c.font = `900 ${h * 1.12}px "Noto Sans", system-ui, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
  const tw = c.measureText('EFS').width, aw = arrow ? h * 0.62 : 0, total = tw + aw + h * 0.06;
  const x0 = cx - total / 2;
  c.fillStyle = BRAND.blue; c.fillText('EFS', x0, cy);
  if (arrow) {
    const ax = x0 + tw + h * 0.06;
    c.fillStyle = '#1b3a7a'; c.beginPath(); c.moveTo(ax, cy - h * 0.46); c.lineTo(ax + aw * 0.32, cy); c.lineTo(ax, cy + h * 0.46); c.closePath(); c.fill();     // the dark edge of the arrow
    const g = c.createLinearGradient(ax, cy, ax + aw, cy); g.addColorStop(0, '#4f9a45'); g.addColorStop(0.6, '#a6c63a'); g.addColorStop(1, '#e3e84a');
    c.fillStyle = g; c.beginPath(); c.moveTo(ax + aw * 0.12, cy - h * 0.46); c.lineTo(ax + aw, cy); c.lineTo(ax + aw * 0.12, cy + h * 0.02); c.closePath(); c.fill();
    c.fillStyle = '#9aa2a6'; c.beginPath(); c.moveTo(ax + aw * 0.12, cy + h * 0.02); c.lineTo(ax + aw, cy); c.lineTo(ax + aw * 0.12, cy + h * 0.46); c.closePath(); c.fill();
  }
  c.restore();
}

// ───────────── materials ─────────────
export function characterMaterials() {
  const faceDetail = { texture: null, ready: { value: 0 } };
  let eyeMap;
  if (hasDOM) {
    faceDetail.texture = new THREE.TextureLoader().load('media/guide-face-albedo.png', () => {
      faceDetail.ready.value = 1;
      if (eyeMap?.image) {
        const img = faceDetail.texture.image, g = eyeMap.image.getContext('2d'), size = eyeMap.image.width, c = size / 2, r = size * .222;
        g.fillStyle = '#f1eeea'; g.fillRect(0, 0, size, size);
        g.save(); g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.clip();
        const irisRadius = img.width * .046;
        g.drawImage(img, img.width * .312 - irisRadius, img.height * .319 - irisRadius, irisRadius * 2, irisRadius * 2, c - r, c - r, r * 2, r * 2);
        g.restore(); eyeMap.needsUpdate = true;
      }
    });
    faceDetail.texture.colorSpace = THREE.SRGBColorSpace;
    faceDetail.texture.anisotropy = 8;
  }
  const grain = canvasTex(64, 64, (g, w, h) => {
    const r = rng(5), d = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 128 + (r() - 0.5) * 90; d.data.set([v, v, v, 255], i * 4); }
    g.putImageData(d, 0, 0);
  }, { repeat: [10, 10], srgb: false });
  const hairTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#b99362'; g.fillRect(0, 0, w, h);
    const r = rng(31);
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y0 = r() * h * 0.5, len = 40 + r() * h * 0.7, l = 36 + r() * 32;
      g.strokeStyle = `hsla(${34 + r() * 8},${35 + r() * 15}%,${l}%,${0.12 + r() * 0.18})`; g.lineWidth = .5 + r();
      g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + (r() - 0.5) * 14, y0 + len / 2, x + (r() - 0.5) * 18, y0 + len); g.stroke();
    }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(60,36,12,0.38)'); gr.addColorStop(0.5, 'rgba(60,36,12,0)'); gr.addColorStop(1, 'rgba(60,36,12,0.22)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const iris = canvasTex(256, 256, (g, w, h) => {
    const c = w / 2;
    let gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, '#0a0c10'); gr.addColorStop(0.3, '#0a0c10'); gr.addColorStop(0.33, '#a9c7dc'); gr.addColorStop(0.6, '#7ea3c2'); gr.addColorStop(0.88, '#4d6f93'); gr.addColorStop(1, '#27374f');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
    const r = rng(8);
    for (let i = 0; i < 90; i++) {                                         // fibres running out from the pupil
      const a = r() * 6.283, r0 = c * 0.34, r1 = c * (0.62 + r() * 0.36);
      g.strokeStyle = r() < 0.5 ? 'rgba(220,238,250,.22)' : 'rgba(20,40,70,.28)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
    }
    g.fillStyle = 'rgba(8,14,26,.45)'; g.beginPath(); g.arc(c, c * 0.34, c * 0.95, 0.15, Math.PI - 0.15); g.fill();   // the lid's shade on the top of the eye
  }, { aniso: 4 });
  // A complete eye surface: the iris stays behind the moving lids instead of rotating a white ball
  // through the face. The square map preserves a round pupil on the curved almond-shaped surface.
  eyeMap = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f1eeea'; g.fillRect(0, 0, w, h);
    const c = w / 2, r = w * .222;
    const color = g.createRadialGradient(c, c, r * .22, c, c, r);
    color.addColorStop(0, '#111f27'); color.addColorStop(.18, '#111f27');
    color.addColorStop(.25, '#93b9bb'); color.addColorStop(.64, '#6c989f');
    color.addColorStop(.9, '#48747c'); color.addColorStop(1, '#284952');
    g.fillStyle = color; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
    const random = rng(81);
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * Math.PI * 2, start = r * (.36 + random() * .08), end = r * (.76 + random() * .2);
      g.strokeStyle = random() > .5 ? '#b6d0c666' : '#24464c66'; g.lineWidth = 1 + random();
      g.beginPath(); g.moveTo(c + Math.cos(a) * start, c + Math.sin(a) * start); g.lineTo(c + Math.cos(a + .025) * end, c + Math.sin(a + .025) * end); g.stroke();
    }
    g.fillStyle = '#101d24'; g.beginPath(); g.arc(c, c, r * .35, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(c - r * .32, c - r * .38, r * .16, r * .12, -.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff99'; g.beginPath(); g.arc(c + r * .35, c + r * .28, r * .065, 0, Math.PI * 2); g.fill();
  });
  // Tuned from the supplied EFS presenter clip: a warm, natural complexion under the studio lights.
  const skinBase = 0xe9b18c;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  return {
    faceDetail,
    skin: new THREE.MeshPhysicalMaterial({ color: skinBase, roughness: 0.64, sheen: .18, sheenColor: new THREE.Color(0xffd0b5), sheenRoughness: 0.8 }),
    noseTip: new THREE.MeshStandardMaterial({ color: 0xe4a084, roughness: 0.5 }),
    lid: new THREE.MeshStandardMaterial({ color: skinBase, roughness: 0.64 }),
    skinWarm: new THREE.MeshPhysicalMaterial({ color: 0xe49a82, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xff8a78), sheenRoughness: 0.5 }),
    hair: std(0xffffff, { map: hairTex, roughness: 0.55 }),
    brow: std(0x6f4c2c, { roughness: 0.7 }),
    lash: std(0x4b3426, { roughness: 0.6 }),
    sclera: std(0xf6f4f0, { roughness: 0.18 }),
    iris: new THREE.MeshPhysicalMaterial({ map: iris, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
    eyeSurface: new THREE.MeshPhysicalMaterial({ map: eyeMap, color: 0xffffff, roughness: .34, clearcoat: .6, clearcoatRoughness: .16 }),
    nostril: std(0x8e5540, { roughness: .9 }),
    catchlight: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    mouthIn: new THREE.MeshBasicMaterial({ color: 0x4a1a1c }),
    crease: new THREE.MeshBasicMaterial({ color: 0xa86d55, transparent: true, opacity: 0.24, depthWrite: false }),
    teeth: std(0xfaf6ee, { roughness: 0.25 }),
    tongue: std(0xd9707a, { roughness: 0.5 }),
    lipTop: std(0xb87d65, { roughness: 0.66 }),
    lipBottom: std(0xd69b7c, { roughness: 0.56 }),
    blush: new THREE.MeshBasicMaterial({ color: 0xff7f86, transparent: true, opacity: 0.0, depthWrite: false }),
    // clothes
    poloWhite: std(0xdfe1e3, { bumpMap: grain, bumpScale: 0.00035, roughness: 0.85 }),
    poloBlue: std(BRAND.collar, { bumpMap: grain, bumpScale: 0.00025, roughness: 0.78 }),
    capWhite: std(0xffffff, { roughness: 0.82 }),
    capBlue: std(0x20468f, { roughness: 0.7 }),
    button: std(0xdfe7f2, { roughness: 0.3 }),
  };
}

// ───────────── the head ─────────────
// A point on the unit sphere becomes a point on the head: wide over the cheekbones, narrowing to a
// firm jaw and a rounded chin.
function shapeHead(x, y, z) {
  const low = smooth(0.05, -0.95, y);
  let X = x * 0.083 * (1 - 0.06 * low);
  X *= 1 + .14 * Math.exp(-(((y + .58) / .27) ** 2));
  let yy = y;
  if (y < -0.8) yy = -0.8 + (y + 0.8) * .42;
  const Y = 0.123 + yy * 0.123;
  let Z = z * .086 * (1 - .04 * low);
  if (z > 0) {
    const gaussian = (cx, cy, sx, sy) => Math.exp(-(((X - cx) / sx) ** 2) - (((Y - cy) / sy) ** 2));
    // One continuous skin surface for brow ridge, sockets, bridge, nose tip, cheeks and chin.
    // This is true depth, so the silhouette still works when the SOP camera moves to the side.
    const detail = .015 * gaussian(0, .128, .012, .037) + .014 * gaussian(0, .105, .017, .015)
      + .006 * (gaussian(.011, .102, .009, .01) + gaussian(-.011, .102, .009, .01))
      + .007 * (gaussian(.046, .111, .027, .027) + gaussian(-.046, .111, .027, .027))
      + .01 * gaussian(0, .067, .035, .025) + .024 * gaussian(0, .033, .045, .03)
      - .0065 * (gaussian(FACE.eyeX, FACE.eyeY, .023, .017) + gaussian(-FACE.eyeX, FACE.eyeY, .023, .017));
    Z += smooth(.1, .65, z) * detail;
  }
  return [X, Y, Z];
}

function headGeometry(wi, hi) {
  const g = new THREE.SphereGeometry(1, wi, hi);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const [x, y, z] = shapeHead(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); }
  const m = mergeVertices(g, 1e-5);
  m.computeVertexNormals();
  return m;
}

/** The generated diffuse material is projected onto actual facial geometry. Eyes and lips are
 * excluded so blinks, eye tracking, speech and jaw motion remain fully animated in three dimensions.
 * The projection fades into the base skin around the sides/back of the head; it is never a face card.
 */
function faceSkin(M, origin = V(0, 0, 0), vertexColors = true) {
  const material = M.skin.clone(); material.vertexColors = vertexColors;
  if (!M.faceDetail?.texture) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFaceDetail = { value: M.faceDetail.texture };
    shader.uniforms.uFaceReady = M.faceDetail.ready;
    shader.uniforms.uFaceOrigin = { value: origin };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFacePosition;\nuniform vec3 uFaceOrigin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFacePosition = position + uFaceOrigin;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFacePosition;\nuniform sampler2D uFaceDetail;\nuniform float uFaceReady;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fy = vFacePosition.y;
        float fv;
        if (fy < .061) fv = mix(.05, .285, (fy - .014) / .047);
        else if (fy < .104) fv = mix(.285, .448, (fy - .061) / .043);
        else if (fy < .143) fv = mix(.448, .681, (fy - .104) / .039);
        else if (fy < .167) fv = mix(.681, .806, (fy - .143) / .024);
        else fv = mix(.806, .98, (fy - .167) / .058);
        vec2 faceUV = vec2(.5 + vFacePosition.x / .1814, clamp(fv, .005, .995));
        vec2 eyeCoord = vec2((abs(vFacePosition.x) - .034) / .022, (fy - .143) / .015);
        vec2 mouthCoord = vec2(vFacePosition.x / .038, (fy - .061) / .017);
        float eyeDistance = dot(eyeCoord, eyeCoord);
        float mouthDistance = dot(mouthCoord, mouthCoord);
        float eyeFade = smoothstep(.85, 1.4, eyeDistance);
        float mouthFade = smoothstep(.9, 1.3, mouthDistance);
        vec3 albedo = texture2D(uFaceDetail, faceUV).rgb;
        albedo = mix(texture2D(uFaceDetail, vec2(faceUV.x, .565 + (fv - .681) * .5)).rgb, albedo, eyeFade);
        albedo = mix(texture2D(uFaceDetail, vec2(faceUV.x, .18 + (fv - .285) * .4)).rgb, albedo, mouthFade);
        float detailBlend = uFaceReady * smoothstep(.012, .065, vFacePosition.z);
        diffuseColor.rgb = mix(diffuseColor.rgb, albedo, detailBlend * .85);
      `);
  };
  material.customProgramCacheKey = () => 'efs-reference-face-v1';
  return material;
}

export class Head {
  constructor(M, { cap = true, neck = true } = {}) {
    this.M = M;
    this.group = new THREE.Group();
    this.mouth = { open: 0, wide: 0.7, round: 0 };       // what is shown now
    this.mouthT = { open: 0, wide: 0.7, round: 0 };      // what the speech asks for
    this.blink = 0; this.nextBlink = 1.5; this.t = 0;
    this.lookYaw = 0; this.lookPitch = 0;
    this.brow = 0; this.browT = 0;
    this.smileT = 0.6; this.smile = 0.6;
    this.lids = 0.85;
    this._build(cap, neck);
  }

  _mesh(geo, mat, parent, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
  }

  /** Height of the skin in front of a point (x, y) on the face. */
  zAt(x, y) {
    // Invert the sculpt's X/Y mapping directly. This avoids a lower-detail raycast surface that
    // could bury teeth and eyelid edges inside the rendered skin, and makes character creation cheap.
    let sy = (y - .123) / .123;
    if (sy < -.8) sy = -.8 + (sy + .8) / .42;
    const low = smooth(.05, -.95, sy);
    const sx = x / (.083 * (1 - .06 * low) * (1 + .14 * Math.exp(-(((sy + .58) / .27) ** 2))));
    const zz = 1 - sx * sx - sy * sy;
    return zz >= 0 ? shapeHead(sx, sy, Math.sqrt(zz))[2] : .09;
  }

  _build(cap, neck = true) {
    const M = this.M, g = this.group;

    // skull and jaw (the jaw is a morph target)
    const geo = headGeometry(96, 64);
    const p = geo.attributes.position, jaw = new Float32Array(p.count * 3), brows = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = smooth(FACE.mouthY + 0.012, FACE.mouthY - 0.016, y) * (1 - 0.75 * smooth(0.05, 0.095, Math.abs(x))) * smooth(-0.05, 0.02, z);
      jaw[i * 3 + 1] = -0.021 * d; jaw[i * 3 + 2] = -0.004 * d;
      brows[i * 3 + 1] = .0085 * Math.exp(-(((Math.abs(x) - FACE.eyeX) / .029) ** 2) - (((y - FACE.browY) / .018) ** 2)) * smooth(.02, .065, z);
    }
    geo.morphAttributes.position = [new THREE.BufferAttribute(jaw, 3), new THREE.BufferAttribute(brows, 3)];
    geo.morphTargetsRelative = true;
    const colors = [], tint = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), front = smooth(0, .06, p.getZ(i));
      const cheek = Math.exp(-(((Math.abs(x) - .05) / .026) ** 2) - (((y - .107) / .027) ** 2)) * front;
      tint.set(0xffffff).lerp(new THREE.Color(0xffc4b2), cheek * .36);
      colors.push(tint.r, tint.g, tint.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.skin = this._mesh(geo, faceSkin(M), g);
    this.skin.morphTargetInfluences = [0, 0];

    this._ears(); this._eyes(); this._brows(); this._nose(); this._cheeks(); this._mouth(); this._hair();
    // neck
    if (neck) this._mesh(new THREE.CylinderGeometry(0.041, 0.05, 0.14, 24), M.skin, g, 0, -0.045, -0.008);    // a body with its own neck leaves this out
    if (cap) this._cap();
  }

  _ears() {
    const M = this.M;
    for (const s of [-1, 1]) {
      const ear = this._mesh(new THREE.SphereGeometry(0.026, 28, 20), M.skin, this.group, s * 0.091, 0.119, -0.006);
      ear.scale.set(0.4, 1.02, 0.59); ear.rotation.z = -s * 0.12; ear.rotation.y = s * 0.22;
      const inner = this._mesh(new THREE.SphereGeometry(0.013, 20, 14), M.skinWarm, this.group, s * 0.0985, 0.12, 0.001, false);
      inner.scale.set(0.2, 1.0, 0.55);
    }
  }

  _eyes() {
    this.eyes = [];
    for (const s of [-1, 1]) {
      const grp = new THREE.Group(); grp.position.set(s * FACE.eyeX, FACE.eyeY, 0); this.group.add(grp);
      const cols = 40, rows = 8, positions = new Float32Array((cols + 1) * (rows + 1) * 3), uv = new Float32Array((cols + 1) * (rows + 1) * 2), idx = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j, b = a + rows + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
      const eye = this._mesh(geo, this.M.eyeSurface, grp, 0, 0, 0, false); eye.frustumCulled = false;
      const ringGeo = new THREE.BufferGeometry(), ringPos = new Float32Array(65 * 4 * 3), ringIdx = [];
      for (let i = 0; i < 64; i++) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = a + 4; ringIdx.push(a, a + 1, b, b, a + 1, b + 1); }
      ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3)); ringGeo.setIndex(ringIdx);
      const lid = this._mesh(ringGeo, faceSkin(this.M, grp.position.clone(), false), grp, 0, 0, 0, false); lid.frustumCulled = false;
      const rimGeo = new THREE.BufferGeometry(), rimIdx = [];
      rimGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((cols + 1) * 6), 3));
      for (let i = 0; i < cols; i++) { const a = i * 2; rimIdx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); }
      rimGeo.setIndex(rimIdx);
      const rim = this._mesh(rimGeo, this.M.lash, grp, 0, 0, 0, false); rim.frustumCulled = false;
      // Fitted outer socket samples are static. The inner rim is updated when the eyelids blink.
      const outside = [];
      for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, x = .029 * Math.cos(a), y = .023 * Math.sin(a); outside.push([x, y, this.zAt(grp.position.x + x, FACE.eyeY + y) + .0002]); }
      const skinZ = new Float32Array(17 * 17);
      for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) skinZ[y * 17 + x] = this.zAt(grp.position.x - .025 + x * .05 / 16, FACE.eyeY - .025 + y * .05 / 16);
      this.eyes.push({ side: s, grp, eye, lid, rim, outside, cols, rows, skinZ });
    }
    this._drawEyes(0);
  }

  _drawEyes(closed) {
    const hw = .0205, height = .013, opening = Math.max(.015, 1 - closed);
    for (const e of this.eyes) {
      const eyeGeo = e.eye.geometry, pos = eyeGeo.attributes.position, uv = eyeGeo.attributes.uv;
      const surface = (x, y) => {
        const fx = clamp((x + .025) / .05 * 16, 0, 16), fy = clamp((y + .025) / .05 * 16, 0, 16), ix = Math.min(15, Math.floor(fx)), iy = Math.min(15, Math.floor(fy)), u = fx - ix, v = fy - iy, z = e.skinZ;
        const base = (z[iy * 17 + ix] * (1 - u) + z[iy * 17 + ix + 1] * u) * (1 - v) + (z[(iy + 1) * 17 + ix] * (1 - u) + z[(iy + 1) * 17 + ix + 1] * u) * v;
        return base + .0012 + .006 * Math.max(0, 1 - (x / hw) ** 2 - (y / .022) ** 2);
      };
      for (let i = 0; i <= e.cols; i++) {
        const t = i / e.cols * 2 - 1, x = t * hw, arch = Math.sqrt(Math.max(0, 1 - t * t));
        const top = height * arch * opening, bottom = -height * .76 * arch * opening;
        for (let j = 0; j <= e.rows; j++) {
          const y = bottom + (top - bottom) * j / e.rows, at = i * (e.rows + 1) + j;
          pos.setXYZ(at, x, y, surface(x, y));
          uv.setXY(at, .5 + x / (hw * 2) - this.lookYaw * .18, .5 + y / (hw * 2) - this.lookPitch * .18);
        }
      }
      pos.needsUpdate = uv.needsUpdate = true; eyeGeo.computeVertexNormals();
      e.eye.visible = closed < .99;
      const rim = e.rim.geometry.attributes.position;
      for (let i = 0; i <= e.cols; i++) {
        const t = i / e.cols * 2 - 1, x = t * hw, arch = Math.sqrt(Math.max(0, 1 - t * t)), y = height * arch * opening;
        rim.setXYZ(i * 2, x, y, surface(x, y) + .00035);
        rim.setXYZ(i * 2 + 1, x, y + .00065 * arch, surface(x, y) + .0004);
      }
      rim.needsUpdate = true; e.rim.geometry.computeVertexNormals();
      const ring = e.lid.geometry.attributes.position;
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * Math.PI * 2, x = hw * Math.cos(a), y = height * Math.sin(a) * (Math.sin(a) < 0 ? .76 : 1) * opening;
        const z = surface(x, y), outer = e.outside[i];
        for (let j = 0; j < 4; j++) { const t = j / 3; ring.setXYZ(i * 4 + j, x + (outer[0] - x) * t, y + (outer[1] - y) * t, z + (outer[2] - z) * t + .0009 * Math.sin(t * Math.PI)); }
      }
      ring.needsUpdate = true; e.lid.geometry.computeVertexNormals();
    }
  }

  _brows() {
    const M = this.M;
    const sh = new THREE.Shape();
    sh.moveTo(-0.026, 0.0); sh.quadraticCurveTo(-0.004, 0.0125, 0.026, -0.0035); sh.quadraticCurveTo(0.004, 0.0035, -0.026, 0.0012); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.0016, bevelSegments: 2, curveSegments: 10 });
    this.brows = [];
    for (const s of [-1, 1]) {
      const x = s * 0.038, y = FACE.browY;
      const pivot = new THREE.Group(); pivot.position.set(x, y, this.zAt(x, y) + 0.0008); this.group.add(pivot);
      const b = this._mesh(geo, M.brow, pivot, 0, 0, 0, false);
      b.scale.set(s * .92, 1.15, 1); b.rotation.y = s * 0.42; b.rotation.z = -s * 0.08;       // follows the curve of the forehead; the outer end a little lower
      this.brows.push({ pivot, base: y, side: s });
    }
  }

  _nose() {
    // The bridge and tip are sculpted into the skull; only the recessed nostrils are separate.
    for (const side of [-1, 1]) {
      const x = side * .0085, y = .096;
      const hole = this._mesh(new THREE.SphereGeometry(.0028, 16, 10), this.M.nostril, this.group, x, y, this.zAt(x, y) - .0005, false);
      hole.scale.set(1, .45, .4); hole.rotation.z = side * .2;
    }
  }

  _cheeks() {
    const tex = canvasTex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    this.M.blush.map = tex; this.M.blush.opacity = 0.08; this.M.blush.needsUpdate = true;
    this.cheeks = [];
    for (const s of [-1, 1]) {
      const x = s * 0.056, y = 0.092, z = this.zAt(x, y);
      const e = 0.004, dzx = (this.zAt(x + e, y) - this.zAt(x - e, y)) / (2 * e), dzy = (this.zAt(x, y + e) - this.zAt(x, y - e)) / (2 * e);
      const m = this._mesh(new THREE.PlaneGeometry(0.056, 0.044), this.M.blush, this.group, x, y, z + 0.0012, false);
      m.quaternion.setFromUnitVectors(V(0, 0, 1), V(-dzx, -dzy, 1).normalize()); m.renderOrder = 2;
      this.cheeks.push(m);
    }
  }

  _mouth() {
    const M = this.M, N = 25;
    this.mN = N;
    const mk = (mat, order) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.frustumCulled = false; m.renderOrder = order; m.castShadow = false; this.group.add(m); return m; };
    this.mInside = mk(M.mouthIn, 3);
    this.mTeeth = mk(M.teeth, 4);
    this.mTongue = mk(M.tongue, 4);
    this.creases = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), M.crease); m.frustumCulled = false; m.renderOrder = 2; m.castShadow = false; this.group.add(m); return m; });
    this.mLipTop = mk(M.lipTop, 5);
    this.mLipBottom = mk(M.lipBottom, 5);
    // sample the skin once for the mouth, so each frame is only arithmetic
    this._zGrid = (() => {
      const nx = 33, ny = 25, x0 = -0.05, x1 = 0.05, y0 = 0.005, y1 = 0.085, a = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) a[j * nx + i] = this.zAt(x0 + (x1 - x0) * i / (nx - 1), y0 + (y1 - y0) * j / (ny - 1));
      return { a, nx, ny, x0, x1, y0, y1 };
    })();
    this._drawMouth();
  }

  _z(x, y) {
    const G = this._zGrid;
    const fx = clamp((x - G.x0) / (G.x1 - G.x0), 0, 1) * (G.nx - 1), fy = clamp((y - G.y0) / (G.y1 - G.y0), 0, 1) * (G.ny - 1);
    const i = Math.min(G.nx - 2, Math.floor(fx)), j = Math.min(G.ny - 2, Math.floor(fy)), u = fx - i, v = fy - j, a = G.a, n = G.nx;
    return (a[j * n + i] * (1 - u) + a[j * n + i + 1] * u) * (1 - v) + (a[(j + 1) * n + i] * (1 - u) + a[(j + 1) * n + i + 1] * u) * v;
  }

  /** Rebuild the mouth shapes for the current open / wide / round / smile. */
  _drawMouth() {
    const { open, wide, round } = this.mouth, smile = this.smile, N = this.mN;
    const hw = (0.023 + 0.006 * wide - 0.008 * round) * (0.96 + 0.08 * smile), cy = FACE.mouthY;
    const up = [], lo = [];
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1)) * 2 - 1, x = t * hw, c = t * t;
      const corner = 0.007 * smile * c - 0.0035 * round * (1 - c);
      const upper = cy + corner + 0.0028 * (1 - c) * (1 - 0.5 * round) * (this._speaking ? open : 1);
      const smileGap = this._speaking ? 0 : Math.max(0, smile - .35) * .013 * (1 - round);
      const gap = (open * 0.026 * (1 - 0.35 * round) + smileGap) * Math.pow(1 - c, 0.7) + 0.0005 * (1 - c);
      const lower = cy + corner - 0.0006 - gap;
      up.push(V(x, upper, 0)); lo.push(V(x, lower, 0));
    }
    const fit = (arr, dz) => arr.map((q) => V(q.x, q.y, this._z(q.x, q.y) + dz));
    const U = fit(up, 0.0016), L = fit(lo, 0.0016);
    // inside of the mouth: a strip between the lips
    const pos = [], idx = [];
    for (let i = 0; i < N; i++) { pos.push(U[i].x, U[i].y, U[i].z - 0.0011, L[i].x, L[i].y, L[i].z - 0.0011); }
    for (let i = 0; i < N - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, c, b, d); }
    this._setGeo(this.mInside, pos, idx);
    // upper teeth hang from the upper lip when the mouth is a little open
    const gapC = U[(N - 1) / 2].y - L[(N - 1) / 2].y;
    const tooth = clamp(gapC * 0.62, 0, 0.0125), showT = gapC > 0.0035;
    this.mTeeth.visible = showT;
    if (showT) {
      const p2 = [], i2 = [];
      for (let i = 2; i < N - 2; i++) { const u = U[i], t = (i / (N - 1)) * 2 - 1, w = tooth * (1 - 0.35 * t * t); p2.push(u.x * 0.93, u.y - 0.0008, u.z - 0.0008, u.x * 0.93, u.y - w, u.z - 0.0008); }
      for (let i = 0; i < p2.length / 6 - 1; i++) { const a = i * 2; i2.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
      this._setGeo(this.mTeeth, p2, i2);
    }
    // tongue: a soft ellipse on the floor of the mouth
    const tongueOn = gapC > 0.014;
    this.mTongue.visible = tongueOn;
    if (tongueOn) {
      const p3 = [], i3 = [], m = Math.floor(N / 2), cx = 0, cyT = L[m].y + gapC * 0.34, rx = hw * 0.5, ry = gapC * 0.26;
      p3.push(cx, cyT, this._z(cx, cyT) + 0.0009);
      for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cyT + Math.sin(a) * ry; p3.push(x, y, this._z(x, y) + 0.0009); }
      for (let k = 1; k <= 16; k++) i3.push(0, k, k + 1);
      this._setGeo(this.mTongue, p3, i3);
    }
    // the smile lines beside the corners of the mouth
    this.creases.forEach((m, k) => {
      const sd = k ? 1 : -1, show = smile > 0.25;
      m.visible = show; if (!show) return;
      const cx = sd * (hw + 0.0035), cyc = up[sd > 0 ? N - 1 : 0].y, pts = [];
      for (let a = 0; a <= 6; a++) { const u = a / 6, x = cx + sd * (0.0035 + 0.0038 * Math.sin(u * Math.PI)), y = cyc + 0.006 - 0.012 * u; pts.push(V(x, y, this._z(x, y) + 0.0012)); }
      m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.00045 + 0.0003 * smile, 5, false);
    });
    // the lips: a thin tube along each edge
    this._tube(this.mLipTop, U, 0.0015); this._tube(this.mLipBottom, L, 0.002);
  }

  _setGeo(mesh, pos, idx) {
    const g = mesh.geometry; g.dispose();
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setIndex(idx);
    ng.computeVertexNormals(); mesh.geometry = ng;
  }
  _tube(mesh, pts, r) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 28, r, 6, false);
  }

  _hair() {
    const M = this.M, g = this.group;
    // a shell round the back and sides of the head, under the cap; the front is pushed inside the skull
    const geo = new THREE.SphereGeometry(1, 56, 36, 0, Math.PI * 2, 0, 1.76);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      let [X, Y, Z] = shapeHead(x, y, z);
      const k = 1.045 + 0.02 * Math.sin(x * 11 + y * 7);
      let cx = X * k, cy = 0.118 + (Y - 0.118) * k, cz = Z * k;
      if (z > 0.1 && Y < 0.205) { const f = smooth(0.1, 0.5, z); cx *= 1 - 0.1 * f; cz *= 1 - 0.17 * f; }
      const ear = smooth(0.55, 0.8, Math.abs(x)) * smooth(0.3, -0.05, y) * smooth(-0.9, -0.1, y) * smooth(0.75, 0.2, Math.abs(z));       // leave the ears bare
      cx *= 1 - 0.14 * ear; cz *= 1 - 0.05 * ear;
      p.setXYZ(i, cx, cy, cz);
    }
    geo.computeVertexNormals();
    this.hair = this._mesh(geo, M.hair, g);
  }

  _cap() {
    const M = this.M, g = new THREE.Group(); this.cap = g; this.group.add(g);
    // The cap follows the shape of the head, 8 mm outside it. Its lower edge is level with the brows at
    // the front and lower at the back, like a cap that sits on the head and not on a ball.
    const edge = (z) => 0.156 + 0.50 * z;
    const pt = (th, ph) => {
      const [X, Y, Z] = shapeHead(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
      return [X * 1.07, 0.118 + (Y - 0.118) * 1.055 + 0.003, Z * 1.07];
    };
    const cols = 72, rows = 30, pos = [], uv = [], idx = [];
    this._capRim = [];
    for (let i = 0; i <= cols; i++) {
      const ph = (i / cols) * Math.PI * 2;
      let lo = 0.2, hi = 2.6;
      for (let it = 0; it < 26; it++) { const mid = (lo + hi) / 2, q = pt(mid, ph); if (q[1] > edge(q[2])) lo = mid; else hi = mid; }
      const thc = lo;
      for (let j = 0; j <= rows; j++) {
        const th = thc * (j / rows), q = pt(th, ph);
        pos.push(q[0], q[1], q[2]); uv.push(i / cols, 1 - th / 1.6);
      }
      this._capRim.push(pt(thc, ph));
    }
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j, b = a + 1, c = a + rows + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = canvasTex(1024, 512, (c, w, h) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
      const sh = c.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(120,140,170,0.10)'); sh.addColorStop(1, 'rgba(120,140,170,0)'); c.fillStyle = sh; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 6; k++) {                                                      // six panels, one centred at the front
        const x = (0.25 + 1 / 12 + k / 6) % 1 * w;
        c.strokeStyle = 'rgba(150,165,190,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
        c.setLineDash([7, 5]); c.strokeStyle = 'rgba(150,165,190,0.5)'; c.beginPath(); c.moveTo(x + 7, 0); c.lineTo(x + 7, h); c.stroke(); c.setLineDash([]);
      }
      // the EFS mark on the front panel, drawn narrow because the dome stretches it sideways
      c.save(); c.translate(w * 0.25, h * 0.4); c.scale(0.8, 1); drawEFS(c, 0, 0, 68); c.restore();
    }, { aniso: 8 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.8, side: THREE.DoubleSide });
    const crown = this._mesh(geo, crownMat, g); crown.castShadow = true;
    this._mesh(new THREE.SphereGeometry(0.0075, 14, 10), M.capWhite, g, 0, 0.118 + 0.118 * 1.055 + 0.003 - 0.002, 0);   // the button on top
    // the brim: thin, rounded, bent down over the forehead
    const sh = new THREE.Shape();
    sh.moveTo(-0.064, 0); sh.bezierCurveTo(-0.072, 0.05, -0.04, 0.082, 0, 0.082); sh.bezierCurveTo(0.04, 0.082, 0.072, 0.05, 0.064, 0); sh.closePath();
    const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0014, bevelSize: 0.0014, bevelSegments: 2, curveSegments: 14 });
    const bp = bg.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i); bp.setZ(i, bp.getZ(i) + 3.0 * x * x + 1.2 * y * y); }       // droops at the sides and the front
    bg.computeVertexNormals();
    const front = this._capRim[Math.round(cols / 4)];
    const brim = this._mesh(bg, M.capWhite, g, 0, front[1] - 0.001, front[2] - 0.012); brim.rotation.x = Math.PI / 2 - 0.1;
  }

  // ───────────── animation ─────────────
  /** Ask for a mouth shape: open 0..1, wide 0..1, round 0..1. */
  setMouth(o) { Object.assign(this.mouthT, o); }
  setSmile(v) { this.smileT = v; }
  setBrow(v) { this.browT = v; }
  look(yaw, pitch) { this.lookYaw = yaw; this.lookPitch = pitch; }

  update(dt, { talking = false, snap = false } = {}) {
    this.t += dt;
    const speechChanged = this._speaking !== talking;
    this._speaking = talking;
    const k = (rate) => (snap ? 1 : 1 - Math.exp(-dt * rate));
    const m = this.mouth, tg = this.mouthT;
    const before = `${m.open.toFixed(3)}${m.wide.toFixed(2)}${m.round.toFixed(2)}${this.smile.toFixed(2)}`;
    m.open += (tg.open - m.open) * k(talking ? 26 : 14);
    m.wide += (tg.wide - m.wide) * k(18);
    m.round += (tg.round - m.round) * k(18);
    this.smile += (this.smileT - this.smile) * k(5);
    this.brow += (this.browT - this.brow) * k(9);
    if (speechChanged || before !== `${m.open.toFixed(3)}${m.wide.toFixed(2)}${m.round.toFixed(2)}${this.smile.toFixed(2)}`) {
      this.skin.morphTargetInfluences[0] = clamp(m.open, 0, 1);
      this._drawMouth();
    }
    // blinking
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.blink <= 0) { this.blink = 0.001; this.nextBlink = 2.2 + (Math.sin(this.t * 12.9) + 1) * 1.7; }
    let closed = 0;
    if (this.blink > 0) { this.blink += dt; const u = this.blink / 0.18; closed = u < 1 ? Math.sin(u * Math.PI) : 0; if (u >= 1) this.blink = 0; }
    const eyeState = `${closed.toFixed(3)}:${this.lookYaw.toFixed(3)}:${this.lookPitch.toFixed(3)}`;
    if (eyeState !== this._eyeState) { this._drawEyes(closed); this._eyeState = eyeState; }
    this.skin.morphTargetInfluences[1] = this.brow;
    for (const b of this.brows) {
      b.pivot.visible = !this.M.faceDetail?.ready.value;
      b.pivot.position.y = b.base + 0.0085 * this.brow - 0.002 * closed; b.pivot.rotation.z = b.side * -0.05 * this.brow;
    }
    for (const c of this.cheeks) c.scale.setScalar(1 + 0.12 * this.smile);
  }
}

// ───────────── hands ─────────────
// A hand with a palm, four fingers and a thumb. The origin is the wrist and the hand hangs along -y; the
// palm faces the body and the thumb points forward. `grip` 0 is relaxed, 1 is closed round a handle;
// `point` keeps the index finger straight; `spread` fans the fingers out, as for a wave.
export function buildHand(M, side) {
  const g = new THREE.Group();
  const meshes = [];
  const add = (geo, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, M.skin); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); meshes.push(m); return m; };
  add(new RoundedBoxGeometry(0.036, 0.088, 0.078, 4, 0.014), g, 0, -0.05, 0);        // the palm: thin across, wide front to back
  const inward = -side;                                                                // the palm faces the middle of the body
  const fingers = [];
  const lens = [[0.034, 0.03, 0.021], [0.038, 0.034, 0.022], [0.036, 0.032, 0.021], [0.029, 0.026, 0.019]];
  for (let i = 0; i < 4; i++) {                                                        // index first, nearest the thumb at the front
    const [a, b, t] = lens[i];
    const root = new THREE.Group(); root.position.set(0, -0.092, 0.027 - i * 0.018); g.add(root);
    add(new THREE.CapsuleGeometry(0.0088, a, 4, 8), root, 0, -a / 2 - 0.002, 0);
    const mid = new THREE.Group(); mid.position.y = -a - 0.004; root.add(mid);
    add(new THREE.CapsuleGeometry(0.0082, b, 4, 8), mid, 0, -b / 2, 0);
    const tip = new THREE.Group(); tip.position.y = -b - 0.002; mid.add(tip);
    add(new THREE.CapsuleGeometry(0.0074, t, 4, 8), tip, 0, -t / 2, 0);
    fingers.push({ root, mid, tip });
  }
  const thumbRoot = new THREE.Group(); thumbRoot.position.set(inward * 0.004, -0.03, 0.034); g.add(thumbRoot);
  add(new THREE.CapsuleGeometry(0.0108, 0.03, 4, 8), thumbRoot, 0, -0.02, 0);
  const thumbTip = new THREE.Group(); thumbTip.position.y = -0.042; thumbRoot.add(thumbTip);
  add(new THREE.CapsuleGeometry(0.0095, 0.026, 4, 8), thumbTip, 0, -0.016, 0);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.0425, 0.044, 0.07, 22), M.glove);
  cuff.position.set(0, 0.03, 0); cuff.castShadow = true; cuff.visible = false; g.add(cuff);

  const st = { grip: 0.2, point: false, spread: 0 };
  const apply = () => {
    const { grip, point, spread } = st;
    fingers.forEach((f, i) => {
      // how far this finger curls: a straight finger (pointing, or spread open) barely bends
      let c = 0.18 + grip * 0.92;
      if (spread > 0) c = c * (1 - spread) + 0.04 * spread;
      if (point && i === 0) c = 0.03;
      f.root.rotation.set((i - 1.5) * spread * 0.2, 0, inward * c * 1.1);
      f.mid.rotation.set(0, 0, inward * c * 1.25); f.tip.rotation.set(0, 0, inward * c * 0.9);
    });
    const th = Math.max(grip, point ? 0.8 : 0) * (1 - spread);
    thumbRoot.rotation.set(-0.35 - th * 0.25 - spread * 0.5, inward * th * 0.5, inward * th * 0.35);
    thumbTip.rotation.set(0, 0, inward * (0.25 + th * 0.7) * (1 - spread));
  };
  const api = {
    group: g, cuff, meshes,
    setGrip(v) { st.grip = v; apply(); },
    setPoint(on) { st.point = !!on; apply(); },
    setSpread(v) { st.spread = v; apply(); },
    get grip() { return st.grip; },
    setGlove(on) { for (const m of meshes) m.material = on ? M.glove : M.skin; cuff.visible = on; },
  };
  apply();
  return api;
}

// ───────────── clothes ─────────────
/**
 * A torso shaped like a fit man: a rounded body that is widest at the shoulders, narrows to the waist, has
 * a little chest, and slopes up to the neck. It is a sphere reshaped by height, so there are no flat
 * edges. The origin is the waist; the top (y = 0.5) is the base of the neck.
 */
export function torsoGeometry(w = 0.42, h = 0.5, d = 0.24, grow = 0) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const p = g.attributes.position, half = w / 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 1) / 2, r = Math.sqrt(x * x + z * z) || 1e-6;
    const rr = Math.pow(Math.min(1, r), 0.32);                                    // a rounded cylinder rather than a ball
    const wid = half * (0.8 + 0.2 * smooth(0.0, 0.82, t)) * (1 - 0.8 * smooth(0.8, 1.0, t) ** 1.3) + grow;
    const dep = (d / 2) * (0.88 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.07 * Math.exp(-(((t - 0.72) / 0.16) ** 2))) * (1 - 0.55 * smooth(0.88, 1.0, t)) + grow;
    p.setXYZ(i, (x / r) * rr * wid, t * h - 0.0 + (t > 0.5 ? 0 : 0), (z / r) * rr * dep);
  }
  g.computeVertexNormals();
  return g;
}

/** The polo collar: a blue band round the neck, open at the front, with two flaps lying on the chest. */
export function buildCollar(M) {
  const g = new THREE.Group();
  const geo = new THREE.TorusGeometry(0.057, 0.0125, 10, 44, Math.PI * 2 - 1.7);
  geo.rotateZ(Math.PI / 2 + 0.85); geo.rotateX(Math.PI / 2);                              // lies flat, the opening at the front
  const band = new THREE.Mesh(geo, M.poloBlue); band.castShadow = true; band.receiveShadow = true; band.scale.set(1.04, 1.2, 1.04); g.add(band);
  const sh = new THREE.Shape(); sh.moveTo(-0.004, 0.0); sh.lineTo(0.06, 0.008); sh.quadraticCurveTo(0.07, -0.03, 0.028, -0.075); sh.lineTo(-0.004, -0.01); sh.closePath();
  const flap = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1 });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(flap, M.poloBlue); m.castShadow = true; m.receiveShadow = true;
    m.scale.x = s; m.position.set(s * 0.003, 0.004, 0.058); m.rotation.set(-0.5, s * 0.1, s * -0.08); g.add(m);
  }
  return g;
}

/** The EFS mark that sits on the chest. */
export function chestLogo() {
  const tex = canvasTex(512, 192, (c, w, h) => { c.clearRect(0, 0, w, h); drawEFS(c, w / 2, h / 2, 96); }, { aniso: 8 });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.043), tex ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }) : new THREE.MeshBasicMaterial({ color: BRAND.blueHex }));
}
