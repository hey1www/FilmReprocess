import { describe, expect, it } from "vitest";
import { createCurveLut } from "./colorEngine";

describe("createCurveLut", () => {
  it("respects control points and stays in range", () => {
    const lut = createCurveLut([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.8 },
      { x: 1, y: 1 },
    ]);

    expect(lut[0]).toBe(0);
    expect(lut[128]).toBeGreaterThan(180);
    expect(lut[255]).toBe(255);
  });
});
