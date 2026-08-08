import { useEffect } from "react";
import { IdentityCard } from "./components/IdentityCard";
import { useBuilderStore } from "./hooks/useBuilderStore";
import { builderStore } from "../../store/builderStore";
import { supabase } from "../../lib/supabase";
import { restoreAuthenticatedBuilder } from "../../core/builder/services/BuilderRestoreService";
import { useTelegramVerification } from "./hooks/useTelegramVerification";
import { useXVerification } from "./hooks/useXVerification";
import { useInstagramVerification } from "./hooks/useInstagramVerification";
import type { IdentityProvider } from "../../core/models/Builder";
import { useLanguage } from "../../core/language";
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
    label: "identity.telegram.label",
    description:
      "identity.telegram.description",
    actionLabel: "identity.telegram.join",
    communityUrl: TELEGRAM_COMMUNITY_URL,
    required: true,
  },
  {
    provider: "x",
    label: "identity.x.label",
    description:
      "identity.x.description",
    actionLabel: "identity.x.connect",
    communityUrl: "https://x.com/bobu_hq",
    required: true,
  },
  {
    provider: "instagram",
    label: "identity.instagram.label",
    description:
      "identity.instagram.description",
    actionLabel: "identity.instagram.connect",
    communityUrl:
      "https://www.instagram.com/bobu_universe?igsh=eGViZGJiOXFhNnR5&utm_source=qr",
    required: false,
  },
  {
    provider: "wallet",
    label: "identity.wallet.label",
    description:
      "identity.wallet.description",
    actionLabel: "identity.status.comingSoon",
    disabled: true,
    required: false,
  },
];

export default function BuilderIdentity() {
  const { t } = useLanguage();
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

  const instagramVerification =
    useInstagramVerification({
      initiallyVerified:
        builder.identity.instagram,
    });

  useEffect(() => {
    const restoreIdentityPage = async (): Promise<void> => {
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

      const hasInstagramCallback =
        searchParams.has("instagram");

      if (hasInstagramCallback) {
        await instagramVerification.processCallback();

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

    };

    void restoreIdentityPage().catch((error) => {
      console.error(
        "Builder identity restore failed:",
        error,
      );
    });
  }, [
    xVerification.verifyAndReward,
    instagramVerification.processCallback,
  ]);

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
      if (instagramVerification.completed) {
        return;
      }

      await instagramVerification.connectInstagram();
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
          {t("identity.eyebrow")}
        </span>

        <h1>{t("identity.title")}</h1>

        <p>{t("identity.description")}</p>
      </section>

      <section className="identity-dashboard">
        <div className="identity-summary">
          <div>
            <span className="identity-summary__label">
              {t("identity.progress")}
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
              label={t(task.label)}
              description={t(task.description)}
              actionLabel={
                task.provider === "telegram"
                  ? telegramVerification.completed
                    ? t("identity.status.completed")
                    : telegramVerification.busy
                      ? t("identity.status.checking")
                      : !telegramVerification.communityOpened
                        ? t("identity.telegram.join")
                        : telegramVerification.phase ===
                            "waiting-for-telegram"
                          ? t("identity.telegram.check")
                          : telegramVerification.phase === "error"
                            ? t("identity.telegram.retry")
                            : t("identity.telegram.connect")
                  : task.provider === "x"
                    ? xVerification.completed
                      ? t("identity.status.completed")
                      : xVerification.busy
                        ? t("identity.status.checking")
                        : xVerification.phase === "error"
                          ? t("identity.x.retry")
                          : t("identity.x.connect")
                  : task.provider === "instagram"
                    ? instagramVerification.completed
                      ? t("identity.status.completed")
                      : instagramVerification.busy
                        ? t("identity.status.checking")
                        : instagramVerification.phase === "error"
                          ? t("identity.instagram.retry")
                          : t("identity.instagram.connect")
                    : t(task.actionLabel)
              }
              communityUrl={task.communityUrl}
              disabled={
                task.disabled ||
                (task.provider === "telegram" &&
                  telegramVerification.busy) ||
                (task.provider === "x" &&
                  xVerification.busy) ||
                (task.provider === "instagram" &&
                  instagramVerification.busy)
              }
              completed={
                task.provider === "telegram"
                  ? telegramVerification.completed
                  : task.provider === "x"
                    ? xVerification.completed
                    : task.provider === "instagram"
                      ? instagramVerification.completed
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
                    : task.provider === "instagram"
                      ? (
                          instagramVerification.errorMessage ??
                          instagramVerification.message
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
                    : task.provider === "instagram"
                      ? instagramVerification.completed
                        ? "success"
                        : instagramVerification.phase === "error"
                          ? "error"
                          : instagramVerification.busy
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
            <span>{t("identity.unlock.passport")}</span>
            <strong>
              {builder.passportUnlocked
                ? t("identity.unlock.unlocked")
                : t("identity.unlock.locked")}
            </strong>
          </div>

          <div
            className={
              builder.gpEnabled ? "is-unlocked" : ""
            }
          >
            <span>{t("identity.unlock.gp")}</span>
            <strong>
              {builder.gpEnabled
                ? t("identity.unlock.active")
                : t("identity.unlock.locked")}
            </strong>
          </div>

          <div
            className={
              builder.missionsUnlocked
                ? "is-unlocked"
                : ""
            }
          >
            <span>{t("identity.unlock.missions")}</span>
            <strong>
              {builder.missionsUnlocked
                ? t("identity.unlock.unlocked")
                : t("identity.unlock.locked")}
            </strong>
          </div>
        </div>

      </section>
    </main>
  );
}
