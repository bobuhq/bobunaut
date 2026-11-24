import {
  useEffect,
  useState,
} from "react";

import {
  readAresCheckpoint,
  type AresCheckpoint,
} from "./aresCheckpoint.mjs";

import {
  readAresSharedFlightCollision,
  type SharedFlightCollision,
} from "../flight/AresSharedFlightCollision";

export type AresRestoreState =
  | { status: "idle" }
  | { status: "loading"; owner: string }
  | {
      status: "ready";
      owner: string;
      checkpoint: AresCheckpoint;
      shared: SharedFlightCollision;
    }
  | { status: "fallback"; owner: string };

export function useAresCheckpointRestore(
  owner: string,
  authorized: boolean,
  requested: boolean,
): AresRestoreState {
  const [state, setState] =
    useState<AresRestoreState>({
      status: "idle",
    });

  useEffect(() => {
    if (!requested || !authorized || !owner) {
      setState({ status: "idle" });
      return;
    }

    let active = true;
    let settled = false;

    const settle = (next: AresRestoreState) => {
      if (!active || settled) return;
      settled = true;
      setState(next);
    };

    let checkpoint: AresCheckpoint | null = null;

    try {
      checkpoint = readAresCheckpoint(
        window.localStorage,
        owner
      );
    } catch {
      // Unavailable storage must not block normal entry.
    }

    if (!checkpoint) {
      settle({
        status: "fallback",
        owner,
      });

      return;
    }

    const saved = checkpoint;

    setState({
      status: "loading",
      owner,
    });

    const timeout = window.setTimeout(() => {
      settle({
        status: "fallback",
        owner,
      });
    }, 10000);

    void readAresSharedFlightCollision()
      .then(shared => {
        settle({
          status: "ready",
          owner,
          checkpoint: saved,
          shared,
        });
      })
      .catch(() => {
        settle({
          status: "fallback",
          owner,
        });
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [owner, authorized, requested]);

  if (!requested || !authorized || !owner) {
    return { status: "idle" };
  }

  if (
    state.status === "idle" ||
    state.owner !== owner
  ) {
    return {
      status: "loading",
      owner,
    };
  }

  return state;
}
