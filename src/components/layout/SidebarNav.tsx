import { NavLink } from "react-router-dom";
import { useI18n } from "../../features/i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import type { Asset } from "../../types/models";

const items = [
  { to: "/", label: "nav.library", end: true },
  { to: "/metadata", label: "nav.metadata" },
  { to: "/split", label: "nav.split" },
  { to: "/lab", label: "nav.lab" },
  { to: "/export", label: "nav.export" },
];

function hasMetadata(asset: Asset) {
  return Boolean(
    asset.metadata.shotAt ||
      asset.metadata.cameraModel ||
      asset.metadata.scannerModel ||
      asset.metadata.location?.label ||
      asset.metadata.notes ||
      asset.metadata.tags?.length,
  );
}

export function SidebarNav() {
  const { t } = useI18n();
  const assets = useAppStore((state) => state.project.assets);

  const statusByRoute: Record<string, "pending" | "ready" | "complete"> = {
    "/": assets.length > 0 ? "complete" : "pending",
    "/metadata":
      assets.length === 0 ? "pending" : assets.every((asset) => hasMetadata(asset)) ? "complete" : "ready",
    "/split":
      assets.length === 0 ? "pending" : assets.every((asset) => asset.flags.splitAccepted) ? "complete" : "ready",
    "/lab": assets.length === 0 ? "pending" : assets.every((asset) => asset.flags.splitAccepted) ? "ready" : "pending",
    "/export": assets.length === 0 ? "pending" : "ready",
  };

  return (
    <nav className="workflow-nav" aria-label="Workflow">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `workflow-nav__link workflow-nav__link--${statusByRoute[item.to]}${isActive ? " workflow-nav__link--active" : ""}`
          }
        >
          <span className={`workflow-nav__state workflow-nav__state--${statusByRoute[item.to]}`} />
          <span>{t(item.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
