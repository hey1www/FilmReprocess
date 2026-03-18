import { describe, expect, it } from "vitest";
import { mergeMetadata } from "./metadataMerge";
import type { Asset } from "../types/models";
import { defaultProcessingRecipe } from "./defaults";

const asset: Asset = {
  id: "asset-1",
  originalName: "frame.jpg",
  width: 100,
  height: 100,
  thumbnailKey: "thumb",
  source: {
    mode: "session-file",
    fileName: "frame.jpg",
    mimeType: "image/jpeg",
    size: 10,
  },
  metadata: {
    cameraModel: "Nikon FM2",
    scannerModel: "",
  },
  recipe: defaultProcessingRecipe,
  flags: {
    autoSplitTried: false,
    splitAccepted: false,
  },
};

describe("mergeMetadata", () => {
  it("fills only empty values in fill-empty mode", () => {
    const next = mergeMetadata(
      asset,
      {
        cameraModel: "Olympus",
        scannerModel: "Noritsu",
      },
      "fill-empty",
      ["cameraModel", "scannerModel"],
    );

    expect(next.metadata.cameraModel).toBe("Nikon FM2");
    expect(next.metadata.scannerModel).toBe("Noritsu");
  });

  it("updates only selected fields in selected-only mode", () => {
    const next = mergeMetadata(
      asset,
      {
        cameraModel: "Olympus",
        scannerModel: "Noritsu",
      },
      "selected-only",
      ["scannerModel"],
    );

    expect(next.metadata.cameraModel).toBe("Nikon FM2");
    expect(next.metadata.scannerModel).toBe("Noritsu");
  });
});
