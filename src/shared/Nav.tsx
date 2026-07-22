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

export function Nav() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
  console.log("LOGIN BUTTON CLICKED");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  console.log("Login result:", { data, error });

  if (error) {
    alert(`Google giriş hatası: ${error.message}`);
  }
};

  const handleLogout = async () => {
  console.log("LOGOUT BUTTON CLICKED");

  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  console.log("Logout result:", { error });

  if (error) {
    alert(`Çıkış hatası: ${error.message}`);
    return;
  }

  setSession(null);
  window.location.href = "/";
};

  const user = session?.user;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Commander";

  return (
    <header>
      <nav className="glass nav">
        <NavLink to="/" className="brand">
          <b>B</b>

          <span>
            BOBU
            <small>UNIVERSE</small>
          </span>
        </NavLink>

        <div className="links">
          {navItems.map(([to, label, Icon]) => (
            <NavLink
              to={to}
              key={to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-account">
          {loading ? (
            <span className="auth-loading">...</span>
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
                    {fullName.charAt(0).toUpperCase()}
                  </span>
                )}

                <span className="nav-user-name">{fullName}</span>
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