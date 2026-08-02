export const supportedLanguages = [
  "en",
  "tr",
  "fi",
  "sv",
  "de",
  "fr",
  "es",
  "pt",
  "ar",
  "ru",
  "zh",
  "ja",
  "ko",
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
    code: "fi",
    label: "Finnish",
    nativeLabel: "Suomi",
    direction: "ltr",
  },
  {
    code: "sv",
    label: "Swedish",
    nativeLabel: "Svenska",
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
    code: "ru",
    label: "Russian",
    nativeLabel: "Русский",
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
    code: "ko",
    label: "Korean",
    nativeLabel: "한국어",
    direction: "ltr",
  },
  {
    code: "pt",
    label: "Portuguese",
    nativeLabel: "Português",
    direction: "ltr",
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    direction: "rtl",
  },
];
