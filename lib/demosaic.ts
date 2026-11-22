import { bayerChannel, demosaicBilinear, type BayerMosaic, type LinearImage } from "./bayer.ts";

export type Algorithm = "nearest" | "bilinear" | "edge";

/** Nearest sample of each color, with deterministic top-to-bottom tie breaking. */
export function demosaicNearest(mosaic: BayerMosaic): LinearImage {
  const { width, height, data: samples, offset } = mosaic;
  if (width < 2 || height < 2 || samples.length !== width * height) throw new RangeError("Invalid Bayer mosaic dimensions.");
  const data = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    for (let channel = 0; channel < 3; channel++) {
      if (bayerChannel(x, y, offset) === channel) { data[i * 3 + channel] = samples[i]; continue; }
      let best = Infinity, value = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy, distance = dx * dx + dy * dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || distance >= best || bayerChannel(nx, ny, offset) !== channel) continue;
        best = distance; value = samples[ny * width + nx];
      }
      data[i * 3 + channel] = value;
    }
  }
  return { width, height, data };
}

/** Directional green interpolation followed by local red/blue minus green interpolation.
 * Gradients compare opposing green samples; ties average both directions. Missing
 * neighbors at boundaries are ignored, and bilinear supplies any unavailable estimate. */
export function demosaicEdgeAware(mosaic: BayerMosaic): LinearImage {
  const { width, height, data: samples, offset } = mosaic;
  const result = demosaicBilinear(mosaic);
  const green = new Float32Array(width * height);
  const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (bayerChannel(x, y, offset) === 1) { green[i] = samples[i]; continue; }
    const direction = (dx: number, dy: number) => {
      const vals: number[] = [];
      for (const sign of [-1, 1]) { const nx = x + sign * dx, ny = y + sign * dy; if (inBounds(nx, ny)) vals.push(samples[ny * width + nx]); }
      if (!vals.length) return null;
      return { mean: vals.reduce((a, b) => a + b, 0) / vals.length, gradient: vals.length === 2 ? Math.abs(vals[0] - vals[1]) : Infinity };
    };
    const h = direction(1, 0), v = direction(0, 1);
    green[i] = !h ? v!.mean : !v ? h.mean : h.gradient < v.gradient ? h.mean : v.gradient < h.gradient ? v.mean : (h.mean + v.mean) / 2;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, measured = bayerChannel(x, y, offset);
    result.data[i * 3 + 1] = green[i];
    for (const c of [0, 2]) {
      if (measured === c) { result.data[i * 3 + c] = samples[i]; continue; }
      let sum = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny) || bayerChannel(nx, ny, offset) !== c) continue;
        const n = ny * width + nx; sum += samples[n] - green[n]; count++;
      }
      if (count) result.data[i * 3 + c] = Math.max(0, Math.min(1, green[i] + sum / count));
    }
  }
  return result;
}

export function reconstruct(mosaic: BayerMosaic, method: Algorithm): LinearImage {
  return method === "nearest" ? demosaicNearest(mosaic) : method === "edge" ? demosaicEdgeAware(mosaic) : demosaicBilinear(mosaic);
}
