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

const processEvent = (event: BobuEvent): void => {
  if (event.type === "BUILDER_RESET") {
    builder = applyBuilderRules(createInitialBuilder());
  } else {
    builder = applyBuilderRules(
      reduceBuilderEvent(builder, event),
    );
  }

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

  addGp(amount: number, source = "unknown"): void {
    eventEngine.publish({
      type: "GP_EARNED",
      amount,
      source,
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
