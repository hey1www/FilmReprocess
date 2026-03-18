import type { CurvePoint } from "../types/models";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function interpolateCurve(points: CurvePoint[], x: number) {
  const ordered = [...points].sort((left, right) => left.x - right.x);

  if (x <= ordered[0].x) {
    return ordered[0].y;
  }

  if (x >= ordered[ordered.length - 1].x) {
    return ordered[ordered.length - 1].y;
  }

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];

    if (x >= current.x && x <= next.x) {
      const range = next.x - current.x || 1;
      return lerp(current.y, next.y, (x - current.x) / range);
    }
  }

  return x;
}
