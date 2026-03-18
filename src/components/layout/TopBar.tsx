import { useI18n } from "../../features/i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import type { Locale } from "../../types/models";
import { SidebarNav } from "./SidebarNav";

export function TopBar() {
  const { t } = useI18n();
  const locale = useAppStore((state) => state.locale);
  const projectName = useAppStore((state) => state.project.name);
  const setLocale = useAppStore((state) => state.setLocale);
  const setProjectName = useAppStore((state) => state.setProjectName);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__title">{t("app.title")}</div>
        <div className="topbar__subtitle">{t("app.subtitle")}</div>
      </div>

      <div className="topbar__controls">
        <label className="field topbar__project">
          <span>{t("field.projectName")}</span>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
        </label>
        <label className="field field--compact">
          <span>{t("field.locale")}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
      </div>

      <div className="topbar__workflow">
        <SidebarNav />
      </div>
    </header>
  );
}
