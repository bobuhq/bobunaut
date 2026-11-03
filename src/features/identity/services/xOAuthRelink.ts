import { supabase } from "../../../lib/supabase";

export interface XOAuthRelinkState {
  authenticated: boolean;
  xLinked: boolean;
  alternativeProviders: string[];
  xIdentityId: string | null;
}

export async function getXOAuthRelinkState(): Promise<XOAuthRelinkState> {
  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      authenticated: false,
      xLinked: false,
      alternativeProviders: [],
      xIdentityId: null,
    };
  }

  const { data, error } =
    await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  const identities = data.identities ?? [];

  const xIdentity = identities.find(
    (identity) => identity.provider.toLowerCase() === "x"
  );

  return {
    authenticated: true,
    xLinked: Boolean(xIdentity),
    alternativeProviders: identities
      .filter((identity) => identity.provider.toLowerCase() !== "x")
      .map((identity) => identity.provider),
    xIdentityId: xIdentity?.id ?? null,
  };
}

export async function prepareXOAuthRelink(): Promise<XOAuthRelinkState> {
  const state = await getXOAuthRelinkState();

  if (!state.authenticated) {
    throw new Error("Authentication required.");
  }

  if (state.alternativeProviders.length === 0) {
    throw new Error(
      "An alternative sign-in method is required before reconnecting X."
    );
  }

  return state;
}

/**
 * Unlink X only after the user has explicitly confirmed
 * that another sign-in method works.
 *
 * This function must never be called automatically on page load.
 */
export async function unlinkXForReverification(
  alternativeLoginConfirmed: boolean,
): Promise<void> {
  if (!alternativeLoginConfirmed) {
    throw new Error(
      "Confirm a working alternative sign-in method before disconnecting X.",
    );
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("Authentication required.");
  }

  const { data, error } =
    await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  const identities = data.identities ?? [];

  const xIdentity = identities.find(
    (identity) => identity.provider.toLowerCase() === "x",
  );

  if (!xIdentity) {
    throw new Error("No linked X identity was found.");
  }

  const alternatives = identities.filter(
    (identity) => identity.provider.toLowerCase() !== "x",
  );

  if (alternatives.length === 0) {
    throw new Error(
      "X cannot be disconnected without another linked sign-in method.",
    );
  }

  const { error: unlinkError } =
    await supabase.auth.unlinkIdentity(xIdentity);

  if (unlinkError) {
    throw new Error(unlinkError.message);
  }

  const { data: refreshed, error: refreshError } =
    await supabase.auth.getUserIdentities();

  if (refreshError) {
    throw refreshError;
  }

  if (
    refreshed.identities.some(
      (identity) => identity.provider.toLowerCase() === "x",
    )
  ) {
    throw new Error(
      "X identity is still linked. Reconnection cannot proceed.",
    );
  }
}
