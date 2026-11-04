import { supabase } from "../../../lib/supabase";
import { verifyXReauthenticationAccount } from "./xReauthGuard";

// Supabase owns the PKCE exchange through detectSessionInUrl. getSession waits
// for its initialization. Share completion across React StrictMode effects.
let completion: Promise<void> | undefined;
export function completeXOAuthCallback(): Promise<void> {
  return completion ??= (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error("OAuth session unavailable");
    const account = await verifyXReauthenticationAccount();
    if (!account.sameAccount) {
      throw new Error("OAuth account changed; sign in to the original account");
    }

    // A successful callback must link X to this authenticated account.
    const { data: identities, error: identitiesError } =
      await supabase.auth.getUserIdentities();

    if (identitiesError) throw identitiesError;

    if (!identities.identities.some(
      (identity) => identity.provider.toLowerCase() === "x"
    )) {
      throw new Error("X identity was not linked to this BOBU account.");
    }
  })().catch(error => { completion = undefined; throw error; });
}
