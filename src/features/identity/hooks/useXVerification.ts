import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { useLanguage } from "../../../core/language";
import { beginXReauthentication, clearXReauthentication } from "../services/xReauthGuard";
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
  const { t } = useLanguage();
  const [phase, setPhase] =
    useState<XVerificationPhase>(
      initiallyVerified ? "completed" : "idle",
    );

  const [message, setMessage] =
    useState<string | null>(
      initiallyVerified
        ? t("identity.x.done")
        : null,
    );

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const verifyAndReward = useCallback(
    async (): Promise<boolean> => {
      setPhase("verifying");
      setMessage(t("identity.x.verifying"));
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

        clearXReauthentication();
        setPhase("completed");
        setMessage(t("identity.x.done"));

        return true;
      } catch (error) {

        console.error(
          "X verification failed:",
          error,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(t("identity.x.failed"));

        return false;
      }
    },
    [t],
  );

  const connectX = useCallback(
    async (): Promise<void> => {
      setPhase("connecting");
      setMessage(t("identity.x.opening"));
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
            t("identity.x.signIn"),
          );
        }

        // Existing X identity: verify without starting another OAuth link.
        const { data: identityData, error: identityError } =
          await supabase.auth.getUserIdentities();

        if (identityError) {
          throw identityError;
        }

        if (
          identityData.identities?.some(
            (identity) => identity.provider.toLowerCase() === "x",
          )
        ) {
          await verifyAndReward();
          return;
        }

        await beginXReauthentication();

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
          window.sessionStorage.removeItem(X_WORKFLOW_KEY);
          clearXReauthentication();
          throw new Error(error.message);
        }
      } catch (error) {

        console.error(
          "X connection failed:",
          error,
        );

        window.sessionStorage.removeItem(X_WORKFLOW_KEY);
        clearXReauthentication();

        setPhase("error");
        setMessage(null);
        setErrorMessage(t("identity.x.failed"));
      }
    },
    [t, verifyAndReward],
  );

  useEffect(() => {
    if (!initiallyVerified) {
      setPhase(current => current === "completed" ? "idle" : current);
      return;
    }

    setPhase("completed");
    setMessage(t("identity.x.done"));
    setErrorMessage(null);
  }, [initiallyVerified, t]);

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
