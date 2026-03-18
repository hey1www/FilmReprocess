import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetStrip } from "../components/library/AssetStrip";
import { MapPicker } from "../components/metadata/MapPicker";
import { SelectionScopeBar } from "../components/shared/SelectionScopeBar";
import { useI18n } from "../features/i18n/I18nProvider";
import { useActiveAsset, useAppStore, useAssets, useSelectedAssets } from "../store/useAppStore";
import type { AssetLocation, BatchMetadataPatch, MetadataMergeStrategy } from "../types/models";
import type { ApplyScope } from "../utils/applyScope";
import { getScopedAssetIds } from "../utils/applyScope";

const initialLocation: AssetLocation = {
  lat: 22.3193,
  lng: 114.1694,
  label: "",
};

export function MetadataPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const assets = useAssets();
  const activeAsset = useActiveAsset();
  const selectedAssets = useSelectedAssets();
  const thumbnailUrls = useAppStore((state) => state.thumbnailUrls);
  const activeAssetId = useAppStore((state) => state.activeAssetId);
  const selectedAssetIds = useAppStore((state) => state.selectedAssetIds);
  const selectAsset = useAppStore((state) => state.selectAsset);
  const selectAssetRange = useAppStore((state) => state.selectAssetRange);
  const updateMetadata = useAppStore((state) => state.updateMetadata);
  const [showMap, setShowMap] = useState(false);
  const [applyScope, setApplyScope] = useState<ApplyScope>(selectedAssets.length > 1 ? "selected" : "current");
  const [strategy, setStrategy] = useState<MetadataMergeStrategy>("selected-only");
  const [selectedFields, setSelectedFields] = useState<Array<keyof BatchMetadataPatch>>([
    "shotAt",
    "cameraModel",
    "scannerModel",
    "location",
  ]);

  const [draft, setDraft] = useState<BatchMetadataPatch>({
    shotAt: activeAsset?.metadata.shotAt ?? "",
    cameraModel: activeAsset?.metadata.cameraModel ?? "",
    scannerModel: activeAsset?.metadata.scannerModel ?? "",
    location: activeAsset?.metadata.location ?? initialLocation,
    notes: activeAsset?.metadata.notes ?? "",
    tags: activeAsset?.metadata.tags ?? [],
  });

  useEffect(() => {
    setDraft({
      shotAt: activeAsset?.metadata.shotAt ?? "",
      cameraModel: activeAsset?.metadata.cameraModel ?? "",
      scannerModel: activeAsset?.metadata.scannerModel ?? "",
      location: activeAsset?.metadata.location ?? initialLocation,
      notes: activeAsset?.metadata.notes ?? "",
      tags: activeAsset?.metadata.tags ?? [],
    });
  }, [activeAsset]);

  const isBatch = selectedAssets.length > 1;
  const targetIds = useMemo(
    () => getScopedAssetIds({ scope: applyScope, assets, activeAssetId, selectedAssetIds }),
    [activeAssetId, applyScope, assets, selectedAssetIds],
  );

  return (
    <section className="workspace workspace--editor workspace--editor-wide">
      <div className="panel panel--rail">
        <div className="panel__header">
          <h1>{t("nav.metadata")}</h1>
          <p className="muted">{isBatch ? t("label.selectionBatch") : t("label.selectionSingle")}</p>
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

      <div className="panel panel--form">
        <div className="panel__header">
          <h2>{t("panel.metadata")}</h2>
          <button
            type="button"
            className="button button--secondary"
            disabled={assets.length === 0}
            onClick={() => navigate("/split")}
          >
            {t("action.nextStep")} · {t("nav.split")}
          </button>
        </div>

        <SelectionScopeBar
          activeAssetName={activeAsset?.originalName ?? null}
          selectedCount={selectedAssetIds.length}
          totalCount={assets.length}
          targetCount={targetIds.length}
          scope={applyScope}
          onScopeChange={setApplyScope}
        />

        <div className="form-grid">
          <label className="field">
            <span>{t("field.shotAt")}</span>
            <input
              type="datetime-local"
              value={draft.shotAt ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, shotAt: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>{t("field.cameraModel")}</span>
            <input
              value={draft.cameraModel ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, cameraModel: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>{t("field.scannerModel")}</span>
            <input
              value={draft.scannerModel ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, scannerModel: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>{t("field.locationLabel")}</span>
            <input
              value={draft.location?.label ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  location: {
                    ...(current.location ?? initialLocation),
                    label: event.target.value,
                  },
                }))
              }
            />
          </label>
          <label className="field field--full">
            <span>{t("field.notes")}</span>
            <textarea
              rows={4}
              value={draft.notes ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          <label className="field field--full">
            <span>{t("field.tags")}</span>
            <input
              value={(draft.tags ?? []).join(", ")}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
            />
          </label>
        </div>

        {applyScope !== "current" ? (
          <div className="toolbar toolbar--wrap">
            <label className="field field--compact">
              <span>{t("field.strategy")}</span>
              <select value={strategy} onChange={(event) => setStrategy(event.target.value as MetadataMergeStrategy)}>
                <option value="selected-only">{t("strategy.selected-only")}</option>
                <option value="fill-empty">{t("strategy.fill-empty")}</option>
                <option value="overwrite">{t("strategy.overwrite")}</option>
              </select>
            </label>
            {(Object.keys(draft) as Array<keyof BatchMetadataPatch>).map((field) => (
              <label key={field} className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={(event) =>
                    setSelectedFields((current) =>
                      event.target.checked ? [...current, field] : current.filter((item) => item !== field),
                    )
                  }
                />
                <span>{t(`field.${field}`)}</span>
              </label>
            ))}
          </div>
        ) : null}

        <div className="toolbar">
          <button type="button" className="button button--secondary" onClick={() => setShowMap(true)}>
            {t("action.openMap")}
          </button>
          <button
            type="button"
            className="button"
            disabled={targetIds.length === 0}
            onClick={() => updateMetadata(targetIds, draft, strategy, selectedFields)}
          >
            {t("action.applyMetadata")}
          </button>
        </div>
      </div>

      {showMap ? (
        <MapPicker
          value={draft.location ?? initialLocation}
          onChange={(location) => setDraft((current) => ({ ...current, location }))}
          onClose={() => setShowMap(false)}
        />
      ) : null}
    </section>
  );
}
