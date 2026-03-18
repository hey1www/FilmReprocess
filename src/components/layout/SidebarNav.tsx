import { NavLink } from "react-router-dom";
import { useI18n } from "../../features/i18n/I18nProvider";

const items = [
  { to: "/", label: "nav.library", end: true },
  { to: "/metadata", label: "nav.metadata" },
  { to: "/split", label: "nav.split" },
  { to: "/lab", label: "nav.lab" },
  { to: "/export", label: "nav.export" },
];

export function SidebarNav() {
  const { t } = useI18n();

  return (
    <nav className="workflow-nav" aria-label="Workflow">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `workflow-nav__link${isActive ? " workflow-nav__link--active" : ""}`}
        >
          {t(item.label)}
        </NavLink>
      ))}
    </nav>
  );
}
