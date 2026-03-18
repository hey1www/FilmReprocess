import { useI18n } from "../../features/i18n/I18nProvider";
import type { ApplyScope } from "../../utils/applyScope";

export function SelectionScopeBar({
  activeAssetName,
  selectedCount,
  totalCount,
  targetCount,
  scope,
  onScopeChange,
}: {
  activeAssetName: string | null;
  selectedCount: number;
  totalCount: number;
  targetCount: number;
  scope: ApplyScope;
  onScopeChange: (scope: ApplyScope) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="scope-bar">
      <div className="scope-bar__summary">
        <span>
          <strong>{t("label.currentAsset")}:</strong> {activeAssetName ?? "-"}
        </span>
        <span>{t("label.selectedAssets", { count: selectedCount })}</span>
        <span>{t("label.applyTargets", { count: targetCount })}</span>
      </div>

      <div className="segmented-control" role="group" aria-label={t("field.applyScope")}>
        {(["current", "selected", "all"] as const).map((value) => {
          const disabled = totalCount === 0 || (value === "selected" && selectedCount === 0);
          return (
            <button
              key={value}
              type="button"
              className={`segmented-control__item${scope === value ? " segmented-control__item--active" : ""}`}
              disabled={disabled}
              onClick={() => onScopeChange(value)}
            >
              {t(`scope.${value}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
