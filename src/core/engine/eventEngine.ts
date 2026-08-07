import type { IdentityProvider } from "../models/Builder";

export type BobuEvent =
  | {
      type: "IDENTITY_CONNECTED";
      provider: IdentityProvider;
      occurredAt: string;
    }
  | {
      type: "IDENTITY_DISCONNECTED";
      provider: IdentityProvider;
      occurredAt: string;
    }
  | {
      type: "BUILDER_RESET";
      occurredAt: string;
    }

  // Universe Events
  | {
      type: "MINING_STARTED";
      occurredAt: string;
    }
  | {
      type: "MINING_STOPPED";
      occurredAt: string;
    }
  | {
      type: "MINING_CLAIMED";
      sessionId: string;
      occurredAt: string;
    }
  | {
      type: "MINING_GP_TICK";
      amount: number;
      occurredAt: string;
    }
  | {
      type: "CLAIM_SUCCESS";
      amount: number;
      occurredAt: string;
    }
  | {
      type: "REFERRAL_JOINED";
      builderId: string;
      occurredAt: string;
    }
  | {
      type: "MISSION_COMPLETED";
      missionId: string;
      rewardGp: number;
      occurredAt: string;
    }
  | {
      type: "LEVEL_UP";
      level: number;
      occurredAt: string;
    }
  | {
      type: "WALLET_UPDATED";
      balance: number;
      occurredAt: string;
    };

type BobuEventListener = (event: BobuEvent) => void;

const listeners = new Set<BobuEventListener>();

export const eventEngine = {
  publish(event: BobuEvent): void {
    listeners.forEach((listener) => listener(event));
  },

  subscribe(listener: BobuEventListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

export const createEventTimestamp = (): string =>
  new Date().toISOString();
