import { describe, expect, it } from "vitest";
import { renderNameTemplate, avoidDuplicateName } from "./naming";
import type { Asset } from "../types/models";
import { defaultProcessingRecipe } from "./defaults";

const asset: Asset = {
  id: "asset-1",
  originalName: "roll01-frame01.jpg",
  width: 1000,
  height: 800,
  thumbnailKey: "thumb-1",
  source: {
    mode: "session-file",
    fileName: "roll01-frame01.jpg",
    mimeType: "image/jpeg",
    size: 10,
  },
  metadata: {
    shotAt: "2026-03-18T10:00",
    cameraModel: "Olympus Pen FT",
  },
  recipe: defaultProcessingRecipe,
  flags: {
    autoSplitTried: false,
    splitAccepted: false,
  },
};

describe("naming", () => {
  it("renders supported tokens", () => {
    expect(renderNameTemplate(asset, "{name}_{side}_{date}_{camera}", "left", 1)).toBe(
      "roll01-frame01_left_2026-03-18_Olympus Pen FT",
    );
  });

  it("avoids duplicates with numeric suffixes", () => {
    const used = new Set<string>();
    expect(avoidDuplicateName("frame", used)).toBe("frame");
    expect(avoidDuplicateName("frame", used)).toBe("frame-2");
    expect(avoidDuplicateName("frame", used)).toBe("frame-3");
  });
});
