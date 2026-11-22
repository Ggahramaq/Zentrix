import test from 'node:test';
import assert from 'node:assert/strict';
import { isSensorGridLocked, sensorFrame, smoothRange } from '../lib/sensor-motion.ts';

test('the animation starts at the hero and ends exactly at the interactive grid', () => {
  const source = { left: 800, top: 250, width: 300, height: 300 };
  const board = { left: 770, top: 960, width: 394, height: 394 };
  const start = sensorFrame(source, board, 720, 0);
  assert.equal(start.progress, 0);
  assert.equal(start.x, 950);
  assert.equal(start.y, 400);
  const endScroll = 960 + 197 - 720 * .52;
  const end = sensorFrame({ ...source, top: source.top - endScroll }, { ...board, top: board.top - endScroll }, 720, endScroll);
  assert.equal(end.progress, 1);
  assert.equal(end.x, 967);
  assert.ok(Math.abs(end.y - 720 * .52) < 1e-9);
  assert.equal(end.side, 394);
  assert.equal(end.handoff, 1);
});

test('scroll phases are clamped and deterministic', () => {
  assert.equal(smoothRange(-1, .1, .9), 0);
  assert.equal(smoothRange(2, .1, .9), 1);
  assert.equal(smoothRange(.5, .1, .9), .5);
});

test('grid unlocks only after the handoff, or when the 3D scene is unavailable', () => {
  assert.equal(isSensorGridLocked(true, 0), true);
  assert.equal(isSensorGridLocked(true, 0.99), true);
  assert.equal(isSensorGridLocked(true, 1), false);
  assert.equal(isSensorGridLocked(false, 0), false);
});
