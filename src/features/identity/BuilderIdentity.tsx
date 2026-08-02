import { useEffect, useState } from "react";
import { IdentityCard } from "./components/IdentityCard";
import { useBuilderStore } from "./hooks/useBuilderStore";
import { builderStore } from "../../store/builderStore";
import { supabase } from "../../lib/supabase";
import { restoreAuthenticatedBuilder } from "../../core/builder/services/BuilderRestoreService";
import { referralService } from "../../core/builder/services/ReferralService";
import { useTelegramVerification } from "./hooks/useTelegramVerification";
import { useXVerification } from "./hooks/useXVerification";
import type { IdentityProvider } from "../../core/models/Builder";
import "./BuilderIdentity.css";

const TELEGRAM_COMMUNITY_URL =
  "https://t.me/+I0Q01kVMYw41YjA0";

interface CommunityTask {
  provider: IdentityProvider;
  label: string;
  description: string;
  actionLabel: string;
  communityUrl?: string;
  disabled?: boolean;
  required: boolean;
}

const communityTasks: CommunityTask[] = [
  {
    provider: "telegram",
    label: "Join BOBU Telegram",
    description:
      "Join the official BOBU Telegram community to enter the Genesis network.",
    actionLabel: "Join Telegram",
    communityUrl: TELEGRAM_COMMUNITY_URL,
    required: true,
  },
  {
    provider: "x",
    label: "Follow BOBU on X",
    description:
      "Follow the official BOBU account for announcements, missions and launch updates.",
    actionLabel: "Follow on X",
    communityUrl: "https://x.com/bobu_hq",
    required: true,
  },
  {
    provider: "instagram",
    label: "Follow BOBU on Instagram",
    description:
      "Follow BOBU on Instagram and become part of the visual Universe journey.",
    actionLabel: "Follow Instagram",
    communityUrl:
      "https://www.instagram.com/bobu_universe?igsh=eGViZGJiOXFhNnR5&utm_source=qr",
    required: false,
  },
  {
    provider: "wallet",
    label: "Solana Wallet",
    description:
      "Wallet connection will become available for future on-chain rewards and claims.",
    actionLabel: "Coming Soon",
    disabled: true,
    required: false,
  },
];

