import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  builderMiningService,
  type BuilderMiningState,
} from "../../../core/builder/services/BuilderMiningService";
import { restoreAuthenticatedBuilder } from "../../../core/builder/services/BuilderRestoreService";

import {
  createEventTimestamp,
  eventEngine,
} from "../../../core/engine/eventEngine";

import {
  gpEngine,
} from "../../../core/gp";

const DEFAULT_SESSION_DURATION_MS =
  24 * 60 * 60 * 1000;

export type BuilderMiningSessionSnapshot = {
  miningState: BuilderMiningState | null;
  loading: boolean;
  busy: boolean;
  errorMessage: string | null;
  showActivation: boolean;
  now: number;
  remainingTime: number;
  sessionProgress: number;
  sessionEarnedGp: number;
  gpPerHour: number;
  gpPerSecond: number;
  isActive: boolean;
  claimable: boolean;
  reload: () => Promise<void>;
  handleMiningAction: () => Promise<void>;
};

export function useBuilderMiningSession():
  BuilderMiningSessionSnapshot {
  const [miningState, setMiningState] =
    useState<BuilderMiningState | null>(null);

  const [now, setNow] = useState(Date.now());

  const [serverOffsetMs, setServerOffsetMs] =
    useState(0);

  const [busy, setBusy] = useState(false);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [showActivation, setShowActivation] =
    useState(false);

  const applyMiningState = useCallback(
    (nextState: BuilderMiningState): void => {
      setMiningState(nextState);

      const serverTime = Date.parse(
        nextState.serverNow,
      );

      if (Number.isFinite(serverTime)) {
        setServerOffsetMs(
          serverTime - Date.now(),
        );

        setNow(serverTime);
      }
    },
    [],
  );

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nextState =
        await builderMiningService.getState();

      applyMiningState(nextState);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Mining state could not be loaded.";

      setMiningState(null);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [applyMiningState]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now() + serverOffsetMs);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [serverOffsetMs]);

  const session = useMemo(() => {
    const sessionStart = miningState?.startedAt
      ? Date.parse(miningState.startedAt)
      : null;

    const sessionEnd = miningState?.endsAt
      ? Date.parse(miningState.endsAt)
      : null;

    const hasValidStart =
      sessionStart !== null &&
      Number.isFinite(sessionStart);

    const hasValidEnd =
      sessionEnd !== null &&
      Number.isFinite(sessionEnd);

    const remainingTime =
      hasValidEnd && miningState?.active
        ? Math.max(0, sessionEnd - now)
        : 0;

    const sessionDuration =
      hasValidStart && hasValidEnd
        ? Math.max(
            sessionEnd - sessionStart,
            1,
          )
        : DEFAULT_SESSION_DURATION_MS;

    const claimable =
      miningState?.claimable === true ||
      (
        miningState?.active === true &&
        hasValidEnd &&
        sessionEnd <= now
      );

    const isActive =
      miningState?.active === true &&
      remainingTime > 0;

    const sessionProgress = claimable
      ? 100
      : isActive
        ? Math.min(
            100,
            Math.max(
              0,
              (
                (
                  sessionDuration -
                  remainingTime
                ) /
                sessionDuration
              ) *
                100,
            ),
          )
        : 0;

    const sessionRewardGp =
      miningState?.rewardGp ?? 0;

    const sessionEarnedGp = claimable
      ? sessionRewardGp
      : (
          sessionRewardGp *
          sessionProgress
        ) / 100;

    const gpPerHour =
      miningState?.totalRatePerHour ?? 0;

    const gpPerSecond =
      gpPerHour / 3600;

    return {
      remainingTime,
      sessionProgress,
      sessionEarnedGp,
      gpPerHour,
      gpPerSecond,
      isActive,
      claimable,
    };
  }, [miningState, now]);

  const handleMiningAction =
    useCallback(async (): Promise<void> => {
      if (busy || session.isActive) {
        return;
      }

      setBusy(true);
      setErrorMessage(null);

      try {
        const nextState = session.claimable
          ? await gpEngine.claimMiningReward()
          : await builderMiningService.start();

        applyMiningState(nextState);

        if (session.claimable) {
          eventEngine.publish({
            type: "CLAIM_SUCCESS",
            amount: nextState.rewardGp,
            occurredAt: createEventTimestamp(),
          });
        } else {
          eventEngine.publish({
            type: "MINING_STARTED",
            occurredAt: createEventTimestamp(),
          });
        }

        await restoreAuthenticatedBuilder();

        setShowActivation(true);

        window.setTimeout(() => {
          setShowActivation(false);
        }, 2200);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Mining action failed.";

        setErrorMessage(message);
        window.alert(message);
      } finally {
        setBusy(false);
      }
    }, [
      applyMiningState,
      busy,
      session.claimable,
      session.isActive,
    ]);

  return {
    miningState,
    loading,
    busy,
    errorMessage,
    showActivation,
    now,
    remainingTime: session.remainingTime,
    sessionProgress: session.sessionProgress,
    sessionEarnedGp:
      session.sessionEarnedGp,
    gpPerHour: session.gpPerHour,
    gpPerSecond: session.gpPerSecond,
    isActive: session.isActive,
    claimable: session.claimable,
    reload,
    handleMiningAction,
  };
}
