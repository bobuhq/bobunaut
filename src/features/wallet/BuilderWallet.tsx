import {
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  builderWalletService,
  type BuilderWalletEntry,
  type BuilderWalletSnapshot,
} from "../../core/builder";
import { useAuthSession } from "../../core/auth/useAuthSession";
import { useLanguage } from "../../core/language";
import { useBuilderStore } from "../identity/hooks/useBuilderStore";
import { BuilderStatusPanel } from "../status/components/BuilderStatusPanel";

import { WalletAnalytics } from "./components/WalletAnalytics";
import { WalletFutureModules } from "./components/WalletFutureModules";
import { WalletLedger } from "./components/WalletLedger";
import { WalletStatCards } from "./components/WalletStatCards";
import { WalletTransactionDrawer } from "./components/WalletTransactionDrawer";
import { useWalletTransactionDrawer } from "./hooks/useWalletTransactionDrawer";

import "./BuilderWallet.css";

const formatGp = (
  value: number,
  language: string,
): string =>
  value.toLocaleString(language);

const formatDate = (
  value: string,
  language: string,
): string =>
  new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatRewardLabel = (
  entry: BuilderWalletEntry,
): string => {
  const provider = entry.provider?.trim();

  if (provider) {
    return provider
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      );
  }

  return entry.rewardType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

export default function BuilderWallet() {
  const { language, t } = useLanguage();

  const { session, loading: authLoading } =
    useAuthSession();
  const builder = useBuilderStore();

  const [wallet, setWallet] =
    useState<BuilderWalletSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const {
    selectedEntry,
    openTransaction,
    closeTransaction,
  } = useWalletTransactionDrawer();

  const builderId = session?.user.id ?? "";

  useEffect(() => {
    let active = true;

    if (!builderId) {
      setWallet(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    void builderWalletService
      .load(builderId, 50)
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setWallet(snapshot);
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setWallet(null);
        setError(
          reason instanceof Error
            ? reason.message
            : t("wallet.state.loadError"),
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [builderId]);

  const recentEntries = useMemo(
    () => wallet?.ledger.slice(0, 10) ?? [],
    [wallet],
  );

  if (authLoading) {
    return (
      <main className="builder-wallet-page">
        <section className="builder-wallet-state">
          <span className="builder-wallet-spinner" />
          <p>{t("wallet.state.loading")}</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="builder-wallet-page">
        <section className="builder-wallet-state">
          <LockKeyhole size={32} />
          <h1>{t("wallet.state.lockedTitle")}</h1>
          <p>
            {t("wallet.state.lockedDescription")}
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="builder-wallet-page">
        <section className="builder-wallet-state">
          <span className="builder-wallet-spinner" />
          <p>{t("wallet.state.synchronizing")}</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="builder-wallet-page">
        <section className="builder-wallet-state">
          <ShieldCheck size={32} />
          <h1>{t("wallet.state.syncInterrupted")}</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  const personalGp =
    wallet?.personalGp ?? builder.personalGp;

  const pendingNetworkGp =
    wallet?.pendingNetworkGp ??
    builder.pendingNetworkGp;

  const eligibleNetworkGp =
    wallet?.eligibleNetworkGp ??
    builder.eligibleNetworkGp;

  const totalGp =
    wallet?.totalGp ?? builder.gp;

  const availableGp =
    wallet?.availableGp ?? 0;

  const lockedGp =
    wallet?.lockedGp ?? totalGp;

  return (
    <main className="builder-wallet-page">
      <section className="builder-wallet-hero">
        <div className="builder-wallet-heading">
          <span className="builder-wallet-eyebrow">
            {t("wallet.hero.eyebrow")}
          </span>

          <div className="builder-wallet-title-row">
            <span className="builder-wallet-title-icon">
              <WalletCards size={28} />
            </span>

            <div>
              <h1>{t("wallet.hero.title")}</h1>
              <p>
                {t("wallet.hero.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="builder-wallet-balance">
          <div
            className="builder-wallet-energy-core"
            aria-hidden="true"
          >
            <span className="builder-wallet-energy-orbit builder-wallet-energy-orbit--one" />
            <span className="builder-wallet-energy-orbit builder-wallet-energy-orbit--two" />
            <span className="builder-wallet-energy-orbit builder-wallet-energy-orbit--three" />
            <span className="builder-wallet-energy-center" />
          </div>

          <div className="builder-wallet-balance-content">
            <span>{t("wallet.hero.totalGp")}</span>
            <strong>{formatGp(totalGp, language)}</strong>
            <small>{t("wallet.hero.previewMode")}</small>
          </div>

          <div className="builder-wallet-live">
            <i />
            {t("wallet.hero.synchronized")}
          </div>
        </div>
      </section>

      <BuilderStatusPanel
        status={{
          builderId,
          username: builder.username,
          level: builder.level,
          gp: totalGp,
          lifetimeEarnedGp:
            wallet?.lifetimeEarnedGp ?? totalGp,
          walletStatus: wallet ? "synced" : "pending",
          genesisStatus:
            builderId.length > 0 ? "active" : "pending",
          miningStatus: "pending",
        }}
        formatGp={(value) => formatGp(value, language)}
      />

      <WalletAnalytics
        ledger={wallet?.ledger ?? []}
        formatGp={(value) => formatGp(value, language)}
      />

      <WalletStatCards
        wallet={wallet}
        personalGp={personalGp}
        pendingNetworkGp={pendingNetworkGp}
        eligibleNetworkGp={eligibleNetworkGp}
        totalGp={totalGp}
        availableGp={availableGp}
        lockedGp={lockedGp}
        formatGp={(value) => formatGp(value, language)}
      />

      <section className="builder-wallet-content">
        <WalletLedger
          entries={recentEntries}
          formatGp={(value) => formatGp(value, language)}
          formatDate={(value) => formatDate(value, language)}
          formatRewardLabel={formatRewardLabel}
          onSelectEntry={openTransaction}
        />

        <WalletFutureModules />
      </section>

      <WalletTransactionDrawer
        entry={selectedEntry}
        onClose={closeTransaction}
        formatGp={(value) => formatGp(value, language)}
        formatDate={(value) => formatDate(value, language)}
        formatRewardLabel={formatRewardLabel}
      />
    </main>
  );
}
