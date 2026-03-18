import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../features/i18n/I18nProvider";
import { LibraryPage } from "../pages/LibraryPage";
import { MetadataPage } from "../pages/MetadataPage";
import { SplitPage } from "../pages/SplitPage";
import { LabPage } from "../pages/LabPage";
import { ExportPage } from "../pages/ExportPage";
import { useAppStore } from "../store/useAppStore";
import { JobPanel } from "../components/layout/JobPanel";
import { TopBar } from "../components/layout/TopBar";
import { useI18n } from "../features/i18n/I18nProvider";

function AppFrame() {
  const ready = useAppStore((state) => state.ready);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const { t } = useI18n();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!ready) {
    return <div className="boot-screen">{t("status.loadingWorkspace")}</div>;
  }

  return (
    <HashRouter>
      <div className="app-shell">
        <TopBar />
        <div className="app-shell__body">
          <main className="app-shell__content">
            <Routes>
              <Route path="/" element={<LibraryPage />} />
              <Route path="/metadata" element={<MetadataPage />} />
              <Route path="/split" element={<SplitPage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/export" element={<ExportPage />} />
            </Routes>
          </main>
        </div>
        <JobPanel />
      </div>
    </HashRouter>
  );
}

export function App() {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);

  return (
    <I18nProvider locale={locale} onLocaleChange={setLocale}>
      <AppFrame />
    </I18nProvider>
  );
}
