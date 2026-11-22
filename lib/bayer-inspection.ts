import { bayerChannel, type BayerMosaic } from "./bayer.ts";

export type ContributingSite = { x: number; y: number; channel: 0 | 1 | 2; weight: number };

/** The in-bounds samples used by the existing 3x3 bilinear decoder.
 * Weights are relative to other samples of the same missing channel. */
export function getContributingSites(mosaic: BayerMosaic, x: number, y: number): ContributingSite[] {
  const measured = bayerChannel(x, y, mosaic.offset);
  const sites: ContributingSite[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= mosaic.width || ny < 0 || ny >= mosaic.height) continue;
    const channel = bayerChannel(nx, ny, mosaic.offset);
    if (channel === measured) continue;
    sites.push({ x: nx, y: ny, channel, weight: (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1) });
  }
  return sites;
}
