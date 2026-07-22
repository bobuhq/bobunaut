import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Compass,
  LogIn,
  LogOut,
  Orbit,
  Radio,
  Rocket,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase";

const navItems = [
  ["/", "Orbit", Orbit],
  ["/command-deck", "Command Deck", Radio],
  ["/missions", "Missions", Rocket],
  ["/galaxy", "Galactic Map", Compass],
] as const;

const buboLogoUrl =
  `${import.meta.env.BASE_URL}images/bubo/bubo-default.png`;

export function Nav() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    console.log("LOGIN BUTTON CLICKED");

    const redirectUrl = new URL(
      import.meta.env.BASE_URL,
      window.location.origin,
    ).toString();

    const { data, error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

    console.log("Login result:", {
      data,
      error,
    });

    if (error) {
      alert(`Google giriş hatası: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    console.log("LOGOUT BUTTON CLICKED");

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    console.log("Logout result:", {
      error,
    });

    if (error) {
      alert(`Çıkış hatası: ${error.message}`);
      return;
    }

    setSession(null);
    window.location.href = import.meta.env.BASE_URL;
  };

  const user = session?.user;

  const avatarUrl = user?.user_metadata?.avatar_url as
    | string
    | undefined;

  const fullName =
    (user?.user_metadata?.full_name as
      | string
      | undefined) ||
    user?.email?.split("@")[0] ||
    "Commander";

  return (
    <header>
      <style>{`
        .brand-bubo-logo {
          position: relative;
          display: grid;
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(196, 181, 253, 0.38);
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(139, 92, 246, 0.36),
              rgba(11, 13, 29, 0.96) 72%
            );
          box-shadow:
            0 0 0 3px rgba(139, 92, 246, 0.08),
            0 0 22px rgba(139, 92, 246, 0.28),
            inset 0 0 14px rgba(103, 232, 249, 0.08);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .brand:hover .brand-bubo-logo {
          transform: translateY(-1px) scale(1.04);
          border-color: rgba(103, 232, 249, 0.58);
          box-shadow:
            0 0 0 4px rgba(139, 92, 246, 0.1),
            0 0 28px rgba(103, 232, 249, 0.24),
            0 0 34px rgba(139, 92, 246, 0.24);
        }

        .brand-bubo-logo::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 2;
          border-radius: inherit;
          pointer-events: none;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.18),
              transparent 32%,
              transparent 72%,
              rgba(103, 232, 249, 0.08)
            );
        }

        .brand-bubo-logo img {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
          object-position: center 32%;
          transform: scale(1.55);
          filter:
            saturate(1.08)
            contrast(1.05)
            brightness(1.06);
        }

        .brand-bubo-fallback {
          position: relative;
          z-index: 1;
          color: #ddd6fe;
          font-size: 20px;
          font-weight: 900;
          line-height: 1;
        }

        .brand-copy {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .brand-copy strong {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .brand-copy small {
          margin-top: 4px;
          color: rgba(196, 181, 253, 0.78);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.19em;
        }

        .brand-copy em {
          margin-top: 5px;
          color: rgba(170, 160, 187, 0.68);
          font-size: 7px;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.13em;
        }

        @media (max-width: 720px) {
          .brand-bubo-logo {
            width: 41px;
            height: 41px;
          }

          .brand-copy em {
            display: none;
          }
        }
      `}</style>

      <nav className="glass nav">
        <NavLink
          to="/"
          className="brand"
          aria-label="BOBU Universe home"
        >
          <span className="brand-bubo-logo">
            {!logoFailed ? (
              <img
                src={buboLogoUrl}
                alt="BOBU"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="brand-bubo-fallback">
                B
              </span>
            )}
          </span>

          <span className="brand-copy">
            <strong>BOBU</strong>
            <small>UNIVERSE</small>
            <em>BUILDING SPACE</em>
          </span>
        </NavLink>

        <div className="links">
          {navItems.map(([to, label, Icon]) => (
            <NavLink
              to={to}
              key={to}
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-account">
          {loading ? (
            <span className="auth-loading">
              ...
            </span>
          ) : user ? (
            <>
              <div className="nav-user">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="nav-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="nav-avatar nav-avatar-fallback">
                    {fullName
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}

                <span className="nav-user-name">
                  {fullName}
                </span>
              </div>

              <button
                type="button"
                className="nav-auth-button nav-logout-button"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="nav-auth-button"
              onClick={handleGoogleLogin}
            >
              <LogIn size={16} />
              <span>Sign in</span>
            </button>
          )}

          <em className="cycle-status">
            <i />
            Cycle 000001
          </em>
        </div>
      </nav>
    </header>
  );
}