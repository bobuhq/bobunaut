import type { Builder } from "../models/Builder";
import type { BobuEvent } from "./eventEngine";

export const reduceBuilderEvent = (
  builder: Builder,
  event: BobuEvent,
): Builder => {
  switch (event.type) {
    case "IDENTITY_CONNECTED":
      return {
        ...builder,
        identity: {
          ...builder.identity,
          [event.provider]: true,
        },
      };

    case "IDENTITY_DISCONNECTED":
      return {
        ...builder,
        identity: {
          ...builder.identity,
          [event.provider]: false,
        },
      };
    case "XP_EARNED":
      if (!Number.isFinite(event.amount) || event.amount <= 0) {
        return builder;
      }

      return {
        ...builder,
        xp: builder.xp + Math.floor(event.amount),
      };

    case "BUILDER_RESET":
      return builder;

    default:
      return builder;
  }
};
