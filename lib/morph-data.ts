import { bayerChannel, createCheckerboard, demosaicBilinear, sampleBayer, srgbToLinear } from "./bayer.ts";

/** Corresponding positions and linear-light colors for one set of sensor sites. */
export type MorphData = {
  side: number;
  opticalPositions: Float32Array;
  sensorPositions: Float32Array;
  imagePositions: Float32Array;
  opticalColors: Float32Array;
  sensorColors: Float32Array;
  imageColors: Float32Array;
};

/** Map a square grid continuously to a disk without randomizing site identity. */
function squareToDisk(x: number, y: number): [number, number] {
  if (x === 0 && y === 0) return [0, 0];
  let radius: number, theta: number;
  if (Math.abs(x) > Math.abs(y)) {
    radius = x;
    theta = Math.PI / 4 * (y / x);
  } else {
    radius = y;
    theta = Math.PI / 2 - Math.PI / 4 * (x / y);
  }
  return [radius * Math.cos(theta), radius * Math.sin(theta)];
}

/**
 * Precompute the same indexed site's three states. The final color is the
 * bilinearly reconstructed value of a neutral checkerboard, not sensor-filter
 * color or an unrelated illustrative texture. Colors are linear RGB.
 */
export function createMorphData(side = 32): MorphData {
  if (!Number.isInteger(side) || side < 2 || side % 2 !== 0) throw new RangeError("Sensor side must be an even integer of at least two.");
  const length = side * side * 3;
  const opticalPositions = new Float32Array(length);
  const sensorPositions = new Float32Array(length);
  const imagePositions = new Float32Array(length);
  const opticalColors = new Float32Array(length);
  const sensorColors = new Float32Array(length);
  const reconstructed = demosaicBilinear(sampleBayer(createCheckerboard(side, side, 3)));
  const palette = [[0.86, 0.30, 0.35], [0.15, 0.66, 0.48], [0.28, 0.47, 0.96]].map(rgb => rgb.map(srgbToLinear));
  const optical = [0.12, 0.20, 0.33].map(srgbToLinear);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const index = (y * side + x) * 3;
    const u = (x + 0.5) / side * 2 - 1;
    const v = (y + 0.5) / side * 2 - 1;
    const [dx, dy] = squareToDisk(u, v);
    const radius = Math.hypot(dx, dy);
    opticalPositions.set([dx * 1.2, -dy * 1.2, -0.18 - 0.35 * radius * radius], index);
    sensorPositions.set([u * 1.45, -v * 1.45, 0], index);
    imagePositions.set([u * 1.45, -v * 1.45, 0], index);
    opticalColors.set(optical, index);
    sensorColors.set(palette[bayerChannel(x, y)], index);
  }
  return { side, opticalPositions, sensorPositions, imagePositions, opticalColors, sensorColors, imageColors: reconstructed.data };
}

/** Clamped smoothstep keeps scroll reversal and fast jumps deterministic. */
export function morphPhase(progress: number, start: number, end: number): number {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
