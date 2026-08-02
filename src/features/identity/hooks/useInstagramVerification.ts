import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { supabase } from "../../../lib/supabase";

export type InstagramVerificationPhase =
  | "idle"
  | "connecting"
  | "verifying"
  | "completed"
  | "error";

interface InstagramLinkResponse {
  ok?: boolean;
  configured?: boolean;
  authorization_url?: string;
  expires_at?: string;
  error?: string;
}

interface UseInstagramVerificationOptions {
  initiallyVerified: boolean;
}

const INSTAGRAM_WORKFLOW_KEY =
  "bobu:instagram-verification:pending";

const errorMessageByReason: Record<string, string> = {
  not_configured:
    "Instagram connection is not configured yet.",
  missing_oauth_parameters:
    "Instagram did not return the required authorization details.",
  token_exchange_failed:
    "Instagram authorization could not be completed.",
  instagram_unavailable:
    "Instagram is temporarily unavailable.",
  state_validation_failed:
    "Instagram verification session could not be validated.",
  state_not_found:
    "Instagram verification session was not found.",
  state_already_used:
    "This Instagram verification link has already been used.",
  state_expired:
    "Instagram verification session expired. Please try again.",
  profile_lookup_failed:
    "Instagram profile could not be loaded.",
  missing_instagram_identity:
    "Instagram did not return a valid account identity.",
  identity_already_linked:
    "This Instagram account is already connected to another Builder account.",
  reward_processing_failed:
    "Instagram was connected, but the GP reward could not be processed.",
  verification_failed:
    "Instagram verification could not be completed.",
};

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
        ? "Instagram verification completed."
        : null,
    );

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const connectInstagram = useCallback(
    async (): Promise<void> => {
      setPhase("connecting");
      setMessage(
        "Opening secure Instagram connection...",
      );
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
          await supabase.functions.invoke<InstagramLinkResponse>(
            "create-instagram-link",
            {
              body: {
                return_url:
                  window.location.origin,
              },
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
              "Instagram connection could not be started.",
          );
        }

        const authorizationUrl =
          data?.authorization_url;

        if (!authorizationUrl) {
          throw new Error(
            data?.error ??
              "Instagram authorization URL was not returned.",
          );
        }

        window.sessionStorage.setItem(
          INSTAGRAM_WORKFLOW_KEY,
          "true",
        );

        window.location.assign(
          authorizationUrl,
        );
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Instagram connection could not be started.";

        console.error(
          "Instagram connection failed:",
          error,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(text);
      }
    },
    [],
  );

  const processCallback = useCallback(
    async (): Promise<boolean> => {
      const params =
        new URLSearchParams(
          window.location.search,
        );

      const callbackStatus =
        params.get("instagram");

      if (!callbackStatus) {
        return false;
      }

      setPhase("verifying");
      setMessage(
        "Verifying your Instagram identity...",
      );
      setErrorMessage(null);

      if (callbackStatus !== "success") {
        const reason =
          params.get("reason") ??
          "verification_failed";

        const text =
          errorMessageByReason[reason] ??
          "Instagram verification could not be completed.";

        window.sessionStorage.removeItem(
          INSTAGRAM_WORKFLOW_KEY,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(text);

        return true;
      }

      try {
        const source =
          await restoreAuthenticatedBuilder();

        const verified =
          Boolean(
            source?.identities.some(
              (identity) =>
                identity.provider.toLowerCase() ===
                  "instagram" &&
                identity.verified === true,
            ),
          );

        if (!verified) {
          throw new Error(
            "Instagram callback completed, but verification could not be restored.",
          );
        }

        const rewarded =
          params.get("rewarded") === "true";

        const rewardGp =
          Number(params.get("reward_gp") ?? 0);

        window.sessionStorage.removeItem(
          INSTAGRAM_WORKFLOW_KEY,
        );

        setPhase("completed");
        setMessage(
          rewarded
            ? `Instagram verified. ${rewardGp.toLocaleString()} GP awarded.`
            : "Instagram is already verified and rewarded.",
        );
        setErrorMessage(null);

        return true;
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Instagram verification failed.";

        console.error(
          "Instagram callback restore failed:",
          error,
        );

        setPhase("error");
        setMessage(null);
        setErrorMessage(text);

        return true;
      }
    },
    [],
  );

  useEffect(() => {
    if (!initiallyVerified) {
      return;
    }

    window.sessionStorage.removeItem(
      INSTAGRAM_WORKFLOW_KEY,
    );

    setPhase("completed");
    setMessage(
      "Instagram verification completed.",
    );
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
    connectInstagram,
    processCallback,
  };
}
