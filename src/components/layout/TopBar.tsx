import { useI18n } from "../../features/i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import type { Locale } from "../../types/models";
import { SidebarNav } from "./SidebarNav";

export function TopBar() {
  const { t } = useI18n();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__title">{t("app.title")}</div>
        <div className="topbar__subtitle">{t("app.subtitle")}</div>
      </div>

      <div className="topbar__workflow">
        <SidebarNav />
        <label className="field field--inline field--compact topbar__locale">
          <span>{t("field.locale")}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
      </div>
    </header>
  );
}
