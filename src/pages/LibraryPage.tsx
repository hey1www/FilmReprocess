import type { MouseEvent } from "react";
import { AssetGrid } from "../components/library/AssetGrid";
import { useI18n } from "../features/i18n/I18nProvider";
import { useActiveAsset, useAppStore, useAssets } from "../store/useAppStore";

function handleSelect(
  assetId: string,
  event: MouseEvent<HTMLButtonElement>,
  selectAsset: (assetId: string, multi?: boolean) => void,
  selectAssetRange: (assetId: string) => void,
) {
  if (event.shiftKey) {
    selectAssetRange(assetId);
    return;
  }

  selectAsset(assetId, event.metaKey || event.ctrlKey);
}

export function LibraryPage() {
  const { t } = useI18n();
  const assets = useAssets();
  const activeAsset = useActiveAsset();
  const selectedAssetIds = useAppStore((state) => state.selectedAssetIds);
  const activeAssetId = useAppStore((state) => state.activeAssetId);
  const thumbnailUrls = useAppStore((state) => state.thumbnailUrls);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const selectAsset = useAppStore((state) => state.selectAsset);
  const selectAssetRange = useAppStore((state) => state.selectAssetRange);
  const selectAll = useAppStore((state) => state.selectAll);
  const clearSelection = useAppStore((state) => state.clearSelection);

  return (
    <section className="workspace workspace--library">
      <div className="panel">
        <div className="panel__header">
          <h1>{t("nav.library")}</h1>
          <p className="muted">
            {t("library.summary", {
              count: assets.length,
              selected: selectedAssetIds.length,
            })}
          </p>
        </div>
        <div className="toolbar">
          <label className="field field--grow">
            <span>{t("field.search")}</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </label>
          <button type="button" className="button button--secondary" onClick={selectAll}>
            {t("action.selectAll")}
          </button>
          <button type="button" className="button button--secondary" onClick={clearSelection}>
            {t("action.clearSelection")}
          </button>
        </div>
        <AssetGrid
          assets={assets}
          selectedIds={selectedAssetIds}
          activeId={activeAssetId}
          thumbnailUrls={thumbnailUrls}
          onSelect={(assetId, event) => handleSelect(assetId, event, selectAsset, selectAssetRange)}
        />
      </div>

      <aside className="panel panel--inspector">
        <div className="panel__header">
          <h2>{t("panel.selection")}</h2>
        </div>
        {!activeAsset ? <p className="muted">{t("empty.noSelection")}</p> : null}
        {activeAsset ? (
          <div className="detail-list">
            <div className="detail-list__item">
              <strong>{activeAsset.originalName}</strong>
            </div>
            <div className="detail-list__item">{activeAsset.width} × {activeAsset.height}</div>
            <div className="detail-list__item">{activeAsset.metadata.shotAt || "-"}</div>
            <div className="detail-list__item">{activeAsset.metadata.cameraModel || "-"}</div>
            <div className="detail-list__item">{activeAsset.metadata.scannerModel || "-"}</div>
            <div className="detail-list__item">{activeAsset.metadata.location?.label || "-"}</div>
            <div className="detail-list__item">{t("hint.handlePersistence")}</div>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
