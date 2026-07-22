import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Compass,
  LogIn,
  LogOut,
  Menu,
  Orbit,
  Radio,
  Rocket,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase";

const navItems = [
  {
    to: "/",
    label: "Orbit",
    icon: Orbit,
  },
  {
    to: "/command-deck",
    label: "Command Deck",
    icon: Radio,
  },
  {
    to: "/missions",
    label: "Missions",
    icon: Rocket,
  },
  {
    to: "/galaxy",
    label: "Galactic Map",
    icon: Compass,
  },
] as const;

const baseUrl = import.meta.env.BASE_URL;

const buboLogoUrl = `${baseUrl}images/bubo/bubo-logo.png`;
const buboFallbackUrl = `${baseUrl}images/bubo/bubo-default.png`;

export function Nav() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoSource, setLogoSource] = useState(buboLogoUrl);
  const [logoVisible, setLogoVisible] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => {
      setMobileOpen(false);
    };

    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  const handleLogoError = () => {
    if (logoSource !== buboFallbackUrl) {
      setLogoSource(buboFallbackUrl);
      return;
    }

    setLogoVisible(false);
  };

  const handleGoogleLogin = async () => {
    const redirectUrl = new URL(
      import.meta.env.BASE_URL,
      window.location.origin,
    ).toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      alert(`Google giriş hatası: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      alert(`Çıkış hatası: ${error.message}`);
      return;
    }

    setSession(null);
    setMobileOpen(false);
    window.location.href = import.meta.env.BASE_URL;
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const user = session?.user;

  const avatarUrl = user?.user_metadata?.avatar_url as
    | string
    | undefined;

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Commander";

  return (
    <header className="bobu-header">
      <style>{`
        .bobu-header {
          position: fixed;
          top: 18px;
          left: 0;
          z-index: 1000;
          width: 100%;
          padding: 0 24px;
          pointer-events: none;
        }

        .bobu-nav {
          position: relative;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
          align-items: center;
          width: min(1120px, 100%);
          min-height: 76px;
          margin: 0 auto;
          padding: 9px 14px 9px 11px;
          overflow: visible;
          border: 1px solid rgba(160, 136, 255, 0.16);
          border-radius: 25px;
          background:
            linear-gradient(
              110deg,
              rgba(18, 12, 48, 0.9),
              rgba(7, 13, 31, 0.94) 48%,
              rgba(5, 16, 29, 0.92)
            );
          box-shadow:
            0 18px 55px rgba(0, 0, 0, 0.34),
            0 0 36px rgba(106, 73, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(24px) saturate(145%);
          -webkit-backdrop-filter: blur(24px) saturate(145%);
          pointer-events: auto;
        }

        .bobu-nav::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 4% 35%,
              rgba(123, 83, 255, 0.18),
              transparent 23%
            ),
            linear-gradient(
              90deg,
              transparent,
              rgba(93, 205, 255, 0.035),
              transparent
            );
        }

        .bobu-brand {
          display: inline-flex;
          align-items: center;
          justify-self: start;
          min-width: 0;
          gap: 13px;
          color: white;
          text-decoration: none;
        }

        .bobu-brand-logo {
          position: relative;
          display: grid;
          flex: 0 0 58px;
          width: 58px;
          height: 58px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(100, 222, 255, 0.58);
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(151, 91, 255, 0.48),
              rgba(14, 11, 41, 0.98) 70%
            );
          box-shadow:
            0 0 0 3px rgba(126, 78, 255, 0.1),
            0 0 20px rgba(86, 105, 255, 0.38),
            0 0 38px rgba(87, 218, 255, 0.12),
            inset 0 0 16px rgba(151, 91, 255, 0.2);
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .bobu-brand:hover .bobu-brand-logo {
          transform: translateY(-1px) scale(1.045);
          border-color: rgba(120, 238, 255, 0.9);
          box-shadow:
            0 0 0 4px rgba(126, 78, 255, 0.12),
            0 0 26px rgba(95, 112, 255, 0.54),
            0 0 44px rgba(87, 218, 255, 0.2),
            inset 0 0 18px rgba(151, 91, 255, 0.25);
        }

        .bobu-brand-logo::before {
          content: "";
          position: absolute;
          inset: -1px;
          z-index: 3;
          border-radius: inherit;
          pointer-events: none;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.24),
              transparent 30%,
              transparent 66%,
              rgba(74, 224, 255, 0.14)
            );
        }

        .bobu-brand-logo::after {
          content: "";
          position: absolute;
          right: 5px;
          bottom: 5px;
          z-index: 4;
          width: 7px;
          height: 7px;
          border: 2px solid rgba(5, 14, 25, 0.95);
          border-radius: 50%;
          background: #25f89a;
          box-shadow: 0 0 10px rgba(37, 248, 154, 0.85);
        }

        .bobu-brand-logo img {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
          object-position: center 30%;
          transform: scale(1.42);
          filter:
            saturate(1.08)
            contrast(1.06)
            brightness(1.05);
        }

        .bobu-logo-fallback {
          position: relative;
          z-index: 2;
          font-size: 21px;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: #ffffff;
          text-shadow:
            0 0 12px rgba(155, 104, 255, 0.9),
            0 0 26px rgba(88, 224, 255, 0.45);
        }

        .bobu-brand-copy {
          display: flex;
          min-width: 128px;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          line-height: 1;
        }

        .bobu-brand-title {
          display: block;
          color: #ffffff;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: 0.085em;
          line-height: 1;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
        }

        .bobu-brand-universe {
          display: block;
          margin-top: 5px;
          color: rgba(231, 228, 255, 0.94);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.31em;
          line-height: 1;
        }

        .bobu-brand-tagline {
          display: block;
          margin-top: 7px;
          color: rgba(105, 221, 255, 0.78);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.22em;
          line-height: 1;
        }

        .bobu-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px;
          border: 1px solid rgba(160, 136, 255, 0.075);
          border-radius: 17px;
          background: rgba(8, 10, 27, 0.3);
        }

        .bobu-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 43px;
          gap: 8px;
          padding: 0 15px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: rgba(220, 221, 240, 0.72);
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
          text-decoration: none;
          transition:
            color 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .bobu-nav-link svg {
          flex-shrink: 0;
          opacity: 0.88;
          transition:
            transform 180ms ease,
            opacity 180ms ease;
        }

        .bobu-nav-link:hover {
          color: #ffffff;
          border-color: rgba(154, 125, 255, 0.14);
          background: rgba(117, 83, 255, 0.08);
          transform: translateY(-1px);
        }

        .bobu-nav-link:hover svg {
          opacity: 1;
          transform: scale(1.06);
        }

        .bobu-nav-link.active {
          color: #ffffff;
          border-color: rgba(151, 117, 255, 0.18);
          background:
            linear-gradient(
              135deg,
              rgba(119, 79, 255, 0.2),
              rgba(55, 89, 166, 0.12)
            );
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .bobu-account {
          display: flex;
          align-items: center;
          justify-self: end;
          gap: 9px;
        }

        .bobu-auth-loading {
          display: grid;
          min-width: 62px;
          height: 40px;
          place-items: center;
          color: rgba(255, 255, 255, 0.62);
        }

        .bobu-user {
          display: flex;
          max-width: 150px;
          align-items: center;
          gap: 8px;
          padding: 5px 9px 5px 5px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .bobu-avatar {
          display: grid;
          flex: 0 0 31px;
          width: 31px;
          height: 31px;
          place-items: center;
          border: 1px solid rgba(159, 121, 255, 0.25);
          border-radius: 50%;
          object-fit: cover;
          background: rgba(112, 72, 255, 0.15);
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .bobu-user-name {
          overflow: hidden;
          color: rgba(242, 241, 255, 0.82);
          font-size: 11px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bobu-auth-button {
          display: inline-flex;
          min-height: 43px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 15px;
          border: 1px solid rgba(142, 116, 255, 0.28);
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(88, 69, 172, 0.25),
              rgba(38, 51, 96, 0.22)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 10px 24px rgba(0, 0, 0, 0.16);
          color: #ffffff;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .bobu-auth-button:hover {
          transform: translateY(-1px);
          border-color: rgba(112, 213, 255, 0.48);
          background:
            linear-gradient(
              135deg,
              rgba(101, 75, 202, 0.35),
              rgba(41, 81, 133, 0.3)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            0 11px 26px rgba(0, 0, 0, 0.2),
            0 0 18px rgba(100, 86, 255, 0.11);
        }

        .bobu-logout-button {
          padding: 0 12px;
        }

        .bobu-cycle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 3px;
          color: rgba(225, 227, 243, 0.7);
          font-size: 9px;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .bobu-cycle-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #27f39b;
          box-shadow:
            0 0 7px rgba(39, 243, 155, 0.85),
            0 0 15px rgba(39, 243, 155, 0.32);
        }

        .bobu-mobile-button {
          display: none;
          width: 43px;
          height: 43px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(147, 119, 255, 0.2);
          border-radius: 13px;
          background: rgba(106, 75, 189, 0.14);
          color: white;
          cursor: pointer;
        }

        .bobu-mobile-panel {
          display: none;
        }

        @media (max-width: 1080px) {
          .bobu-nav {
            grid-template-columns: minmax(190px, 1fr) auto minmax(170px, 1fr);
          }

          .bobu-nav-link {
            padding: 0 11px;
          }

          .bobu-user {
            display: none;
          }

          .bobu-cycle {
            display: none;
          }
        }

        @media (max-width: 860px) {
          .bobu-header {
            top: 12px;
            padding: 0 14px;
          }

          .bobu-nav {
            display: flex;
            min-height: 70px;
            align-items: center;
            justify-content: space-between;
            padding: 7px 9px;
            border-radius: 22px;
          }

          .bobu-nav-links,
          .bobu-account {
            display: none;
          }

          .bobu-brand-logo {
            flex-basis: 52px;
            width: 52px;
            height: 52px;
          }

          .bobu-brand-title {
            font-size: 18px;
          }

          .bobu-brand-universe {
            font-size: 8px;
          }

          .bobu-brand-tagline {
            font-size: 6px;
          }

          .bobu-mobile-button {
            display: inline-flex;
          }

          .bobu-mobile-panel {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            gap: 9px;
            padding: 13px;
            border: 1px solid rgba(155, 125, 255, 0.18);
            border-radius: 20px;
            background:
              linear-gradient(
                145deg,
                rgba(17, 12, 45, 0.97),
                rgba(5, 15, 29, 0.98)
              );
            box-shadow:
              0 24px 55px rgba(0, 0, 0, 0.45),
              0 0 32px rgba(106, 73, 255, 0.1);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-8px) scale(0.98);
            transform-origin: top center;
            transition:
              opacity 180ms ease,
              visibility 180ms ease,
              transform 180ms ease;
          }

          .bobu-mobile-panel.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
          }

          .bobu-mobile-links {
            display: grid;
            gap: 5px;
          }

          .bobu-mobile-links .bobu-nav-link {
            justify-content: flex-start;
            min-height: 47px;
            padding: 0 14px;
          }

          .bobu-mobile-account {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
          }

          .bobu-mobile-account .bobu-user {
            display: flex;
            max-width: 180px;
          }

          .bobu-mobile-account .bobu-cycle {
            display: inline-flex;
          }
        }

        @media (max-width: 520px) {
          .bobu-header {
            padding: 0 9px;
          }

          .bobu-nav {
            min-height: 64px;
            border-radius: 19px;
          }

          .bobu-brand {
            gap: 10px;
          }

          .bobu-brand-logo {
            flex-basis: 47px;
            width: 47px;
            height: 47px;
          }

          .bobu-brand-copy {
            min-width: 106px;
          }

          .bobu-brand-title {
            font-size: 16px;
          }

          .bobu-brand-universe {
            margin-top: 4px;
            font-size: 7px;
          }

          .bobu-brand-tagline {
            margin-top: 5px;
            font-size: 5px;
          }

          .bobu-mobile-button {
            width: 41px;
            height: 41px;
          }

          .bobu-mobile-account {
            align-items: stretch;
            flex-direction: column;
          }

          .bobu-mobile-account .bobu-user {
            width: 100%;
            max-width: none;
          }

          .bobu-mobile-account .bobu-auth-button {
            width: 100%;
          }

          .bobu-mobile-account .bobu-cycle {
            justify-content: center;
            min-height: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bobu-brand-logo,
          .bobu-nav-link,
          .bobu-auth-button,
          .bobu-mobile-panel {
            transition: none;
          }
        }
      `}</style>

      <nav className="bobu-nav" aria-label="Main navigation">
        <NavLink
          to="/"
          className="bobu-brand"
          aria-label="BOBU Universe home"
          onClick={closeMobileMenu}
        >
          <span className="bobu-brand-logo">
            {logoVisible ? (
              <img
                src={logoSource}
                alt=""
                onError={handleLogoError}
              />
            ) : (
              <span className="bobu-logo-fallback">B</span>
            )}
          </span>

          <span className="bobu-brand-copy">
            <strong className="bobu-brand-title">
              BOBU
            </strong>

            <span className="bobu-brand-universe">
              UNIVERSE
            </span>

            <span className="bobu-brand-tagline">
              BUILDING SPACE
            </span>
          </span>
        </NavLink>

        <div className="bobu-nav-links">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `bobu-nav-link${isActive ? " active" : ""}`
              }
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="bobu-account">
          {loading ? (
            <span className="bobu-auth-loading">•••</span>
          ) : user ? (
            <>
              <div className="bobu-user">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="bobu-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="bobu-avatar">
                    {fullName.charAt(0).toUpperCase()}
                  </span>
                )}

                <span className="bobu-user-name">
                  {fullName}
                </span>
              </div>

              <button
                type="button"
                className="bobu-auth-button bobu-logout-button"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="bobu-auth-button"
              onClick={handleGoogleLogin}
            >
              <LogIn size={16} />
              <span>Sign in</span>
            </button>
          )}

          <span className="bobu-cycle">
            <i className="bobu-cycle-dot" />
            Cycle 000001
          </span>
        </div>

        <button
          type="button"
          className="bobu-mobile-button"
          aria-label={
            mobileOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div
          className={`bobu-mobile-panel${
            mobileOpen ? " open" : ""
          }`}
        >
          <div className="bobu-mobile-links">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `bobu-nav-link${isActive ? " active" : ""}`
                }
                onClick={closeMobileMenu}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="bobu-mobile-account">
            {loading ? (
              <span className="bobu-auth-loading">•••</span>
            ) : user ? (
              <>
                <div className="bobu-user">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="bobu-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="bobu-avatar">
                      {fullName.charAt(0).toUpperCase()}
                    </span>
                  )}

                  <span className="bobu-user-name">
                    {fullName}
                  </span>
                </div>

                <button
                  type="button"
                  className="bobu-auth-button"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="bobu-auth-button"
                onClick={handleGoogleLogin}
              >
                <LogIn size={16} />
                <span>Sign in</span>
              </button>
            )}

            <span className="bobu-cycle">
              <i className="bobu-cycle-dot" />
              Cycle 000001
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}