import type { ColorRecipe, CurvePoint, Rect } from "../types/models";
import { clamp, interpolateCurve } from "../utils/math";

export function createCurveLut(points: CurvePoint[]) {
  return new Uint8ClampedArray(
    new Array(256).fill(0).map((_, index) => {
      const normalized = index / 255;
      return clamp(Math.round(interpolateCurve(points, normalized) * 255), 0, 255);
    }),
  );
}

function computeMaskSample(data: Uint8ClampedArray, width: number, height: number) {
  const border = Math.max(1, Math.floor(Math.min(width, height) * 0.04));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x > border && x < width - border && y > border && y < height - border) {
        continue;
      }

      const index = (y * width + x) * 4;
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      count += 1;
    }
  }

  return {
    red: red / Math.max(1, count),
    green: green / Math.max(1, count),
    blue: blue / Math.max(1, count),
  };
}

function applyContrast(value: number, contrast: number) {
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  return clamp(factor * (value - 128) + 128, 0, 255);
}

function applySaturation(red: number, green: number, blue: number, saturation: number) {
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const factor = 1 + saturation;

  return {
    red: clamp(luminance + (red - luminance) * factor, 0, 255),
    green: clamp(luminance + (green - luminance) * factor, 0, 255),
    blue: clamp(luminance + (blue - luminance) * factor, 0, 255),
  };
}

export function processImageData(imageData: ImageData, recipe: ColorRecipe) {
  const { width, height, data } = imageData;
  const curveLut = createCurveLut(recipe.curve);
  const exposureFactor = 2 ** recipe.exposure;
  const maskSample = recipe.removeMask ? computeMaskSample(data, width, height) : null;
  const maskOffsets = maskSample
    ? {
        red: maskSample.red - maskSample.green * 0.92,
        green: 0,
        blue: maskSample.blue - maskSample.green * 0.55,
      }
    : { red: 0, green: 0, blue: 0 };

  for (let index = 0; index < data.length; index += 4) {
    let red = data[index];
    let green = data[index + 1];
    let blue = data[index + 2];

    if (recipe.invertNegative) {
      red = 255 - red;
      green = 255 - green;
      blue = 255 - blue;
    }

    if (recipe.removeMask) {
      red = clamp(red - maskOffsets.red, 0, 255);
      green = clamp(green - maskOffsets.green, 0, 255);
      blue = clamp(blue - maskOffsets.blue, 0, 255);
    }

    red = clamp(red * exposureFactor, 0, 255);
    green = clamp(green * exposureFactor, 0, 255);
    blue = clamp(blue * exposureFactor, 0, 255);

    red = applyContrast(red, recipe.contrast);
    green = applyContrast(green, recipe.contrast);
    blue = applyContrast(blue, recipe.contrast);

    red = clamp(red + recipe.temperature * 35 - recipe.tint * 12, 0, 255);
    green = clamp(green - recipe.temperature * 8, 0, 255);
    blue = clamp(blue - recipe.temperature * 35 + recipe.tint * 12, 0, 255);

    const saturated = applySaturation(red, green, blue, recipe.saturation);
    red = saturated.red;
    green = saturated.green;
    blue = saturated.blue;

    const blackPoint = clamp(recipe.blackPoint, 0, 0.95) * 255;
    const whitePoint = clamp(recipe.whitePoint, 0.05, 1) * 255;
    const range = Math.max(1, whitePoint - blackPoint);

    red = clamp(((red - blackPoint) / range) * 255, 0, 255);
    green = clamp(((green - blackPoint) / range) * 255, 0, 255);
    blue = clamp(((blue - blackPoint) / range) * 255, 0, 255);

    data[index] = curveLut[Math.round(red)];
    data[index + 1] = curveLut[Math.round(green)];
    data[index + 2] = curveLut[Math.round(blue)];
  }

  return imageData;
}

export function normalizeRect(rect: Rect, width: number, height: number) {
  const x = clamp(rect.x, 0, width - 1);
  const y = clamp(rect.y, 0, height - 1);
  const maxWidth = width - x;
  const maxHeight = height - y;

  return {
    x,
    y,
    width: clamp(rect.width, 1, maxWidth),
    height: clamp(rect.height, 1, maxHeight),
  };
}
