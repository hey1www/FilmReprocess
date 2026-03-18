import { useI18n } from "../../features/i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";

export function JobPanel() {
  const { t } = useI18n();
  const jobs = useAppStore((state) => state.jobs);

  return (
    <section className="jobs">
      <div className="panel__header">
        <h2>{t("panel.jobs")}</h2>
      </div>

      {jobs.length === 0 ? <p className="muted">{t("jobs.none")}</p> : null}

      <div className="jobs__list">
        {jobs.map((job) => (
          <article key={job.id} className="jobs__item">
            <div className="jobs__row">
              <span>{t(job.label)}</span>
              <span>{Math.round(job.progress * 100)}%</span>
            </div>
            <div className="jobs__progress">
              <div className="jobs__progress-fill" style={{ width: `${job.progress * 100}%` }} />
            </div>
            <div className="jobs__stage">{t(`status.${job.stage}`)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
