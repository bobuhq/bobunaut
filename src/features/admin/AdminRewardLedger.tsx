import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";

import type {
  AdminRewardEntryType,
  AdminRewardLedgerEntry,
} from "../../core/admin/AdminRewardLedgerService";
import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminRewardLedger } from "../../core/admin/useAdminRewardLedger";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

const PAGE_SIZE = 25;

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function getBuilderName(
  entry: AdminRewardLedgerEntry,
): string {
  return (
    entry.displayName ||
    entry.username ||
    "Unnamed Builder"
  );
}

function formatRewardType(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export default function AdminRewardLedger() {
  const { access } = useAdminAccess();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [entryType, setEntryType] =
    useState<AdminRewardEntryType | "">("");
  const [rewardType, setRewardType] = useState("");
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] =
    useState<AdminRewardLedgerEntry | null>(null);
  const [copiedValue, setCopiedValue] =
    useState<string | null>(null);

  const {
    entries,
    loading,
    error,
    refresh,
  } = useAdminRewardLedger({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search,
    entryType,
    rewardType,
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
    setRewardType(rewardType.trim());
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setEntryType("");
    setRewardType("");
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
                IMMUTABLE REWARD HISTORY
              </span>

              <h1>Reward Ledger</h1>

              <p>
                Inspect Builder GP credits and debits without
                modifying balances or ledger history.
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
                placeholder="Search Builder, reward or idempotency key"
                aria-label="Search Reward Ledger"
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
              />

              <select
                value={entryType}
                aria-label="Filter by entry type"
                onChange={(event) => {
                  setEntryType(
                    event.target
                      .value as AdminRewardEntryType | "",
                  );
                  setPage(0);
                }}
              >
                <option value="">All entries</option>
                <option value="credit">Credits</option>
                <option value="debit">Debits</option>
              </select>

              <input
                type="text"
                value={rewardType}
                placeholder="Reward type"
                aria-label="Filter by reward type"
                onChange={(event) =>
                  setRewardType(event.target.value)
                }
              />

              <button type="submit">Apply</button>

              {search || entryType || rewardType ? (
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
                <Coins size={19} />

                <div>
                  <span>REWARD OPERATIONS</span>

                  <strong>
                    {loading
                      ? "Loading ledger"
                      : `${entries.length} entries loaded`}
                  </strong>
                </div>
              </div>

              <span className="admin-builders__page-label">
                PAGE {page + 1}
              </span>
            </div>

            {error ? (
              <div className="admin-builders__state">
                <strong>Unable to load Reward Ledger</strong>
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
                <strong>Loading Reward Ledger</strong>
                <span>
                  Securely requesting immutable GP history.
                </span>
              </div>
            ) : entries.length === 0 ? (
              <div className="admin-builders__state">
                <strong>No ledger entries found</strong>
                <span>
                  No reward entries matched the current filters.
                </span>
              </div>
            ) : (
              <div className="admin-operations__table-wrap">
                <table className="admin-operations__table">
                  <thead>
                    <tr>
                      <th>Builder</th>
                      <th>Reward</th>
                      <th>Entry</th>
                      <th>Amount</th>
                      <th>Provider</th>
                      <th>Created</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>

                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.ledgerId}>
                        <td>
                          <strong>
                            {getBuilderName(entry)}
                          </strong>

                          <span>
                            {entry.username
                              ? `@${entry.username}`
                              : entry.builderId.slice(0, 12)}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {formatRewardType(
                              entry.rewardType,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`admin-operations__status admin-operations__status--${entry.entryType}`}
                          >
                            {entry.entryType}
                          </span>
                        </td>

                        <td>
                          <strong
                            className={`admin-operations__amount admin-operations__amount--${entry.entryType}`}
                          >
                            {entry.entryType === "debit"
                              ? "−"
                              : "+"}
                            {numberFormatter.format(
                              entry.amount,
                            )}{" "}
                            GP
                          </strong>
                        </td>

                        <td>
                          {entry.provider ?? "System"}
                        </td>

                        <td>
                          {dateFormatter.format(
                            new Date(entry.createdAt),
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-operations__view"
                            onClick={() =>
                              setSelectedEntry(entry)
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
                  {PAGE_SIZE} entries per page
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

      {selectedEntry ? (
        <div
          className="admin-builder-drawer__backdrop"
          role="presentation"
          onClick={() => setSelectedEntry(null)}
        >
          <aside
            className="admin-builder-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Reward ledger entry details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-builder-drawer__header">
              <div>
                <span>REWARD LEDGER ENTRY</span>
                <strong>
                  {formatRewardType(
                    selectedEntry.rewardType,
                  )}
                </strong>
              </div>

              <button
                type="button"
                aria-label="Close entry details"
                onClick={() => setSelectedEntry(null)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="admin-builder-drawer__content">
              <section className="admin-builder-drawer__stats">
                <div>
                  <Coins size={17} />
                  <span>Amount</span>
                  <strong>
                    {selectedEntry.entryType === "debit"
                      ? "−"
                      : "+"}
                    {numberFormatter.format(
                      selectedEntry.amount,
                    )}{" "}
                    GP
                  </strong>
                </div>

                <div>
                  <ShieldCheck size={17} />
                  <span>Entry type</span>
                  <strong>
                    {selectedEntry.entryType.toUpperCase()}
                  </strong>
                </div>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Reward Details</h3>

                <div className="admin-builder-drawer__rows">
                  <div>
                    <span>Builder</span>
                    <strong>
                      {getBuilderName(selectedEntry)}
                    </strong>
                  </div>

                  <div>
                    <span>Reward Type</span>
                    <strong>
                      {formatRewardType(
                        selectedEntry.rewardType,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Provider</span>
                    <strong>
                      {selectedEntry.provider ?? "System"}
                    </strong>
                  </div>

                  <div>
                    <span>Created</span>
                    <strong>
                      {dateFormatter.format(
                        new Date(selectedEntry.createdAt),
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Ledger ID</h3>

                <button
                  type="button"
                  className="admin-builder-drawer__copy"
                  onClick={() =>
                    void copyValue(selectedEntry.ledgerId)
                  }
                >
                  <code>{selectedEntry.ledgerId}</code>

                  <span>
                    <Copy size={15} />
                    {copiedValue === selectedEntry.ledgerId
                      ? "Copied"
                      : "Copy"}
                  </span>
                </button>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Idempotency Key</h3>

                <button
                  type="button"
                  className="admin-builder-drawer__copy"
                  onClick={() =>
                    void copyValue(
                      selectedEntry.idempotencyKey,
                    )
                  }
                >
                  <code>
                    {selectedEntry.idempotencyKey}
                  </code>

                  <span>
                    <Copy size={15} />
                    {copiedValue ===
                    selectedEntry.idempotencyKey
                      ? "Copied"
                      : "Copy"}
                  </span>
                </button>
              </section>

              <section className="admin-builder-drawer__section">
                <h3>Metadata</h3>

                <pre className="admin-operations__metadata">
                  {JSON.stringify(
                    selectedEntry.metadata,
                    null,
                    2,
                  )}
                </pre>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </AdminLayout>
  );
}