export default function BuilderIdentity() {
  const builder = useBuilderStore();
  const telegramVerification =
    useTelegramVerification({
      communityUrl: TELEGRAM_COMMUNITY_URL,
      initiallyVerified: builder.identity.telegram,
    });

  const xVerification =
    useXVerification({
      initiallyVerified: builder.identity.x,
    });

  const [instagramOpened, setInstagramOpened] =
    useState(false);

  const [instagramBusy, setInstagramBusy] =
    useState(false);

  useEffect(() => {
    const restoreIdentityPage = async (): Promise<void> => {
      referralService.captureReferralFromUrl();

      const searchParams = new URLSearchParams(
        window.location.search,
      );

      const hasXCallback =
        searchParams.has("code") ||
        searchParams.get("error_code") ===
          "identity_already_exists";

      if (hasXCallback) {
        await xVerification.verifyAndReward();

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }

      const source =
        await restoreAuthenticatedBuilder();

      if (!source) {
        return;
      }

      await referralService.connectReferral(
        source.builderId,
      );

    };

    void restoreIdentityPage().catch((error) => {
      console.error(
        "Builder identity restore failed:",
        error,
      );
    });
  }, [xVerification.verifyAndReward]);

  const requiredTasks = communityTasks.filter(
    (task) => task.required,
  );

  const completedCount = requiredTasks.filter(
    (task) => builder.identity[task.provider],
  ).length;

  const progress =
    (completedCount / requiredTasks.length) * 100;

  const handleTaskComplete = async (
    provider: IdentityProvider,
  ): Promise<void> => {
    if (provider === "wallet") {
      return;
    }

    const task = communityTasks.find(
      (item) => item.provider === provider,
    );

    if (provider === "x") {
      if (xVerification.completed) {
        return;
      }

      await xVerification.connectX();
      return;
    }

    if (provider === "instagram") {
      if (task?.communityUrl) {
        window.open(
          task.communityUrl,
          "_blank",
          "noopener,noreferrer",
        );
      }

      setInstagramOpened(true);

      window.alert(
        "Instagram verification is not available yet. No GP has been awarded.",
      );

      return;
    }

    if (provider !== "telegram") {
      if (task?.communityUrl) {
        window.open(
          task.communityUrl,
          "_blank",
          "noopener,noreferrer",
        );
      }

      return;
    }

    if (telegramVerification.completed) {
      return;
    }

    if (!telegramVerification.communityOpened) {
      telegramVerification.openCommunity();
      return;
    }

    if (
      telegramVerification.phase === "waiting-for-telegram" ||
      telegramVerification.phase === "verifying-membership"
    ) {
      telegramVerification.retryVerification();
      return;
    }

    await telegramVerification.connectTelegram();
  };

  return (
    <main className="builder-identity">
      <section className="builder-identity__hero">
        <span className="builder-identity__eyebrow">
          BOBU GENESIS ACCESS
        </span>

        <h1>Complete the Genesis Checkpoint</h1>

        <p>
          Join BOBU&apos;s official community channels to unlock
          your Builder Passport, activate GP and access missions.
        </p>
      </section>

      <section className="identity-dashboard">
        <div className="identity-summary">
          <div>
            <span className="identity-summary__label">
              Community Progress
            </span>

            <strong>
              {completedCount} / {requiredTasks.length}
            </strong>
          </div>

          <div
            className="identity-progress"
            role="progressbar"
            aria-label="Genesis Checkpoint progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="identity-progress__bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="identity-grid">
          {communityTasks.map((task) => (
            <IdentityCard
              key={task.provider}
              provider={task.provider}
              label={task.label}
              description={task.description}
              actionLabel={
                task.provider === "telegram"
                  ? telegramVerification.completed
                    ? "Completed"
                    : telegramVerification.busy
                      ? "Checking..."
                      : !telegramVerification.communityOpened
                        ? "Join Telegram"
                        : telegramVerification.phase ===
                            "waiting-for-telegram"
                          ? "Check Telegram Status"
                          : telegramVerification.phase === "error"
                            ? "Retry Telegram"
                            : "Connect Telegram"
                  : task.provider === "x"
                    ? xVerification.completed
                      ? "Completed"
                      : xVerification.busy
                        ? "Checking..."
                        : xVerification.phase === "error"
                          ? "Retry X"
                          : "Connect X"
                  : task.provider === "instagram"
                    ? instagramOpened
                      ? "Verification Coming Soon"
                      : "Follow Instagram"
                    : task.actionLabel
              }
              communityUrl={task.communityUrl}
              disabled={
                task.disabled ||
                (task.provider === "telegram" &&
                  telegramVerification.busy) ||
                (task.provider === "x" &&
                  xVerification.busy)
              }
              completed={
                task.provider === "telegram"
                  ? telegramVerification.completed
                  : task.provider === "x"
                    ? xVerification.completed
                    : builder.identity[task.provider]
              }
              statusMessage={
                task.provider === "telegram"
                  ? (
                      telegramVerification.errorMessage ??
                      telegramVerification.message
                    )
                  : task.provider === "x"
                    ? (
                        xVerification.errorMessage ??
                        xVerification.message
                      )
                    : null
              }
              statusTone={
                task.provider === "telegram"
                  ? telegramVerification.completed
                    ? "success"
                    : telegramVerification.phase === "error"
                      ? "error"
                      : (
                          telegramVerification.phase ===
                            "waiting-for-telegram" ||
                          telegramVerification.phase ===
                            "verifying-membership" ||
                          telegramVerification.phase ===
                            "creating-link"
                        )
                        ? "pending"
                        : "neutral"
                  : task.provider === "x"
                    ? xVerification.completed
                      ? "success"
                      : xVerification.phase === "error"
                        ? "error"
                        : xVerification.busy
                          ? "pending"
                          : "neutral"
                    : "neutral"
              }
              onComplete={handleTaskComplete}
            />
          ))}
        </div>

        <div className="identity-unlocks">
          <div
            className={
              builder.passportUnlocked
                ? "is-unlocked"
                : ""
            }
          >
            <span>Builder Passport</span>
            <strong>
              {builder.passportUnlocked
                ? "Unlocked"
                : "Locked"}
            </strong>
          </div>

          <div
            className={
              builder.gpEnabled ? "is-unlocked" : ""
            }
          >
            <span>BOBU GP</span>
            <strong>
              {builder.gpEnabled ? "Active" : "Locked"}
            </strong>
          </div>

          <div
            className={
              builder.missionsUnlocked
                ? "is-unlocked"
                : ""
            }
          >
            <span>Missions</span>
            <strong>
              {builder.missionsUnlocked
                ? "Unlocked"
                : "Locked"}
            </strong>
          </div>
        </div>

      </section>
    </main>
  );
}
