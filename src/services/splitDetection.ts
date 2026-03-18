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

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

function findGapBounds(
  normalizedBrightness: number[],
  normalizedEnergy: number[],
  splitX: number,
  start: number,
  end: number,
) {
  const darkness = normalizedBrightness.map((value) => 1 - value);
  const quietness = normalizedEnergy.map((value) => 1 - value);
  const scores = darkness.map((value, index) => value * 0.7 + quietness[index] * 0.3);
  const peakScore = scores[splitX];
  const scoreThreshold = Math.max(0.4, peakScore * 0.68);
  const darknessThreshold = Math.max(0.54, darkness[splitX] * 0.72);

  let gapStart = splitX;
  while (gapStart > start) {
    const index = gapStart - 1;
    if (scores[index] < scoreThreshold || darkness[index] < darknessThreshold) {
      break;
    }
    gapStart = index;
  }

  let gapEnd = splitX + 1;
  while (gapEnd < end) {
    const index = gapEnd;
    if (scores[index] < scoreThreshold || darkness[index] < darknessThreshold) {
      break;
    }
    gapEnd += 1;
  }

  const padding = clamp(Math.round((end - start) * 0.006), 1, 10);
  gapStart = clamp(gapStart - padding, start, end - 1);
  gapEnd = clamp(gapEnd + padding, gapStart + 1, end);

  const maxGapWidth = clamp(Math.round((end - start) * 0.16), 4, 48);
  if (gapEnd - gapStart > maxGapWidth) {
    return {
      start: splitX,
      end: splitX + 1,
    };
  }

  return {
    start: gapStart,
    end: gapEnd,
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
  const columnBrightness = new Array<number>(width).fill(0);
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
      columnBrightness[x] += luminance;
      rowEnergy[y] += energy;
    }
  }

  const smoothColumns = smooth(columnEnergy, Math.max(2, Math.floor(width * 0.012)));
  const brightnessColumns = smooth(columnBrightness, Math.max(2, Math.floor(width * 0.012)));
  const normalizedEnergy = normalize(smoothColumns);
  const normalizedBrightness = normalize(brightnessColumns);
  const centerStart = Math.floor(width * 0.28);
  const centerEnd = Math.floor(width * 0.72);
  let splitX = Math.floor(width / 2);
  let splitScore = Number.NEGATIVE_INFINITY;

  for (let x = centerStart; x < centerEnd; x += 1) {
    const darkness = 1 - normalizedBrightness[x];
    const edgeQuiet = 1 - normalizedEnergy[x];
    const score = darkness * 0.7 + edgeQuiet * 0.3;

    if (score > splitScore) {
      splitScore = score;
      splitX = x;
    }
  }

  const gapBounds = findGapBounds(normalizedBrightness, normalizedEnergy, splitX, centerStart, centerEnd);
  const verticalBounds = findEdgeBounds(smooth(rowEnergy, Math.max(2, Math.floor(height * 0.01))), 0, height);

  const leftCrop: Rect = {
    x: 0,
    y: clamp(verticalBounds.start, 0, height - 1),
    width: clamp(gapBounds.start, width * 0.1, width),
    height: clamp(verticalBounds.end - verticalBounds.start, height * 0.1, height),
  };

  const rightCrop: Rect = {
    x: clamp(gapBounds.end, 0, width - 1),
    y: clamp(verticalBounds.start, 0, height - 1),
    width: clamp(width - gapBounds.end, width * 0.1, width),
    height: clamp(verticalBounds.end - verticalBounds.start, height * 0.1, height),
  };

  const leftRatio = leftCrop.width / width;
  const rightRatio = rightCrop.width / width;
  const balanceScore = 1 - Math.abs(leftRatio - rightRatio);
  const gapWidthScore = clamp((gapBounds.end - gapBounds.start) / Math.max(4, width * 0.025), 0, 1);
  const centerWindow = normalizedBrightness.slice(centerStart, centerEnd);
  const centerMean = mean(centerWindow);
  const gapDarkness = clamp(1 - normalizedBrightness[splitX] + centerMean * 0.1, 0, 1);
  const gapQuietness = clamp(1 - normalizedEnergy[splitX], 0, 1);
  const confidence = clamp(
    gapDarkness * 0.42 + gapQuietness * 0.18 + balanceScore * 0.24 + gapWidthScore * 0.16,
    0.15,
    0.98,
  );

  if (leftCrop.width < width * 0.14 || rightCrop.width < width * 0.14 || confidence < 0.28) {
    return {
      confidence: clamp(confidence * 0.8, 0.12, 0.45),
      leftCrop: buildFallbackRect(width, height, "left"),
      rightCrop: buildFallbackRect(width, height, "right"),
    };
  }

  return {
    confidence,
    leftCrop,
    rightCrop,
  };
}
