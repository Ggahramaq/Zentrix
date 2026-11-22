export type SensorRect = { left: number; top: number; width: number; height: number };
export type SensorFrame = { progress: number; x: number; y: number; side: number; handoff: number };

/** The static grid is usable whenever there is no active 3D handoff. */
export function isSensorGridLocked(sceneAvailable: boolean, handoff: number): boolean {
  return sceneAvailable && handoff < 1;
}

export function smoothRange(value: number, start: number, end: number): number {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/** Screen-space endpoints follow the actual DOM, including during resize and scroll. */
export function sensorFrame(source: SensorRect, target: SensorRect, viewportHeight: number, scrollY: number): SensorFrame {
  const targetDocumentCenter = target.top + scrollY + target.height / 2;
  const end = Math.max(1, targetDocumentCenter - viewportHeight * 0.52);
  const progress = Math.max(0, Math.min(1, scrollY / end));
  const move = smoothRange(progress, 0.08, 0.96);
  const lerp = (a: number, b: number) => a + (b - a) * move;
  return {
    progress,
    x: lerp(source.left + source.width / 2, target.left + target.width / 2),
    y: lerp(source.top + source.height / 2, target.top + target.height / 2),
    side: lerp(source.width * 0.82, target.width) * (1 + Math.sin(Math.PI * move) * 0.07),
    handoff: smoothRange(progress, 0.88, 1),
  };
}
