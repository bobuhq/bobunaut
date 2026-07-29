import {
  ChevronLeft,
  ChevronRight,
  FileClock,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import type {
  AdminAuditSeverity,
} from "../../core/admin/AdminSecurityService";

import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminAuditLogs } from "../../core/admin/useAdminAuditLogs";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

const PAGE_SIZE = 25;

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

export default function AdminAuditLogs() {
  const { access } = useAdminAccess();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionInput, setActionInput] =
    useState("");
  const [action, setAction] = useState("");

  const [severity, setSeverity] =
    useState<AdminAuditSeverity | "">("");

  const [page, setPage] = useState(0);

  const {
    entries,
    loading,
    error,
    refresh,
  } = useAdminAuditLogs({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search,
    action,
    severity,
  });

  const role = access?.role ?? "admin";
  const canGoBack = page > 0;
  const canGoForward = entries.length === PAGE_SIZE;

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
    setAction(actionInput.trim());
  }

  function handleClear() {
    setSearchInput("");
    setSearch("");
    setActionInput("");
    setAction("");
    setSeverity("");
    setPage(0);
  }

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                IMMUTABLE AUTHORITY HISTORY
              </span>

              <h1>Audit Logs</h1>

              <p>
                Search protected administrator role and access
                changes without modifying the original event
                history.
              </p>
            </div>

            <div className="admin-dashboard__authority">
              <ShieldCheck size={19} />

              <div>
                <span>Read-only authority</span>
                <strong>{role.toUpperCase()}</strong>
              </div>
            </div>
          </header>

          <section className="admin-builders__toolbar admin-operations__toolbar">
            <form
              className="admin-builders__search admin-operations__filters"
              onSubmit={handleSubmit}
            >
              <Search size={18} />

              <input
                type="search"
                value={searchInput}
                placeholder="Search actor, target or event"
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
              />

              <select
                value={severity}
                aria-label="Filter by severity"
                onChange={(event) => {
                  setSeverity(
                    event.target
                      .value as AdminAuditSeverity | "",
                  );
                  setPage(0);
                }}
              >
                <option value="">All severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>

              <input
                type="text"
                value={actionInput}
                placeholder="Exact action"
                onChange={(event) =>
                  setActionInput(event.target.value)
                }
              />

              <button type="submit">Apply</button>

              {search || action || severity ? (
                <button
                  type="button"
                  className="admin-builders__clear"
                  onClick={handleClear}
                >
                  Clear
                </button>
              ) : null}
            </form>

            <button
              type="button"
              className="admin-builders__refresh"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "admin-builders__refresh-icon--loading"
                    : undefined
                }
              />

              Refresh
            </button>
          </section>

          <section className="admin-builders__panel">
            <div className="admin-builders__panel-header">
              <div>
                <FileClock size={19} />

                <div>
                  <span>SECURITY AUDIT HISTORY</span>
                  <strong>
                    {loading
                      ? "Loading audit events"
                      : `${entries.length} events loaded`}
                  </strong>
                </div>
              </div>

              <span className="admin-builders__page-label">
                PAGE {page + 1}
              </span>
            </div>

            {error ? (
              <div className="admin-builders__state">
                <strong>
                  Unable to load Audit Logs
                </strong>
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => void refresh()}
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="admin-builders__state">
                <strong>Loading Audit Logs</strong>
                <span>
                  Reading immutable administrator events.
                </span>
              </div>
            ) : entries.length === 0 ? (
              <div className="admin-builders__state">
                <strong>No audit events found</strong>
                <span>
                  No recorded events matched the filters.
                </span>
              </div>
            ) : (
              <div className="admin-operations__table-wrap">
                <table className="admin-operations__table admin-audit__table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Severity</th>
                      <th>Actor</th>
                      <th>Target</th>
                      <th>Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.auditId}>
                        <td>
                          <strong>
                            {formatAction(entry.action)}
                          </strong>
                          <span>{entry.auditId.slice(0, 12)}</span>
                        </td>

                        <td>
                          <span
                            className={`admin-audit__severity admin-audit__severity--${entry.severity}`}
                          >
                            {entry.severity}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {entry.actorEmail ||
                              "System authority"}
                          </strong>
                          <span>
                            {entry.actorUserId
                              ? entry.actorUserId.slice(0, 12)
                              : "server"}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {entry.targetType}
                          </strong>
                          <span>
                            {entry.targetId
                              ? entry.targetId.slice(0, 16)
                              : "—"}
                          </span>
                        </td>

                        <td>
                          {dateFormatter.format(
                            new Date(entry.createdAt),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-builders__pagination">
              <span>
                Showing page {page + 1} · Up to{" "}
                {PAGE_SIZE} events per page
              </span>

              <div>
                <button
                  type="button"
                  disabled={!canGoBack || loading}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(0, current - 1),
                    )
                  }
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={!canGoForward || loading}
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}
