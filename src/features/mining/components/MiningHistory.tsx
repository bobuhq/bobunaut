import {
  CalendarDays,
  CheckCircle2,
  History,
} from "lucide-react";

import { useLanguage } from "../../../core/language";

import type {
  MiningHistoryEntry,
} from "../services/MiningHistoryService";

type MiningHistoryProps = {
  entries: MiningHistoryEntry[];
  loading: boolean;
  errorMessage: string | null;
};

const formatDate = (
  value: string,
  language: string,
): string =>
  new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const shortenSessionId = (
  sessionId: string | null,
  unavailableLabel: string,
): string => {
  if (!sessionId) {
    return unavailableLabel;
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
  const { language, t } = useLanguage();

  return (
    <section className="mining-history-panel">
      <div className="mining-history-heading">
        <div>
          <span className="mining-history-eyebrow">
            <History size={15} />
            {t("mining.history.eyebrow")}
          </span>

          <h2>{t("mining.history.title")}</h2>
        </div>

        <span className="mining-history-count">
          {t("mining.history.latest", {
            count: entries.length,
          })}
        </span>
      </div>

      {loading ? (
        <p className="mining-history-state">
          {t("mining.history.synchronizing")}
        </p>
      ) : errorMessage ? (
        <p className="mining-history-state is-error">
          {errorMessage}
        </p>
      ) : entries.length === 0 ? (
        <p className="mining-history-state">
          {t("mining.history.empty")}
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
                    language,
                  )} GP
                </strong>

                <span>
                  {shortenSessionId(
                    entry.sessionId,
                    t("mining.history.sessionUnavailable"),
                  )}
                </span>
              </div>

              <div className="mining-history-entry-date">
                <CalendarDays size={14} />
                <span>
                  {formatDate(
                    entry.createdAt,
                    language,
                  )}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
