import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { gpEngine } from "../../../core/gp";
import { supabase } from "../../../lib/supabase";

export type TelegramVerificationPhase =
  | "idle"
  | "opening-community"
  | "creating-link"
  | "waiting-for-telegram"
  | "verifying-membership"
  | "completed"
  | "error";

interface TelegramLinkResponse {
  ok?: boolean;
  telegram_url?: string;
  bot_url?: string;
  url?: string;
  link?: string;
  expires_at?: string;
  error?: string;
}

interface UseTelegramVerificationOptions {
  communityUrl: string;
  initiallyVerified: boolean;
}

interface PendingTelegramWorkflow {
  startedAt: number;
  expiresAt?: string;
}

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 90_000;

const WORKFLOW_STORAGE_KEY =
  "bobu:telegram-verification:pending";

const COMMUNITY_STORAGE_KEY =
  "bobu:telegram-community-opened";

const readPendingWorkflow =
  (): PendingTelegramWorkflow | null => {
    try {
      const value = window.sessionStorage.getItem(
        WORKFLOW_STORAGE_KEY,
      );

      if (!value) {
        return null;
      }

      const parsed = JSON.parse(
        value,
      ) as Partial<PendingTelegramWorkflow>;

      if (
        typeof parsed.startedAt !== "number" ||
        !Number.isFinite(parsed.startedAt)
      ) {
        return null;
      }

      return {
        startedAt: parsed.startedAt,
        expiresAt:
          typeof parsed.expiresAt === "string"
            ? parsed.expiresAt
            : undefined,
      };
    } catch {
      return null;
    }
  };

const savePendingWorkflow = (
  workflow: PendingTelegramWorkflow,
): void => {
  window.sessionStorage.setItem(
    WORKFLOW_STORAGE_KEY,
    JSON.stringify(workflow),
  );
};

const clearPendingWorkflow = (): void => {
  window.sessionStorage.removeItem(
    WORKFLOW_STORAGE_KEY,
  );
};

const hasTelegramIdentity = (
  source: Awaited<
    ReturnType<typeof restoreAuthenticatedBuilder>
  >,
): boolean =>
  Boolean(
    source?.identities.some(
      (identity) =>
        identity.provider.toLowerCase() ===
          "telegram" &&
        identity.provider_user_id.trim().length > 0,
    ),
  );

