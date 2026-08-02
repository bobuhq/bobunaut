import {
  languageOptions,
  supportedLanguages,
  type SupportedLanguage,
  type TranslationDictionary,
} from "./types";
import { en } from "./locales/en";

const STORAGE_KEY = "bobu.preferred-language";
const DEFAULT_LANGUAGE: SupportedLanguage = "en";

type LocaleLoader =
  () => Promise<TranslationDictionary>;

const loadedDictionaries: Partial<
  Record<SupportedLanguage, TranslationDictionary>
> = {
  en,
};

const pendingLoads: Partial<
  Record<SupportedLanguage, Promise<TranslationDictionary>>
> = {};

const localeLoaders: Partial<
  Record<SupportedLanguage, LocaleLoader>
> = {
  tr: async () => {
    const module = await import("./locales/tr");
    return module.tr;
  },

  fi: async () => {
    const module = await import("./locales/fi");
    return module.fi;
  },

  sv: async () => {
    const module = await import("./locales/sv");
    return module.sv;
  },

  de: async () => {
    const module = await import("./locales/de");
    return module.de;
  },

  fr: async () => {
    const module = await import("./locales/fr");
    return module.fr;
  },

  es: async () => {
    const module = await import("./locales/es");
    return module.es;
  },

  pt: async () => {
    const module = await import("./locales/pt");
    return module.pt;
  },

  ar: async () => {
    const module = await import("./locales/ar");
    return module.ar;
  },

  ru: async () => {
    const module = await import("./locales/ru");
    return module.ru;
  },

  zh: async () => {
    const module = await import("./locales/zh");
    return module.zh;
  },

  ja: async () => {
    const module = await import("./locales/ja");
    return module.ja;
  },

  ko: async () => {
    const module = await import("./locales/ko");
    return module.ko;
  },
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
      result.replaceAll(
        `{{${key}}}`,
        String(value),
      ),
    template,
  );
}

async function loadLanguage(
  language: SupportedLanguage,
): Promise<TranslationDictionary> {
  const loaded = loadedDictionaries[language];

  if (loaded) {
    return loaded;
  }

  const pending = pendingLoads[language];

  if (pending) {
    return pending;
  }

  const loader = localeLoaders[language];

  if (!loader) {
    return en;
  }

  const request = loader()
    .then((dictionary) => {
      loadedDictionaries[language] = dictionary;
      delete pendingLoads[language];

      return dictionary;
    })
    .catch((error: unknown) => {
      delete pendingLoads[language];
      throw error;
    });

  pendingLoads[language] = request;

  return request;
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

  storeLanguage(
    language: SupportedLanguage,
  ): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        language,
      );
    } catch {
      // The application continues when storage is blocked.
    }
  },

  resolveInitialLanguage(): SupportedLanguage {
    return (
      this.getStoredLanguage() ??
      this.detectBrowserLanguage() ??
      DEFAULT_LANGUAGE
    );
  },

  isLanguageLoaded(
    language: SupportedLanguage,
  ): boolean {
    return Boolean(loadedDictionaries[language]);
  },

  loadLanguage,

  translate(
    language: SupportedLanguage,
    key: string,
    variables?: Record<string, string | number>,
  ): string {
    const translatedValue =
      loadedDictionaries[language]?.[key] ??
      en[key] ??
      key;

    return interpolate(
      translatedValue,
      variables,
    );
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
