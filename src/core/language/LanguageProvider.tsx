import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  setLanguage: (
    language: SupportedLanguage,
  ) => void;
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
 * English remains synchronously available as the production
 * fallback. Other locale dictionaries are loaded only when
 * selected or restored from the user's preferences.
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

  const [dictionaryVersion, setDictionaryVersion] =
    useState(0);

  const languageRequestId = useRef(0);

  const direction =
    LanguageService.getDirection(language);

  const setLanguage = useCallback(
    (nextLanguage: SupportedLanguage) => {
      const requestId =
        languageRequestId.current + 1;

      languageRequestId.current = requestId;

      void LanguageService
        .loadLanguage(nextLanguage)
        .then(() => {
          if (
            languageRequestId.current !== requestId
          ) {
            return;
          }

          preferencesStore.updateLocal({
            preferredLanguage: nextLanguage,
          });
        })
        .catch((error: unknown) => {
          console.error(
            `Failed to load ${nextLanguage} locale:`,
            error,
          );
        });
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void LanguageService
      .loadLanguage(language)
      .then(() => {
        if (!active) {
          return;
        }

        setDictionaryVersion(
          (currentVersion) =>
            currentVersion + 1,
        );
      })
      .catch((error: unknown) => {
        console.error(
          `Failed to restore ${language} locale:`,
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [language]);

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
    [language, dictionaryVersion],
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
    [
      language,
      direction,
      setLanguage,
      t,
    ],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
