import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

interface AuthSessionContextValue {
  session: Session | null;
  loading: boolean;
  authenticated: boolean;
}

const AuthSessionContext =
  createContext<AuthSessionContextValue | null>(null);

interface AuthSessionProviderProps {
  children: ReactNode;
}

export function AuthSessionProvider({
  children,
}: AuthSessionProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      loading,
      authenticated: Boolean(session?.user.id),
    }),
    [session, loading],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error(
      "useAuthSession must be used inside AuthSessionProvider",
    );
  }

  return context;
}