export function useTelegramVerification({
  communityUrl,
  initiallyVerified,
}: UseTelegramVerificationOptions) {
  const [phase, setPhase] =
    useState<TelegramVerificationPhase>(
      initiallyVerified ? "completed" : "idle",
    );

  const [communityOpened, setCommunityOpened] =
    useState<boolean>(() => {
      if (typeof window === "undefined") {
        return false;
      }

      return (
        window.sessionStorage.getItem(
          COMMUNITY_STORAGE_KEY,
        ) === "true" ||
        readPendingWorkflow() !== null
      );
    });

  const [message, setMessage] =
    useState<string | null>(
      initiallyVerified
        ? "Telegram verification completed."
        : null,
    );

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const pollTimerRef =
    useRef<number | null>(null);

  const pollingRef = useRef(false);
  const verificationRunningRef = useRef(false);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const finishWorkflow = useCallback(() => {
    clearPollTimer();
    pollingRef.current = false;
    clearPendingWorkflow();
  }, [clearPollTimer]);

  const verifyAndReward = useCallback(
    async (): Promise<boolean> => {
      if (verificationRunningRef.current) {
        return false;
      }

      verificationRunningRef.current = true;
      setPhase("verifying-membership");
      setMessage("Verifying Telegram membership...");
      setErrorMessage(null);

      try {
        const result =
          await gpEngine.claimGenesisReward("telegram");

        if (!result.verified) {
          setPhase("waiting-for-telegram");
          setMessage(
            result.message ??
              "Join the Telegram community and complete the bot connection.",
          );

          return false;
        }

        await restoreAuthenticatedBuilder();

        finishWorkflow();
        setPhase("completed");
        setMessage(
          result.message ??
            (
              result.rewarded
                ? `Telegram verified. ${result.rewardGp.toLocaleString()} GP awarded.`
                : "Telegram is already verified."
            ),
        );
        setErrorMessage(null);

        return true;
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Telegram verification failed.";

        console.error(
          "Telegram verification request failed:",
          error,
        );

        setPhase("waiting-for-telegram");
        setMessage(
          "Waiting for Telegram account confirmation...",
        );

        /*
         * A non-2xx response is expected while the webhook has not
         * linked the Telegram identity yet. Polling continues.
         */
        setErrorMessage(
          text.includes("non-2xx") ? null : text,
        );

        return false;
      } finally {
        verificationRunningRef.current = false;
      }
    },
    [finishWorkflow],
  );

  const pollForTelegramIdentity =
    useCallback(async (): Promise<void> => {
      const workflow = readPendingWorkflow();

      if (!workflow) {
        pollingRef.current = false;
        clearPollTimer();
        return;
      }

      if (
        Date.now() - workflow.startedAt >
        POLL_TIMEOUT_MS
      ) {
        finishWorkflow();
        setPhase("error");
        setMessage(null);
        setErrorMessage(
          "Telegram confirmation timed out. Open the verification bot again and retry.",
        );
        return;
      }

      try {
        const source =
          await restoreAuthenticatedBuilder();

        if (hasTelegramIdentity(source)) {
          const completed =
            await verifyAndReward();

          if (completed) {
            return;
          }
        }
      } catch (error) {
        console.error(
          "Telegram identity polling failed:",
          error,
        );
      }

      clearPollTimer();

      pollTimerRef.current = window.setTimeout(
        () => {
          void pollForTelegramIdentity();
        },
        POLL_INTERVAL_MS,
      );
    }, [
      clearPollTimer,
      finishWorkflow,
      verifyAndReward,
    ]);

  const startPolling = useCallback(() => {
    const workflow = readPendingWorkflow();

    if (!workflow) {
      return;
    }

    if (pollingRef.current) {
      return;
    }

    pollingRef.current = true;
    setPhase("waiting-for-telegram");
    setMessage(
      "Waiting for Telegram account confirmation...",
    );
    setErrorMessage(null);

    void pollForTelegramIdentity();
  }, [pollForTelegramIdentity]);

  const openCommunity = useCallback(() => {
    setPhase("opening-community");
    setErrorMessage(null);

    window.open(
      communityUrl,
      "_blank",
      "noopener,noreferrer",
    );

    window.sessionStorage.setItem(
      COMMUNITY_STORAGE_KEY,
      "true",
    );

    setCommunityOpened(true);
    setPhase("idle");
    setMessage(
      "Community opened. Join the group, then connect your Telegram account.",
    );
  }, [communityUrl]);

  const connectTelegram = useCallback(
    async (): Promise<void> => {
      setPhase("creating-link");
      setMessage("Creating secure Telegram connection...");
      setErrorMessage(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session?.access_token) {
          throw new Error(
            "Please sign in with Google first.",
          );
        }

        const { data, error } =
          await supabase.functions.invoke<TelegramLinkResponse>(
            "create-telegram-link",
            {
              body: {},
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
            },
          );

        if (error) {
          throw new Error(
            data?.error ??
              error.message ??
              "Telegram verification link could not be created.",
          );
        }

        const telegramUrl =
          data?.telegram_url ??
          data?.bot_url ??
          data?.url ??
          data?.link;

        if (!telegramUrl) {
          throw new Error(
            data?.error ??
              "Telegram verification link was not returned.",
          );
        }

        savePendingWorkflow({
          startedAt: Date.now(),
          expiresAt: data?.expires_at,
        });

        window.sessionStorage.setItem(
          COMMUNITY_STORAGE_KEY,
          "true",
        );

        setCommunityOpened(true);
        setPhase("waiting-for-telegram");
        setMessage(
          "Waiting for Telegram account confirmation...",
        );

        const isMobile =
          /iPhone|iPad|iPod|Android/i.test(
            navigator.userAgent,
          );

        if (isMobile) {
          /*
           * The pending workflow is persisted before navigation,
           * so polling automatically resumes when the user returns.
           */
          window.location.assign(telegramUrl);
          return;
        }

        window.open(
          telegramUrl,
          "_blank",
          "noopener,noreferrer",
        );

        startPolling();
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Telegram connection could not be started.";

        console.error(
          "Telegram connection failed:",
          error,
        );

        finishWorkflow();
        setPhase("error");
        setMessage(null);
        setErrorMessage(text);
      }
    },
    [finishWorkflow, startPolling],
  );

  useEffect(() => {
    if (!initiallyVerified) {
      return;
    }

    finishWorkflow();
    setPhase("completed");
    setMessage("Telegram verification completed.");
    setErrorMessage(null);
  }, [finishWorkflow, initiallyVerified]);

  useEffect(() => {
    if (
      initiallyVerified ||
      readPendingWorkflow() === null
    ) {
      return;
    }

    startPolling();
  }, [initiallyVerified, startPolling]);

  useEffect(() => {
    const handleReturnToSite = () => {
      if (
        document.visibilityState === "visible" &&
        !initiallyVerified &&
        readPendingWorkflow() !== null
      ) {
        pollingRef.current = false;
        clearPollTimer();
        startPolling();
      }
    };

    window.addEventListener(
      "focus",
      handleReturnToSite,
    );

    document.addEventListener(
      "visibilitychange",
      handleReturnToSite,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleReturnToSite,
      );

      document.removeEventListener(
        "visibilitychange",
        handleReturnToSite,
      );

      clearPollTimer();
      pollingRef.current = false;
    };
  }, [
    clearPollTimer,
    initiallyVerified,
    startPolling,
  ]);

  return {
    phase,
    message,
    errorMessage,
    communityOpened,
    busy:
      phase === "opening-community" ||
      phase === "creating-link" ||
      phase === "verifying-membership",
    completed:
      phase === "completed" ||
      initiallyVerified,
    openCommunity,
    connectTelegram,
    retryVerification: startPolling,
  };
}
