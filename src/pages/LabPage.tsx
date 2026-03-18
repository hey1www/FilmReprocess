import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetStrip } from "../components/library/AssetStrip";
import { CurveEditor } from "../components/lab/CurveEditor";
import { HistogramChart } from "../components/lab/HistogramChart";
import { SelectionScopeBar } from "../components/shared/SelectionScopeBar";
import { useRenderedPreview } from "../components/shared/useRenderedPreview";
import { useI18n } from "../features/i18n/I18nProvider";
import { defaultCurve } from "../services/defaults";
import { useActiveAsset, useAppStore, useAssets } from "../store/useAppStore";
import type { PreviewTarget } from "../types/models";
import type { ApplyScope } from "../utils/applyScope";
import { getScopedAssetIds } from "../utils/applyScope";

export function LabPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const assets = useAssets();
  const activeAsset = useActiveAsset();
  const thumbnailUrls = useAppStore((state) => state.thumbnailUrls);
  const activeAssetId = useAppStore((state) => state.activeAssetId);
  const selectedAssetIds = useAppStore((state) => state.selectedAssetIds);
  const previewTarget = useAppStore((state) => state.previewTarget);
  const selectAsset = useAppStore((state) => state.selectAsset);
  const selectAssetRange = useAppStore((state) => state.selectAssetRange);
  const setPreviewTarget = useAppStore((state) => state.setPreviewTarget);
  const updateColor = useAppStore((state) => state.updateColor);
  const colorPresets = useAppStore((state) => state.project.colorPresets);
  const saveColorPreset = useAppStore((state) => state.saveColorPreset);
  const applyColorPreset = useAppStore((state) => state.applyColorPreset);
  const { url, histogram, loading } = useRenderedPreview(activeAsset, previewTarget);
  const [presetName, setPresetName] = useState("");
  const [applyScope, setApplyScope] = useState<ApplyScope>(selectedAssetIds.length > 1 ? "selected" : "current");
  const applyTargetIds = useMemo(
    () => getScopedAssetIds({ scope: applyScope, assets, activeAssetId, selectedAssetIds }),
    [activeAssetId, applyScope, assets, selectedAssetIds],
  );

  return (
    <section className="workspace workspace--editor">
      <div className="panel panel--rail">
        <div className="panel__header">
          <h1>{t("nav.lab")}</h1>
          <p className="muted">{t("hint.lab")}</p>
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
            <label className="field field--compact">
              <span>{t("field.previewTarget")}</span>
              <select value={previewTarget} onChange={(event) => setPreviewTarget(event.target.value as PreviewTarget)}>
                <option value="original">{t("preview.original")}</option>
                <option value="left">{t("preview.left")}</option>
                <option value="right">{t("preview.right")}</option>
              </select>
            </label>
            <button
              type="button"
              className="button button--secondary"
              disabled={assets.length === 0}
              onClick={() => navigate("/export")}
            >
              {t("action.nextStep")} · {t("nav.export")}
            </button>
          </div>
        </div>

        <SelectionScopeBar
          activeAssetName={activeAsset?.originalName ?? null}
          selectedCount={selectedAssetIds.length}
          totalCount={assets.length}
          targetCount={applyTargetIds.length}
          scope={applyScope}
          onScopeChange={setApplyScope}
        />

        <div className="lab-preview">
          {loading ? <div className="empty-card">{t("status.running")}</div> : null}
          {url ? <img src={url} alt="Processed preview" className="lab-preview__image" /> : null}
          {!url && !loading ? <div className="empty-card">{t("empty.noSelection")}</div> : null}
        </div>
      </div>

      <aside className="panel panel--inspector">
        {activeAsset ? (
          <div className="control-stack control-stack--compact">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={activeAsset.recipe.color.invertNegative}
                onChange={(event) => updateColor([activeAsset.id], { invertNegative: event.target.checked })}
              />
              <span>{t("field.invertNegative")}</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={activeAsset.recipe.color.removeMask}
                onChange={(event) => updateColor([activeAsset.id], { removeMask: event.target.checked })}
              />
              <span>{t("field.removeMask")}</span>
            </label>

            {[
              ["exposure", -2, 2, 0.01],
              ["contrast", -1, 1, 0.01],
              ["saturation", -1, 1, 0.01],
              ["temperature", -1, 1, 0.01],
              ["tint", -1, 1, 0.01],
              ["blackPoint", 0, 0.3, 0.01],
              ["whitePoint", 0.7, 1, 0.01],
            ].map(([field, min, max, step]) => (
              <label key={field} className="field field--slider">
                <span>{t(`field.${field}`)}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={activeAsset.recipe.color[field as keyof typeof activeAsset.recipe.color] as number}
                  onChange={(event) => updateColor([activeAsset.id], { [field]: Number(event.target.value) })}
                />
              </label>
            ))}

            <div className="panel__header">
              <h3>{t("label.histogram")}</h3>
            </div>
            <HistogramChart histogram={histogram} />

            <div className="panel__header">
              <h3>{t("label.curve")}</h3>
              <button type="button" className="button button--secondary" onClick={() => updateColor([activeAsset.id], { curve: defaultCurve })}>
                {t("action.resetCurve")}
              </button>
            </div>
            <CurveEditor
              points={activeAsset.recipe.color.curve}
              onChange={(curve) => updateColor([activeAsset.id], { curve })}
            />
            <div className="panel__header">
              <h3>{t("label.presets")}</h3>
            </div>
            <label className="field">
              <span>{t("field.presetName")}</span>
              <input value={presetName} onChange={(event) => setPresetName(event.target.value)} />
            </label>
            <div className="toolbar">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  saveColorPreset(presetName, activeAsset.id);
                  setPresetName("");
                }}
              >
                {t("action.savePreset")}
              </button>
            </div>
            <div className="preset-list">
              {colorPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-list__item"
                  onClick={() => applyColorPreset(preset.id, applyTargetIds)}
                >
                  <strong>{preset.name}</strong>
                  <span>{t("action.applyPreset")}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button"
              disabled={applyTargetIds.length === 0}
              onClick={() => updateColor(applyTargetIds, activeAsset.recipe.color)}
            >
              {t("action.copyToSelected")}
            </button>
          </div>
        ) : (
          <p className="muted">{t("empty.noSelection")}</p>
        )}
      </aside>
    </section>
  );
}
