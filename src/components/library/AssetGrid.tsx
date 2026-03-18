import type { MouseEvent } from "react";
import { useI18n } from "../../features/i18n/I18nProvider";
import type { Asset } from "../../types/models";

export function AssetGrid({
  assets,
  selectedIds,
  activeId,
  thumbnailUrls,
  onSelect,
}: {
  assets: Asset[];
  selectedIds: string[];
  activeId: string | null;
  thumbnailUrls: Record<string, string>;
  onSelect: (assetId: string, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useI18n();

  if (assets.length === 0) {
    return <div className="empty-card">{t("empty.noAssets")}</div>;
  }

  const selected = new Set(selectedIds);

  return (
    <div className="asset-grid">
      {assets.map((asset) => {
        const isSelected = selected.has(asset.id);
        const isActive = activeId === asset.id;

        return (
          <button
            type="button"
            key={asset.id}
            className={`asset-card${isSelected ? " asset-card--selected" : ""}${isActive ? " asset-card--active" : ""}`}
            onClick={(event) => onSelect(asset.id, event)}
          >
            <div className="asset-card__thumb">
              {thumbnailUrls[asset.id] ? (
                <img src={thumbnailUrls[asset.id]} alt={asset.originalName} loading="lazy" />
              ) : (
                <div className="asset-card__placeholder" />
              )}
            </div>
            <div className="asset-card__meta">
              <strong>{asset.originalName}</strong>
              <span>{asset.width} × {asset.height}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
