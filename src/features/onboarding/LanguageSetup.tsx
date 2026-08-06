import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  Globe2,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  useLanguage,
  type SupportedLanguage,
} from "../../core/language";
import {
  preferencesService,
  usePreferences,
} from "../../core/preferences";

import "./LanguageSetup.css";

export default function LanguageSetup() {
  const navigate = useNavigate();

  const {
    language,
    languages,
    setLanguage,
    t,
  } = useLanguage();

  const preferences = usePreferences();

  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>(language);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const selectedOption = useMemo(
    () =>
      languages.find(
        (option) =>
          option.code === selectedLanguage,
      ) ?? languages[0],
    [languages, selectedLanguage],
  );

  const handleSelect = (
    nextLanguage: SupportedLanguage,
  ) => {
    setErrorMessage(null);
    setSelectedLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  const handleConfirm = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await preferencesService.update({
        preferredLanguage: selectedLanguage,
        languageSetupCompleted: true,
      });

      navigate("/", { replace: true });
    } catch (error) {
      console.error(
        "Language setup could not be completed:",
        error,
      );

      setErrorMessage(
        t("onboarding.language.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="language-setup-page">
      <div className="language-setup-stars" />

      <section className="language-setup-panel">
        <div className="language-setup-emblem">
          <Globe2 size={34} />
        </div>

        <span className="language-setup-eyebrow">
          {t("onboarding.language.eyebrow")}
        </span>

        <h1>{t("onboarding.language.title")}</h1>

        <p className="language-setup-description">
          {t("onboarding.language.description")}
        </p>

        <div className="language-setup-detected">
          <span>
            {t("onboarding.language.detected")}
          </span>

          <strong>
            {selectedOption.nativeLabel}
          </strong>
        </div>

        <div
          className="language-setup-grid"
          role="radiogroup"
          aria-label={t("language.selectorLabel")}
        >
          {languages.map((option) => {
            const selected =
              option.code === selectedLanguage;

            return (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={selected}
                className={
                  selected
                    ? "language-setup-option is-selected"
                    : "language-setup-option"
                }
                onClick={() =>
                  handleSelect(option.code)
                }
                disabled={saving}
              >
                <span>
                  <strong>
                    {option.nativeLabel}
                  </strong>

                  <small>{option.label}</small>
                </span>

                {selected && <Check size={18} />}
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <p
            className="language-setup-message is-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {preferences.isSaving && !errorMessage && (
          <p className="language-setup-message">
            {t("onboarding.language.saving")}
          </p>
        )}

        <button
          type="button"
          className="language-setup-confirm"
          onClick={() => void handleConfirm()}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle
              size={18}
              className="language-setup-spinner"
            />
          ) : (
            <Check size={18} />
          )}

          {saving
            ? t("onboarding.language.saving")
            : t("onboarding.language.confirm")}
        </button>
      </section>
    </main>
  );
}
