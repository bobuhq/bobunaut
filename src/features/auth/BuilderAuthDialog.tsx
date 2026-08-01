import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  X,
} from "lucide-react";

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

const getRedirectUrl = (): string =>
  new URL(
    import.meta.env.BASE_URL,
    window.location.origin,
  ).toString();

export default function BuilderAuthDialog({
  open,
  onClose,
}: BuilderAuthDialogProps) {
  const [mode, setMode] =
    useState<AuthMode>("sign-in");

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

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
          redirectTo: getRedirectUrl(),
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

    if (
      mode !== "forgot-password" &&
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
              emailRedirectTo: getRedirectUrl(),
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
            redirectTo: getRedirectUrl(),
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
                    showPassword
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
                    setShowPassword(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
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
            disabled={busy}
          >
            {busy && (
              <LoaderCircle
                className="builder-auth-spinner"
                size={18}
              />
            )}

            {mode === "sign-up"
              ? "Create Account"
              : mode === "forgot-password"
                ? "Send Recovery Link"
                : "Sign In"}
          </button>
        </form>

        <footer className="builder-auth-footer">
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
