import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Coins,
  History,
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
            <strong>
              {wallet?.transactionCount ?? 0}
            </strong>
          </div>
        </article>
      </section>

      <section className="builder-wallet-content">
        <article className="builder-wallet-ledger">
          <div className="builder-wallet-section-heading">
            <div>
              <span>GP LEDGER</span>
              <h2>Recent Activity</h2>
            </div>

            <div className="builder-wallet-section-status">
              <Clock3 size={15} />
              Latest 10
            </div>
          </div>

          {recentEntries.length > 0 ? (
            <div className="builder-wallet-entry-list">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="builder-wallet-entry"
                >
                  <span
                    className={`builder-wallet-entry-icon builder-wallet-entry-icon--${entry.type}`}
                  >
                    {entry.type === "credit" ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <ArrowDownRight size={18} />
                    )}
                  </span>

                  <div className="builder-wallet-entry-copy">
                    <strong>
                      {formatRewardLabel(entry)}
                    </strong>
                    <span>
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>

                  <strong
                    className={`builder-wallet-entry-amount builder-wallet-entry-amount--${entry.type}`}
                  >
                    {entry.type === "credit" ? "+" : "-"}
                    {formatGp(entry.amount)} GP
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="builder-wallet-empty">
              <History size={28} />
              <h3>No GP activity yet</h3>
              <p>
                Mining, mission and community rewards will
                appear here.
              </p>
            </div>
          )}
        </article>

        <aside className="builder-wallet-future">
          <span className="builder-wallet-future-label">
            WALLET EVOLUTION
          </span>
          <h2>Future Network Modules</h2>
          <p>
            These modules remain secured until the BOBU
            economy enters its next development stage.
          </p>

          {[
            "On-chain Wallet",
            "Token Claim",
            "NFT Inventory",
            "BOBU Marketplace",
          ].map((feature) => (
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
      </section>
    </main>
  );
}
