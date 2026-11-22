import test from 'node:test';
import assert from 'node:assert/strict';
import { bayerChannel, createCheckerboard, demosaicBilinear, sampleBayer } from '../lib/bayer.ts';
import { getContributingSites } from '../lib/bayer-inspection.ts';

test('the checkerboard explanation uses the real samples and weighted reconstruction for every control setting', () => {
  const positions = [[8, 8], [9, 8], [8, 9], [9, 9]];
  const offsets = [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}];
  for (let size = 1; size <= 10; size++) {
    const source = createCheckerboard(80, 80, size);
    for (const offset of offsets) {
      const mosaic = sampleBayer(source, offset);
      const reconstructed = demosaicBilinear(mosaic);
      for (const [x, y] of positions) {
        const i = y * 80 + x;
        const channel = bayerChannel(x, y, offset);
        assert.equal(mosaic.data[i], source.data[i * 3 + channel]);
      }
      const x = 8, y = 8, i = y * 80 + x;
      const measured = bayerChannel(x, y, offset);
      assert.equal(reconstructed.data[i * 3 + measured], mosaic.data[i]);
      for (let channel = 0; channel < 3; channel++) {
        if (channel === measured) continue;
        const neighbors = getContributingSites(mosaic, x, y).filter(site => site.channel === channel);
        const totalWeight = neighbors.reduce((sum, site) => sum + site.weight, 0);
        const value = neighbors.reduce((sum, site) => sum + mosaic.data[site.y * 80 + site.x] * site.weight, 0) / totalWeight;
        assert.ok(Math.abs(value - reconstructed.data[i * 3 + channel]) < 1e-6);
      }
    }
  }
});

test('moving the sensor changes which filters receive each measurement, and changes the reconstructed color', () => {
  const source = createCheckerboard(80, 80, 1);
  const initial = sampleBayer(source, {x: 0, y: 0});
  const shifted = sampleBayer(source, {x: 1, y: 0});
  const i = 8 * 80 + 8;
  assert.equal(source.data[i * 3], 1);
  assert.notEqual(bayerChannel(8, 8, initial.offset), bayerChannel(8, 8, shifted.offset));
  assert.deepEqual(Array.from(demosaicBilinear(initial).data.slice(i * 3, i * 3 + 3)), [1, 0, 1]);
  assert.deepEqual(Array.from(demosaicBilinear(shifted).data.slice(i * 3, i * 3 + 3)), [0, 1, 0]);
});
