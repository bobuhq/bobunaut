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
import { useBuilderStore } from "../identity/hooks/useBuilderStore";
import { BuilderStatusPanel } from "../status/components/BuilderStatusPanel";

import { WalletAnalytics } from "./components/WalletAnalytics";
import { WalletFutureModules } from "./components/WalletFutureModules";
import { WalletLedger } from "./components/WalletLedger";
import { WalletStatCards } from "./components/WalletStatCards";
import { WalletTransactionDrawer } from "./components/WalletTransactionDrawer";
import { useWalletTransactionDrawer } from "./hooks/useWalletTransactionDrawer";

import "./BuilderWallet.css";

const formatGp = (value: number): string =>
  value.toLocaleString("en-US");

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
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
            : "Builder Wallet could not be loaded.",
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
          <p>Loading Builder Wallet…</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="builder-wallet-page">
        <section className="builder-wallet-state">
          <LockKeyhole size={32} />
          <h1>Builder Wallet Locked</h1>
          <p>
            Sign in to access your GP balance and reward
            history.
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
          <p>Synchronizing GP ledger…</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="builder-wallet-page">
        <section className="builder-wallet-state">
          <ShieldCheck size={32} />
          <h1>Wallet Sync Interrupted</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  const currentGp = wallet?.currentGp ?? builder.gp;
  const availableGp = wallet?.availableGp ?? builder.gp;

  return (
    <main className="builder-wallet-page">
      <section className="builder-wallet-hero">
        <div className="builder-wallet-heading">
          <span className="builder-wallet-eyebrow">
            BUILDER FINANCIAL CORE
          </span>

          <div className="builder-wallet-title-row">
            <span className="builder-wallet-title-icon">
              <WalletCards size={28} />
            </span>

            <div>
              <h1>Builder Wallet</h1>
              <p>
                Your authoritative GP balance and Builder
                reward history.
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
            <span>Available GP</span>
            <strong>{formatGp(availableGp)}</strong>
            <small>GP</small>
          </div>

          <div className="builder-wallet-live">
            <i />
            Synchronized with Builder Core
          </div>
        </div>
      </section>

      <BuilderStatusPanel
        status={{
          builderId,
          username: builder.username,
          level: builder.level,
          gp: currentGp,
          lifetimeEarnedGp:
            wallet?.lifetimeEarnedGp ?? currentGp,
          walletStatus: wallet ? "synced" : "pending",
          genesisStatus:
            builderId.length > 0 ? "active" : "pending",
          miningStatus: "pending",
        }}
        formatGp={formatGp}
      />

      <WalletAnalytics
        ledger={wallet?.ledger ?? []}
        formatGp={formatGp}
      />

      <WalletStatCards
        wallet={wallet}
        currentGp={currentGp}
        formatGp={formatGp}
      />

      <section className="builder-wallet-content">
        <WalletLedger
          entries={recentEntries}
          formatGp={formatGp}
          formatDate={formatDate}
          formatRewardLabel={formatRewardLabel}
          onSelectEntry={openTransaction}
        />

        <WalletFutureModules />
      </section>

      <WalletTransactionDrawer
        entry={selectedEntry}
        onClose={closeTransaction}
        formatGp={formatGp}
        formatDate={formatDate}
        formatRewardLabel={formatRewardLabel}
      />
    </main>
  );
}
