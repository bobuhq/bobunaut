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

interface NativeMarsBridge {
  postMessage: (message: string) => void;
}

type NativeMarsWindow = Window & {
  ReactNativeWebView?: NativeMarsBridge;
};

const AuthSessionContext =
  createContext<AuthSessionContextValue | null>(null);

interface AuthSessionProviderProps {
  children: ReactNode;
}

function getNativeMarsBridge(): NativeMarsBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (window as NativeMarsWindow).ReactNativeWebView ?? null
  );
}

function isNativeMarsWebView(): boolean {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined"
  ) {
    return false;
  }

  return (
    window.location.pathname.startsWith("/mars") &&
    new URLSearchParams(window.location.search).get(
      "nativeBridge",
    ) === "1" &&
    navigator.userAgent.includes("BOBU-Mobile") &&
    getNativeMarsBridge() !== null
  );
}

function parseBridgePayload(
  rawValue: unknown,
): Record<string, unknown> | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function AuthSessionProvider({
  children,
}: AuthSessionProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const nativeMarsWebView = isNativeMarsWebView();

  useEffect(() => {
    let mounted = true;
    let bootstrapInFlight = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);

        if (nextSession) {
          setLoading(false);
        }
      },
    );

    if (nativeMarsWebView) {
      const bridge = getNativeMarsBridge();

      if (!bridge) {
        setLoading(false);

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      }

      const handleBridgeMessage = (
        event: MessageEvent,
      ) => {
        const payload = parseBridgePayload(event.data);

        if (
          !payload ||
          payload.type !==
            "BOBU_MARS_AUTH_BOOTSTRAP" ||
          payload.version !== 1 ||
          typeof payload.accessToken !== "string" ||
          typeof payload.refreshToken !== "string" ||
          bootstrapInFlight
        ) {
          return;
        }

        bootstrapInFlight = true;

        void supabase.auth
          .setSession({
            access_token: payload.accessToken,
            refresh_token: payload.refreshToken,
          })
          .then(({ data, error }) => {
            if (!mounted) {
              return;
            }

            if (error || !data.session) {
              setSession(null);
              setLoading(false);

              bridge.postMessage(
                JSON.stringify({
                  type: "BOBU_MARS_AUTH_RESULT",
                  version: 1,
                  success: false,
                }),
              );

              return;
            }

            setSession(data.session);
            setLoading(false);

            bridge.postMessage(
              JSON.stringify({
                type: "BOBU_MARS_AUTH_RESULT",
                version: 1,
                success: true,
              }),
            );
          })
          .finally(() => {
            bootstrapInFlight = false;
          });
      };

      window.addEventListener(
        "message",
        handleBridgeMessage,
      );

      document.addEventListener(
        "message",
        handleBridgeMessage as EventListener,
      );

      bridge.postMessage(
        JSON.stringify({
          type: "BOBU_MARS_AUTH_READY",
          version: 1,
        }),
      );

      return () => {
        mounted = false;

        window.removeEventListener(
          "message",
          handleBridgeMessage,
        );

        document.removeEventListener(
          "message",
          handleBridgeMessage as EventListener,
        );

        subscription.unsubscribe();
      };
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session);
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [nativeMarsWebView]);

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
      {nativeMarsWebView && loading
        ? null
        : children}
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
