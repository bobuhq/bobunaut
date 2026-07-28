import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  History,
  Search,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import type { BuilderWalletEntry } from "../../../core/builder";

type WalletLedgerProps = {
  entries: BuilderWalletEntry[];
  formatGp: (value: number) => string;
  formatDate: (value: string) => string;
  formatRewardLabel: (
    entry: BuilderWalletEntry,
  ) => string;
  onSelectEntry: (
    entry: BuilderWalletEntry,
  ) => void;
};

type WalletLedgerFilter =
  | "all"
  | "social"
  | "mining"
  | "missions"
  | "referral"
  | "marketplace";

const ledgerFilters: Array<{
  id: WalletLedgerFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "mining", label: "Mining" },
  { id: "missions", label: "Missions" },
  { id: "referral", label: "Referral" },
  { id: "marketplace", label: "Marketplace" },
];

const normalize = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() ?? "";

const getEntrySearchText = (
  entry: BuilderWalletEntry,
  rewardLabel: string,
): string =>
  [
    rewardLabel,
    entry.provider,
    entry.rewardType,
    entry.type,
    entry.id,
  ]
    .map(normalize)
    .join(" ");

const matchesFilter = (
  entry: BuilderWalletEntry,
  filter: WalletLedgerFilter,
): boolean => {
  if (filter === "all") {
    return true;
  }

  const source = [
    entry.provider,
    entry.rewardType,
  ]
    .map(normalize)
    .join(" ");

  if (filter === "social") {
    return [
      "telegram",
      "twitter",
      "x",
      "instagram",
      "social",
      "community",
    ].some((keyword) => source.includes(keyword));
  }

  if (filter === "mining") {
    return source.includes("mining");
  }

  if (filter === "missions") {
    return (
      source.includes("mission") ||
      source.includes("quest")
    );
  }

  if (filter === "referral") {
    return (
      source.includes("referral") ||
      source.includes("invite")
    );
  }

  return (
    source.includes("marketplace") ||
    source.includes("market")
  );
};

export function WalletLedger({
  entries,
  formatGp,
  formatDate,
  formatRewardLabel,
  onSelectEntry,
}: WalletLedgerProps) {
  const [activeFilter, setActiveFilter] =
    useState<WalletLedgerFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const query = normalize(searchQuery);

    return entries.filter((entry) => {
      const rewardLabel = formatRewardLabel(entry);

      if (!matchesFilter(entry, activeFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return getEntrySearchText(
        entry,
        rewardLabel,
      ).includes(query);
    });
  }, [
    activeFilter,
    entries,
    formatRewardLabel,
    searchQuery,
  ]);

  const hasFilters =
    activeFilter !== "all" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setActiveFilter("all");
    setSearchQuery("");
  };

  return (
    <article className="builder-wallet-ledger">
      <div className="builder-wallet-section-heading">
        <div>
          <span>GP LEDGER</span>
          <h2>Recent Activity</h2>
        </div>

        <div className="builder-wallet-section-status">
          <Clock3 size={15} />
          Latest {entries.length}
        </div>
      </div>

      <div className="builder-wallet-ledger-tools">
        <div
          className="builder-wallet-ledger-filters"
          aria-label="Transaction filters"
        >
          {ledgerFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={
                activeFilter === filter.id
                  ? "builder-wallet-ledger-filter builder-wallet-ledger-filter--active"
                  : "builder-wallet-ledger-filter"
              }
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="builder-wallet-ledger-search">
          <Search size={15} />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
          />
        </label>
      </div>

      {filteredEntries.length > 0 ? (
        <div
          key={`${activeFilter}-${searchQuery}`}
          className="builder-wallet-entry-list builder-wallet-entry-list--animated"
        >
          {filteredEntries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className="builder-wallet-entry"
              aria-label={`Open ${formatRewardLabel(entry)} transaction details`}
              style={{
                animationDelay: `${index * 35}ms`,
              }}
              onClick={() =>
                onSelectEntry(entry)
              }
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
            </button>
          ))}
        </div>
      ) : (
        <div className="builder-wallet-empty">
          <History size={28} />

          <h3>
            {hasFilters
              ? "No matching transactions"
              : "No GP activity yet"}
          </h3>

          <p>
            {hasFilters
              ? "Try another filter or search term."
              : "Mining, mission and community rewards will appear here."}
          </p>

          {hasFilters && (
            <button
              type="button"
              className="builder-wallet-clear-filters"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </article>
  );
}
