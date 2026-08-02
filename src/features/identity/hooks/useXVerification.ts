import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { gpEngine } from "../../../core/gp";
import { supabase } from "../../../lib/supabase";

export type XVerificationPhase =
  | "idle"
  | "connecting"
  | "verifying"
  | "completed"
  | "error";

interface UseXVerificationOptions {
  initiallyVerified: boolean;
}

const X_WORKFLOW_KEY =
  "bobu:x-verification:pending";

export function useXVerification({
  initiallyVerified,
}: UseXVerificationOptions) {
  const [phase, setPhase] =
    useState<XVerificationPhase>(
      initiallyVerified ? "completed" : "idle",
    );

  const [message, setMessage] =
    useState<string | null>(
      initiallyVerified
        ? "X verification completed."
        : null,
    );

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const verifyAndReward = useCallback(
    async (): Promise<boolean> => {
      setPhase("verifying");
      setMessage("Verifying your X identity...");
      setErrorMessage(null);

      try {
        const result =
          await gpEngine.claimGenesisReward("x");

        if (!result.verified) {
          throw new Error(
            result.message ??
              "X verification could not be completed.",
          );
        }

        await restoreAuthenticatedBuilder();

        window.sessionStorage.removeItem(
          X_WORKFLOW_KEY,
        );

        setPhase("completed");
        setMessage(
          result.message ??
            (
              result.rewarded
                ? `X verified. ${result.rewardGp.toLocaleString()} GP awarded.`
                : "X is already verified."
            ),
        );

        return true;
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "X verification failed.";

        console.error(
          "X verification failed:",
          error,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(text);

        return false;
      }
    },
    [],
  );

  const connectX = useCallback(
    async (): Promise<void> => {
      setPhase("connecting");
      setMessage("Opening secure X connection...");
      setErrorMessage(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session) {
          throw new Error(
            "Please sign in with Google first.",
          );
        }

        const redirectTo = new URL(
          "/identity",
          window.location.origin,
        ).toString();

        window.sessionStorage.setItem(
          X_WORKFLOW_KEY,
          "true",
        );

        const { error } =
          await supabase.auth.linkIdentity({
            provider: "x",
            options: {
              redirectTo,
            },
          });

        if (error) {
          window.sessionStorage.removeItem(
            X_WORKFLOW_KEY,
          );

          throw new Error(error.message);
        }
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "X connection could not be started.";

        console.error(
          "X connection failed:",
          error,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(text);
      }
    },
    [],
  );

  useEffect(() => {
    if (!initiallyVerified) {
      return;
    }

    window.sessionStorage.removeItem(
      X_WORKFLOW_KEY,
    );

    setPhase("completed");
    setMessage("X verification completed.");
    setErrorMessage(null);
  }, [initiallyVerified]);

  return {
    phase,
    message,
    errorMessage,
    completed:
      phase === "completed" ||
      initiallyVerified,
    busy:
      phase === "connecting" ||
      phase === "verifying",
    connectX,
    verifyAndReward,
  };
}
