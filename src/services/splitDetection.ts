import type { Rect, SplitDetectionResult } from "../types/models";
import { clamp } from "../utils/math";

function smooth(values: number[], radius: number) {
  return values.map((_, index) => {
    let total = 0;
    let count = 0;

    for (let cursor = index - radius; cursor <= index + radius; cursor += 1) {
      if (cursor < 0 || cursor >= values.length) {
        continue;
      }

      total += values[cursor];
      count += 1;
    }

    return total / Math.max(1, count);
  });
}

function normalize(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const delta = max - min || 1;
  return values.map((value) => (value - min) / delta);
}

function findEdgeBounds(projection: number[], start: number, end: number) {
  const window = projection.slice(start, end);
  const normalized = normalize(window);
  const threshold = 0.22;

  let left = 0;
  while (left < normalized.length && normalized[left] < threshold) {
    left += 1;
  }

  let right = normalized.length - 1;
  while (right > left && normalized[right] < threshold) {
    right -= 1;
  }

  return {
    start: start + clamp(left, 0, normalized.length - 1),
    end: start + clamp(right, 0, normalized.length - 1),
  };
}

function buildFallbackRect(width: number, height: number, side: "left" | "right"): Rect {
  return {
    x: side === "left" ? 0 : width / 2,
    y: 0,
    width: width / 2,
    height,
  };
}

export function detectHalfFrameFromImageData(imageData: ImageData): SplitDetectionResult {
  const { width, height, data } = imageData;

  if (width < 40 || height < 40) {
    return {
      confidence: 0.1,
      leftCrop: buildFallbackRect(width, height, "left"),
      rightCrop: buildFallbackRect(width, height, "right"),
    };
  }

  const columnEnergy = new Array<number>(width).fill(0);
  const rowEnergy = new Array<number>(height).fill(0);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      const leftIndex = (y * width + (x - 1)) * 4;
      const upIndex = ((y - 1) * width + x) * 4;

      const luminance =
        data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
      const leftLuminance =
        data[leftIndex] * 0.2126 + data[leftIndex + 1] * 0.7152 + data[leftIndex + 2] * 0.0722;
      const upLuminance =
        data[upIndex] * 0.2126 + data[upIndex + 1] * 0.7152 + data[upIndex + 2] * 0.0722;

      const diffX = Math.abs(luminance - leftLuminance);
      const diffY = Math.abs(luminance - upLuminance);
      const energy = diffX + diffY;

      columnEnergy[x] += energy;
      rowEnergy[y] += energy;
    }
  }

  const smoothColumns = smooth(columnEnergy, Math.max(2, Math.floor(width * 0.012)));
  const centerStart = Math.floor(width * 0.28);
  const centerEnd = Math.floor(width * 0.72);
  let splitX = Math.floor(width / 2);
  let splitScore = Number.POSITIVE_INFINITY;

  for (let x = centerStart; x < centerEnd; x += 1) {
    const score = smoothColumns[x];
    if (score < splitScore) {
      splitScore = score;
      splitX = x;
    }
  }

  const leftBounds = findEdgeBounds(smoothColumns, 0, splitX);
  const rightBounds = findEdgeBounds(smoothColumns, splitX, width);
  const verticalBounds = findEdgeBounds(smooth(rowEnergy, Math.max(2, Math.floor(height * 0.01))), 0, height);

  const leftCrop: Rect = {
    x: clamp(leftBounds.start, 0, width - 1),
    y: clamp(verticalBounds.start, 0, height - 1),
    width: clamp(splitX - leftBounds.start, width * 0.1, width),
    height: clamp(verticalBounds.end - verticalBounds.start, height * 0.1, height),
  };

  const rightCrop: Rect = {
    x: clamp(splitX, 0, width - 1),
    y: clamp(verticalBounds.start, 0, height - 1),
    width: clamp(rightBounds.end - splitX, width * 0.1, width),
    height: clamp(verticalBounds.end - verticalBounds.start, height * 0.1, height),
  };

  const normalized = normalize(smoothColumns.slice(centerStart, centerEnd));
  const median = normalized.sort((left, right) => left - right)[Math.floor(normalized.length / 2)] ?? 1;
  const confidence = clamp(1 - splitScore / ((median + 0.01) * (Math.max(...smoothColumns) || 1)), 0.15, 0.99);

  return {
    confidence,
    leftCrop,
    rightCrop,
  };
}
