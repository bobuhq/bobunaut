import {
  createInitialBuilder,
  type Builder,
  type IdentityProvider,
} from "../core/models/Builder";
import {
  createEventTimestamp,
  eventEngine,
  type BobuEvent,
} from "../core/engine/eventEngine";
import { reduceBuilderEvent } from "../core/engine/builderEventHandler";
import { applyBuilderRules } from "../core/rules/rulesEngine";

type BuilderListener = () => void;

let builder: Builder = applyBuilderRules(createInitialBuilder());
const listeners = new Set<BuilderListener>();

const emitChange = (): void => {
  listeners.forEach((listener) => listener());
};

const replaceBuilderSnapshot = (
  snapshot: Builder,
): void => {
  builder = applyBuilderRules(snapshot);
  emitChange();
};

const processEvent = (event: BobuEvent): void => {
  if (event.type === "BUILDER_RESET") {
    replaceBuilderSnapshot(createInitialBuilder());
    return;
  }

  builder = applyBuilderRules(
    reduceBuilderEvent(builder, event),
  );

  emitChange();
};

eventEngine.subscribe(processEvent);

export const builderStore = {
  getSnapshot(): Builder {
    return builder;
  },

  subscribe(listener: BuilderListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Replaces the in-memory Builder state with an authoritative
   * snapshot loaded from persistent storage.
   *
   * Restore does not publish domain events and does not calculate
   * GP, XP or rewards. Derived access rules are recalculated from
   * the restored source fields before notifying React subscribers.
   */
  restore(snapshot: Builder): void {
    replaceBuilderSnapshot(snapshot);
  },

  connectIdentity(provider: IdentityProvider): void {
    eventEngine.publish({
      type: "IDENTITY_CONNECTED",
      provider,
      occurredAt: createEventTimestamp(),
    });
  },

  disconnectIdentity(provider: IdentityProvider): void {
    eventEngine.publish({
      type: "IDENTITY_DISCONNECTED",
      provider,
      occurredAt: createEventTimestamp(),
    });
  },

  toggleIdentity(provider: IdentityProvider): void {
    const connected = builder.identity[provider];

    eventEngine.publish({
      type: connected
        ? "IDENTITY_DISCONNECTED"
        : "IDENTITY_CONNECTED",
      provider,
      occurredAt: createEventTimestamp(),
    });
  },

  addXp(amount: number, source = "unknown"): void {
    eventEngine.publish({
      type: "XP_EARNED",
      amount,
      source,
      occurredAt: createEventTimestamp(),
    });
  },

  reset(): void {
    eventEngine.publish({
      type: "BUILDER_RESET",
      occurredAt: createEventTimestamp(),
    });
  },
};
