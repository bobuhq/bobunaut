import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { gpEngine } from "../../../core/gp";

export type InstagramVerificationPhase =
  | "idle"
  | "opening-instagram"
  | "waiting-for-return"
  | "verifying"
  | "completed"
  | "error";

interface UseInstagramVerificationOptions {
  initiallyVerified: boolean;
}

const INSTAGRAM_PROFILE_URL =
  "https://www.instagram.com/bobu_universe";

const INSTAGRAM_WORKFLOW_KEY =
  "bobu:instagram-manual-verification:pending";

export function useInstagramVerification({
  initiallyVerified,
}: UseInstagramVerificationOptions) {
  const [phase, setPhase] =
    useState<InstagramVerificationPhase>(
      initiallyVerified ? "completed" : "idle",
    );

  const [message, setMessage] =
    useState<string | null>(
      initiallyVerified
        ? "Instagram completed successfully."
        : null,
    );

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const claimRunningRef = useRef(false);

  const claimInstagramReward =
    useCallback(async (): Promise<void> => {
      if (
        claimRunningRef.current ||
        initiallyVerified
      ) {
        return;
      }

      claimRunningRef.current = true;
      setPhase("verifying");
      setMessage(
        "Completing Instagram verification...",
      );
      setErrorMessage(null);

      try {
        const result =
          await gpEngine.claimGenesisReward(
            "instagram",
          );

        if (!result.verified) {
          throw new Error(
            result.message ??
              "Instagram verification could not be completed.",
          );
        }

        await restoreAuthenticatedBuilder();

        window.sessionStorage.removeItem(
          INSTAGRAM_WORKFLOW_KEY,
        );

        setPhase("completed");
        setMessage(
          result.message ??
            (
              result.rewarded
                ? `Instagram completed. ${result.rewardGp.toLocaleString()} GP awarded.`
                : "Instagram is already completed and rewarded."
            ),
        );
        setErrorMessage(null);
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Instagram verification failed.";

        console.error(
          "Instagram manual verification failed:",
          error,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(text);
      } finally {
        claimRunningRef.current = false;
      }
    }, [initiallyVerified]);

  const connectInstagram =
    useCallback(async (): Promise<void> => {
      if (initiallyVerified) {
        return;
      }

      setPhase("opening-instagram");
      setMessage(
        "Opening the official BOBU Instagram account...",
      );
      setErrorMessage(null);

      window.sessionStorage.setItem(
        INSTAGRAM_WORKFLOW_KEY,
        "true",
      );

      setPhase("waiting-for-return");
      setMessage(
        "Follow BOBU on Instagram, then return to complete.",
      );

      const isMobile =
        /iPhone|iPad|iPod|Android/i.test(
          navigator.userAgent,
        );

      if (isMobile) {
        window.location.assign(
          INSTAGRAM_PROFILE_URL,
        );
        return;
      }

      window.open(
        INSTAGRAM_PROFILE_URL,
        "_blank",
        "noopener,noreferrer",
      );
    }, [initiallyVerified]);

  useEffect(() => {
    if (!initiallyVerified) {
      return;
    }

    window.sessionStorage.removeItem(
      INSTAGRAM_WORKFLOW_KEY,
    );

    setPhase("completed");
    setMessage(
      "Instagram completed successfully.",
    );
    setErrorMessage(null);
  }, [initiallyVerified]);

  useEffect(() => {
    const completePendingWorkflow = () => {
      const pending =
        window.sessionStorage.getItem(
          INSTAGRAM_WORKFLOW_KEY,
        ) === "true";

      if (
        document.visibilityState === "visible" &&
        pending &&
        !initiallyVerified
      ) {
        void claimInstagramReward();
      }
    };

    window.addEventListener(
      "focus",
      completePendingWorkflow,
    );

    document.addEventListener(
      "visibilitychange",
      completePendingWorkflow,
    );

    /*
     * Mobile browsers may reload the BOBU page when returning
     * from Instagram. Resume the pending workflow automatically.
     */
    completePendingWorkflow();

    return () => {
      window.removeEventListener(
        "focus",
        completePendingWorkflow,
      );

      document.removeEventListener(
        "visibilitychange",
        completePendingWorkflow,
      );
    };
  }, [
    claimInstagramReward,
    initiallyVerified,
  ]);

  return {
    phase,
    message,
    errorMessage,
    completed:
      phase === "completed" ||
      initiallyVerified,
    busy:
      phase === "opening-instagram" ||
      phase === "verifying",
    connectInstagram,
    processCallback:
      claimInstagramReward,
  };
}
