import test from 'node:test';
import assert from 'node:assert/strict';
import { createMorphData, morphPhase } from '../lib/morph-data.ts';
import { createCheckerboard, sampleBayer, demosaicBilinear } from '../lib/bayer.ts';

test('morph data assigns stable states to the same indexed sites', () => {
  const a = createMorphData(8);
  const b = createMorphData(8);
  assert.equal(a.opticalPositions.length, 8 * 8 * 3);
  assert.deepEqual(a.opticalPositions, b.opticalPositions);
  assert.deepEqual(a.sensorPositions, a.imagePositions);
  assert.deepEqual(a.imageColors, demosaicBilinear(sampleBayer(createCheckerboard(8, 8, 3))).data);
  for (const value of a.opticalPositions) assert.ok(Number.isFinite(value));
});

test('sensor tile colors preserve the RGGB proportions', () => {
  const { side, sensorColors } = createMorphData(8);
  const counts = new Map();
  for (let i = 0; i < side * side; i++) {
    const key = [...sensorColors.slice(i * 3, i * 3 + 3)].join(',');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.deepEqual([...counts.values()].sort((a, b) => a - b), [16, 16, 32]);
});

test('scroll phase is clamped, reversible, and deterministic', () => {
  assert.equal(morphPhase(0.1, 0.2, 0.5), 0);
  assert.equal(morphPhase(0.6, 0.2, 0.5), 1);
  assert.ok(Math.abs(morphPhase(0.35, 0.2, 0.5) - 0.5) < 1e-12);
});
