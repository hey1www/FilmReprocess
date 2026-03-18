import { useRef, type MouseEvent } from "react";
import { AssetGrid } from "../components/library/AssetGrid";
import { useI18n } from "../features/i18n/I18nProvider";
import { supportsDirectoryPicker } from "../services/fileAccess";
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

function mapFiles(list: FileList) {
  return Array.from(list).map((file) => {
    const maybeRelative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    return {
      file,
      relativePath: maybeRelative || undefined,
    };
  });
}

export function LibraryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();
  const canPickDirectory = supportsDirectoryPicker();
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
  const importFiles = useAppStore((state) => state.importFiles);
  const importFromDirectory = useAppStore((state) => state.importFromDirectory);

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
        <div className="toolbar toolbar--wrap">
          <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
            {t("action.importFiles")}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              if (canPickDirectory) {
                void importFromDirectory();
                return;
              }

              folderInputRef.current?.click();
            }}
          >
            {t("action.importFolder")}
          </button>
          {!canPickDirectory ? <p className="muted">{t("hint.folderFallback")}</p> : null}
        </div>
        <div className="toolbar toolbar--wrap">
          <label className="field field--inline field--grow">
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

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const list = event.target.files;
            if (!list) {
              return;
            }
            void importFiles(mapFiles(list));
            event.target.value = "";
          }}
        />
        <input
          ref={(node) => {
            folderInputRef.current = node;
            if (node) {
              node.setAttribute("webkitdirectory", "");
              node.setAttribute("directory", "");
            }
          }}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const list = event.target.files;
            if (!list) {
              return;
            }
            void importFiles(mapFiles(list));
            event.target.value = "";
          }}
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
