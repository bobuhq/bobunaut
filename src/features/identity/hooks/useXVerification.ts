import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "../../../core/auth/useAuthSession";
import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";
import { useLanguage } from "../../../core/language";
import { gpRewardService } from "../../../core/gp/services/GPRewardService";
import { supabase } from "../../../lib/supabase";
import { beginXLink, clearXLink, finishXRecovery, hasXRecovery, prepareXReconnect, requireXIdentity } from "../services/xOAuthCallback";
import { readXVerification } from "../services/xVerificationStatus";

export function useXVerification(_options: { initiallyVerified: boolean }) {
  const { t } = useLanguage();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const current = useRef(userId); current.current = userId;
  const lock = useRef(false);
  const version = useRef(0);
  const [state, setState] = useState({ userId, verified: false, reconnect: false });
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
        : { userId: id, verified: false, reconnect: false }
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

      const result = {
        linked,
        reconnect: recovery || status.pending,
        verified: linked && !recovery && status.verified,
        serverStatus: status.status,
      };

      setState({
        userId: id,
        verified: result.verified,
        reconnect: result.reconnect,
      });
      setCheckState({ userId: id, status: "ready" });

      return result;
    } catch (error) {
      if (check === version.current && current.current === id) {
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
        : { userId, verified: false, reconnect: false }
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
      const result = await gpRewardService.claimGenesisReward("x", userId);
      assertCurrent(userId);
      if (!result.verified) throw new Error(result.message || t("identity.x.failed"));
      await restoreAuthenticatedBuilder(userId);
      const status = await refresh();
      assertCurrent(userId);
      // Keep local recovery evidence until the server confirms the identity.
      if (!status?.verified) throw new Error("X verification was not confirmed by the server.");
      await finishXRecovery(userId);
      await clearXLink();
      setPhase("idle");
      return true;
    } catch (error) {
      if (current.current === userId) {
        if (error instanceof Error && error.message.includes("fresh_x_oauth_required")) setState({userId, verified: false, reconnect: true});
        else setState(s => ({...s, verified: false}));
        setPhase("error"); setError(t("identity.x.failed"));
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
      if (status.reconnect && status.linked) {
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

  return {
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
