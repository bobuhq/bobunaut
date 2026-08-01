import {
  CalendarDays,
  CheckCircle2,
  History,
} from "lucide-react";

import type {
  MiningHistoryEntry,
} from "../services/MiningHistoryService";

type MiningHistoryProps = {
  entries: MiningHistoryEntry[];
  loading: boolean;
  errorMessage: string | null;
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const shortenSessionId = (
  sessionId: string | null,
): string => {
  if (!sessionId) {
    return "Session unavailable";
  }

  if (sessionId.length <= 18) {
    return sessionId;
  }

  return `${sessionId.slice(0, 8)}…${sessionId.slice(-6)}`;
};

export default function MiningHistory({
  entries,
  loading,
  errorMessage,
}: MiningHistoryProps) {
  return (
    <section className="mining-history-panel">
      <div className="mining-history-heading">
        <div>
          <span className="mining-history-eyebrow">
            <History size={15} />
            Verified Ledger
          </span>

          <h2>Mining History</h2>
        </div>

        <span className="mining-history-count">
          Latest {entries.length}
        </span>
      </div>

      {loading ? (
        <p className="mining-history-state">
          Synchronizing mining history…
        </p>
      ) : errorMessage ? (
        <p className="mining-history-state is-error">
          {errorMessage}
        </p>
      ) : entries.length === 0 ? (
        <p className="mining-history-state">
          No claimed mining sessions yet.
        </p>
      ) : (
        <div className="mining-history-list">
          {entries.map((entry) => (
            <article
              className="mining-history-entry"
              key={entry.id}
            >
              <span className="mining-history-entry-icon">
                <CheckCircle2 size={18} />
              </span>

              <div className="mining-history-entry-main">
                <strong>
                  +{entry.amountGp.toLocaleString(
                    "en-US",
                  )} GP
                </strong>

                <span>
                  {shortenSessionId(entry.sessionId)}
                </span>
              </div>

              <div className="mining-history-entry-date">
                <CalendarDays size={14} />
                <span>{formatDate(entry.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
