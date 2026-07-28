import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  History,
} from "lucide-react";

import type { BuilderWalletSnapshot } from "../../../core/builder";

type WalletStatCardsProps = {
  wallet: BuilderWalletSnapshot | null;
  currentGp: number;
  formatGp: (value: number) => string;
};

export function WalletStatCards({
  wallet,
  currentGp,
  formatGp,
}: WalletStatCardsProps) {
  return (
    <section className="builder-wallet-stats">
      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Coins size={19} />
        </span>

        <div>
          <span>Current Balance</span>
          <strong>{formatGp(currentGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <ArrowUpRight size={19} />
        </span>

        <div>
          <span>Loaded Rewards</span>
          <strong>
            {formatGp(wallet?.lifetimeEarnedGp ?? 0)} GP
          </strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <ArrowDownRight size={19} />
        </span>

        <div>
          <span>Spent GP</span>
          <strong>
            {formatGp(wallet?.lifetimeSpentGp ?? 0)} GP
          </strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <History size={19} />
        </span>

        <div>
          <span>Loaded Transactions</span>
          <strong>{wallet?.transactionCount ?? 0}</strong>
        </div>
      </article>
    </section>
  );
}
