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
import { useLanguage } from "../../core/language";
import { useAchievementProgress } from "../../core/game/hooks";
import { achievementRewardService } from "../../core/game/services";
import { createAchievementViewModels } from "../../core/game/view-model/AchievementViewModel";
import { useBuilderStore } from "../identity/hooks/useBuilderStore";
import BuilderPassportActions from "./BuilderPassportActions";
import BuilderPassportShareCard from "./BuilderPassportShareCard";
import "./BuilderPassport.css";

const formatGp = (value: number): string =>
  value.toLocaleString("en-US");

const getBuilderTitleKey = (totalGp: number): string => {
  if (totalGp >= 100_000) return "passport.rank.masterBuilder";
  if (totalGp >= 50_000) return "passport.rank.architect";
  if (totalGp >= 20_000) return "passport.rank.commander";
  if (totalGp >= 5_000) return "passport.rank.navigator";
  if (totalGp >= 1_000) return "passport.rank.explorer";
  return "passport.rank.newBuilder";
};

const shortenBuilderId = (builderId: string): string => {
  if (builderId.length <= 18) {
    return builderId;
  }

  return `${builderId.slice(0, 9)}…${builderId.slice(-7)}`;
};

export function BuilderPassport() {
  const { t } = useLanguage();
  const builder = useBuilderStore();

  const {
    definitions: achievementDefinitions,
    progress: achievementProgress,
  } = useAchievementProgress();

  const achievementCards = createAchievementViewModels(
    achievementDefinitions,
    achievementProgress,
  );

  const [claimingAchievementId, setClaimingAchievementId] =
    useState<string | null>(null);

  const [achievementClaimError, setAchievementClaimError] =
    useState<string | null>(null);

  const handleAchievementClaim = async (
    achievementId: string,
  ): Promise<void> => {
    if (
      !builder.id ||
      builder.id === "builder-001" ||
      claimingAchievementId !== null
    ) {
      return;
    }

    setAchievementClaimError(null);
    setClaimingAchievementId(achievementId);

    try {
      await achievementRewardService.claim(
        builder.id,
        achievementId,
      );
    } catch (error) {
      setAchievementClaimError(
        error instanceof Error
          ? error.message
          : "Achievement reward could not be claimed.",
      );
    } finally {
      setClaimingAchievementId(null);
    }
  };
  const { authenticated } = useAuthSession();

  const [copiedBuilderId, setCopiedBuilderId] =
    useState(false);

  const [copiedInviteCode, setCopiedInviteCode] =
    useState(false);

  const [copiedReferralUrl, setCopiedReferralUrl] =
    useState(false);

  const verified =
    builder.identity.telegram &&
    builder.identity.x;

  const genesisBuilder = verified;
  const builderTitleKey = getBuilderTitleKey(builder.gp);
  const builderTitle = t(builderTitleKey);

  const passportUrl = new URL(
    "passport",
    window.location.origin + import.meta.env.BASE_URL,
  ).toString();

  const referralUrl =
    builder.inviteCode &&
    builder.inviteCode !== "BOBU-GENESIS"
      ? new URL(
          `?ref=${encodeURIComponent(builder.inviteCode)}`,
          window.location.origin + import.meta.env.BASE_URL,
        ).toString()
      : null;

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

  const copyReferralUrl = async () => {
    if (!referralUrl) {
      return;
    }

    await navigator.clipboard.writeText(referralUrl);
    setCopiedReferralUrl(true);

    window.setTimeout(() => {
      setCopiedReferralUrl(false);
    }, 1800);
  };

  const sharePassport = async () => {
    const data = {
      title: t("passport.share.title", {
        username:
          builder.username ||
          t("passport.defaultUsername"),
      }),
      text: t("passport.share.text"),
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
    window.alert(t("passport.actions.linkCopied"));
  };

  const identityItems = [
    {
      labelKey: "passport.identity.telegram",
      verified: builder.identity.telegram,
      icon: Globe2,
    },
    {
      labelKey: "passport.identity.x",
      verified: builder.identity.x,
      icon: Sparkles,
    },
    {
      labelKey: "passport.identity.instagram",
      verified: builder.identity.instagram,
      icon: CircleDot,
    },
    {
      labelKey: "passport.identity.wallet",
      verified: builder.identity.wallet,
      icon: WalletCards,
    },
  ];

  const journeyItems = [
    {
      labelKey: "passport.journey.passport",
      complete: builder.passportUnlocked,
    },
    {
      labelKey: "passport.journey.telegram",
      complete: builder.identity.telegram,
    },
    {
      labelKey: "passport.journey.x",
      complete: builder.identity.x,
    },
    {
      labelKey: "passport.journey.genesis",
      complete: genesisBuilder,
    },
    {
      labelKey: "passport.journey.wallet",
      complete: builder.identity.wallet,
    },
  ];

  const achievements = [
    {
      labelKey: "passport.achievements.genesisBuilder",
      descriptionKey: "passport.achievements.genesisBuilderDescription",
      unlocked: genesisBuilder,
      icon: Gem,
    },
    {
      labelKey: "passport.achievements.identityVerified",
      descriptionKey: "passport.achievements.identityVerifiedDescription",
      unlocked: verified,
      icon: BadgeCheck,
    },
    {
      labelKey: "passport.achievements.networkBuilder",
      descriptionKey: "passport.achievements.networkBuilderDescription",
      unlocked: builder.referralCount > 0,
      icon: Network,
    },
    {
      labelKey: "passport.achievements.walletReady",
      descriptionKey: "passport.achievements.walletReadyDescription",
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
                alt={t("passport.avatarAlt")}
              />
              <span className="builder-passport-avatar-status" />
            </div>

            <div>
              <p className="builder-passport-eyebrow">
                {t("passport.title")}
              </p>

              <h1 className="builder-passport-name">
                {builder.username || t("passport.defaultBuilder")}
              </h1>

              <p className="builder-passport-handle">
                @{builder.username || t("passport.defaultUsername")}
              </p>

              <span className="builder-passport-title">
                <Rocket size={13} />
                {builderTitle}
              </span>

              <div className="builder-passport-badges">
                <span className="builder-passport-badge is-positive">
                  <Zap size={12} />
                  {t("passport.badge.activeBuilder")}
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
                    ? t("passport.badge.genesisBuilder")
                    : t("passport.badge.genesisPending")}
                </span>

                <span
                  className={
                    verified
                      ? "builder-passport-badge is-positive"
                      : "builder-passport-badge"
                  }
                >
                  <ShieldCheck size={12} />
                  {verified
                    ? t("passport.badge.verified")
                    : t("passport.badge.verificationPending")}
                </span>
              </div>
            </div>
          </div>

          <aside className="builder-passport-id-card">
            <div>
              <span className="builder-passport-id-label">
                {t("passport.id.builderId")}
              </span>

              <strong className="builder-passport-id-value">
                {shortenBuilderId(builder.id)}
              </strong>
            </div>

            <div className="builder-passport-id-meta">
              <div>
                <span className="builder-passport-id-label">
                  {t("passport.id.passport")}
                </span>
                <strong>
                  {builder.passportUnlocked
                    ? t("passport.id.unlocked")
                    : t("passport.id.initializing")}
                </strong>
              </div>

              <div>
                <span className="builder-passport-id-label">
                  {t("passport.id.status")}
                </span>
                <strong>
                  {authenticated
                    ? t("passport.id.online")
                    : t("passport.id.guest")}
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
                  <h2>{t("passport.gp.title")}</h2>
                </div>

                <span className="builder-passport-panel-subtitle">
                  {t("passport.gp.subtitle")}
                </span>
              </div>

              <div className="builder-passport-gp-grid">
                <article className="builder-passport-gp-card is-personal">
                  <span>{t("passport.gp.personal")}</span>
                  <strong>{formatGp(builder.personalGp)}</strong>
                  <small>{t("passport.gp.personalDescription")}</small>
                </article>

                <article className="builder-passport-gp-card is-pending">
                  <span>{t("passport.gp.pendingNetwork")}</span>
                  <strong>
                    {formatGp(builder.pendingNetworkGp)}
                  </strong>
                  <small>{t("passport.gp.pendingDescription")}</small>
                </article>

                <article className="builder-passport-gp-card is-eligible">
                  <span>{t("passport.gp.eligibleNetwork")}</span>
                  <strong>
                    {formatGp(builder.eligibleNetworkGp)}
                  </strong>
                  <small>{t("passport.gp.eligibleDescription")}</small>
                </article>

                <article className="builder-passport-gp-card is-total">
                  <span>{t("passport.gp.total")}</span>
                  <strong>{formatGp(builder.gp)}</strong>
                  <small>{t("passport.gp.totalDescription")}</small>
                </article>
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Trophy size={18} />
                  <h2>{t("passport.progression.title")}</h2>
                </div>

                <span className="builder-passport-panel-subtitle">
                  {t("passport.progression.subtitle")}
                </span>
              </div>

              <div className="builder-passport-progression">
                <article className="builder-passport-progress-card">
                  <span>{t("passport.progression.gpRank")}</span>
                  <strong>{builderTitle}</strong>
                </article>

                <article className="builder-passport-progress-card">
                  <span>{t("passport.progression.reputation")}</span>
                  <strong>{formatGp(builder.reputation)}</strong>
                </article>

                <article className="builder-passport-progress-card">
                  <span>{t("passport.progression.network")}</span>
                  <strong>{builder.referralCount}</strong>
                </article>
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Award size={18} />
                  <h2>{t("passport.achievements.title")}</h2>
                </div>

                <span className="builder-passport-panel-subtitle">
                  {t("passport.achievements.subtitle")}
                </span>
              </div>

              <div className="builder-passport-achievements">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;

                  return (
                    <article
                      key={achievement.labelKey}
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

                      <strong>{t(achievement.labelKey)}</strong>
                      <small>{t(achievement.descriptionKey)}</small>
                    </article>
                  );
                })}
              </div>

              {achievementCards.length > 0 && (
                <div className="builder-passport-reward-achievements">
                  {achievementCards.map((achievement) => {
                    const unlocked =
                      achievement.status === "unlocked";

                    const claimed =
                      achievement.status === "claimed";

                    const claiming =
                      claimingAchievementId ===
                      achievement.id;

                    return (
                      <article
                        key={achievement.id}
                        className={
                          claimed
                            ? "builder-passport-reward-achievement is-claimed"
                            : unlocked
                              ? "builder-passport-reward-achievement is-unlocked"
                              : "builder-passport-reward-achievement"
                        }
                      >
                        <div className="builder-passport-reward-achievement-head">
                          <span className="builder-passport-achievement-icon">
                            {unlocked || claimed ? (
                              <Award size={20} />
                            ) : (
                              <LockKeyhole size={18} />
                            )}
                          </span>

                          <div>
                            <strong>
                              {achievement.title}
                            </strong>

                            <small>
                              {achievement.description}
                            </small>
                          </div>
                        </div>

                        <div className="builder-passport-achievement-progress">
                          <span>
                            {achievement.progress.toLocaleString()}
                            {" / "}
                            {achievement.target.toLocaleString()}
                          </span>

                          <strong>
                            +{achievement.rewardGp.toLocaleString()} GP
                          </strong>
                        </div>

                        <div
                          className="builder-passport-achievement-progress-track"
                          aria-hidden="true"
                        >
                          <span
                            style={{
                              width: `${achievement.progressPercent}%`,
                            }}
                          />
                        </div>

                        {claimed ? (
                          <span className="builder-passport-achievement-claimed">
                            Reward Claimed
                          </span>
                        ) : unlocked ? (
                          <button
                            type="button"
                            className="builder-passport-achievement-claim"
                            disabled={
                              claimingAchievementId !== null
                            }
                            onClick={() =>
                              void handleAchievementClaim(
                                achievement.id,
                              )
                            }
                          >
                            {claiming
                              ? "Claiming..."
                              : `Claim ${achievement.rewardGp.toLocaleString()} GP`}
                          </button>
                        ) : (
                          <span className="builder-passport-achievement-locked">
                            In Progress
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {achievementClaimError && (
                <p
                  className="builder-passport-achievement-error"
                  role="alert"
                >
                  {achievementClaimError}
                </p>
              )}
            </section>
          </div>

          <div className="builder-passport-side-column">
            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Fingerprint size={18} />
                  <h2>{t("passport.identity.title")}</h2>
                </div>
              </div>

              <div className="builder-passport-identity-list">
                {identityItems.map((identity) => {
                  const Icon = identity.icon;

                  return (
                    <div
                      key={identity.labelKey}
                      className="builder-passport-identity-row"
                    >
                      <span className="builder-passport-identity-name">
                        <Icon size={15} />
                        {t(identity.labelKey)}
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
                          ? t("passport.identity.verified")
                          : t("passport.identity.pending")}
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
                  <h2>{t("passport.journey.title")}</h2>
                </div>
              </div>

              <div className="builder-passport-journey">
                {journeyItems.map((journey) => (
                  <div
                    key={journey.labelKey}
                    className="builder-passport-journey-row"
                  >
                    <span className="builder-passport-journey-name">
                      {journey.complete ? (
                        <UserRoundCheck size={15} />
                      ) : (
                        <CircleDot size={14} />
                      )}
                      {t(journey.labelKey)}
                    </span>

                    <span
                      className={
                        journey.complete
                          ? "builder-passport-status is-complete"
                          : "builder-passport-status"
                      }
                    >
                      {journey.complete
                        ? t("passport.journey.complete")
                        : t("passport.journey.pending")}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="builder-passport-panel">
              <div className="builder-passport-panel-heading">
                <div className="builder-passport-panel-title">
                  <Network size={18} />
                  <h2>{t("passport.network.title")}</h2>
                </div>
              </div>

              <div className="builder-passport-invite-code">
                <div>
                  <span className="builder-passport-id-label">
                    {t("passport.network.inviteCode")}
                  </span>
                  <code>{builder.inviteCode}</code>
                </div>

                <button
                  type="button"
                  onClick={() => void copyInviteCode()}
                  aria-label={t("passport.network.copyInviteCode")}
                >
                  {copiedInviteCode ? (
                    <BadgeCheck size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>

              <div className="builder-passport-referral-link">
                <div>
                  <span className="builder-passport-id-label">
                    {t("passport.network.referralLink")}
                  </span>

                  <code>
                    {referralUrl ??
                      t("passport.network.referralUnavailable")}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={() => void copyReferralUrl()}
                  disabled={!referralUrl}
                  aria-label={t("passport.network.copyReferralLink")}
                >
                  {copiedReferralUrl ? (
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
          displayName={
            builder.username ||
            t("passport.defaultBuilder")
          }
          username={
            builder.username ||
            t("passport.defaultUsername")
          }
          gpRank={builderTitle}
          gpBalance={builder.gp}
          walletAddress={
            builder.identity.wallet
              ? t("passport.share.connected")
              : t("passport.share.notConnected")
          }
        />
      </div>
    </main>
  );
}
