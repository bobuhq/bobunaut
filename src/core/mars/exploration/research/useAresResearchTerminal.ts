import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  AresHiddenMission,
} from "../missions/AresHiddenMissionService";

import {
  completeMyAresResearch,
  getMyAresResearch,
  startMyAresResearch,
  type AresResearch,
} from "./AresResearchService";

export type AresResearchTerminalState =
  | "unavailable"
  | "loading"
  | "ready"
  | "analyzing"
  | "completed"
  | "error";

const ANALYSIS_DURATION_MS = 4000;

export function useAresResearchTerminal(
  mission: AresHiddenMission | null,
  isNear: boolean,
) {
  const [
    state,
    setState,
  ] =
    useState<AresResearchTerminalState>(
      mission?.status === "claimed"
        ? "loading"
        : "unavailable",
    );

  const [
    progress,
    setProgress,
  ] =
    useState(0);

  const [
    research,
    setResearch,
  ] =
    useState<AresResearch | null>(
      null,
    );

  const completingRef =
    useRef(false);

  const missionKey =
    mission?.missionKey ?? null;

  const missionClaimed =
    mission?.status === "claimed";

  const restoreResearch =
    useCallback(
      async () => {
        if (
          !missionKey ||
          !missionClaimed
        ) {
          setResearch(null);
          setProgress(0);
          setState(
            "unavailable",
          );
          return;
        }

        try {
          setState(
            "loading",
          );

          const restored =
            await getMyAresResearch();

          if (
            !restored ||
            restored.missionKey !==
              missionKey
          ) {
            setResearch(null);
            setProgress(0);
            setState(
              "ready",
            );
            return;
          }

          setResearch(
            restored,
          );

          if (
            restored.status ===
            "completed"
          ) {
            setProgress(1);
            setState(
              "completed",
            );
            return;
          }

          if (
            restored.status ===
              "analyzing" &&
            restored.analysisStartedAt
          ) {
            setState(
              "analyzing",
            );
            return;
          }

          setProgress(0);
          setState(
            "ready",
          );
        } catch (
          restoreError
        ) {
          console.error(
            "Failed to restore Ares research",
            restoreError,
          );

          setState(
            "error",
          );
        }
      },
      [
        missionClaimed,
        missionKey,
      ],
    );

  useEffect(() => {
    void restoreResearch();
  }, [
    restoreResearch,
  ]);

  const beginResearch =
    useCallback(
      async () => {
        if (
          !missionKey ||
          !missionClaimed ||
          !isNear ||
          (
            state !== "ready" &&
            state !== "error"
          )
        ) {
          return;
        }

        try {
          setProgress(0);
          setState(
            "loading",
          );

          const started =
            await startMyAresResearch(
              missionKey,
            );

          if (!started) {
            throw new Error(
              "Research start returned no record",
            );
          }

          if (
            started.status ===
            "completed"
          ) {
            const restored =
              await getMyAresResearch();

            setResearch(
              restored,
            );
            setProgress(1);
            setState(
              "completed",
            );
            return;
          }

          const restored =
            await getMyAresResearch();

          setResearch(
            restored,
          );

          setState(
            "analyzing",
          );
        } catch (
          startError
        ) {
          console.error(
            "Failed to start Ares research",
            startError,
          );

          setState(
            "error",
          );
        }
      },
      [
        isNear,
        missionClaimed,
        missionKey,
        state,
      ],
    );

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.code !==
          "KeyE" ||
        event.repeat ||
        !isNear
      ) {
        return;
      }

      if (
        state !== "ready" &&
        state !== "error"
      ) {
        return;
      }

      event.preventDefault();

      void beginResearch();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    beginResearch,
    isNear,
    state,
  ]);

  useEffect(() => {
    if (
      state !==
        "analyzing" ||
      !missionKey ||
      !research?.analysisStartedAt
    ) {
      return;
    }

    let cancelled =
      false;

    async function finishResearch() {
      if (
        completingRef.current ||
        cancelled
      ) {
        return;
      }

      completingRef.current =
        true;

      try {
        const result =
          await completeMyAresResearch(
            missionKey!,
          );

        if (cancelled) {
          return;
        }

        if (
          result?.status ===
          "completed"
        ) {
          const restored =
            await getMyAresResearch();

          if (cancelled) {
            return;
          }

          setResearch(
            restored,
          );
          setProgress(1);
          setState(
            "completed",
          );
        }
      } catch (
        completeError
      ) {
        if (!cancelled) {
          console.error(
            "Failed to complete Ares research",
            completeError,
          );

          setState(
            "error",
          );
        }
      } finally {
        completingRef.current =
          false;
      }
    }

    const startedAt =
      new Date(
        research.analysisStartedAt,
      ).getTime();

    function updateProgress() {
      const elapsed =
        Date.now() -
        startedAt;

      const nextProgress =
        Math.min(
          1,
          Math.max(
            0,
            elapsed /
              ANALYSIS_DURATION_MS,
          ),
        );

      setProgress(
        nextProgress,
      );

      if (
        elapsed >=
        ANALYSIS_DURATION_MS +
          150
      ) {
        void finishResearch();
      }
    }

    updateProgress();

    const timer =
      window.setInterval(
        updateProgress,
        100,
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        timer,
      );
    };
  }, [
    missionKey,
    research?.analysisStartedAt,
    state,
  ]);

  return {
    state,
    progress,
    research,
  };
}
