const AsyncStorage = { getItem: async (key: string) => localStorage.getItem(key), setItem: async (key: string, value: string) => localStorage.setItem(key, value), removeItem: async (key: string) => localStorage.removeItem(key) };
import { supabase } from "../../../lib/supabase";

const PENDING_KEY = "bobu:oauth:x-link:v1";
const MAX_AGE = 10 * 60_000;


const recoveryKey = (userId: string) => `bobu:oauth:x-recovery:v1:${userId}`;
type Recovery = { userId: string; identityId: string; providerId: string; startedAt: number };

async function activeUser(userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error("BOBU account changed or session expired. Please try again.");
  return data.user;
}

async function recoveryFor(userId: string): Promise<Recovery | null> {
  const stored = await AsyncStorage.getItem(recoveryKey(userId));
  if (!stored) return null;
  const recovery = JSON.parse(stored) as Recovery;
  if (recovery.userId !== userId || !recovery.identityId || !recovery.providerId || !Number.isFinite(recovery.startedAt)) {
    throw new Error("Invalid X recovery state. Reconnect cancelled.");
  }
  return recovery;
}

export async function hasXRecovery(userId: string): Promise<boolean> {
  return (await recoveryFor(userId)) !== null;
}

/** Confirmation must precede this operation. Keep recovery across cancellation/restarts. */
export async function prepareXReconnect(userId: string, confirmed: boolean): Promise<void> {
  if (!confirmed) throw new Error("Explicit X unlink confirmation required.");
  const user = await activeUser(userId);
  const identities = user.identities ?? [];
  if (!identities.some(identity => identity.provider !== "x" && identity.user_id === userId)) {
    throw new Error("Another sign-in identity is required before reconnecting X.");
  }
  const identity = identities.find(identity => identity.provider === "x" && identity.user_id === userId);
  let recovery = await recoveryFor(userId);
  if (!recovery) {
    if (!identity?.identity_id || !identity.id) throw new Error("Original X identity is unavailable. Reconnect cancelled.");
    recovery = { userId, identityId: identity.identity_id, providerId: identity.id, startedAt: Date.now() };
    await AsyncStorage.setItem(recoveryKey(userId), JSON.stringify(recovery));
  }
  // Revalidate immediately before the destructive step; never use a cached session.
  const current = await activeUser(userId);
  if (!(current.identities ?? []).some(item => item.provider !== "x" && item.user_id === userId)) {
    throw new Error("Another sign-in identity is required before reconnecting X.");
  }
  const currentX = current.identities?.find(item => item.provider === "x" && item.user_id === userId);
  if (currentX) {
    const { error } = await supabase.auth.unlinkIdentity(currentX);
    if (error) throw error;
  }
  if (await requireXIdentity(userId)) throw new Error("Old X identity could not be disconnected.");
}

export async function validateXRecovery(userId: string): Promise<void> {
  const recovery = await recoveryFor(userId);
  if (!recovery) return;
  const user = await activeUser(userId);
  const identity = user.identities?.find(item => item.provider === "x" && item.user_id === userId);
  if (!identity || identity.id !== recovery.providerId) {
    throw new Error("Reconnect the original X account. This X account does not match.");
  }
  // reset_at and timestamp ordering are enforced by claim-x-reward on the server;
  // the device clock must never decide whether a server identity is fresh.
  if (!identity.identity_id || identity.identity_id === recovery.identityId || !identity.created_at ||
      !Number.isFinite(Date.parse(identity.created_at))) {
    throw new Error("fresh_x_oauth_required");
  }
}

export async function finishXRecovery(userId: string): Promise<void> {
  await activeUser(userId);
  await AsyncStorage.removeItem(recoveryKey(userId));
}

export async function beginXLink(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication is required to connect X.");
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ userId: data.user.id, startedAt: Date.now() }));
  return data.user.id;
}

export async function clearXLink(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function requireXIdentity(userId: string): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error("BOBU account changed or session expired. Please try again.");
  // getUser is server validated; do not trust a cached session or historical social record.
  return data.user.identities?.some(identity => identity.provider === "x" && identity.user_id === userId) === true;
}


// Supabase detectSessionInUrl owns the browser PKCE exchange. Never exchange twice.
let completion: Promise<void> | undefined;
export function completeXOAuthCallback(): Promise<void> {
  if (completion) return completion;
  completion = (async () => {
    const stored = await AsyncStorage.getItem(PENDING_KEY);
    const pending = stored ? JSON.parse(stored) as {userId: string; startedAt: number} : null;
    if (!pending?.userId || !Number.isFinite(pending.startedAt) || Date.now() - pending.startedAt > MAX_AGE) {
      throw new Error("X connection expired. Please try again.");
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== pending.userId) throw new Error("BOBU account changed or OAuth session unavailable.");
    for (let attempt = 0; attempt < 8; attempt++) {
      if (await requireXIdentity(pending.userId)) {
        await validateXRecovery(pending.userId);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error("X identity linking did not complete. Please try again.");
  })().finally(() => { completion = undefined; });
  return completion;
}
export function hasPendingXLink(): boolean { return localStorage.getItem(PENDING_KEY) !== null; }
