import test from 'node:test';
import assert from 'node:assert/strict';
import { bayerChannel, createCheckerboard, sampleBayer, demosaicBilinear, srgbToLinear, linearToSrgb } from '../lib/bayer.ts';

test('RGGB coordinates and shifted alignments select the expected channels', () => {
  assert.deepEqual([bayerChannel(0, 0), bayerChannel(1, 0), bayerChannel(0, 1), bayerChannel(1, 1)], [0, 1, 1, 2]);
  assert.deepEqual([bayerChannel(0, 0, { x: 1, y: 1 }), bayerChannel(1, 1, { x: 1, y: 1 })], [2, 0]);
});

test('checkerboard input is grayscale and the one-pixel pattern generates false color', () => {
  const input = createCheckerboard(8, 8, 1);
  for (let i = 0; i < input.data.length; i += 3) assert.deepEqual([...input.data.slice(i, i + 3)], [input.data[i], input.data[i], input.data[i]]);
  const result = demosaicBilinear(sampleBayer(input));
  assert.deepEqual([...result.data.slice(0, 3)], [1, 0, 1]);
  const shifted = demosaicBilinear(sampleBayer(input, { x: 1, y: 0 }));
  assert.deepEqual([...shifted.data.slice(0, 3)], [0, 1, 0]);
});

test('reconstruction preserves measured channels including at image edges', () => {
  const input = createCheckerboard(9, 7, 3);
  for (const offset of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]) {
    const mosaic = sampleBayer(input, offset);
    const result = demosaicBilinear(mosaic);
    for (let y = 0; y < input.height; y++) for (let x = 0; x < input.width; x++) {
      const i = y * input.width + x;
      assert.equal(result.data[i * 3 + bayerChannel(x, y, offset)], mosaic.data[i]);
      for (let c = 0; c < 3; c++) assert.ok(Number.isFinite(result.data[i * 3 + c]));
    }
  }
});

test('constant neutral images remain neutral at corners and edges', () => {
  const image = { width: 5, height: 3, data: new Float32Array(5 * 3 * 3).fill(srgbToLinear(0.5)) };
  const result = demosaicBilinear(sampleBayer(image));
  for (const value of result.data) assert.ok(Math.abs(linearToSrgb(value) - 0.5) < 1e-6);
});
