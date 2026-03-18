import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetStrip } from "../components/library/AssetStrip";
import { CropEditor } from "../components/split/CropEditor";
import { SelectionScopeBar } from "../components/shared/SelectionScopeBar";
import { useAssetFileUrl } from "../components/shared/useAssetFileUrl";
import { useRenderedPreview } from "../components/shared/useRenderedPreview";
import { useI18n } from "../features/i18n/I18nProvider";
import { useActiveAsset, useAppStore, useAssets } from "../store/useAppStore";
import type { Asset, Rect } from "../types/models";
import type { ApplyScope } from "../utils/applyScope";
import { getScopedAssetIds } from "../utils/applyScope";

function updateRect(asset: Asset, side: "left" | "right", rect: Rect): Asset {
  return {
    ...asset,
    flags: {
      ...asset.flags,
      splitAccepted: true,
    },
    recipe: {
      ...asset.recipe,
      split: {
        ...asset.recipe.split,
        mode: "half-frame" as const,
        [side === "left" ? "leftCrop" : "rightCrop"]: rect,
        activeSide: side,
      },
    },
  };
}

function createFallbackRect(width: number, height: number, side: "left" | "right"): Rect {
  const gutter = Math.min(Math.max(width * 0.015, 12), 48);
  const halfWidth = Math.max((width - gutter) / 2, 20);

  if (side === "left") {
    return {
      x: 0,
      y: 0,
      width: halfWidth,
      height,
    };
  }

  return {
    x: width - halfWidth,
    y: 0,
    width: halfWidth,
    height,
  };
}

