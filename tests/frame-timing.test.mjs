import test from 'node:test';
import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { Stage } from '../src/scene/stage.js';
import { QualityGovernor } from '../src/quality.js';

test('slow rendering is measured honestly while animation steps remain bounded', () => {
  const stage = {
    _lightsNow: 1, lightsOn: 1, _lightBase: { hemi: 1, key: 1, fill: 1, rim: 1, env: 1 },
    hemi: {}, key: {}, fill: {}, rim: {}, scene: {}, camera: {},
    renderer: { render() {} }, _acc: 0, _frames: 0, fps: 60,
    gov: new QualityGovernor(), scale: 1, setLevel() {}, resize() {}, render: Stage.prototype.render,
  };
  const frames = [];
  const app = { screen: { update(dt) { frames.push(dt); } }, stage,
    host: { style: {} }, shell: { setFps() {} } };
  for (let i = 0; i < 100; i++) App.prototype.frame.call(app, .1);
  assert.ok(frames.every(dt => dt === .05), 'animation remains stable at 10 FPS');
  assert.ok(Math.abs(stage.fps - 10) < .01, 'FPS must reflect actual frame time');
  assert.equal(stage.gov.level, 0, 'sustained poor performance reduces graphics work');
  const previous = stage.fps;
  App.prototype.frame.call(app, 60);
  assert.equal(stage.fps, previous, 'a suspended tab does not count as a slow GPU frame');
});
