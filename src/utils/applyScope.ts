import type { Asset } from "../types/models";

export type ApplyScope = "current" | "selected" | "all";

export function getScopedAssetIds(options: {
  scope: ApplyScope;
  assets: Asset[];
  activeAssetId: string | null;
  selectedAssetIds: string[];
}) {
  const { scope, assets, activeAssetId, selectedAssetIds } = options;

  if (scope === "all") {
    return assets.map((asset) => asset.id);
  }

  if (scope === "selected") {
    if (selectedAssetIds.length > 0) {
      return selectedAssetIds;
    }

    return activeAssetId ? [activeAssetId] : [];
  }

  return activeAssetId ? [activeAssetId] : [];
}
