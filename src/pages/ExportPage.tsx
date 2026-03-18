import { useMemo, useState } from "react";
import { useI18n } from "../features/i18n/I18nProvider";
import { exportProject, triggerDownload } from "../services/exportService";
import { renderNameTemplate } from "../services/naming";
import { getExportTargets } from "../services/renderSpec";
import { useActiveAsset, useAppStore, useSelectedAssets } from "../store/useAppStore";
import type { ExportContent, ExportFormat, ExportMode, ExportRange } from "../types/models";
import { createId } from "../utils/id";

export function ExportPage() {
  const { t } = useI18n();
  const activeAsset = useActiveAsset();
  const selectedAssets = useSelectedAssets();
  const project = useAppStore((state) => state.project);
  const exportSettings = useAppStore((state) => state.project.exportSettings);
  const updateExportSettings = useAppStore((state) => state.updateExportSettings);
  const resolveAssetFile = useAppStore((state) => state.resolveAssetFile);
  const addJob = useAppStore((state) => state.addJob);
  const updateJob = useAppStore((state) => state.updateJob);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const assets = useMemo(() => {
    if (exportSettings.range === "current") {
      return activeAsset ? [activeAsset] : [];
    }

    if (exportSettings.range === "selected") {
      return selectedAssets;
    }

    return project.assets;
  }, [activeAsset, exportSettings.range, project.assets, selectedAssets]);

  const previewNames = assets.flatMap((asset) =>
    getExportTargets(asset).map((target, index) =>
      renderNameTemplate(asset, exportSettings.namingTemplate, target.side, index + 1),
    ),
  );

  return (
    <section className="workspace workspace--export">
      <div className="panel panel--form">
        <div className="panel__header">
          <h1>{t("nav.export")}</h1>
          <p className="muted">{t("hint.export")}</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>{t("field.exportRange")}</span>
            <select
              value={exportSettings.range}
              onChange={(event) => updateExportSettings({ range: event.target.value as ExportRange })}
            >
              <option value="current">{t("range.current")}</option>
              <option value="selected">{t("range.selected")}</option>
              <option value="all">{t("range.all")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("field.exportContent")}</span>
            <select
              value={exportSettings.content}
              onChange={(event) => updateExportSettings({ content: event.target.value as ExportContent })}
            >
              <option value="processed">{t("content.processed")}</option>
              <option value="split-only">{t("content.split-only")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("field.exportFormat")}</span>
            <select
              value={exportSettings.format}
              onChange={(event) => updateExportSettings({ format: event.target.value as ExportFormat })}
            >
              <option value="jpeg">{t("format.jpeg")}</option>
              <option value="png">{t("format.png")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("field.exportMode")}</span>
            <select
              value={exportSettings.mode}
              onChange={(event) => updateExportSettings({ mode: event.target.value as ExportMode })}
            >
              <option value="zip">{t("mode.zip")}</option>
              <option value="folder">{t("mode.folder")}</option>
            </select>
          </label>
          <label className="field field--full">
            <span>{t("field.namingTemplate")}</span>
            <input
              value={exportSettings.namingTemplate}
              onChange={(event) => updateExportSettings({ namingTemplate: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("field.exportQuality")}</span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={exportSettings.quality}
              onChange={(event) => updateExportSettings({ quality: Number(event.target.value) })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportSettings.includeSidecar}
              onChange={(event) => updateExportSettings({ includeSidecar: event.target.checked })}
            />
            <span>{t("field.includeSidecar")}</span>
          </label>
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="button"
            disabled={assets.length === 0}
            onClick={async () => {
              const jobId = createId("job");
              addJob({
                id: jobId,
                label: "jobs.exporting",
                progress: 0,
                stage: "running",
              });

              const directoryHandle =
                exportSettings.mode === "folder" && typeof window.showDirectoryPicker === "function"
                  ? await window.showDirectoryPicker({ mode: "readwrite" })
                  : undefined;

              void exportProject({
                project,
                assets,
                settings: exportSettings,
                resolveAssetFile,
                directoryHandle,
                onProgress(progress) {
                  updateJob(jobId, { progress });
                },
              })
                .then((result) => {
                  updateJob(jobId, { progress: 1, stage: "success" });

                  if (result.mode === "zip") {
                    setDownloadUrl((current) => {
                      if (current) {
                        URL.revokeObjectURL(current);
                      }
                      return result.url;
                    });
                    triggerDownload(result.url, `${project.name.replace(/\s+/g, "-").toLowerCase() || "film-reprocess"}.zip`);
                  }
                })
                .catch(() => {
                  updateJob(jobId, { stage: "error" });
                });
            }}
          >
            {t("action.exportNow")}
          </button>
          {downloadUrl ? (
            <a className="button button--secondary" href={downloadUrl} download={`${project.name || "film-reprocess"}.zip`}>
              ZIP
            </a>
          ) : null}
        </div>
      </div>

      <aside className="panel panel--inspector">
        <div className="panel__header">
          <h2>{t("label.filenamePreview")}</h2>
        </div>
        <div className="name-preview">
          {previewNames.map((name) => (
            <div key={name} className="name-preview__item">
              {name}
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
