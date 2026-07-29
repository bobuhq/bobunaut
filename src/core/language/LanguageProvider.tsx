import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { preferencesStore } from "../preferences/PreferencesStore";
import { LanguageService } from "./LanguageService";
import {
  languageOptions,
  type LanguageOption,
  type SupportedLanguage,
} from "./types";

export interface LanguageContextValue {
  language: SupportedLanguage;
  direction: "ltr" | "rtl";
  languages: readonly LanguageOption[];
  setLanguage: (language: SupportedLanguage) => void;
  t: (
    key: string,
    variables?: Record<string, string | number>,
  ) => string;
}

export const LanguageContext =
  createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * React adapter for the framework-independent Preferences Store.
 *
 * LanguageProvider does not own language state. It subscribes to
 * preferencesStore and exposes the existing language context API
 * to the React application.
 */
export function LanguageProvider({
  children,
}: LanguageProviderProps) {
  const preferencesSnapshot = useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getSnapshot,
    preferencesStore.getSnapshot,
  );

  const language =
    preferencesSnapshot.preferences.preferredLanguage;

  const direction =
    LanguageService.getDirection(language);

  const setLanguage = useCallback(
    (nextLanguage: SupportedLanguage) => {
      preferencesStore.updateLocal({
        preferredLanguage: nextLanguage,
      });
    },
    [],
  );

  const t = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
    ) =>
      LanguageService.translate(
        language,
        key,
        variables,
      ),
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction,
      languages: languageOptions,
      setLanguage,
      t,
    }),
    [language, direction, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
