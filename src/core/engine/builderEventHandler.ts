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
    case "BUILDER_RESET":
      return builder;

    default:
      return builder;
  }
};
