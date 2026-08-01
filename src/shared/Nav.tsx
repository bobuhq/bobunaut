import { useEffect, useState } from "react";
import {
  Compass,
  Globe2,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  Orbit,
  Pickaxe,
  Radio,
  Rocket,
  Trophy,
  User,
  WalletCards,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthSession } from "../core/auth/useAuthSession";
import { useBuilderStore } from "../features/identity/hooks/useBuilderStore";
import { useLanguage } from "../core/language";
import type { SupportedLanguage } from "../core/language";

const navItems = [
  {
    to: "/",
    labelKey: "nav.orbit",
    icon: Orbit,
    locked: false,
  },
  {
    to: "/command-deck",
    labelKey: "nav.commandDeck",
    icon: Radio,
    locked: false,
  },
  {
    to: "/identity",
    labelKey: "nav.genesis",
    icon: User,
    locked: false,
  },
  {
    to: "/passport",
    labelKey: "nav.passport",
    icon: User,
    locked: false,
  },
  {
    to: "/wallet",
    labelKey: "nav.wallet",
    icon: WalletCards,
    locked: false,
  },
  {
    to: "/mining",
    labelKey: "nav.mining",
    icon: Pickaxe,
    locked: false,
  },
  {
    to: "/missions",
    labelKey: "nav.missions",
    icon: Rocket,
    locked: false,
  },
  {
    to: "/galaxy",
    labelKey: "nav.galaxy",
    icon: Compass,
    locked: false,
  },
  {
    to: "/leaderboard",
    labelKey: "nav.leaderboard",
    icon: Trophy,
    locked: false,
  },
] as const;

const baseUrl = import.meta.env.BASE_URL;

const buboLogoUrl = `${baseUrl}images/bubo/bubo-logo.png`;
const buboFallbackUrl = `${baseUrl}images/bubo/bubo-default.png`;

