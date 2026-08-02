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
import { useLanguage } from "../../../core/language";

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
  labelKey: string;
}> = [
  { id: "all", labelKey: "wallet.ledger.filterAll" },
  { id: "social", labelKey: "wallet.ledger.filterSocial" },
  { id: "mining", labelKey: "wallet.ledger.filterMining" },
  { id: "missions", labelKey: "wallet.ledger.filterMissions" },
  { id: "referral", labelKey: "wallet.ledger.filterReferral" },
  {
    id: "marketplace",
    labelKey: "wallet.ledger.filterMarketplace",
  },
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
  const { t } = useLanguage();

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
          <span>{t("wallet.ledger.eyebrow")}</span>
          <h2>{t("wallet.ledger.title")}</h2>
        </div>

        <div className="builder-wallet-section-status">
          <Clock3 size={15} />
          {t("wallet.ledger.latest", {
            count: entries.length,
          })}
        </div>
      </div>

      <div className="builder-wallet-ledger-tools">
        <div
          className="builder-wallet-ledger-filters"
          aria-label={t("wallet.ledger.filtersAria")}
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
              {t(filter.labelKey)}
            </button>
          ))}
        </div>

        <label className="builder-wallet-ledger-search">
          <Search size={15} />
          <input
            type="search"
            value={searchQuery}
            placeholder={t("wallet.ledger.searchPlaceholder")}
            aria-label={t("wallet.ledger.searchAria")}
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
              aria-label={t("wallet.ledger.openDetailsAria", {
                label: formatRewardLabel(entry),
              })}
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
              ? t("wallet.ledger.noMatches")
              : t("wallet.ledger.empty")}
          </h3>

          <p>
            {hasFilters
              ? t("wallet.ledger.noMatchesDescription")
              : t("wallet.ledger.emptyDescription")}
          </p>

          {hasFilters && (
            <button
              type="button"
              className="builder-wallet-clear-filters"
              onClick={clearFilters}
            >
              {t("wallet.ledger.clearFilters")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
