import {
  CircleDollarSign,
  Coins,
  LockKeyhole,
  Network,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import type { BuilderWalletSnapshot } from "../../../core/builder";

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
  return (
    <section className="builder-wallet-stats">
      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Coins size={19} />
        </span>

        <div>
          <span>Personal GP</span>
          <strong>{formatGp(personalGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Network size={19} />
        </span>

        <div>
          <span>Eligible Network GP</span>
          <strong>{formatGp(eligibleNetworkGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <ShieldCheck size={19} />
        </span>

        <div>
          <span>Pending Network GP</span>
          <strong>{formatGp(pendingNetworkGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <CircleDollarSign size={19} />
        </span>

        <div>
          <span>Total GP</span>
          <strong>{formatGp(totalGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <LockKeyhole size={19} />
        </span>

        <div>
          <span>Locked GP</span>
          <strong>{formatGp(lockedGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <WalletCards size={19} />
        </span>

        <div>
          <span>Available GP</span>
          <strong>{formatGp(availableGp)} GP</strong>
        </div>
      </article>

      <article className="builder-wallet-stat">
        <span className="builder-wallet-stat-icon">
          <Coins size={19} />
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
          <WalletCards size={19} />
        </span>

        <div>
          <span>Transactions</span>
          <strong>{wallet?.transactionCount ?? 0}</strong>
        </div>
      </article>
    </section>
  );
}
