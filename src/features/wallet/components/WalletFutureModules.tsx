import { LockKeyhole } from "lucide-react";

const futureModules = [
  "On-chain Wallet",
  "Token Claim",
  "NFT Inventory",
  "BOBU Marketplace",
];

export function WalletFutureModules() {
  return (
    <aside className="builder-wallet-future">
      <span className="builder-wallet-future-label">
        WALLET EVOLUTION
      </span>

      <h2>Future Network Modules</h2>

      <p>
        These modules remain secured until the BOBU economy
        enters its next development stage.
      </p>

      {futureModules.map((feature) => (
        <div
          key={feature}
          className="builder-wallet-locked-feature"
        >
          <LockKeyhole size={16} />
          <span>{feature}</span>
          <small>LOCKED</small>
        </div>
      ))}
    </aside>
  );
}
