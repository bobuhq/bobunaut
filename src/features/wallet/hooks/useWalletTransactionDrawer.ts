import {
  useCallback,
  useState,
} from "react";

import type { BuilderWalletEntry } from "../../../core/builder";

export function useWalletTransactionDrawer() {
  const [selectedEntry, setSelectedEntry] =
    useState<BuilderWalletEntry | null>(null);

  const openTransaction = useCallback(
    (entry: BuilderWalletEntry) => {
      setSelectedEntry(entry);
    },
    [],
  );

  const closeTransaction = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  return {
    selectedEntry,
    isOpen: selectedEntry !== null,
    openTransaction,
    closeTransaction,
  };
}
