import { LockKeyhole } from "lucide-react";
import { useLanguage } from "../../../core/language";

const futureModuleKeys = [
  "wallet.future.onChainWallet",
  "wallet.future.tokenClaim",
  "wallet.future.nftInventory",
  "wallet.future.marketplace",
];

export function WalletFutureModules() {
  const { t } = useLanguage();

  return (
    <aside className="builder-wallet-future">
      <span className="builder-wallet-future-label">
        {t("wallet.future.eyebrow")}
      </span>

      <h2>{t("wallet.future.title")}</h2>

      <p>
        {t("wallet.future.description")}
      </p>

      {futureModuleKeys.map((featureKey) => (
        <div
          key={featureKey}
          className="builder-wallet-locked-feature"
        >
          <LockKeyhole size={16} />
          <span>{t(featureKey)}</span>
          <small>{t("wallet.future.locked")}</small>
        </div>
      ))}
    </aside>
  );
}
