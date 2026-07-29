import {
  ChartNoAxesCombined,
  FileClock,
  Gift,
  LayoutDashboard,
  Pickaxe,
  Settings,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

const activeSecurityNavigation = [
  {
    label: "Security",
    icon: ShieldCheck,
    to: "/admin/security",
  },
  {
    label: "Audit Logs",
    icon: FileClock,
    to: "/admin/audit-logs",
  },
] as const;

const analyticsNavigation = [
  {
    label: "Analytics",
    icon: ChartNoAxesCombined,
    to: "/admin/analytics",
  },
] as const;

const futureNavigation = [
  { label: "Missions", icon: Target },
  { label: "Settings", icon: Settings },
] as const;

export function AdminSidebar({
  open,
  onClose,
}: AdminSidebarProps) {
  return (
    <>
      <button
        type="button"
        className={`admin-sidebar__backdrop ${
          open ? "admin-sidebar__backdrop--visible" : ""
        }`}
        aria-label="Close navigation"
        onClick={onClose}
      />

      <aside
        className={`admin-sidebar ${
          open ? "admin-sidebar--open" : ""
        }`}
      >
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-mark">B</div>

          <div>
            <strong>BOBU</strong>
            <span>CONTROL CENTER</span>
          </div>

          <button
            type="button"
            className="admin-sidebar__close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <nav
          className="admin-sidebar__navigation"
          aria-label="Admin navigation"
        >
          <span className="admin-sidebar__section-label">
            OPERATIONS
          </span>

          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `admin-sidebar__link ${
                isActive ? "admin-sidebar__link--active" : ""
              }`
            }
            onClick={onClose}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/builders"
            className={({ isActive }) =>
              `admin-sidebar__link ${
                isActive ? "admin-sidebar__link--active" : ""
              }`
            }
            onClick={onClose}
          >
            <Users size={19} />
            <span>Builders</span>
          </NavLink>

          <NavLink
            to="/admin/reward-ledger"
            className={({ isActive }) =>
              `admin-sidebar__link ${
                isActive ? "admin-sidebar__link--active" : ""
              }`
            }
            onClick={onClose}
          >
            <Gift size={19} />
            <span>Reward Ledger</span>
          </NavLink>

          <NavLink
            to="/admin/mining-sessions"
            className={({ isActive }) =>
              `admin-sidebar__link ${
                isActive ? "admin-sidebar__link--active" : ""
              }`
            }
            onClick={onClose}
          >
            <Pickaxe size={19} />
            <span>Mining Sessions</span>
          </NavLink>

          {activeSecurityNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `admin-sidebar__link ${
                    isActive
                      ? "admin-sidebar__link--active"
                      : ""
                  }`
                }
                onClick={onClose}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {analyticsNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `admin-sidebar__link ${
                    isActive
                      ? "admin-sidebar__link--active"
                      : ""
                  }`
                }
                onClick={onClose}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {futureNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                className="admin-sidebar__link admin-sidebar__link--locked"
                key={item.label}
                title={`${item.label} module is coming next`}
                disabled
              >
                <Icon size={19} />
                <span>{item.label}</span>
                <small>SOON</small>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar__security">
          <ShieldCheck size={18} />

          <div>
            <strong>Protected Console</strong>
            <span>Role verification active</span>
          </div>
        </div>
      </aside>
    </>
  );
}
