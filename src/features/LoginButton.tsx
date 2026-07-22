import { supabase } from "../lib/supabase";

export function LoginButton() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Google login error:", error.message);
      alert("Google ile giriş başlatılamadı.");
    }
  };

  return (
    <button type="button" onClick={handleGoogleLogin}>
      Continue with Google
    </button>
  );
}