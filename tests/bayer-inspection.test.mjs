import test from 'node:test';
import assert from 'node:assert/strict';
import { bayerChannel, createCheckerboard, demosaicBilinear, sampleBayer } from '../lib/bayer.ts';
import { getContributingSites } from '../lib/bayer-inspection.ts';

test('highlighted neighbors reproduce the actual bilinear estimate at every site and alignment', () => {
  const input = createCheckerboard(12, 12, 3);
  for (const offset of [{x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}]) {
    const mosaic = sampleBayer(input, offset);
    const image = demosaicBilinear(mosaic);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const measured = bayerChannel(x, y, offset);
      const neighbors = getContributingSites(mosaic, x, y);
      assert.ok(neighbors.every(site => site.channel !== measured && Math.abs(site.x - x) <= 1 && Math.abs(site.y - y) <= 1));
      for (let channel = 0; channel < 3; channel++) {
        if (channel === measured) continue;
        const sites = neighbors.filter(site => site.channel === channel);
        const weight = sites.reduce((sum, site) => sum + site.weight, 0);
        const estimate = sites.reduce((sum, site) => sum + mosaic.data[site.y * 12 + site.x] * site.weight, 0) / weight;
        assert.ok(Math.abs(image.data[(y * 12 + x) * 3 + channel] - estimate) < 1e-6);
      }
    }
  }
});
