import {
  CircleDollarSign,
  Coins,
  LockKeyhole,
  Network,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import type { BuilderWalletSnapshot } from "../../../core/builder";
import { useLanguage } from "../../../core/language";

type WalletStatCardsProps = {
  wallet: BuilderWalletSnapshot | null;
  personalGp: number;
  pendingNetworkGp: number;
  eligibleNetworkGp: number;
  totalGp: number;
  availableGp: number;
  lockedGp: number;
  formatGp: (value: number) => string;
};

export function WalletStatCards({
  wallet,
  personalGp,
  pendingNetworkGp,
  eligibleNetworkGp,
  totalGp,
  availableGp,
  lockedGp,
  formatGp,
}: WalletStatCardsProps) {
  const { t } = useLanguage();

  return (
    <section className="builder-wallet-stats">
      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Coins size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.personalGp")}</span>
          <strong>{formatGp(personalGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Network size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.eligibleNetworkGp")}</span>
          <strong>{formatGp(eligibleNetworkGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <ShieldCheck size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.pendingNetworkGp")}</span>
          <strong>{formatGp(pendingNetworkGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <CircleDollarSign size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.totalGp")}</span>
          <strong>{formatGp(totalGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <LockKeyhole size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.lockedGp")}</span>
          <strong>{formatGp(lockedGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <WalletCards size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.availableGp")}</span>
          <strong>{formatGp(availableGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Coins size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.loadedRewards")}</span>
          <strong>
            {formatGp(wallet?.lifetimeEarnedGp ?? 0)} GP
          </strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <WalletCards size={19} />
        </span>

        <div>
          <span>{t("wallet.stats.transactions")}</span>
          <strong>{wallet?.transactionCount ?? 0}</strong>
        </div>
      </article>
    </section>
  );
}
