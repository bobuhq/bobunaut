import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useLanguage } from "../../core/language";
import { supabase } from "../../lib/supabase";
import "./BuilderAuthDialog.css";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password";

type BuilderAuthDialogProps = {
  open: boolean;
  onClose: () => void;
};

const getAppUrl = (): string =>
  new URL(
    import.meta.env.BASE_URL,
    window.location.origin,
  ).toString();

const normalizeBuilderName = (
  value: string,
): string =>
  value.trim().replace(/\s+/g, " ");

export default function BuilderAuthDialog({
  open,
  onClose,
}: BuilderAuthDialogProps) {
  const { t } = useLanguage();
  const [mode, setMode] =
    useState<AuthMode>("sign-in");

  const [builderName, setBuilderName] =
    useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPasswords, setShowPasswords] =
    useState(false);

  const [legalAccepted, setLegalAccepted] =
    useState(false);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const passwordRules = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    }),
    [password],
  );

  const passwordRuleCount =
    Object.values(passwordRules).filter(Boolean)
      .length;

  const passwordStrong =
    Object.values(passwordRules).every(Boolean);

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const normalizedBuilderName =
    normalizeBuilderName(builderName);

  const builderNameValid =
    normalizedBuilderName.length >= 3 &&
    normalizedBuilderName.length <= 32;

  const signUpReady =
    builderNameValid &&
    email.trim().length > 0 &&
    passwordStrong &&
    passwordsMatch &&
    legalAccepted;

  const passwordStrength =
    passwordRuleCount <= 2
      ? "weak"
      : passwordRuleCount <= 4
        ? "medium"
        : "strong";

  const passwordStrengthLabel =
    passwordStrength === "weak"
      ? t("auth.dialog.password.weak")
      : passwordStrength === "medium"
        ? t("auth.dialog.password.medium")
        : t("auth.dialog.password.strong");

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow = "";

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open, onClose]);

  useEffect(() => {
    setMessage(null);
    setErrorMessage(null);
    setConfirmPassword("");
    setShowPasswords(false);
    setLegalAccepted(false);
  }, [mode]);

  if (!open) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setBusy(true);
    setErrorMessage(null);
    setMessage(null);

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAppUrl(),
        },
      });

    if (error) {
      setErrorMessage(error.message);
      setBusy(false);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        t("auth.dialog.validation.emailRequired"),
      );
      return;
    }

    if (mode === "sign-up") {
      if (!builderNameValid) {
        setErrorMessage(
          t("auth.dialog.validation.builderName"),
        );
        return;
      }

      if (!passwordStrong) {
        setErrorMessage(
          t(
            "auth.dialog.validation.strongPassword",
          ),
        );
        return;
      }

      if (!passwordsMatch) {
        setErrorMessage(
          t(
            "auth.dialog.validation.passwordMismatch",
          ),
        );
        return;
      }

      if (!legalAccepted) {
        setErrorMessage(
          t("auth.dialog.validation.legalRequired"),
        );
        return;
      }
    }

    if (
      mode === "sign-in" &&
      password.length < 8
    ) {
      setErrorMessage(
        t(
          "auth.dialog.validation.passwordMinimum",
        ),
      );
      return;
    }

    setBusy(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (mode === "sign-in") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (error) {
          throw error;
        }

        onClose();
        return;
      }

      if (mode === "sign-up") {
        const { data, error } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: getAppUrl(),
              data: {
                display_name:
                  normalizedBuilderName,
                full_name:
                  normalizedBuilderName,
                builder_name:
                  normalizedBuilderName,
              },
            },
          });

        if (error) {
          throw error;
        }

        if (data.session) {
          onClose();
          return;
        }

        setMessage(
          t("auth.dialog.message.accountCreated"),
        );
        return;
      }

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: new URL(
              "reset-password",
              getAppUrl(),
            ).toString(),
          },
        );

      if (error) {
        throw error;
      }

      setMessage(
        t("auth.dialog.message.recoverySent"),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(
              "auth.dialog.validation.authenticationFailed",
            ),
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "sign-up"
      ? t("auth.dialog.title.signUp")
      : mode === "forgot-password"
        ? t("auth.dialog.title.recovery")
        : t("auth.dialog.title.signIn");

  const description =
    mode === "sign-up"
      ? t("auth.dialog.description.signUp")
      : mode === "forgot-password"
        ? t("auth.dialog.description.recovery")
        : t("auth.dialog.description.signIn");

  return (
    <div
      className="builder-auth-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="builder-auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-auth-title"
      >
        <button
          type="button"
          className="builder-auth-close"
          onClick={onClose}
          aria-label={t("auth.dialog.closeAria")}
        >
          <X size={19} />
        </button>

        <header className="builder-auth-header">
          <div className="builder-auth-emblem">
            <img
              src="/images/galaxy/bobu-builder-space.webp"
              alt=""
            />
          </div>

          <span className="builder-auth-eyebrow">
            {t("auth.dialog.eyebrow")}
          </span>

          <h2 id="builder-auth-title">
            {title}
          </h2>

          <p>{description}</p>
        </header>

        {mode !== "forgot-password" && (
          <>
            <button
              type="button"
              className="builder-auth-google"
              onClick={() =>
                void handleGoogleLogin()
              }
              disabled={busy}
            >
              <span className="builder-auth-google-mark">
                G
              </span>

              {t("auth.dialog.google")}
            </button>

            <div className="builder-auth-divider">
              <span>
                {t("auth.dialog.emailDivider")}
              </span>
            </div>
          </>
        )}

        <form
          className="builder-auth-form"
          onSubmit={(event) =>
            void handleSubmit(event)
          }
        >
          {mode === "sign-up" && (
            <label>
              <span>
                {t("auth.dialog.builderName.label")}
              </span>

              <div className="builder-auth-input">
                <UserRound size={17} />

                <input
                  type="text"
                  value={builderName}
                  autoComplete="nickname"
                  placeholder={t(
                    "auth.dialog.builderName.placeholder",
                  )}
                  minLength={3}
                  maxLength={32}
                  onChange={(event) =>
                    setBuilderName(
                      event.target.value,
                    )
                  }
                  disabled={busy}
                  required
                />
              </div>

              {builderName.length > 0 && (
                <small
                  className={
                    builderNameValid
                      ? "builder-auth-field-state is-valid"
                      : "builder-auth-field-state is-invalid"
                  }
                >
                  {builderNameValid ? (
                    <CircleCheck size={13} />
                  ) : (
                    <CircleX size={13} />
                  )}

                  {builderNameValid
                    ? t(
                        "auth.dialog.builderName.ready",
                      )
                    : t(
                        "auth.dialog.builderName.invalid",
                      )}
                </small>
              )}
            </label>
          )}

          <label>
            <span>
              {t("auth.dialog.email.label")}
            </span>

            <div className="builder-auth-input">
              <Mail size={17} />

              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder={t(
                  "auth.dialog.email.placeholder",
                )}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                disabled={busy}
                required
              />
            </div>
          </label>

          {mode !== "forgot-password" && (
            <label>
              <span>
                {t("auth.dialog.password.label")}
              </span>

              <div className="builder-auth-input">
                <LockKeyhole size={17} />

                <input
                  type={
                    showPasswords
                      ? "text"
                      : "password"
                  }
                  value={password}
                  autoComplete={
                    mode === "sign-up"
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder={t(
                    "auth.dialog.password.placeholder",
                  )}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  disabled={busy}
                  required
                />

                <button
                  type="button"
                  className="builder-auth-password-toggle"
                  onClick={() =>
                    setShowPasswords(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showPasswords
                      ? t(
                          "auth.dialog.password.hide",
                        )
                      : t(
                          "auth.dialog.password.show",
                        )
                  }
                >
                  {showPasswords ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>

              {mode === "sign-up" &&
                password.length > 0 && (
                  <div className="builder-auth-strength">
                    <div className="builder-auth-strength-heading">
                      <span>
                        {t(
                          "auth.dialog.password.strength",
                        )}
                      </span>

                      <strong
                        className={`strength-${passwordStrength}`}
                      >
                        {passwordStrengthLabel}
                      </strong>
                    </div>

                    <div className="builder-auth-strength-bars">
                      {[1, 2, 3, 4, 5].map(
                        (bar) => (
                          <span
                            key={bar}
                            className={
                              bar <=
                              passwordRuleCount
                                ? "is-active"
                                : ""
                            }
                          />
                        ),
                      )}
                    </div>

                    <div className="builder-auth-password-rules">
                      {[
                        [
                          passwordRules.length,
                          t(
                            "auth.dialog.password.ruleLength",
                          ),
                        ],
                        [
                          passwordRules.uppercase,
                          t(
                            "auth.dialog.password.ruleUppercase",
                          ),
                        ],
                        [
                          passwordRules.lowercase,
                          t(
                            "auth.dialog.password.ruleLowercase",
                          ),
                        ],
                        [
                          passwordRules.number,
                          t(
                            "auth.dialog.password.ruleNumber",
                          ),
                        ],
                        [
                          passwordRules.symbol,
                          t(
                            "auth.dialog.password.ruleSymbol",
                          ),
                        ],
                      ].map(([valid, label]) => (
                        <span
                          key={String(label)}
                          className={
                            valid ? "is-valid" : ""
                          }
                        >
                          {valid ? (
                            <CircleCheck size={13} />
                          ) : (
                            <CircleX size={13} />
                          )}

                          {String(label)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </label>
          )}

          {mode === "sign-up" && (
            <label>
              <span>
                {t(
                  "auth.dialog.confirmPassword.label",
                )}
              </span>

              <div className="builder-auth-input">
                <LockKeyhole size={17} />

                <input
                  type={
                    showPasswords
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  autoComplete="new-password"
                  placeholder={t(
                    "auth.dialog.confirmPassword.placeholder",
                  )}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  disabled={busy}
                  required
                />

                <button
                  type="button"
                  className="builder-auth-password-toggle"
                  onClick={() =>
                    setShowPasswords(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showPasswords
                      ? t(
                          "auth.dialog.password.hide",
                        )
                      : t(
                          "auth.dialog.password.show",
                        )
                  }
                >
                  {showPasswords ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <small
                  className={
                    passwordsMatch
                      ? "builder-auth-field-state is-valid"
                      : "builder-auth-field-state is-invalid"
                  }
                >
                  {passwordsMatch ? (
                    <CircleCheck size={13} />
                  ) : (
                    <CircleX size={13} />
                  )}

                  {passwordsMatch
                    ? t(
                        "auth.dialog.confirmPassword.match",
                      )
                    : t(
                        "auth.dialog.confirmPassword.noMatch",
                      )}
                </small>
              )}
            </label>
          )}

          {mode === "sign-up" && (
            <label className="builder-auth-legal">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) =>
                  setLegalAccepted(
                    event.target.checked,
                  )
                }
                disabled={busy}
                required
              />

              <span className="builder-auth-legal-box">
                {legalAccepted && (
                  <CircleCheck size={15} />
                )}
              </span>

              <span>
                {t(
                  "auth.dialog.legal.prefix",
                )}{" "}
                <Link
                  to="/terms"
                  onClick={onClose}
                >
                  {t("auth.dialog.legal.terms")}
                </Link>{" "}
                {t("auth.dialog.legal.and")}{" "}
                <Link
                  to="/privacy"
                  onClick={onClose}
                >
                  {t("auth.dialog.legal.privacy")}
                </Link>
                .
              </span>
            </label>
          )}

          {errorMessage && (
            <p className="builder-auth-message is-error">
              {errorMessage}
            </p>
          )}

          {message && (
            <p className="builder-auth-message is-success">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="builder-auth-submit"
            disabled={
              busy ||
              (
                mode === "sign-up" &&
                !signUpReady
              )
            }
          >
            {busy && (
              <LoaderCircle
                className="builder-auth-spinner"
                size={18}
              />
            )}

            {mode === "sign-up"
              ? t("auth.dialog.submit.signUp")
              : mode === "forgot-password"
                ? t("auth.dialog.submit.recovery")
                : t("auth.dialog.submit.signIn")}
          </button>

          {mode === "sign-up" &&
            !signUpReady && (
              <p className="builder-auth-submit-help">
                {t("auth.dialog.submit.help")}
              </p>
            )}
        </form>

        <footer className="builder-auth-footer">
          <span className="builder-auth-security-note">
            <ShieldCheck size={14} />
            {t("auth.dialog.securityNote")}
          </span>

          {mode === "sign-in" && (
            <>
              <button
                type="button"
                onClick={() =>
                  setMode("forgot-password")
                }
              >
                {t(
                  "auth.dialog.footer.forgotPassword",
                )}
              </button>

              <span>
                {t(
                  "auth.dialog.footer.newToBobu",
                )}
                <button
                  type="button"
                  onClick={() =>
                    setMode("sign-up")
                  }
                >
                  {t(
                    "auth.dialog.footer.createAccount",
                  )}
                </button>
              </span>
            </>
          )}

          {mode === "sign-up" && (
            <span>
              {t(
                "auth.dialog.footer.alreadyBuilder",
              )}
              <button
                type="button"
                onClick={() =>
                  setMode("sign-in")
                }
              >
                {t(
                  "auth.dialog.footer.signIn",
                )}
              </button>
            </span>
          )}

          {mode === "forgot-password" && (
            <button
              type="button"
              onClick={() =>
                setMode("sign-in")
              }
            >
              {t(
                "auth.dialog.footer.returnToSignIn",
              )}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
