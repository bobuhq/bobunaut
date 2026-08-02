import {
  BadgeCheck,
  CircleDot,
  Gem,
  Hash,
  Pickaxe,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import type {
  BuilderStatusSnapshot,
  BuilderSystemStatus,
} from "../types/builderStatus";
import { useLanguage } from "../../../core/language";

import "./BuilderStatusPanel.css";

type BuilderStatusPanelProps = {
  status: BuilderStatusSnapshot;
  formatGp?: (value: number) => string;
  compact?: boolean;
};

const formatBuilderId = (
  value: string,
  unavailableLabel: string,
): string => {
  const normalized = value.trim();

  if (!normalized) {
    return unavailableLabel;
  }

  if (normalized.length <= 18) {
    return normalized;
  }

  return `${normalized.slice(0, 8)}…${normalized.slice(-6)}`;
};

const statusLabelKeys: Record<
  BuilderSystemStatus,
  string
> = {
  active: "builderStatus.status.active",
  synced: "builderStatus.status.synced",
  inactive: "builderStatus.status.inactive",
  pending: "builderStatus.status.pending",
  locked: "builderStatus.status.locked",
};

function StatusBadge({
  status,
}: {
  status: BuilderSystemStatus;
}) {
  const { t } = useLanguage();
  return (
    <span
      className={`builder-status-badge builder-status-badge--${status}`}
    >
      <i />
      {t(statusLabelKeys[status])}
    </span>
  );
}

export function BuilderStatusPanel({
  status,
  formatGp,
  compact = false,
}: BuilderStatusPanelProps) {
  const { language, t } = useLanguage();

  const resolvedFormatGp =
    formatGp ??
    ((value: number) =>
      value.toLocaleString(language));

  return (
    <section
      className={
        compact
          ? "builder-status-panel builder-status-panel--compact"
          : "builder-status-panel"
      }
      aria-label={t("builderStatus.aria")}
    >
      <header className="builder-status-header">
        <div>
          <span className="builder-status-eyebrow">
            {t("builderStatus.eyebrow")}
          </span>

          <h2>{t("builderStatus.title")}</h2>

          <p>
            {t("builderStatus.description")}
          </p>
        </div>

        <div className="builder-status-core-state">
          <CircleDot size={16} />
          {t("builderStatus.coreOnline")}
        </div>
      </header>

      <div className="builder-status-primary">
        <div className="builder-status-identity">
          <span className="builder-status-avatar">
            <UserRound size={25} />
          </span>

          <div>
            <span>{t("builderStatus.identity")}</span>
            <strong>
              {status.username.trim()
                ? `@${status.username}`
                : t("builderStatus.defaultBuilder")}
            </strong>
            <small title={status.builderId}>
              <Hash size={12} />
              {formatBuilderId(
                status.builderId,
                t("builderStatus.unavailable"),
              )}
            </small>
          </div>
        </div>

        <div className="builder-status-gp">
          <span>
            <Gem size={15} />
            {t("builderStatus.builderGp")}
          </span>

          <strong>{resolvedFormatGp(status.gp)}</strong>
          <small>{t("builderStatus.progressionSource")}</small>
        </div>
      </div>

      <div className="builder-status-grid">
        <article className="builder-status-stat">
          <span>
            <BadgeCheck size={16} />
            {t("builderStatus.level")}
          </span>

          <strong>{status.level}</strong>
          <small>{t("builderStatus.poweredByGp")}</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <Gem size={16} />
            {t("builderStatus.lifetimeEarned")}
          </span>

          <strong>
            {resolvedFormatGp(status.lifetimeEarnedGp)} GP
          </strong>
          <small>{t("builderStatus.verifiedRewards")}</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <WalletCards size={16} />
            {t("builderStatus.wallet")}
          </span>

          <StatusBadge status={status.walletStatus} />
          <small>{t("builderStatus.walletDescription")}</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <ShieldCheck size={16} />
            {t("builderStatus.genesis")}
          </span>

          <StatusBadge status={status.genesisStatus} />
          <small>{t("builderStatus.genesisDescription")}</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <Pickaxe size={16} />
            {t("builderStatus.mining")}
          </span>

          <StatusBadge status={status.miningStatus} />
          <small>{t("builderStatus.miningDescription")}</small>
        </article>
      </div>
    </section>
  );
}
