import { useState } from "react";
import {
  Award,
  BadgeCheck,
  CircleDot,
  Copy,
  Fingerprint,
  Gem,
  Globe2,
  LockKeyhole,
  Network,
  Orbit,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRoundCheck,
  WalletCards,
  Zap,
} from "lucide-react";

import { useAuthSession } from "../../core/auth/useAuthSession";
import { useBuilderStore } from "../identity/hooks/useBuilderStore";
import BuilderPassportActions from "./BuilderPassportActions";
import BuilderPassportShareCard from "./BuilderPassportShareCard";
import "./BuilderPassport.css";

const formatGp = (value: number): string =>
  value.toLocaleString("en-US");

const getBuilderTitle = (level: number): string => {
  if (level >= 50) return "Master Architect";
  if (level >= 25) return "Galaxy Commander";
  if (level >= 10) return "Navigator";
  if (level >= 5) return "Explorer";
  return "New Builder";
};

const shortenBuilderId = (builderId: string): string => {
  if (builderId.length <= 18) {
    return builderId;
  }

  return `${builderId.slice(0, 9)}…${builderId.slice(-7)}`;
};

export function BuilderPassport() {
  const builder = useBuilderStore();
  const { authenticated } = useAuthSession();

  const [copiedBuilderId, setCopiedBuilderId] =
    useState(false);

  const [copiedInviteCode, setCopiedInviteCode] =
    useState(false);

  const verified =
    builder.identity.telegram &&
    builder.identity.x;

  const genesisBuilder = verified;
  const builderTitle = getBuilderTitle(builder.level);

  const passportUrl = new URL(
    "passport",
    window.location.origin + import.meta.env.BASE_URL,
  ).toString();

  const copyBuilderId = async () => {
    await navigator.clipboard.writeText(builder.id);
    setCopiedBuilderId(true);

    window.setTimeout(() => {
      setCopiedBuilderId(false);
    }, 1800);
  };

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(builder.inviteCode);
    setCopiedInviteCode(true);

    window.setTimeout(() => {
      setCopiedInviteCode(false);
    }, 1800);
  };

  const sharePassport = async () => {
    const data = {
      title: `${builder.username} — BOBU Builder Passport`,
      text:
        "Explore my Builder Passport in BOBU Universe — " +
        "the world's first explorable Web3 social universe.",
      url: passportUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    await navigator.clipboard.writeText(passportUrl);
    window.alert("Passport link copied.");
  };

  const identityItems = [
    {
      label: "Telegram",
      verified: builder.identity.telegram,
      icon: Globe2,
    },
    {
      label: "X",
      verified: builder.identity.x,
      icon: Sparkles,
    },
    {
      label: "Instagram",
      verified: builder.identity.instagram,
      icon: CircleDot,
    },
    {
      label: "BOBU Wallet",
      verified: builder.identity.wallet,
      icon: WalletCards,
    },
  ];

  const journeyItems = [
    {
      label: "Builder Passport",
      complete: builder.passportUnlocked,
    },
    {
      label: "Telegram Identity",
      complete: builder.identity.telegram,
    },
    {
      label: "X Identity",
      complete: builder.identity.x,
    },
    {
      label: "Genesis Status",
      complete: genesisBuilder,
    },
    {
      label: "Wallet Activation",
      complete: builder.identity.wallet,
    },
  ];

  const achievements = [
    {
      label: "Genesis Builder",
      description: "Telegram + X",
      unlocked: genesisBuilder,
      icon: Gem,
    },
    {
      label: "Identity Verified",
      description: "Trusted identity",
      unlocked: verified,
      icon: BadgeCheck,
    },
    {
      label: "Network Builder",
      description: "Invite network",
      unlocked: builder.referralCount > 0,
      icon: Network,
    },
    {
      label: "Wallet Ready",
      description: "Wallet identity",
      unlocked: builder.identity.wallet,
      icon: WalletCards,
    },
  ];

  return (
    <main className="builder-passport-page">
      <div className="builder-passport-shell">
        <section className="builder-passport-hero">
          <div className="builder-passport-identity">
            <div className="builder-passport-avatar">
              <img
                src="/images/galaxy/bobu-builder-space.webp"
                alt="BOBU Builder"
              />
              <span className="builder-passport-avatar-status" />
            </div>

            <div>
              <p className="builder-passport-eyebrow">
                Builder Passport
              </p>

              <h1 className="builder-passport-name">
                {builder.username || "BOBU Builder"}
              </h1>

              <p className="builder-passport-handle">
                @{builder.username || "builder"}
              </p>

              <span className="builder-passport-title">
                <Rocket size={13} />
                {builderTitle}
              </span>

              <div className="builder-passport-badges">
                <span className="builder-passport-badge is-positive">
                  <Zap size={12} />
                  Active Builder
                </span>

                <span
                  className={
                    genesisBuilder
                      ? "builder-passport-badge is-genesis"
                      : "builder-passport-badge"
                  }
                >
                  <Gem size={12} />
                  {genesisBuilder
                    ? "Genesis Builder"
                    : "Genesis Pending"}
                </span>

                <span
                  className={
                    verified
                      ? "builder-passport-badge is-positive"
                      : "builder-passport-badge"
                  }
                >
                  <ShieldCheck size={12} />
                  {verified ? "Verified" : "Verification Pending"}
                </span>
              </div>
            </div>
          </div>

          <aside className="builder-passport-id-card">
            <div>
              <span className="builder-passport-id-label">
                Builder ID
              </span>

              <strong className="builder-passport-id-value">
                {shortenBuilderId(builder.id)}
              </strong>
            </div>

            <div className="builder-passport-id-meta">
              <div>
                <span className="builder-passport-id-label">
                  Passport
                </span>
                <strong>
                  {builder.passportUnlocked
                    ? "Unlocked"
                    : "Initializing"}
                </strong>
              </div>

              <div>
                <span className="builder-passport-id-label">
                  Status
                </span>
                <strong>
                  {authenticated ? "Online" : "Guest"}
                </strong>
              </div>
            </div>
          </aside>
        </section>

        <div className="builder-passport-grid">
          <div className="builder-passport-main-column">
            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Orbit size={18} />
                  <h2>GP Command Center</h2>
                </div>

                <span className="builder-passport-panel-subtitle">
                  Storage v2
                </span>
              </div>

              <div className="builder-passport-gp-grid">
                <article className="builder-passport-gp-card is-personal">
                  <span>Personal GP</span>
                  <strong>{formatGp(builder.personalGp)}</strong>
                  <small>Earned directly by you</small>
                </article>

                <article className="builder-passport-gp-card is-pending">
                  <span>Pending Network GP</span>
                  <strong>
                    {formatGp(builder.pendingNetworkGp)}
                  </strong>
                  <small>Locked until eligibility</small>
                </article>

                <article className="builder-passport-gp-card is-eligible">
                  <span>Eligible Network GP</span>
                  <strong>
                    {formatGp(builder.eligibleNetworkGp)}
                  </strong>
                  <small>Counts toward Total GP</small>
                </article>

                <article className="builder-passport-gp-card is-total">
                  <span>Total GP</span>
                  <strong>{formatGp(builder.gp)}</strong>
                  <small>Authoritative Builder balance</small>
                </article>
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Trophy size={18} />
                  <h2>Builder Progression</h2>
                </div>

                <span className="builder-passport-panel-subtitle">
                  Live Core Data
                </span>
              </div>

              <div className="builder-passport-progression">
                <article className="builder-passport-progress-card">
                  <span>Level</span>
                  <strong>{builder.level}</strong>
                </article>

                <article className="builder-passport-progress-card">
                  <span>Reputation</span>
                  <strong>{formatGp(builder.reputation)}</strong>
                </article>

                <article className="builder-passport-progress-card">
                  <span>Network</span>
                  <strong>{builder.referralCount}</strong>
                </article>
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Award size={18} />
                  <h2>Achievement Vault</h2>
                </div>

                <span className="builder-passport-panel-subtitle">
                  Builder Milestones
                </span>
              </div>

              <div className="builder-passport-achievements">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;

                  return (
                    <article
                      key={achievement.label}
                      className={
                        achievement.unlocked
                          ? "builder-passport-achievement is-unlocked"
                          : "builder-passport-achievement"
                      }
                    >
                      <span className="builder-passport-achievement-icon">
                        {achievement.unlocked ? (
                          <Icon size={20} />
                        ) : (
                          <LockKeyhole size={18} />
                        )}
                      </span>

                      <strong>{achievement.label}</strong>
                      <small>{achievement.description}</small>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="builder-passport-side-column">
            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Fingerprint size={18} />
                  <h2>Identity Matrix</h2>
                </div>
              </div>

              <div className="builder-passport-identity-list">
                {identityItems.map((identity) => {
                  const Icon = identity.icon;

                  return (
                    <div
                      key={identity.label}
                      className="builder-passport-identity-row"
                    >
                      <span className="builder-passport-identity-name">
                        <Icon size={15} />
                        {identity.label}
                      </span>

                      <span
                        className={
                          identity.verified
                            ? "builder-passport-status is-complete"
                            : "builder-passport-status"
                        }
                      >
                        {identity.verified ? (
                          <BadgeCheck size={14} />
                        ) : (
                          <CircleDot size={13} />
                        )}

                        {identity.verified
                          ? "Verified"
                          : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Star size={18} />
                  <h2>Genesis Journey</h2>
                </div>
              </div>

              <div className="builder-passport-journey">
                {journeyItems.map((journey) => (
                  <div
                    key={journey.label}
                    className="builder-passport-journey-row"
                  >
                    <span className="builder-passport-journey-name">
                      {journey.complete ? (
                        <UserRoundCheck size={15} />
                      ) : (
                        <CircleDot size={14} />
                      )}
                      {journey.label}
                    </span>

                    <span
                      className={
                        journey.complete
                          ? "builder-passport-status is-complete"
                          : "builder-passport-status"
                      }
                    >
                      {journey.complete ? "Complete" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Network size={18} />
                  <h2>Builder Network</h2>
                </div>
              </div>

              <div className="builder-passport-invite-code">
                <div>
                  <span className="builder-passport-id-label">
                    Invite Code
                  </span>
                  <code>{builder.inviteCode}</code>
                </div>

                <button
                  type="button"
                  onClick={() => void copyInviteCode()}
                  aria-label="Copy invite code"
                >
                  {copiedInviteCode ? (
                    <BadgeCheck size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <BuilderPassportActions
                  copiedBuilderId={copiedBuilderId}
                  onCopyBuilderId={() => void copyBuilderId()}
                  onShare={() => void sharePassport()}
                  onDownload={() =>
                    document
                      .getElementById(
                        "builder-passport-download-trigger",
                      )
                      ?.click()
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="builder-passport-hidden-share-card">
        <BuilderPassportShareCard
          displayName={builder.username || "BOBU Builder"}
          username={builder.username || "builder"}
          level={builder.level}
          gpBalance={builder.gp}
          walletAddress={
            builder.identity.wallet
              ? "Connected"
              : "Not connected"
          }
        />
      </div>
    </main>
  );
}
