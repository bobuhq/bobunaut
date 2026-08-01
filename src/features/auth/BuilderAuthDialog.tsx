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

  const passwordStrengthLabel =
    passwordRuleCount <= 2
      ? "Weak"
      : passwordRuleCount <= 4
        ? "Medium"
        : "Strong";

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
        "Enter your email address.",
      );
      return;
    }

    if (mode === "sign-up") {
      if (!builderNameValid) {
        setErrorMessage(
          "Builder Name must contain between 3 and 32 characters.",
        );
        return;
      }

      if (!passwordStrong) {
        setErrorMessage(
          "Password must include uppercase and lowercase letters, a number, a symbol, and at least 8 characters.",
        );
        return;
      }

      if (!passwordsMatch) {
        setErrorMessage(
          "Passwords do not match.",
        );
        return;
      }

      if (!legalAccepted) {
        setErrorMessage(
          "You must accept the Terms of Service and Privacy Policy.",
        );
        return;
      }
    }

    if (
      mode === "sign-in" &&
      password.length < 8
    ) {
      setErrorMessage(
        "Password must contain at least 8 characters.",
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
          "Account created. Check your email to confirm your BOBU account.",
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
        "Password recovery instructions were sent to your email.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Authentication could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "sign-up"
      ? "Create Builder Account"
      : mode === "forgot-password"
        ? "Recover Account"
        : "Enter BOBU Universe";

  const description =
    mode === "sign-up"
      ? "Create your secure Builder identity."
      : mode === "forgot-password"
        ? "Receive a secure password recovery link."
        : "Continue your journey across BOBU Universe.";

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
          aria-label="Close authentication window"
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
            Builder Identity Gateway
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

              Continue with Google
            </button>

            <div className="builder-auth-divider">
              <span>or continue with email</span>
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
              <span>Builder Name</span>

              <div className="builder-auth-input">
                <UserRound size={17} />

                <input
                  type="text"
                  value={builderName}
                  autoComplete="nickname"
                  placeholder="Choose your Builder identity"
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
                    ? "Builder Name is ready."
                    : "Use between 3 and 32 characters."}
                </small>
              )}
            </label>
          )}

          <label>
            <span>Email address</span>

            <div className="builder-auth-input">
              <Mail size={17} />

              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder="builder@example.com"
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
              <span>Password</span>

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
                  placeholder="Minimum 8 characters"
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
                      ? "Hide passwords"
                      : "Show passwords"
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
                      <span>Password strength</span>

                      <strong
                        className={`strength-${passwordStrengthLabel.toLowerCase()}`}
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
                          "At least 8 characters",
                        ],
                        [
                          passwordRules.uppercase,
                          "Uppercase letter",
                        ],
                        [
                          passwordRules.lowercase,
                          "Lowercase letter",
                        ],
                        [
                          passwordRules.number,
                          "Number",
                        ],
                        [
                          passwordRules.symbol,
                          "Special character",
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
              <span>Confirm password</span>

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
                  placeholder="Enter password again"
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
                      ? "Hide passwords"
                      : "Show passwords"
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
                    ? "Passwords match."
                    : "Passwords do not match."}
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
                I have read and agree to the{" "}
                <Link
                  to="/terms"
                  onClick={onClose}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  onClick={onClose}
                >
                  Privacy Policy
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
              ? "Create Builder Account"
              : mode === "forgot-password"
                ? "Send Recovery Link"
                : "Sign In"}
          </button>

          {mode === "sign-up" &&
            !signUpReady && (
              <p className="builder-auth-submit-help">
                Complete all required security
                fields to create your account.
              </p>
            )}
        </form>

        <footer className="builder-auth-footer">
          <span className="builder-auth-security-note">
            <ShieldCheck size={14} />
            Secured by BOBU Identity Gateway
          </span>

          {mode === "sign-in" && (
            <>
              <button
                type="button"
                onClick={() =>
                  setMode("forgot-password")
                }
              >
                Forgot password?
              </button>

              <span>
                New to BOBU?
                <button
                  type="button"
                  onClick={() =>
                    setMode("sign-up")
                  }
                >
                  Create account
                </button>
              </span>
            </>
          )}

          {mode === "sign-up" && (
            <span>
              Already a Builder?
              <button
                type="button"
                onClick={() =>
                  setMode("sign-in")
                }
              >
                Sign in
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
              Return to sign in
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
