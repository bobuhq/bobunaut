import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DeleteAccount() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      setUserEmail(session?.user?.email ?? "");
      setLoading(false);
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const handleGoogleLogin = async () => {
    setError("");

    const { error: loginError } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/delete-account`,
        },
      });

    if (loginError) {
      setError(loginError.message);
    }
  };

  const handleDelete = async () => {
    setError("");

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your BOBU account? This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in before deleting your account.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Account deletion failed.",
        );
      }

      await supabase.auth.signOut();

      setSuccess(true);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Account deletion failed.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.muted}>Loading...</p>
        </section>
      </main>
    );
  }

  if (success) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.badge}>ACCOUNT DELETED</div>

          <h1 style={styles.title}>
            Your BOBU account has been deleted.
          </h1>

          <p style={styles.text}>
            Your account deletion request has been completed.
            You can close this page.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>BOBU UNIVERSE</div>

        <h1 style={styles.title}>Delete Your BOBU Account</h1>

        <p style={styles.text}>
          You can permanently delete your BOBU account and
          associated account data from this page.
        </p>

        {!userEmail ? (
          <>
            <p style={styles.notice}>
              Sign in with your BOBU account to continue.
            </p>

            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              style={styles.primaryButton}
            >
              Continue with Google
            </button>
          </>
        ) : (
          <>
            <div style={styles.account}>
              <span style={styles.label}>Signed in as</span>
              <strong>{userEmail}</strong>
            </div>

            <p style={styles.warning}>
              Account deletion is permanent and cannot be
              undone.
            </p>

            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              style={styles.deleteButton}
            >
              {deleting ? "Deleting account..." : "Delete Account"}
            </button>
          </>
        )}

        {error ? (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        ) : null}

        <p style={styles.footer}>
          If you need assistance, please contact BOBU Support.
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "32px 20px",
    background:
      "radial-gradient(circle at top, #111a3b 0%, #050713 55%, #02030a 100%)",
    color: "#eef2ff",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: 620,
    padding: "42px 34px",
    borderRadius: 24,
    background: "rgba(10, 15, 35, 0.92)",
    border: "1px solid rgba(139, 92, 246, 0.28)",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
  },

  badge: {
    display: "inline-block",
    marginBottom: 18,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    background: "rgba(139, 92, 246, 0.16)",
    color: "#c4b5fd",
  },

  title: {
    margin: 0,
    fontSize: "clamp(30px, 5vw, 46px)",
    lineHeight: 1.08,
  },

  text: {
    marginTop: 20,
    fontSize: 16,
    lineHeight: 1.7,
    color: "rgba(235, 238, 255, 0.74)",
  },

  muted: {
    color: "rgba(235, 238, 255, 0.65)",
  },

  notice: {
    marginTop: 28,
    padding: 16,
    borderRadius: 14,
    background: "rgba(139, 92, 246, 0.08)",
    color: "rgba(235, 238, 255, 0.82)",
  },

  account: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 28,
    padding: 16,
    borderRadius: 14,
    background: "rgba(255, 255, 255, 0.04)",
  },

  label: {
    fontSize: 12,
    color: "rgba(235, 238, 255, 0.5)",
  },

  warning: {
    marginTop: 20,
    color: "#fca5a5",
    lineHeight: 1.6,
  },

  primaryButton: {
    width: "100%",
    marginTop: 22,
    padding: "14px 18px",
    border: 0,
    borderRadius: 12,
    background: "#8b5cf6",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },

  deleteButton: {
    width: "100%",
    marginTop: 22,
    padding: "14px 18px",
    border: 0,
    borderRadius: 12,
    background: "#dc2626",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },

  error: {
    marginTop: 20,
    color: "#fca5a5",
    lineHeight: 1.5,
  },

  footer: {
    marginTop: 32,
    fontSize: 13,
    lineHeight: 1.6,
    color: "rgba(235, 238, 255, 0.45)",
  },
};
