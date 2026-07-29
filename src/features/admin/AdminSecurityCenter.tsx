import {
  AlertTriangle,
  Clock3,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";

import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminSecurity } from "../../core/admin/useAdminSecurity";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
);

function formatAction(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export default function AdminSecurityCenter() {
  const { access } = useAdminAccess();

  const {
    security,
    loading,
    error,
    refresh,
  } = useAdminSecurity();

  const role = access?.role ?? "admin";

  const summaryCards = [
    {
      label: "Total Authorities",
      value: security?.summary.totalAdmins ?? 0,
      icon: Users,
    },
    {
      label: "Active Authorities",
      value: security?.summary.activeAdmins ?? 0,
      icon: ShieldCheck,
    },
    {
      label: "Inactive Authorities",
      value: security?.summary.inactiveAdmins ?? 0,
      icon: ShieldOff,
    },
    {
      label: "Critical Events · 30D",
      value: security?.summary.criticalEvents ?? 0,
      icon: AlertTriangle,
    },
  ];

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                AUTHORITY AND ACCESS CONTROL
              </span>

              <h1>Security Center</h1>

              <p>
                Inspect administrator roles, account state,
                authentication history and immutable authority
                changes.
              </p>
            </div>

            <div className="admin-dashboard__authority">
              <ShieldCheck size={19} />

              <div>
                <span>Security authority</span>
                <strong>{role.toUpperCase()}</strong>
              </div>
            </div>
          </header>

          <div className="admin-security__toolbar">
            <span>
              Server-authoritative access records
            </span>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "admin-builders__refresh-icon--loading"
                    : undefined
                }
              />

              Refresh
            </button>
          </div>

          {error ? (
            <section className="admin-builders__panel">
              <div className="admin-builders__state">
                <strong>
                  Unable to load Security Center
                </strong>
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => void refresh()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="admin-security__summary">
                {summaryCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article key={card.label}>
                      <Icon size={18} />
                      <span>{card.label}</span>
                      <strong>
                        {loading
                          ? "—"
                          : numberFormatter.format(
                              card.value,
                            )}
                      </strong>
                    </article>
                  );
                })}
              </section>

              <section className="admin-security__grid">
                <div className="admin-builders__panel">
                  <div className="admin-builders__panel-header">
                    <div>
                      <ShieldCheck size={19} />

                      <div>
                        <span>ADMIN AUTHORITIES</span>
                        <strong>
                          {loading
                            ? "Loading accounts"
                            : `${
                                security?.admins.length ?? 0
                              } accounts`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="admin-builders__state">
                      <strong>
                        Loading authorities
                      </strong>
                      <span>
                        Reading protected admin access records.
                      </span>
                    </div>
                  ) : !security ||
                    security.admins.length === 0 ? (
                    <div className="admin-builders__state">
                      <strong>
                        No administrator accounts
                      </strong>
                    </div>
                  ) : (
                    <div className="admin-operations__table-wrap">
                      <table className="admin-operations__table admin-security__table">
                        <thead>
                          <tr>
                            <th>Authority</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Sign In</th>
                            <th>Added</th>
                          </tr>
                        </thead>

                        <tbody>
                          {security.admins.map((admin) => (
                            <tr key={admin.userId}>
                              <td>
                                <strong>
                                  {admin.email ||
                                    "Unknown account"}
                                </strong>
                                <span>
                                  {admin.userId.slice(0, 12)}
                                </span>
                              </td>

                              <td>
                                <span className="admin-security__role">
                                  {admin.role}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`admin-operations__status ${
                                    admin.active
                                      ? "admin-operations__status--active"
                                      : "admin-operations__status--completed"
                                  }`}
                                >
                                  {admin.active
                                    ? "active"
                                    : "inactive"}
                                </span>
                              </td>

                              <td>
                                {admin.lastSignInAt
                                  ? dateFormatter.format(
                                      new Date(
                                        admin.lastSignInAt,
                                      ),
                                    )
                                  : "No recorded sign-in"}
                              </td>

                              <td>
                                {dateFormatter.format(
                                  new Date(
                                    admin.createdAt,
                                  ),
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="admin-security__events">
                  <header>
                    <Clock3 size={18} />

                    <div>
                      <span>RECENT SECURITY EVENTS</span>
                      <strong>Immutable history</strong>
                    </div>
                  </header>

                  <div>
                    {loading ? (
                      <div className="admin-security__empty">
                        Loading events…
                      </div>
                    ) : !security ||
                      security.recentEvents.length === 0 ? (
                      <div className="admin-security__empty">
                        No authority changes recorded yet.
                      </div>
                    ) : (
                      security.recentEvents.map((event) => (
                        <article key={event.auditId}>
                          <i
                            className={`admin-security__severity admin-security__severity--${event.severity}`}
                          />

                          <div>
                            <strong>
                              {formatAction(event.action)}
                            </strong>

                            <span>
                              {event.actorEmail ||
                                "System authority"}
                            </span>

                            <time
                              dateTime={event.createdAt}
                            >
                              {dateFormatter.format(
                                new Date(
                                  event.createdAt,
                                ),
                              )}
                            </time>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
