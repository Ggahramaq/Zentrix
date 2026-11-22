import type { LinearImage } from "./bayer.ts";

/** Separable Gaussian blur in linear light, normalized at boundaries. Sigma is in pixels. */
export function gaussianBlur(image: LinearImage, sigma: number): LinearImage {
  if (!Number.isFinite(sigma) || sigma < 0 || sigma > 4) throw new RangeError("Blur sigma must be between 0 and 4.");
  if (sigma === 0) return { ...image, data: new Float32Array(image.data) };
  const { width, height } = image, radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius + 1 }, (_, i) => Math.exp(-(i * i) / (2 * sigma * sigma)));
  const temp = new Float32Array(image.data.length), data = new Float32Array(image.data.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
    let sum = 0, weight = 0;
    for (let d = -radius; d <= radius; d++) if (x + d >= 0 && x + d < width) { const w = kernel[Math.abs(d)]; sum += image.data[(y * width + x + d) * 3 + c] * w; weight += w; }
    temp[(y * width + x) * 3 + c] = sum / weight;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) {
    let sum = 0, weight = 0;
    for (let d = -radius; d <= radius; d++) if (y + d >= 0 && y + d < height) { const w = kernel[Math.abs(d)]; sum += temp[((y + d) * width + x) * 3 + c] * w; weight += w; }
    data[(y * width + x) * 3 + c] = sum / weight;
  }
  return { width, height, data };
}
