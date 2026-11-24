
import { useEffect, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

import { AresColonyVoicePanel } from "./AresColonyVoicePanel";

export function isLocalVoiceTestEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search)
      .get("localVoice") === "1"
  );
}

function createLocalVoiceClient() {
  if (!isLocalVoiceTestEnabled()) {
    throw new Error("LOCAL_VOICE_TEST_DISABLED");
  }

  return createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "bobu-local-voice-test-v1",
      },
    }
  );
}

export function AresLocalVoiceTestPanel() {
  const [backend] = useState(createLocalVoiceClient);

  const [session, setSession] = useState<Session | null>(null);

  const [account, setAccount] = useState("alpha");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const { data: { subscription } } =
      backend.auth.onAuthStateChange((_event, current) => {
        setSession(current);
      });

    return () => {
      subscription.unsubscribe();
      backend.auth.stopAutoRefresh();
    };
  }, [backend]);

  async function login() {
    if (busy || !password) return;

    setBusy(true);
    setError("");

    try {
      const result = await backend.auth.signInWithPassword({
        email: `voice-${account}@bobu.test`,
        password,
      });

      if (result.error || !result.data.session) {
        setError("LOCAL_VOICE_LOGIN_FAILED");
        return;
      }

      setSession(result.data.session);

    } catch {
      setError("LOCAL_VOICE_CONNECTION_FAILED");

    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function logout() {
    setSession(null);
    await backend.auth.signOut({ scope: "local" });
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: 16,
          top: 110,
          zIndex: 500,
          width: 210,
          pointerEvents: "auto",
          padding: 10,
          background: "#071624",
          border: "1px solid #e5bd58",
          borderRadius: 9,
          color: "#ffdd86",
          fontSize: 11,
          display: "grid",
          gap: 7,
          maxWidth: 210,
        }}
      >
        <strong>LOCAL VOICE TEST</strong>

        {session ? (
          <>
            <span>{session.user.email}</span>

            <button onClick={() => void logout()}>
              LOG OUT TEST VOICE
            </button>
          </>
        ) : (
          <>
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              disabled={busy}
            >
              <option value="alpha">Alpha</option>
              <option value="beta">Beta</option>
              <option value="gamma">Gamma</option>
            </select>

            <input
              type="password"
              placeholder="Test account password"
              value={password}
              autoComplete="off"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              disabled={busy || !password}
              onClick={() => void login()}
            >
              {busy ? "CONNECTING..." : "LOGIN TEST VOICE"}
            </button>
          </>
        )}

        {error && <span role="alert">{error}</span>}
      </div>

      {session && (
        <AresColonyVoicePanel
          key={session.user.id}
          backend={backend}
          builderId={session.user.id}
          accessToken={session.access_token}
        />
      )}
    </>
  );
}