export function Nav() {
  const { session, loading } = useAuthSession();
  const {
    language,
    languages,
    setLanguage,
    t,
  } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoSource, setLogoSource] = useState(buboLogoUrl);
  const [logoVisible, setLogoVisible] = useState(true);
  const builder = useBuilderStore();

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
      alert(t("auth.googleLoginError", { message: error.message }));
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      alert(t("auth.logoutError", { message: error.message }));
      return;
    }

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
    t("auth.commander");

  const formattedGp = new Intl.NumberFormat(
    language,
  ).format(builder.gp);

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
          grid-template-columns: 175px minmax(0, 1fr) max-content;
          column-gap: 10px;
          align-items: center;
          width: min(1380px, 100%);
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
          width: 175px;
          max-width: 175px;
          min-width: 0;
          align-items: center;
          justify-self: start;
          gap: 8px;
          overflow: hidden;
          color: white;
          text-decoration: none;
        }

        .bobu-brand-logo {
          position: relative;
          display: grid;
          flex: 0 0 50px;
          width: 50px;
          height: 50px;
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
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: #ffffff;
          text-shadow:
            0 0 12px rgba(155, 104, 255, 0.9),
            0 0 26px rgba(88, 224, 255, 0.45);
        }

        .bobu-brand-copy {
          display: flex;
          width: 112px;
          min-width: 0;
          overflow: hidden;
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
          font-size: 9px;
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
          min-width: 0;
          align-items: center;
          justify-content: center;
          justify-self: stretch;
          gap: 2px;
          padding: 4px;
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
          gap: 5px;
          padding: 0 9px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: rgba(220, 221, 240, 0.72);
          font-size: 10.5px;
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

        .bobu-nav-link.bobu-nav-link--locked {
          opacity: 0.42;
          cursor: not-allowed;
          user-select: none;
          filter: saturate(0.55);
        }

        .bobu-nav-link.bobu-nav-link--locked:hover {
          color: inherit;
          background: transparent;
          transform: none;
          box-shadow: none;
        }

        .bobu-nav-link.bobu-nav-link--locked:hover svg {
          transform: none;
        }

        .bobu-nav-lock {
          width: 13px;
          height: 13px;
          margin-left: -3px;
          opacity: 1;
          color: #25F89A;
          filter: drop-shadow(0 0 6px rgba(37,248,154,.45));
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
          min-width: max-content;
          align-items: center;
          justify-self: end;
          margin-left: 4px;
          gap: 6px;
          flex-wrap: nowrap;
        }

        .bobu-language-control {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .bobu-language-control svg {
          flex: 0 0 auto;
          color: rgba(105, 221, 255, 0.88);
          width: 14px;
          height: 14px;
          pointer-events: none;
        }

        .bobu-language-select {
          appearance: none;
          border: none;
          background: transparent;
          color: inherit;
          font-weight: 700;
          text-align: center;
          text-align-last: center;
          min-width: 42px;
          padding: 0 18px 0 8px;
          cursor: pointer;
        }

        .bobu-language-select option {
          background: #0d1025;
          color: #ffffff;
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
          align-self: center;
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

        .bobu-user-avatar-only {
          min-width: 43px;
          max-width: 43px;
          width: 43px;
          height: 43px;
          padding: 5px;
          justify-content: center;
          border-radius: 50%;
        }

        .bobu-user-avatar-only .bobu-avatar {
          width: 31px;
          height: 31px;
        }

        .bobu-user-name {
          display: block;
          min-width: 0;
          overflow: hidden;
          color: rgba(242, 241, 255, 0.82);
          font-size: 11px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bobu-gp-badge {
          display: inline-flex;
          flex: 0 0 auto;
          min-height: 41px;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          border: 1px solid rgba(255, 208, 92, 0.22);
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(113, 77, 18, 0.28),
              rgba(58, 38, 10, 0.2)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 10px 22px rgba(0, 0, 0, 0.16);
          color: #ffe18a;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .bobu-gp-badge strong {
          color: #ffffff;
          font-size: 12px;
        }

        .bobu-auth-button {
          display: inline-flex;
          flex: 0 0 auto;
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

          .bobu-mobile-account .bobu-gp-badge,
          .bobu-mobile-account .bobu-auth-button,
          .bobu-mobile-account .bobu-language-control {
            width: 100%;
          }

          .bobu-mobile-account .bobu-language-select {
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

      <nav className="bobu-nav" aria-label={t("nav.mainNavigation")}>
        <NavLink
          to="/"
          className="bobu-brand"
          aria-label={t("nav.home")}
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
          {navItems.map(({ to, labelKey, icon: Icon, locked }) =>
            locked ? (
              <span
                key={to}
                className="bobu-nav-link bobu-nav-link--locked"
                title={t("nav.walletUnderDevelopment")}
                aria-label={t(
                  "nav.lockedUnderDevelopment",
                  { label: t(labelKey) },
                )}
                aria-disabled="true"
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{t(labelKey)}</span>
                <LockKeyhole
                  className="bobu-nav-lock"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `bobu-nav-link${isActive ? " active" : ""}`
                }
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{t(labelKey)}</span>
              </NavLink>
            ),
          )}
        </div>

        <div className="bobu-account">


          <label
            className="bobu-language-control"
            aria-label={t("language.selectorLabel")}
          >
            <Globe2 size={15} aria-hidden="true" />

            <select
              className="bobu-language-select"
              value={language}
              aria-label={t("language.selectorLabel")}
              onChange={(event) =>
                setLanguage(
                  event.target.value as SupportedLanguage,
                )
              }
            >
              {languages.map((option) => (
                <option
                  key={option.code}
                  value={option.code}
                >
                  {option.code.toUpperCase()}
                </option>
              ))}
            </select>
          </label>


          {loading ? (
            <span className="bobu-auth-loading">•••</span>
          ) : user ? (
            <>
<button
                type="button"
                className="bobu-auth-button bobu-logout-button"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>{t("auth.logout")}</span>
              </button>

              <span className="bobu-cycle">
                <i className="bobu-cycle-dot" />
                {t("common.cycle")} 000001
              </span>

              <div
                className="bobu-user bobu-user-avatar-only"
                title={fullName}
                aria-label={fullName}
              >
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
              </div>
            </>
          ) : (
            <button
              type="button"
              className="bobu-auth-button"
              onClick={handleGoogleLogin}
            >
              <LogIn size={16} />
              <span>{t("auth.login")}</span>
            </button>
          )}

          {!user && (
            <span className="bobu-cycle">
              <i className="bobu-cycle-dot" />
              {t("common.cycle")} 000001
            </span>
          )}
        </div>

        <button
          type="button"
          className="bobu-mobile-button"
          aria-label={
            mobileOpen
              ? t("nav.closeMobileMenu")
              : t("nav.openMobileMenu")
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
            {navItems.map(({ to, labelKey, icon: Icon, locked }) =>
              locked ? (
                <span
                  key={to}
                  className="bobu-nav-link bobu-nav-link--locked"
                  title={t("nav.walletUnderDevelopment")}
                  aria-label={t(
                  "nav.lockedUnderDevelopment",
                  { label: t(labelKey) },
                )}
                  aria-disabled="true"
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{t(labelKey)}</span>
                  <LockKeyhole
                    className="bobu-nav-lock"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
              ) : (
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
                  <span>{t(labelKey)}</span>
                </NavLink>
              ),
            )}
          </div>

          <div className="bobu-mobile-account">
            <label
              className="bobu-language-control"
              aria-label={t("language.selectorLabel")}
            >
              <Globe2 size={16} aria-hidden="true" />

              <select
                className="bobu-language-select"
                value={language}
                aria-label={t("language.selectorLabel")}
                onChange={(event) =>
                  setLanguage(
                    event.target.value as SupportedLanguage,
                  )
                }
              >
                {languages.map((option) => (
                  <option
                    key={option.code}
                    value={option.code}
                  >
                    {option.nativeLabel}
                  </option>
                ))}
              </select>
            </label>

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

                <div
                  className="bobu-gp-badge"
                  aria-label={`${formattedGp} GP`}
                >
                  <span>⭐</span>
                  <strong>{formattedGp}</strong>
                  <span>GP</span>
                </div>

                <button
                  type="button"
                  className="bobu-auth-button"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>{t("auth.logout")}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="bobu-auth-button"
                onClick={handleGoogleLogin}
              >
                <LogIn size={16} />
                <span>{t("auth.login")}</span>
              </button>
            )}

            <span className="bobu-cycle">
              <i className="bobu-cycle-dot" />
              {t("common.cycle")} 000001
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}