import type {
  MarsResourceKey,
} from "./MarsResourceState";

export type MarsProductionFlow = {
  resource: MarsResourceKey;

  producedPerHour: number;
  consumedPerHour: number;
  netPerHour: number;
};
