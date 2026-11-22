import type { LinearImage } from "./bayer.ts";

/** 100 times mean per-pixel channel range, valid as false color for neutral inputs. */
export function falseColorScore(image: LinearImage): number {
  let sum = 0;
  for (let i = 0; i < image.data.length; i += 3) sum += Math.max(image.data[i], image.data[i + 1], image.data[i + 2]) - Math.min(image.data[i], image.data[i + 1], image.data[i + 2]);
  return sum / (image.width * image.height) * 100;
}

/** MSE is measured against the unfiltered source in normalized linear RGB. */
export function meanSquaredError(reference: LinearImage, actual: LinearImage): number {
  if (reference.width !== actual.width || reference.height !== actual.height || reference.data.length !== actual.data.length) throw new RangeError("Image dimensions must match.");
  let sum = 0;
  for (let i = 0; i < reference.data.length; i++) sum += (reference.data[i] - actual.data[i]) ** 2;
  return sum / reference.data.length;
}

/** Ratio of mean absolute horizontal and vertical luminance differences. */
export function detailRatio(reference: LinearImage, actual: LinearImage): number | null {
  if (reference.width !== actual.width || reference.height !== actual.height) throw new RangeError("Image dimensions must match.");
  const gradient = (image: LinearImage) => {
    let sum = 0;
    const luma = (i: number) => .2126 * image.data[i] + .7152 * image.data[i + 1] + .0722 * image.data[i + 2];
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 3;
      if (x + 1 < image.width) sum += Math.abs(luma(i) - luma(i + 3));
      if (y + 1 < image.height) sum += Math.abs(luma(i) - luma(i + image.width * 3));
    }
    return sum;
  };
  const baseline = gradient(reference); return baseline > 1e-10 ? gradient(actual) / baseline : null;
}
