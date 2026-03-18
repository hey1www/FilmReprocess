import type { MouseEvent } from "react";
import type { Asset } from "../../types/models";

export function AssetStrip({
  assets,
  thumbnailUrls,
  activeAssetId,
  selectedAssetIds,
  onSelect,
}: {
  assets: Asset[];
  thumbnailUrls: Record<string, string>;
  activeAssetId: string | null;
  selectedAssetIds: string[];
  onSelect: (assetId: string, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const selected = new Set(selectedAssetIds);

  return (
    <div className="asset-strip">
      {assets.map((asset) => (
        <button
          type="button"
          key={asset.id}
          className={`asset-strip__item${activeAssetId === asset.id ? " asset-strip__item--active" : ""}${selected.has(asset.id) ? " asset-strip__item--selected" : ""}`}
          onClick={(event) => onSelect(asset.id, event)}
        >
          <img src={thumbnailUrls[asset.id]} alt={asset.originalName} loading="lazy" />
          <span>{asset.originalName}</span>
        </button>
      ))}
    </div>
  );
}
