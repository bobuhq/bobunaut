import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Database,
  ExternalLink,
  Fingerprint,
  LockKeyhole,
  Network,
  Tag,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";

import type { BuilderWalletEntry } from "../../../core/builder";
import { useLanguage } from "../../../core/language";

type WalletTransactionDrawerProps = {
  entry: BuilderWalletEntry | null;
  onClose: () => void;
  formatGp: (value: number) => string;
  formatDate: (value: string) => string;
  formatRewardLabel: (
    entry: BuilderWalletEntry,
  ) => string;
};

const formatValue = (
  value: unknown,
  unsupportedLabel: string,
): string => {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return unsupportedLabel;
  }
};

const formatFieldLabel = (
  value: string,
): string =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

export function WalletTransactionDrawer({
  entry,
  onClose,
  formatGp,
  formatDate,
  formatRewardLabel,
}: WalletTransactionDrawerProps) {
  const { t } = useLanguage();

  const closeButtonRef =
    useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!entry) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [entry, onClose]);

  if (!entry) {
    return null;
  }

  const provider =
    entry.provider?.trim() || t("wallet.drawer.defaultProvider");

  const metadataEntries = Object.entries(
    entry.metadata ?? {},
  );

  const isCredit = entry.type === "credit";

  return (
    <div
      className="builder-wallet-drawer-layer"
      role="presentation"
    >
      <button
        type="button"
        className="builder-wallet-drawer-backdrop"
        aria-label={t("wallet.drawer.closeAria")}
        onClick={onClose}
      />

      <aside
        className="builder-wallet-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-transaction-title"
      >
        <header className="builder-wallet-drawer-header">
          <div>
            <span>{t("wallet.drawer.eyebrow")}</span>
            <h2 id="wallet-transaction-title">
              {formatRewardLabel(entry)}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="builder-wallet-drawer-close"
            aria-label={t("wallet.drawer.closeAria")}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="builder-wallet-drawer-content">
          <section
            className={`builder-wallet-drawer-amount builder-wallet-drawer-amount--${entry.type}`}
          >
            <span className="builder-wallet-drawer-amount-icon">
              {isCredit ? (
                <ArrowUpRight size={24} />
              ) : (
                <ArrowDownRight size={24} />
              )}
            </span>

            <div>
              <span>
                {isCredit
                  ? t("wallet.drawer.gpReceived")
                  : t("wallet.drawer.gpSpent")}
              </span>

              <strong>
                {isCredit ? "+" : "-"}
                {formatGp(entry.amount)} GP
              </strong>
            </div>
          </section>

          <section className="builder-wallet-drawer-status">
            <CheckCircle2 size={18} />

            <div>
              <span>{t("wallet.drawer.status")}</span>
              <strong>{t("wallet.drawer.completed")}</strong>
            </div>

            <i>{t("wallet.drawer.verified")}</i>
          </section>

          <section className="builder-wallet-drawer-details">
            <div className="builder-wallet-drawer-row">
              <span>
                <Network size={16} />
                {t("wallet.drawer.provider")}
              </span>
              <strong>{provider}</strong>
            </div>

            <div className="builder-wallet-drawer-row">
              <span>
                <Tag size={16} />
                {t("wallet.drawer.rewardType")}
              </span>
              <strong>
                {formatFieldLabel(
                  entry.rewardType,
                )}
              </strong>
            </div>

            <div className="builder-wallet-drawer-row">
              <span>
                <Database size={16} />
                {t("wallet.drawer.entryType")}
              </span>
              <strong>
                {entry.type === "credit"
                  ? t("wallet.drawer.credit")
                  : t("wallet.drawer.debit")}
              </strong>
            </div>

            <div className="builder-wallet-drawer-row">
              <span>
                <CalendarDays size={16} />
                {t("wallet.drawer.created")}
              </span>
              <strong>
                {formatDate(entry.createdAt)}
              </strong>
            </div>

            <div className="builder-wallet-drawer-row builder-wallet-drawer-row--stacked">
              <span>
                <Fingerprint size={16} />
                {t("wallet.drawer.transactionId")}
              </span>

              <code>{entry.id}</code>
            </div>
          </section>

          <section className="builder-wallet-drawer-explorer">
            <div>
              <LockKeyhole size={18} />

              <span>
                <strong>{t("wallet.drawer.explorer")}</strong>
                <small>
                  {t("wallet.drawer.explorerDescription")}
                </small>
              </span>
            </div>

            <button type="button" disabled>
              <ExternalLink size={15} />
              {t("wallet.drawer.locked")}
            </button>
          </section>

          {metadataEntries.length > 0 && (
            <section className="builder-wallet-drawer-metadata">
              <div className="builder-wallet-drawer-subheading">
                <span>{t("wallet.drawer.metadata")}</span>
                <strong>
                  {t("wallet.drawer.fields", {
                    count: metadataEntries.length,
                  })}
                </strong>
              </div>

              <div className="builder-wallet-drawer-metadata-list">
                {metadataEntries.map(
                  ([key, value]) => (
                    <div key={key}>
                      <span>
                        {formatFieldLabel(key)}
                      </span>
                      <code>
                        {formatValue(
                          value,
                          t("wallet.drawer.unsupportedValue"),
                        )}
                      </code>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
