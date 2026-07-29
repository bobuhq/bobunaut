import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Network,
  Pickaxe,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";

import type {
  AdminMiningSession,
  AdminMiningStatus,
} from "../../core/admin/AdminMiningSessionsService";
import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminMiningSessions } from "../../core/admin/useAdminMiningSessions";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

const PAGE_SIZE = 25;

const numberFormatter = new Intl.NumberFormat("en-US");

const rateFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function getBuilderName(
  session: AdminMiningSession,
): string {
  return (
    session.displayName ||
    session.username ||
    "Unnamed Builder"
  );
}

function formatRemainingTime(
  remainingSeconds: number,
  status: AdminMiningStatus,
): string {
  if (status === "expired") {
    return "Expired";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "claimed") {
    return "Claimed";
  }

  const totalSeconds = Math.max(
    Math.trunc(remainingSeconds),
    0,
  );

  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(
    (totalSeconds % 3_600) / 60,
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function AdminMiningSessions() {
  const { access } = useAdminAccess();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<AdminMiningStatus | "">("");
  const [page, setPage] = useState(0);
  const [selectedSession, setSelectedSession] =
    useState<AdminMiningSession | null>(null);
  const [copiedValue, setCopiedValue] =
    useState<string | null>(null);

  const {
    sessions,
    loading,
    error,
    refresh,
  } = useAdminMiningSessions({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search,
    status,
  });

  const role = access?.role ?? "admin";
  const canGoBack = page > 0;
  const canGoForward = sessions.length === PAGE_SIZE;

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(0);
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);

      window.setTimeout(() => {
        setCopiedValue(null);
      }, 1_500);
    } catch {
      setCopiedValue(null);
    }
  }

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                SERVER-AUTHORITATIVE MINING
              </span>

              <h1>Mining Sessions</h1>

              <p>
                Monitor active, completed and claimed 24-hour
                Builder Mining sessions.
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
                placeholder="Search Builder or session ID"
                aria-label="Search Mining Sessions"
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
              />

              <select
                value={status}
                aria-label="Filter by mining status"
                onChange={(event) => {
                  setStatus(
                    event.target
                      .value as AdminMiningStatus | "",
                  );
                  setPage(0);
                }}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="completed">Completed</option>
                <option value="claimed">Claimed</option>
              </select>

              <button type="submit">Search</button>

              {search || status ? (
                <button
                  type="button"
                  className="admin-builders__clear"
                  onClick={handleClearFilters}
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
                <Pickaxe size={19} />

                <div>
                  <span>MINING OPERATIONS</span>

                  <strong>
                    {loading
                      ? "Loading sessions"
                      : `${sessions.length} sessions loaded`}
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
                  Unable to load Mining Sessions
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
                <strong>Loading Mining Sessions</strong>
                <span>
                  Securely requesting server mining data.
                </span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="admin-builders__state">
                <strong>No mining sessions found</strong>
                <span>
                  No sessions matched the current filters.
                </span>
              </div>
            ) : (
              <div className="admin-operations__table-wrap">
                <table className="admin-operations__table">
                  <thead>
                    <tr>
                      <th>Builder</th>
                      <th>Status</th>
                      <th>Reward</th>
                      <th>Rate / Hour</th>
                      <th>Referrals</th>
                      <th>Ends</th>
                      <th>Remaining</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>

                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.sessionId}>
                        <td>
                          <strong>
                            {getBuilderName(session)}
                          </strong>

                          <span>
                            {session.username
                              ? `@${session.username}`
                              : session.builderId.slice(0, 12)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`admin-operations__status admin-operations__status--${session.status}`}
                          >
                            {session.status}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {numberFormatter.format(
                              session.rewardGp,
                            )}{" "}
                            GP
                          </strong>
                        </td>

                        <td>
                          {rateFormatter.format(
                            session.totalRatePerHour,
                          )}
                        </td>

                        <td>
                          {numberFormatter.format(
                            session.activeReferralCount,
                          )}
                        </td>

                        <td>
                          {dateFormatter.format(
                            new Date(session.endsAt),
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatRemainingTime(
                              session.remainingSeconds,
                              session.status,
                            )}
                          </strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-operations__view"
                            onClick={() =>
                              setSelectedSession(session)
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!error && !loading ? (
              <footer className="admin-builders__pagination">
                <span>
                  Showing page {page + 1} · Up to{" "}
                  {PAGE_SIZE} sessions per page
                </span>

                <div>
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(current - 1, 0),
                      )
                    }
                  >
                    <ChevronLeft size={17} />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!canGoForward}
                    onClick={() =>
                      setPage((current) => current + 1)
                    }
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>
              </footer>
            ) : null}
          </section>
        </div>
      </section>

      {selectedSession ? (
        <div
          className="admin-builder-drawer__backdrop"
          role="presentation"
          onClick={() => setSelectedSession(null)}
        >
          <aside
            className="admin-builder-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mining session details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-builder-drawer__header">
              <div>
                <span>MINING SESSION</span>
                <strong>
                  {getBuilderName(selectedSession)}
                </strong>
              </div>

              <button
                type="button"
                aria-label="Close session details"
                onClick={() => setSelectedSession(null)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="admin-builder-drawer__content">
              <section className="admin-builder-drawer__stats">
                <div>
                  <Sparkles size={17} />
                  <span>Reward</span>
                  <strong>
                    {numberFormatter.format(
                      selectedSession.rewardGp,
                    )}{" "}
                    GP
                  </strong>
                </div>

                <div>
                  <Pickaxe size={17} />
                  <span>Status</span>
                  <strong>
                    {selectedSession.status.toUpperCase()}
                  </strong>
                </div>

                <div>
                  <Network size={17} />
                  <span>Referrals</span>
                  <strong>
                    {numberFormatter.format(
                      selectedSession.activeReferralCount,
                    )}
                  </strong>
                </div>

                <div>
                  <Clock3 size={17} />
                  <span>Rate / Hour</span>
                  <strong>
                    {rateFormatter.format(
                      selectedSession.totalRatePerHour,
                    )}
                  </strong>
                </div>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Mining Rates</h3>

                <div className="admin-builder-drawer__rows">
                  <div>
                    <span>Base Rate</span>
                    <strong>
                      {rateFormatter.format(
                        selectedSession.baseRatePerHour,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Referral Bonus</span>
                    <strong>
                      {rateFormatter.format(
                        selectedSession.referralBonusRate,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Total Rate</span>
                    <strong>
                      {rateFormatter.format(
                        selectedSession.totalRatePerHour,
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Timeline</h3>

                <div className="admin-builder-drawer__rows">
                  <div>
                    <span>Started</span>
                    <strong>
                      {dateFormatter.format(
                        new Date(selectedSession.startedAt),
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Ends</span>
                    <strong>
                      {dateFormatter.format(
                        new Date(selectedSession.endsAt),
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Remaining</span>
                    <strong>
                      {formatRemainingTime(
                        selectedSession.remainingSeconds,
                        selectedSession.status,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Claimed</span>
                    <strong>
                      {selectedSession.claimedAt
                        ? dateFormatter.format(
                            new Date(
                              selectedSession.claimedAt,
                            ),
                          )
                        : "Not claimed"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Session ID</h3>

                <button
                  type="button"
                  className="admin-builder-drawer__copy"
                  onClick={() =>
                    void copyValue(
                      selectedSession.sessionId,
                    )
                  }
                >
                  <code>
                    {selectedSession.sessionId}
                  </code>

                  <span>
                    <Copy size={15} />
                    {copiedValue ===
                    selectedSession.sessionId
                      ? "Copied"
                      : "Copy"}
                  </span>
                </button>
              </section>

              {selectedSession.ledgerId ? (
                <section className="admin-builder-drawer__section">
                  <h3>Reward Ledger ID</h3>

                  <button
                    type="button"
                    className="admin-builder-drawer__copy"
                    onClick={() =>
                      void copyValue(
                        selectedSession.ledgerId!,
                      )
                    }
                  >
                    <code>
                      {selectedSession.ledgerId}
                    </code>

                    <span>
                      <Copy size={15} />
                      {copiedValue ===
                      selectedSession.ledgerId
                        ? "Copied"
                        : "Copy"}
                    </span>
                  </button>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </AdminLayout>
  );
}
