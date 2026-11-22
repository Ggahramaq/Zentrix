import { createCheckerboard, type LinearImage } from "./bayer.ts";
export type Pattern = "checker" | "stripes" | "diagonal" | "texture";
export function createPattern(width: number, height: number, pattern: Pattern, stripeWidth: number, orientation: "vertical" | "horizontal"): LinearImage {
  if (pattern === "checker") return createCheckerboard(width, height, 1);
  const data = new Float32Array(width * height * 3);
  const w = Math.max(1, Math.floor(stripeWidth));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const coordinate = orientation === "vertical" ? x : y;
    const value = pattern === "stripes" ? Math.floor(coordinate / w) % 2 : pattern === "diagonal" ? Math.floor((x + y) / w) % 2 : (Math.floor(x / w) + Math.floor(y / (w * 2)) + Math.floor((x + y) / (w * 3))) % 2;
    const i = (y * width + x) * 3; data[i] = data[i + 1] = data[i + 2] = value;
  }
  return { width, height, data };
}
