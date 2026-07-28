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

import "./BuilderStatusPanel.css";

type BuilderStatusPanelProps = {
  status: BuilderStatusSnapshot;
  formatGp?: (value: number) => string;
  compact?: boolean;
};

const defaultFormatGp = (value: number): string =>
  value.toLocaleString("en-US");

const formatBuilderId = (value: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    return "Unavailable";
  }

  if (normalized.length <= 18) {
    return normalized;
  }

  return `${normalized.slice(0, 8)}…${normalized.slice(-6)}`;
};

const statusLabels: Record<
  BuilderSystemStatus,
  string
> = {
  active: "Active",
  synced: "Synced",
  inactive: "Inactive",
  pending: "Pending",
  locked: "Locked",
};

function StatusBadge({
  status,
}: {
  status: BuilderSystemStatus;
}) {
  return (
    <span
      className={`builder-status-badge builder-status-badge--${status}`}
    >
      <i />
      {statusLabels[status]}
    </span>
  );
}

export function BuilderStatusPanel({
  status,
  formatGp = defaultFormatGp,
  compact = false,
}: BuilderStatusPanelProps) {
  return (
    <section
      className={
        compact
          ? "builder-status-panel builder-status-panel--compact"
          : "builder-status-panel"
      }
      aria-label="Builder status"
    >
      <header className="builder-status-header">
        <div>
          <span className="builder-status-eyebrow">
            BUILDER CORE STATUS
          </span>

          <h2>Builder Status</h2>

          <p>
            Live identity, GP and ecosystem synchronization.
          </p>
        </div>

        <div className="builder-status-core-state">
          <CircleDot size={16} />
          Core Online
        </div>
      </header>

      <div className="builder-status-primary">
        <div className="builder-status-identity">
          <span className="builder-status-avatar">
            <UserRound size={25} />
          </span>

          <div>
            <span>Builder Identity</span>
            <strong>
              {status.username.trim()
                ? `@${status.username}`
                : "BOBU Builder"}
            </strong>
            <small title={status.builderId}>
              <Hash size={12} />
              {formatBuilderId(status.builderId)}
            </small>
          </div>
        </div>

        <div className="builder-status-gp">
          <span>
            <Gem size={15} />
            Builder GP
          </span>

          <strong>{formatGp(status.gp)}</strong>
          <small>Single progression source</small>
        </div>
      </div>

      <div className="builder-status-grid">
        <article className="builder-status-stat">
          <span>
            <BadgeCheck size={16} />
            Builder Level
          </span>

          <strong>{status.level}</strong>
          <small>Powered entirely by GP</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <Gem size={16} />
            Lifetime Earned
          </span>

          <strong>
            {formatGp(status.lifetimeEarnedGp)} GP
          </strong>
          <small>Verified Builder rewards</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <WalletCards size={16} />
            Wallet
          </span>

          <StatusBadge status={status.walletStatus} />
          <small>Connected to Builder Core</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <ShieldCheck size={16} />
            Genesis
          </span>

          <StatusBadge status={status.genesisStatus} />
          <small>Genesis network access</small>
        </article>

        <article className="builder-status-stat">
          <span>
            <Pickaxe size={16} />
            Mining
          </span>

          <StatusBadge status={status.miningStatus} />
          <small>24-hour Builder sessions</small>
        </article>
      </div>
    </section>
  );
}
