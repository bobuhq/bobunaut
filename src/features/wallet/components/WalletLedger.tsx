import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  History,
} from "lucide-react";

import type { BuilderWalletEntry } from "../../../core/builder";

type WalletLedgerProps = {
  entries: BuilderWalletEntry[];
  formatGp: (value: number) => string;
  formatDate: (value: string) => string;
  formatRewardLabel: (
    entry: BuilderWalletEntry,
  ) => string;
};

export function WalletLedger({
  entries,
  formatGp,
  formatDate,
  formatRewardLabel,
}: WalletLedgerProps) {
  return (
    <article className="builder-wallet-ledger">
      <div className="builder-wallet-section-heading">
        <div>
          <span>GP LEDGER</span>
          <h2>Recent Activity</h2>
        </div>

        <div className="builder-wallet-section-status">
          <Clock3 size={15} />
          Latest 10
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="builder-wallet-entry-list">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="builder-wallet-entry"
            >
              <span
                className={`builder-wallet-entry-icon builder-wallet-entry-icon--${entry.type}`}
              >
                {entry.type === "credit" ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <ArrowDownRight size={18} />
                )}
              </span>

              <div className="builder-wallet-entry-copy">
                <strong>{formatRewardLabel(entry)}</strong>
                <span>{formatDate(entry.createdAt)}</span>
              </div>

              <strong
                className={`builder-wallet-entry-amount builder-wallet-entry-amount--${entry.type}`}
              >
                {entry.type === "credit" ? "+" : "-"}
                {formatGp(entry.amount)} GP
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="builder-wallet-empty">
          <History size={28} />
          <h3>No GP activity yet</h3>
          <p>
            Mining, mission and community rewards will appear
            here.
          </p>
        </div>
      )}
    </article>
  );
}
