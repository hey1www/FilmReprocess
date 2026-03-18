import { describe, expect, it } from "vitest";
import { detectHalfFrameFromImageData } from "./splitDetection";

function createSyntheticHalfFrame(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const inGap = x > width / 2 - 6 && x < width / 2 + 6;
      const value = inGap ? 10 : x < width / 2 ? 180 : 220;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  return {
    data,
    width,
    height,
  } as ImageData;
}

describe("detectHalfFrameFromImageData", () => {
  it("finds a center split with reasonable confidence", () => {
    const result = detectHalfFrameFromImageData(createSyntheticHalfFrame(200, 100));

    expect(result.confidence).toBeGreaterThan(0.2);
    expect(result.leftCrop.width).toBeGreaterThan(10);
    expect(result.rightCrop.width).toBeGreaterThan(10);
    expect(result.rightCrop.x).toBeGreaterThan(40);
  });
});