export function SplitPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const assets = useAssets();
  const activeAsset = useActiveAsset();
  const thumbnailUrls = useAppStore((state) => state.thumbnailUrls);
  const activeAssetId = useAppStore((state) => state.activeAssetId);
  const selectedAssetIds = useAppStore((state) => state.selectedAssetIds);
  const selectAsset = useAppStore((state) => state.selectAsset);
  const selectAssetRange = useAppStore((state) => state.selectAssetRange);
  const autoDetectSplit = useAppStore((state) => state.autoDetectSplit);
  const updateSplit = useAppStore((state) => state.updateSplit);
  const copySplitToAssets = useAppStore((state) => state.copySplitToAssets);
  const { fileUrl, loading } = useAssetFileUrl(activeAsset?.id ?? null);
  const [applyScope, setApplyScope] = useState<ApplyScope>(selectedAssetIds.length > 1 ? "selected" : "current");

  const leftRect = activeAsset?.recipe.split.leftCrop ?? (activeAsset ? createFallbackRect(activeAsset.width, activeAsset.height, "left") : undefined);
  const rightRect = activeAsset?.recipe.split.rightCrop ?? (activeAsset ? createFallbackRect(activeAsset.width, activeAsset.height, "right") : undefined);
  const hasStoredSplit = Boolean(activeAsset?.recipe.split.leftCrop && activeAsset?.recipe.split.rightCrop);
  const splitMode = activeAsset?.recipe.split.mode ?? "single";
  const applyTargetIds = useMemo(
    () => getScopedAssetIds({ scope: applyScope, assets, activeAssetId, selectedAssetIds }),
    [activeAssetId, applyScope, assets, selectedAssetIds],
  );
  const leftPreview = useRenderedPreview(splitMode === "half-frame" ? activeAsset : null, "left", {
    applyColor: false,
    maxEdge: 480,
  });
  const rightPreview = useRenderedPreview(splitMode === "half-frame" ? activeAsset : null, "right", {
    applyColor: false,
    maxEdge: 480,
  });

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
          <button
            type="button"
            className="button button--secondary"
            disabled={assets.length === 0}
            onClick={() => navigate("/lab")}
          >
            {t("action.nextStep")} · {t("nav.lab")}
          </button>
        </div>

        <SelectionScopeBar
          activeAssetName={activeAsset?.originalName ?? null}
          selectedCount={selectedAssetIds.length}
          totalCount={assets.length}
          targetCount={applyTargetIds.length}
          scope={applyScope}
          onScopeChange={setApplyScope}
        />

        <div className="toolbar toolbar--wrap">
          <div className="segmented-control" role="group" aria-label={t("field.scanMode")}>
            <button
              type="button"
              className={`segmented-control__item${splitMode === "single" ? " segmented-control__item--active" : ""}`}
              disabled={!activeAsset}
              onClick={() => {
                if (!activeAsset) {
                  return;
                }

                updateSplit(activeAsset.id, (asset) => ({
                  ...asset,
                  flags: {
                    ...asset.flags,
                    splitAccepted: true,
                  },
                  recipe: {
                    ...asset.recipe,
                    split: {
                      ...asset.recipe.split,
                      mode: "single" as const,
                    },
                  },
                }));
              }}
            >
              {t("mode.singleFrame")}
            </button>
            <button
              type="button"
              className={`segmented-control__item${splitMode === "half-frame" ? " segmented-control__item--active" : ""}`}
              disabled={!activeAsset}
              onClick={() => {
                if (!activeAsset) {
                  return;
                }

                updateSplit(activeAsset.id, (asset) => ({
                  ...asset,
                  flags: {
                    ...asset.flags,
                    splitAccepted: true,
                  },
                  recipe: {
                    ...asset.recipe,
                    split: {
                      ...asset.recipe.split,
                      mode: "half-frame" as const,
                      leftCrop: asset.recipe.split.leftCrop ?? createFallbackRect(asset.width, asset.height, "left"),
                      rightCrop: asset.recipe.split.rightCrop ?? createFallbackRect(asset.width, asset.height, "right"),
                      activeSide: "left",
                    },
                  },
                }));
              }}
            >
              {t("mode.halfFrame")}
            </button>
          </div>
          <div className="toolbar">
            <button type="button" className="button" onClick={() => void autoDetectSplit(applyTargetIds)}>
              {t("action.autoDetect")}
            </button>
            {activeAsset ? (
              <button
                type="button"
                className="button button--secondary"
                disabled={applyTargetIds.filter((assetId) => assetId !== activeAsset.id).length === 0}
                onClick={() => copySplitToAssets(activeAsset.id, applyTargetIds)}
              >
                {t("action.copySplit")}
              </button>
            ) : null}
          </div>
        </div>

        {!activeAsset ? <div className="empty-card">{t("empty.noSelection")}</div> : null}
        {loading ? <div className="empty-card">{t("status.running")}</div> : null}
        {activeAsset && fileUrl && splitMode === "single" ? (
          <>
            <p className="muted">{t("hint.singleFrameMode")}</p>
            <div className="crop-editor">
              <div className="crop-editor__canvas">
                <img src={fileUrl} alt="Single frame source" />
              </div>
            </div>
          </>
        ) : null}
        {activeAsset && fileUrl && splitMode === "half-frame" && leftRect && rightRect ? (
          <>
            {!hasStoredSplit ? <p className="muted">{t("hint.splitManualStart")}</p> : null}
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
                  flags: {
                    ...asset.flags,
                    splitAccepted: true,
                  },
                  recipe: {
                    ...asset.recipe,
                    split: {
                      ...asset.recipe.split,
                      mode: "half-frame" as const,
                      activeSide: side,
                    },
                  },
                }))
              }
              onRectChange={(side, rect) => updateSplit(activeAsset.id, (asset) => updateRect(asset, side, rect))}
            />
          </>
        ) : null}

        {activeAsset ? (
          <div className="split-result-grid">
            {splitMode === "single" ? (
              <article className="split-result-card">
                <h3>{t("label.outputSingle")}</h3>
                {fileUrl ? <img src={fileUrl} alt="Single output preview" className="split-result-card__image" /> : null}
              </article>
            ) : (
              <>
                <article className="split-result-card">
                  <h3>{t("label.outputLeft")}</h3>
                  {leftPreview.url ? <img src={leftPreview.url} alt="Left output preview" className="split-result-card__image" /> : null}
                </article>
                <article className="split-result-card">
                  <h3>{t("label.outputRight")}</h3>
                  {rightPreview.url ? <img src={rightPreview.url} alt="Right output preview" className="split-result-card__image" /> : null}
                </article>
              </>
            )}
          </div>
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
