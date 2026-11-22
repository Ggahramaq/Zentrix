/** A compact, linear-light RGB image. Channels are interleaved in R, G, B order. */
export type LinearImage = { width: number; height: number; data: Float32Array };
export type BayerOffset = { x: number; y: number };
export type BayerMosaic = { width: number; height: number; data: Float32Array; offset: BayerOffset };

export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

/** RGGB, with the offset expressing the sensor's position relative to the image. */
export function bayerChannel(x: number, y: number, offset: BayerOffset = { x: 0, y: 0 }): 0 | 1 | 2 {
  const column = ((x + offset.x) % 2 + 2) % 2;
  const row = ((y + offset.y) % 2 + 2) % 2;
  return row === 0 ? (column === 0 ? 0 : 1) : (column === 0 ? 1 : 2);
}

/** Generate neutral sRGB checks and convert them into linear-light RGB. */
export function createCheckerboard(width: number, height: number, size: number): LinearImage {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || !Number.isInteger(size) || size < 1) throw new RangeError("Dimensions must be at least 2 and pattern size must be a positive integer.");
  const data = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = srgbToLinear((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? 1 : 0);
    const i = (y * width + x) * 3;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  return { width, height, data };
}

export function sampleBayer(image: LinearImage, offset: BayerOffset = { x: 0, y: 0 }): BayerMosaic {
  const { width, height } = image;
  if (width < 2 || height < 2 || image.data.length !== width * height * 3) throw new RangeError("Invalid RGB image dimensions.");
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    data[i] = image.data[i * 3 + bayerChannel(x, y, offset)];
  }
  return { width, height, data, offset: { ...offset } };
}

/** Bilinear demosaicing: use the surrounding sites of the requested color.
 * The separable 1-2-1 kernel is normalized at image boundaries, and measured
 * channels are copied exactly. A minimum 2×2 image contains every channel. */
export function demosaicBilinear(mosaic: BayerMosaic): LinearImage {
  const { width, height, data: samples, offset } = mosaic;
  if (width < 2 || height < 2 || samples.length !== width * height) throw new RangeError("Invalid Bayer mosaic dimensions.");
  const data = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    const measured = bayerChannel(x, y, offset);
    for (let channel = 0; channel < 3; channel++) {
      if (channel === measured) { data[index * 3 + channel] = samples[index]; continue; }
      let sum = 0, weightSum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || bayerChannel(nx, ny, offset) !== channel) continue;
        const weight = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
        sum += samples[ny * width + nx] * weight;
        weightSum += weight;
      }
      data[index * 3 + channel] = sum / weightSum;
    }
  }
  return { width, height, data };
}

export function toDisplayRgba(image: LinearImage): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.width * image.height; i++) {
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.round(linearToSrgb(image.data[i * 3 + c]) * 255);
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}
