export const supportedLanguages = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "zh",
  "ja",
  "ar",
] as const;

export type SupportedLanguage =
  (typeof supportedLanguages)[number];

export type TranslationDictionary =
  Readonly<Record<string, string>>;

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  direction: "ltr" | "rtl";
}

export const languageOptions: readonly LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    direction: "ltr",
  },
  {
    code: "tr",
    label: "Turkish",
    nativeLabel: "Türkçe",
    direction: "ltr",
  },
  {
    code: "de",
    label: "German",
    nativeLabel: "Deutsch",
    direction: "ltr",
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    direction: "ltr",
  },
  {
    code: "es",
    label: "Spanish",
    nativeLabel: "Español",
    direction: "ltr",
  },
  {
    code: "zh",
    label: "Chinese",
    nativeLabel: "中文",
    direction: "ltr",
  },
  {
    code: "ja",
    label: "Japanese",
    nativeLabel: "日本語",
    direction: "ltr",
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    direction: "rtl",
  },
];
