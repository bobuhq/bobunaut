import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AdminAccessService } from "../../core/admin/AdminAccessService";
import { useAuthSession } from "../../core/auth/useAuthSession";
import { supabase } from "../../lib/supabase";
import "./AdminDashboard.css";

interface AdminLoginLocationState {
  from?: string;
}

function resolveAdminEmail(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();

  if (normalized.includes("@")) {
    return normalized;
  }

  const domain =
    import.meta.env.VITE_ADMIN_USERNAME_DOMAIN ||
    "admin.bobunaut.com";

  return `${normalized}@${domain}`;
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    authenticated,
    loading: authLoading,
  } = useAuthSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [checkingSession, setCheckingSession] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const state =
    location.state as AdminLoginLocationState | null;

  const destination = useMemo(() => {
    const requestedPath = state?.from;

    if (
      requestedPath &&
      requestedPath.startsWith("/admin") &&
      requestedPath !== "/admin/login"
    ) {
      return requestedPath;
    }

    return "/admin";
  }, [state?.from]);

  const expired =
    new URLSearchParams(location.search).get(
      "reason",
    ) === "expired";

  useEffect(() => {
    let mounted = true;

    if (authLoading || !authenticated) {
      return () => {
        mounted = false;
      };
    }

    setCheckingSession(true);

    void AdminAccessService.getMyAccess()
      .then((access) => {
        if (!mounted) {
          return;
        }

        if (access?.active) {
          navigate(destination, {
            replace: true,
          });
        }
      })
      .finally(() => {
        if (mounted) {
          setCheckingSession(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    authenticated,
    authLoading,
    destination,
    navigate,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedIdentifier =
      identifier.trim();

    if (!normalizedIdentifier || !password) {
      setError(
        "Enter your administrator username and password.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const email = resolveAdminEmail(
        normalizedIdentifier,
      );

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        throw new Error(
          "Invalid administrator credentials.",
        );
      }

      const access =
        await AdminAccessService.getMyAccess();

      if (!access?.active) {
        await supabase.auth.signOut();

        throw new Error(
          "This account does not have active Control Center access.",
        );
      }

      navigate(destination, {
        replace: true,
      });
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in to the Control Center.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || checkingSession) {
    return (
      <main className="admin-login">
        <div className="admin-login__loading">
          <LoaderCircle size={24} />
          <span>Verifying command authority…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-login">
      <div className="admin-login__stars" />

      <section className="admin-login__panel">
        <header className="admin-login__header">
          <div className="admin-login__mark">
            B
          </div>

          <div>
            <span>BOBU UNIVERSE</span>
            <h1>Control Center</h1>
            <p>
              Secure administrator authentication
            </p>
          </div>
        </header>

        <div className="admin-login__security">
          <ShieldCheck size={18} />

          <div>
            <strong>Protected authority gateway</strong>
            <span>
              Credentials are verified by Supabase Auth
            </span>
          </div>
        </div>

        {expired ? (
          <div className="admin-login__notice">
            Your administrator session expired after
            30 minutes of inactivity. Sign in again.
          </div>
        ) : null}

        {error ? (
          <div
            className="admin-login__error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <form
          className="admin-login__form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>Username or email</span>

            <div className="admin-login__input">
              <KeyRound size={18} />

              <input
                type="text"
                value={identifier}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Administrator username"
                disabled={submitting}
                onChange={(event) =>
                  setIdentifier(event.target.value)
                }
              />
            </div>
          </label>

          <label>
            <span>Password</span>

            <div className="admin-login__input">
              <LockKeyhole size={18} />

              <input
                type={
                  showPassword ? "text" : "password"
                }
                value={password}
                autoComplete="current-password"
                placeholder="Administrator password"
                disabled={submitting}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
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

          <button
            type="submit"
            className="admin-login__submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <LoaderCircle size={18} />
                Verifying authority…
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <footer className="admin-login__footer">
          <LockKeyhole size={14} />
          <span>
            BOBU Control Center · Secure Session
          </span>
        </footer>
      </section>
    </main>
  );
}
