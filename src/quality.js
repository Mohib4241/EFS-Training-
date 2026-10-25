// Chooses how much graphics work the scene does, from how long frames really take. Pure logic, so
// it can be tested without a GPU.
//
//   level 2  high    sharp pixels (up to 1.5x), big shadow map
//   level 1  medium  normal pixels, smaller shadow map
//   level 0  low     no shadows
//
// On top of the level there is a render scale (1, 0.85 or 0.7 of the pixels in each direction).
// In `auto` mode it works like the dynamic resolution of a console game: when the frame rate sags
// under 52 the picture is drawn at fewer pixels and stretched, which keeps the look and the
// bloom and gives back most of the time. If the frame rate is still low at the smallest scale, and
// under 28, the level drops too. While a lower scale holds a steady 57 or more the governor tries
// the next scale up now and then (after 20 s, and after longer each time a try fails), so one
// stutter does not leave the picture soft for good. A fixed mode ignores frame time.
export const LEVEL_NAMES = ['Low', 'Medium', 'High'];
export const MODES = ['auto', 'high', 'medium', 'low'];
export const SCALES = [1, 0.85, 0.7];

export class QualityGovernor {
  constructor({ mode = 'auto', warmup = 2.5, slowFps = 28, slowFor = 1.5, scaleFps = 52, scaleFor = 1.2, steadyFps = 57, probeAfter = 20 } = {}) {
    this.warmup = warmup; // seconds of start-up to ignore
    this.slowFps = slowFps; // below this frame rate, at the smallest scale, the level drops
    this.slowFor = slowFor; // seconds of slow frames before the level is dropped
    this.scaleFps = scaleFps; // below this frame rate the render scale steps down
    this.scaleFor = scaleFor; // seconds below it before a step
    this.steadyFps = steadyFps; // at or above this the frame rate counts as steady
    this.probe0 = probeAfter; // seconds of steady frames before trying a bigger scale
    this.setMode(mode);
  }

  setMode(mode) {
    this.mode = mode;
    this.level = mode === 'low' ? 0 : mode === 'medium' ? 1 : 2;
    this.scaleIdx = 0;
    this.t = 0;
    this.slow = 0; // seconds under slowFps
    this.sag = 0; // seconds under scaleFps
    this.steady = 0; // seconds at or above steadyFps
    this.probeAfter = this.probe0;
    this.probing = 0; // seconds since a scale-up try, while it is on trial
    this.ema = 0;
  }

  /** Step to the next mode: auto, high, medium, low, then auto again. */
  cycle() {
    this.setMode(MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]);
    return this.mode;
  }

  get scale() { return SCALES[this.scaleIdx]; }

  /**
   * Call once per frame with the real frame time in seconds. Returns the new level when it
   * changes, otherwise null. The render scale is read from `scale` (it can change on any call).
   */
  update(dt) {
    if (this.mode !== 'auto' || !(dt > 0) || dt > 1) return null; // a frame over a second is a sleeping tab, not a slow GPU
    this.t += dt;
    if (this.t < this.warmup) return null;
    this.ema = this.ema ? this.ema * 0.9 + dt * 0.1 : dt;
    const fps = 1 / this.ema;
    const last = SCALES.length - 1;

    // a bigger scale that was tried has to hold for 3 s; if it does not, the next try waits twice as long
    if (this.probing > 0) {
      this.probing += dt;
      if (this.probing >= 3) { this.probing = 0; this.probeAfter = this.probe0; }
    }

    // the level drops only at the smallest scale, and only when the frame rate is really poor
    if (this.level > 0 && this.scaleIdx === last && fps < this.slowFps) {
      this.slow += dt;
      if (this.slow >= this.slowFor) {
        this.level--;
        this.slow = this.sag = this.steady = 0;
        this.ema = 0;
        return this.level;
      }
    } else this.slow = 0;

    if (fps < this.scaleFps && this.scaleIdx < last) {
      this.sag += dt;
      if (this.sag >= this.scaleFor) {
        this.scaleIdx++;
        if (this.probing > 0) this.probeAfter = Math.min(this.probeAfter * 2, 160); // the try failed
        this.probing = 0;
        this.sag = this.steady = 0;
        this.ema = 0;
      }
    } else this.sag = 0;

    if (this.scaleIdx > 0 && fps >= this.steadyFps) {
      this.steady += dt;
      if (this.steady >= this.probeAfter) {
        this.scaleIdx--;
        this.probing = 0.001;
        this.steady = 0;
        this.ema = 0;
      }
    } else this.steady = 0;
    return null;
  }

  get label() { return this.mode === 'auto' ? `Auto (${LEVEL_NAMES[this.level]})` : LEVEL_NAMES[this.level]; }
}
