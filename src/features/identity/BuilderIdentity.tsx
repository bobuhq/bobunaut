import { useEffect, useState } from "react";
import { IdentityCard } from "./components/IdentityCard";
import { useBuilderStore } from "./hooks/useBuilderStore";
import { builderStore } from "../../store/builderStore";
import { supabase } from "../../lib/supabase";
import { gpEngine } from "../../core/gp";
import { restoreAuthenticatedBuilder } from "../../core/builder/services/BuilderRestoreService";
import { referralService } from "../../core/builder/services/ReferralService";
import type { IdentityProvider } from "../../core/models/Builder";
import "./BuilderIdentity.css";

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
    communityUrl: "https://t.me/+I0Q01kVMYw41YjA0",
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
  const [telegramCommunityOpened, setTelegramCommunityOpened] =
    useState(false);
  const [telegramBotOpened, setTelegramBotOpened] =
    useState(false);
  const [telegramBusy, setTelegramBusy] =
    useState(false);

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
        try {
          const result =
            await gpEngine.claimGenesisReward("x");

          if (!result.verified) {
            console.error(
              "X verification was not completed:",
              result,
            );
          } else {
            await restoreAuthenticatedBuilder();
          }
        } catch (error) {
          console.error(
            "X reward claim failed:",
            error,
          );
        }

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

      const telegramLinked =
        source.identities.some(
          (identity) =>
            identity.provider.toLowerCase() ===
              "telegram" &&
            identity.provider_user_id.length > 0,
        );

      setTelegramBotOpened(telegramLinked);
    };

    void restoreIdentityPage().catch((error) => {
      console.error(
        "Builder identity restore failed:",
        error,
      );
    });
  }, []);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.alert("Please sign in with Google first.");
        return;
      }

      const redirectTo = new URL(
        "/identity",
        window.location.origin,
      ).toString();

      const { error } = await supabase.auth.linkIdentity({
        provider: "x",
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error("X connection failed:", error);
        window.alert(`X connection failed: ${error.message}`);
      }

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

    if (telegramBusy) {
      return;
    }

    setTelegramBusy(true);

    try {
      if (!telegramCommunityOpened) {
        if (!task?.communityUrl) {
          throw new Error("Telegram community link is missing.");
        }

        window.open(
          task.communityUrl,
          "_blank",
          "noopener,noreferrer",
        );

        setTelegramCommunityOpened(true);

        window.alert(
          "Join the BOBU Telegram community, then return and open the verification bot.",
        );

        return;
      }

      if (!telegramBotOpened) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Please sign in with Google first.");
        }

        const { data, error } =
          await supabase.functions.invoke(
            "create-telegram-link",
            {
              body: {},
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            },
          );

        if (error) {
          throw error;
        }

        const telegramUrl =
          data?.bot_url ??
          data?.telegram_url ??
          data?.url ??
          data?.link;

        if (
          typeof telegramUrl !== "string" ||
          telegramUrl.length === 0
        ) {
          throw new Error(
            "Telegram verification link was not returned.",
          );
        }

        window.open(
          telegramUrl,
          "_blank",
          "noopener,noreferrer",
        );

        setTelegramBotOpened(true);

        window.alert(
          "Complete the verification in Telegram, then return and click Verify Telegram.",
        );

        return;
      }

      const result =
        await gpEngine.claimGenesisReward(
          "telegram",
        );

      if (result.verified) {
        await restoreAuthenticatedBuilder();

        const rewardMessage =
          result.message ??
          (
            result.rewarded
              ? `Telegram verified. ${result.rewardGp.toLocaleString()} GP awarded.`
              : "Telegram is already verified."
          );

        window.alert(rewardMessage);
        return;
      }

      window.alert(
        result.message ??
          "Telegram membership could not be verified yet.",
      );
    } catch (error) {
      console.error(
        "Telegram verification failed:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Telegram verification failed.",
      );
    } finally {
      setTelegramBusy(false);
    }
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
                  ? telegramBusy
                    ? "Checking..."
                    : !telegramCommunityOpened
                      ? "Join Telegram"
                      : telegramBotOpened
                        ? "Verify Telegram"
                        : "Open Verify Bot"
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
                  telegramBusy)
              }
              completed={
                builder.identity[task.provider]
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
