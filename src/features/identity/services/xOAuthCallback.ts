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

    // Wait for Supabase Auth identity propagation after OAuth.
    // Never accept an identity belonging to a different Builder.
    let linked = false;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data: identities, error: identitiesError } =
        await supabase.auth.getUserIdentities();

      if (identitiesError) throw identitiesError;

      linked = identities.identities.some(
        (identity) => identity.provider.toLowerCase() === "x"
      );

      if (linked) break;

      if (attempt < 5) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 500)
        );
      }
    }

    if (!linked) {
      throw new Error("X identity was not linked to this BOBU account.");
    }
  })().catch(error => { completion = undefined; throw error; });
}
