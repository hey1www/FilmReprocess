import type { Asset, BatchMetadataPatch, MetadataMergeStrategy } from "../types/models";

type MetadataKey = keyof BatchMetadataPatch;

export function mergeMetadata(
  asset: Asset,
  patch: BatchMetadataPatch,
  strategy: MetadataMergeStrategy,
  selectedFields: MetadataKey[],
) {
  const nextMetadata = { ...asset.metadata };

  (Object.keys(patch) as MetadataKey[]).forEach((key) => {
    if (strategy === "selected-only" && !selectedFields.includes(key)) {
      return;
    }

    const value = patch[key];

    if (typeof value === "undefined") {
      return;
    }

    if (strategy === "fill-empty") {
      const currentValue = nextMetadata[key];
      if (
        typeof currentValue !== "undefined" &&
        currentValue !== "" &&
        !(Array.isArray(currentValue) && currentValue.length === 0)
      ) {
        return;
      }
    }

    nextMetadata[key] = value as never;
  });

  return {
    ...asset,
    metadata: nextMetadata,
  };
}
