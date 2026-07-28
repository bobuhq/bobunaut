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
      type: "XP_EARNED";
      amount: number;
      source: string;
      occurredAt: string;
    }
  | {
      type: "BUILDER_RESET";
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
