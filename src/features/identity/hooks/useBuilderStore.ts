import { useSyncExternalStore } from "react";
import { builderStore } from "../../../store/builderStore";

export const useBuilderStore = () =>
  useSyncExternalStore(
    builderStore.subscribe,
    builderStore.getSnapshot,
    builderStore.getSnapshot,
  );
