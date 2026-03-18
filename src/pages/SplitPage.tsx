import { AssetStrip } from "../components/library/AssetStrip";
import { CropEditor } from "../components/split/CropEditor";
import { useAssetFileUrl } from "../components/shared/useAssetFileUrl";
import { useI18n } from "../features/i18n/I18nProvider";
import { useActiveAsset, useAppStore, useAssets } from "../store/useAppStore";
import type { Asset, Rect } from "../types/models";

function updateRect(asset: Asset, side: "left" | "right", rect: Rect) {
  return {
    ...asset,
    recipe: {
      ...asset.recipe,
      split: {
        ...asset.recipe.split,
        [side === "left" ? "leftCrop" : "rightCrop"]: rect,
        activeSide: side,
      },
    },
  };
}

export function SplitPage() {
  const { t } = useI18n();
  const assets = useAssets();
  const activeAsset = useActiveAsset();
  const thumbnailUrls = useAppStore((state) => state.thumbnailUrls);
  const activeAssetId = useAppStore((state) => state.activeAssetId);
  const selectedAssetIds = useAppStore((state) => state.selectedAssetIds);
  const selectAsset = useAppStore((state) => state.selectAsset);
  const selectAssetRange = useAppStore((state) => state.selectAssetRange);
  const autoDetectSplit = useAppStore((state) => state.autoDetectSplit);
  const updateSplit = useAppStore((state) => state.updateSplit);
  const copySplitToSelected = useAppStore((state) => state.copySplitToSelected);
  const { fileUrl, loading } = useAssetFileUrl(activeAsset?.id ?? null);

  const leftRect = activeAsset?.recipe.split.leftCrop;
  const rightRect = activeAsset?.recipe.split.rightCrop;

  return (
    <section className="workspace workspace--editor">
      <div className="panel panel--rail">
        <div className="panel__header">
          <h1>{t("nav.split")}</h1>
          <p className="muted">{t("hint.split")}</p>
        </div>
        <AssetStrip
          assets={assets}
          thumbnailUrls={thumbnailUrls}
          activeAssetId={activeAssetId}
          selectedAssetIds={selectedAssetIds}
          onSelect={(assetId, event) => {
            if (event.shiftKey) {
              selectAssetRange(assetId);
              return;
            }
            selectAsset(assetId, event.metaKey || event.ctrlKey);
          }}
        />
      </div>

      <div className="panel panel--main">
        <div className="panel__header">
          <h2>{activeAsset?.originalName ?? t("empty.noSelection")}</h2>
          <div className="toolbar">
            <button type="button" className="button" onClick={() => void autoDetectSplit(selectedAssetIds)}>
              {t("action.autoDetect")}
            </button>
            {activeAsset ? (
              <button type="button" className="button button--secondary" onClick={() => copySplitToSelected(activeAsset.id)}>
                {t("action.copySplit")}
              </button>
            ) : null}
          </div>
        </div>

        {!activeAsset ? <div className="empty-card">{t("empty.noSelection")}</div> : null}
        {loading ? <div className="empty-card">{t("status.running")}</div> : null}
        {activeAsset && fileUrl && leftRect && rightRect ? (
          <CropEditor
            imageUrl={fileUrl}
            naturalWidth={activeAsset.width}
            naturalHeight={activeAsset.height}
            leftRect={leftRect}
            rightRect={rightRect}
            activeSide={activeAsset.recipe.split.activeSide}
            onActiveSideChange={(side) =>
              updateSplit(activeAsset.id, (asset) => ({
                ...asset,
                recipe: {
                  ...asset.recipe,
                  split: {
                    ...asset.recipe.split,
                    activeSide: side,
                  },
                },
              }))
            }
            onRectChange={(side, rect) => updateSplit(activeAsset.id, (asset) => updateRect(asset, side, rect))}
          />
        ) : null}
      </div>

      <aside className="panel panel--inspector">
        <div className="panel__header">
          <h2>{t("panel.split")}</h2>
        </div>
        {activeAsset ? (
          <>
            <p>
              {t("label.autosplitConfidence")}:{" "}
              {activeAsset.recipe.split.confidence ? `${Math.round(activeAsset.recipe.split.confidence * 100)}%` : "-"}
            </p>
            <label className="field">
              <span>{t("field.leftRotation")}</span>
              <input
                type="range"
                min={-45}
                max={45}
                step={0.1}
                value={activeAsset.recipe.split.leftRotation}
                onChange={(event) =>
                  updateSplit(activeAsset.id, (asset) => ({
                    ...asset,
                    recipe: {
                      ...asset.recipe,
                      split: {
                        ...asset.recipe.split,
                        leftRotation: Number(event.target.value),
                      },
                    },
                  }))
                }
              />
            </label>
            <label className="field">
              <span>{t("field.rightRotation")}</span>
              <input
                type="range"
                min={-45}
                max={45}
                step={0.1}
                value={activeAsset.recipe.split.rightRotation}
                onChange={(event) =>
                  updateSplit(activeAsset.id, (asset) => ({
                    ...asset,
                    recipe: {
                      ...asset.recipe,
                      split: {
                        ...asset.recipe.split,
                        rightRotation: Number(event.target.value),
                      },
                    },
                  }))
                }
              />
            </label>
          </>
        ) : (
          <p className="muted">{t("empty.noSelection")}</p>
        )}
      </aside>
    </section>
  );
}
