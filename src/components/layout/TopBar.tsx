import { useRef } from "react";
import { supportsDirectoryPicker } from "../../services/fileAccess";
import { useI18n } from "../../features/i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import type { Locale } from "../../types/models";

function mapFiles(list: FileList) {
  return Array.from(list).map((file) => {
    const maybeRelative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    return {
      file,
      relativePath: maybeRelative || undefined,
    };
  });
}

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();
  const locale = useAppStore((state) => state.locale);
  const projectName = useAppStore((state) => state.project.name);
  const setLocale = useAppStore((state) => state.setLocale);
  const importFiles = useAppStore((state) => state.importFiles);
  const importFromDirectory = useAppStore((state) => state.importFromDirectory);
  const setProjectName = useAppStore((state) => state.setProjectName);

  return (
    <header className="topbar">
      <div>
        <div className="topbar__title">{t("app.title")}</div>
        <div className="topbar__subtitle">{t("app.subtitle")}</div>
      </div>

      <div className="topbar__project">
        <label className="field">
          <span>{t("field.projectName")}</span>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
        </label>
      </div>

      <div className="topbar__actions">
        <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
          {t("action.importFiles")}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            if (supportsDirectoryPicker()) {
              void importFromDirectory();
              return;
            }

            folderInputRef.current?.click();
          }}
        >
          {t("action.importFolder")}
        </button>

        <label className="field field--compact">
          <span>{t("field.locale")}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
      </div>

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
    </header>
  );
}
