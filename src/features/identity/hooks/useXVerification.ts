import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "../../../core/auth/useAuthSession";
import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { useLanguage } from "../../../core/language";
import { gpRewardService } from "../../../core/gp/services/GPRewardService";
import { supabase } from "../../../lib/supabase";
import { beginXLink, clearXLink, finishXRecovery, hasXRecovery, prepareXReconnect, requireXIdentity } from "../services/xOAuthCallback";
import { readXVerification } from "../services/xVerificationStatus";

// UI-only cache. Never authorizes OAuth or reward claims.
let lastVerifiedXUserId: string | null = null;

export function useXVerification(_options: { initiallyVerified: boolean }) {
  const { t } = useLanguage();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const current = useRef(userId); current.current = userId;
  const lock = useRef(false);
  const version = useRef(0);
  const [state, setState] = useState(() => ({
    userId,
    verified: Boolean(userId && lastVerifiedXUserId === userId),
    reconnect: false,
  }));
  const [checkState, setCheckState] = useState<{
    userId: string | undefined;
    status: "checking" | "ready" | "error";
  }>({ userId, status: "checking" });
  const [phase, setPhase] = useState("idle");
  const [errorMessage, setError] = useState<string | null>(null);
  const assertCurrent = useCallback((id: string) => {
    if (current.current !== id) throw new Error("BOBU account changed during X verification.");
  }, []);
  const refresh = useCallback(async () => {
    const id = userId;
    const check = ++version.current;

    setCheckState({ userId: id, status: "checking" });
    setState(s =>
      s.userId === id
        ? s
        : {
            userId: id,
            verified: Boolean(id && lastVerifiedXUserId === id),
            reconnect: false,
          }
    );

    if (!id) {
      setCheckState({ userId: id, status: "error" });
      return null;
    }

    try {
      const linked = await requireXIdentity(id);
      assertCurrent(id);

      const recovery = await hasXRecovery(id);
      assertCurrent(id);

      const status = await readXVerification(id);
      assertCurrent(id);

      if (check !== version.current) {
        throw new Error("X verification check superseded.");
      }

      if (
        status.status === "invalid_session" ||
        status.status === "unavailable"
      ) {
        throw new Error(t("identity.x.failed"));
      }

      // BOBU_X_RECOVERY_V4:
      // Only authoritative server verification can release
      // an interrupted local OAuth recovery. Never infer success
      // from local storage or the presence of an X identity alone.
      if (recovery && linked && status.verified) {
        await finishXRecovery(id);
        assertCurrent(id);
      }

      const recoveryPending =
        recovery && !(linked && status.verified);

      // BOBU_X_RECOVERY_V6: server evidence controls recovery.
      if (status.pending && (
        status.recoveryState === "unavailable" ||
        (status.recoveryState === "missing_identity" && linked) ||
        (status.recoveryState === "fresh_identity" && !linked) ||
        (status.recoveryState === "old_identity" && !linked)
      )) {
        throw new Error("X recovery status unavailable. Please retry.");
      }

      const result = {
        linked,
        recoveryState: status.recoveryState,
        reconnect: status.pending &&
          status.recoveryState === "old_identity",
        verified: linked && !recoveryPending && status.verified,
        serverVerified: linked && status.verified,
        serverStatus: status.status,
      };

      if (result.verified) {
        lastVerifiedXUserId = id;
      } else if (lastVerifiedXUserId === id) {
        lastVerifiedXUserId = null;
      }

      setState({
        userId: id,
        verified: result.verified,
        reconnect: result.reconnect,
      });

      // Clear stale errors only after confirmed server verification.
      if (result.verified) {
        setError(null);
      }

      setCheckState({ userId: id, status: "ready" });

      return result;
    } catch (error) {
      if (check === version.current && current.current === id) {
        if (lastVerifiedXUserId === id) {
          lastVerifiedXUserId = null;
        }
        setState(s => ({ ...s, userId: id, verified: false }));
        setCheckState({ userId: id, status: "error" });
      }
      throw error;
    }
  }, [userId, assertCurrent, t]);
  useEffect(() => {
    setState(previous =>
      previous.userId === userId
        ? previous
        : {
            userId,
            verified: Boolean(userId && lastVerifiedXUserId === userId),
            reconnect: false,
          }
    );
    setCheckState({ userId, status: "checking" });
    setPhase("idle"); setError(null);
    const check = () => { void refresh().catch(() => { if (current.current === userId) setError(t("identity.x.failed")); }); };
    check(); window.addEventListener("focus", check);
    return () => { ++version.current; window.removeEventListener("focus", check); };
  }, [refresh, userId, t]);
  const verifyAndReward = useCallback(async () => {
    if (!userId || lock.current) return false;
    lock.current = true; setPhase("verifying"); setError(null);
    try {
      // A completed reset with invalid server evidence must never trigger a new GP claim.
      const preflight = await refresh();
      assertCurrent(userId);
      if (preflight?.serverStatus === "rewarded" && !preflight.verified) {
        throw new Error("X account requires a secure identity review. No GP claim was made.");
      }
      if (!preflight?.linked) {
        throw new Error("X identity is not linked.");
      }

      if (preflight.verified) {
        setPhase("idle");
        return true;
      }

      if (
        preflight.serverStatus !== "no_reset" &&
        preflight.recoveryState !== "fresh_identity"
      ) {
        throw new Error("X recovery requires valid server identity evidence.");
      }

      const result = await gpRewardService.claimGenesisReward("x", userId);
      assertCurrent(userId);
      if (!result.verified) throw new Error(result.message || t("identity.x.failed"));
      await restoreAuthenticatedBuilder(userId);
      const status = await refresh();
      assertCurrent(userId);
      // BOBU_X_RECOVERY_V2:
      // A successful server claim must be confirmed independently
      // of the local recovery flag. Never clear recovery before proof.
      if (!status?.serverVerified) {
        throw new Error(
          "X verification was not confirmed by the server."
        );
      }

      await finishXRecovery(userId);
      await clearXLink();

      // Re-read after recovery cleanup so the UI can become complete.
      const confirmed = await refresh();
      assertCurrent(userId);

      if (!confirmed?.verified) {
        throw new Error(
          "X verification succeeded but the final status check failed."
        );
      }

      setPhase("idle");
      return true;
    } catch (error) {
      if (current.current === userId) {
        if (error instanceof Error && error.message.includes("fresh_x_oauth_required")) setState({userId, verified: false, reconnect: true});
        else setState(s => ({...s, verified: false}));
        setPhase("error");
        setError(
          error instanceof Error &&
          error.message.includes("secure identity review")
            ? error.message
            : t("identity.x.failed")
        );
      }
      return false;
    } finally { lock.current = false; }
  }, [userId, assertCurrent, refresh, t]);
  const connectX = useCallback(async () => {
    if (
      !userId ||
      lock.current ||
      checkState.userId !== userId ||
      checkState.status !== "ready" ||
      (state.userId === userId && state.verified)
    ) return;
    lock.current = true; setPhase("connecting"); setError(null);
    try {
      const status = await refresh();
      assertCurrent(userId);
      if (!status) throw new Error("Session unavailable");
      if (status.verified) {
        setPhase("idle");
        return;
      }
      // A rewarded record with rejected server proof needs controlled review,
      // not client unlink, OAuth relink, or another reward attempt.
      if (status.serverStatus === "rewarded" && !status.verified) {
        setPhase("error");
        setError("X identity mismatch: secure BOBU support review required. Your GP has not been changed.");
        return;
      }
      if (
        status.serverStatus === "pending" ||
        status.serverStatus === "relinked"
      ) {
        if (
          status.recoveryState === "different_identity" ||
          status.recoveryState === "review_required" ||
          status.recoveryState === "unavailable"
        ) {
          setPhase("error");
          setError("X recovery requires secure review of the original X account. No GP claim was made.");
          return;
        }
      }

      if (
        status.recoveryState === "old_identity" &&
        status.reconnect &&
        status.linked
      ) {
        // Only unlink if an X identity actually exists. Pending accounts with
        // no linked X identity must be allowed to start fresh browser OAuth.
        if (!window.confirm(t("identity.x.relinkConfirm"))) { setPhase("idle"); return; }
        await prepareXReconnect(userId, true);
      } else if (status.linked) {
        // Legacy no_reset does not authorize unlinking an X identity.
        // Try the existing server-side claim exactly once; if it fails,
        // present the real state instead of pretending OAuth will open.
        lock.current = false;
        const verified = await verifyAndReward();
        if (!verified && status.serverStatus === "no_reset") {
          setError("X is connected but is not verified by the server. Contact BOBU support for a safe account review before reconnecting.");
        }
        return;
      }
      assertCurrent(userId);
      const initiatingId = await beginXLink();
      if (initiatingId !== userId) throw new Error("BOBU account changed during X OAuth.");
      const { error } = await supabase.auth.linkIdentity({provider: "x", options: { redirectTo: new URL("/identity", window.location.origin).toString(), skipBrowserRedirect: false }});
      if (error) throw error;
    } catch {
      await clearXLink();
      if (current.current === userId) { setPhase("error"); setError(t("identity.x.failed")); }
    } finally { lock.current = false; }
  }, [userId, refresh, assertCurrent, verifyAndReward, t, checkState, state]);
  const completed = state.userId === userId && state.verified;
  const checkStatus =
    checkState.userId === userId ? checkState.status : "checking";
  const busy =
    checkStatus === "checking" ||
    phase === "connecting" ||
    phase === "verifying";
  const canConnect =
    Boolean(userId) &&
    checkStatus === "ready" &&
    !completed &&
    !busy &&
    !lock.current;

  // BOBU_X_RECOVERY_V1: allow an explicit retry after
  // temporary status-service failure, never bypass verification.
  const canRetry =
    Boolean(userId) &&
    checkStatus === "error" &&
    !lock.current;

  return {
    canRetry,
    phase,
    errorMessage,
    message: completed ? t("identity.x.done") : null,
    completed,
    reconnect: state.userId === userId && state.reconnect,
    checkStatus,
    canConnect,
    busy,
    connectX,
    verifyAndReward,
    refresh,
  };
}
