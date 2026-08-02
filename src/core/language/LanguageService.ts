import {
  languageOptions,
  supportedLanguages,
  type SupportedLanguage,
  type TranslationDictionary,
} from "./types";
import { en } from "./locales/en";
import { tr } from "./locales/tr";
import { fi } from "./locales/fi";
import { sv } from "./locales/sv";
import { de } from "./locales/de";
import { fr } from "./locales/fr";
import { es } from "./locales/es";
import { pt } from "./locales/pt";
import { ar } from "./locales/ar";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";

const STORAGE_KEY = "bobu.preferred-language";
const DEFAULT_LANGUAGE: SupportedLanguage = "en";

const dictionaries: Record<
  SupportedLanguage,
  TranslationDictionary
> = {
  en,
  tr,
  fi,
  sv,
  de,
  fr,
  es,
  pt,
  ar,
  ru,
  zh,
  ja,
  ko,
};

function isSupportedLanguage(
  value: string | null | undefined,
): value is SupportedLanguage {
  return Boolean(
    value &&
      supportedLanguages.includes(
        value as SupportedLanguage,
      ),
  );
}

function normalizeLanguage(
  value: string | null | undefined,
): SupportedLanguage | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .split("-")[0];

  return isSupportedLanguage(normalized)
    ? normalized
    : null;
}

function interpolate(
  template: string,
  variables?: Record<string, string | number>,
): string {
  if (!variables) {
    return template;
  }

  return Object.entries(variables).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export const LanguageService = {
  defaultLanguage: DEFAULT_LANGUAGE,

  detectBrowserLanguage(): SupportedLanguage {
    if (typeof navigator === "undefined") {
      return DEFAULT_LANGUAGE;
    }

    const candidates = [
      ...(navigator.languages ?? []),
      navigator.language,
    ];

    for (const candidate of candidates) {
      const language = normalizeLanguage(candidate);

      if (language) {
        return language;
      }
    }

    return DEFAULT_LANGUAGE;
  },

  getStoredLanguage(): SupportedLanguage | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return normalizeLanguage(
        window.localStorage.getItem(STORAGE_KEY),
      );
    } catch {
      return null;
    }
  },

  storeLanguage(language: SupportedLanguage): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        language,
      );
    } catch {
      // The application continues even when storage is blocked.
    }
  },

  resolveInitialLanguage(): SupportedLanguage {
    return (
      this.getStoredLanguage() ??
      this.detectBrowserLanguage() ??
      DEFAULT_LANGUAGE
    );
  },

  translate(
    language: SupportedLanguage,
    key: string,
    variables?: Record<string, string | number>,
  ): string {
    const translatedValue =
      dictionaries[language][key] ??
      dictionaries[DEFAULT_LANGUAGE][key] ??
      key;

    return interpolate(translatedValue, variables);
  },

  getDirection(
    language: SupportedLanguage,
  ): "ltr" | "rtl" {
    return (
      languageOptions.find(
        (option) => option.code === language,
      )?.direction ?? "ltr"
    );
  },
};
