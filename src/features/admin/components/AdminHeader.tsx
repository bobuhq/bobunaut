import {
  Bell,
  Check,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../../lib/supabase";

type AdminHeaderProps = {
  role: string;
  email: string | null;
  onMenuToggle: () => void;
};

export function AdminHeader({
  role,
  email,
  onMenuToggle,
}: AdminHeaderProps) {
  const navigate = useNavigate();

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const [menuOpen, setMenuOpen] =
    useState(false);
  const [passwordOpen, setPasswordOpen] =
    useState(false);
  const [password, setPassword] =
    useState("");
  const [passwordConfirm, setPasswordConfirm] =
    useState("");
  const [passwordError, setPasswordError] =
    useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] =
    useState(false);
  const [savingPassword, setSavingPassword] =
    useState(false);
  const [signingOut, setSigningOut] =
    useState(false);

  useEffect(() => {
    function handleDocumentClick(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleDocumentClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentClick,
      );
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/admin/login", {
        replace: true,
      });
    }
  }

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPasswordError(null);
    setPasswordSaved(false);

    if (password.length < 12) {
      setPasswordError(
        "Use at least 12 characters.",
      );
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordError(
        "Password confirmation does not match.",
      );
      return;
    }

    setSavingPassword(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setPassword("");
      setPasswordConfirm("");
      setPasswordSaved(true);

      window.setTimeout(() => {
        setPasswordSaved(false);
        setPasswordOpen(false);
      }, 1_500);
    } catch (caughtError: unknown) {
      setPasswordError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <button
          type="button"
          className="admin-header__menu"
          aria-label="Open admin navigation"
          onClick={onMenuToggle}
        >
          <Menu size={21} />
        </button>

        <div>
          <span>BOBU UNIVERSE</span>
          <strong>Operational Command</strong>
        </div>
      </div>

      <div className="admin-header__actions">
        <button
          type="button"
          className="admin-header__notification"
          aria-label="Notifications"
          title="Notification Center is next"
          disabled
        >
          <Bell size={18} />
        </button>

        <div
          ref={menuRef}
          className="admin-header__profile"
        >
          <button
            type="button"
            className="admin-header__authority"
            aria-expanded={menuOpen}
            onClick={() =>
              setMenuOpen(
                (current) => !current,
              )
            }
          >
            <ShieldCheck size={17} />

            <div>
              <span>Verified authority</span>
              <strong>
                {role.toUpperCase()}
              </strong>
            </div>

            <ChevronDown size={15} />
          </button>

          {menuOpen ? (
            <div className="admin-header__dropdown">
              <div className="admin-header__identity">
                <UserRound size={18} />

                <div>
                  <strong>
                    {role.toUpperCase()}
                  </strong>
                  <span>
                    {email ??
                      "Authenticated administrator"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPasswordOpen(true);
                  setMenuOpen(false);
                }}
              >
                <KeyRound size={16} />
                Change password
              </button>

              <button
                type="button"
                className="admin-header__logout"
                disabled={signingOut}
                onClick={() =>
                  void handleSignOut()
                }
              >
                <LogOut size={16} />
                {signingOut
                  ? "Signing out…"
                  : "Sign out"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {passwordOpen ? (
        <div
          className="admin-password__backdrop"
          role="presentation"
          onClick={() =>
            setPasswordOpen(false)
          }
        >
          <section
            className="admin-password"
            role="dialog"
            aria-modal="true"
            aria-label="Change administrator password"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>SECURE CREDENTIALS</span>
                <strong>Change password</strong>
              </div>

              <button
                type="button"
                aria-label="Close password dialog"
                onClick={() =>
                  setPasswordOpen(false)
                }
              >
                <X size={18} />
              </button>
            </header>

            <form
              onSubmit={handlePasswordChange}
            >
              <label>
                <span>New password</span>
                <input
                  type="password"
                  value={password}
                  minLength={12}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  value={passwordConfirm}
                  minLength={12}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswordConfirm(
                      event.target.value,
                    )
                  }
                />
              </label>

              {passwordError ? (
                <p className="admin-password__error">
                  {passwordError}
                </p>
              ) : null}

              {passwordSaved ? (
                <p className="admin-password__success">
                  <Check size={15} />
                  Password updated securely.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={savingPassword}
              >
                <KeyRound size={17} />
                {savingPassword
                  ? "Updating…"
                  : "Update password"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </header>
  );
}
