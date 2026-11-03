import { supabase } from "../../../lib/supabase";

const REAUTH_KEY = "bobu:x-reauth:expected-user";

export async function beginXReauthentication(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Authentication required.");
  }

  const userId = data.user.id;

  sessionStorage.setItem(REAUTH_KEY, userId);

  return userId;
}

export async function verifyXReauthenticationAccount(): Promise<{
  sameAccount: boolean;
  userId: string | null;
}> {
  const expectedUserId = sessionStorage.getItem(REAUTH_KEY);

  if (!expectedUserId) {
    return {
      sameAccount: false,
      userId: null,
    };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      sameAccount: false,
      userId: null,
    };
  }

  return {
    sameAccount: data.user.id === expectedUserId,
    userId: data.user.id,
  };
}

export function clearXReauthentication(): void {
  sessionStorage.removeItem(REAUTH_KEY);
}
