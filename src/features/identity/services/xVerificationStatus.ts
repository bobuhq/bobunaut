import { supabase } from "../../../lib/supabase";

export type XVerificationStatus = "pending" | "relinked" | "rewarded" | "no_reset" | "invalid_session" | "unavailable";
export type XVerification = { verified: boolean; pending: boolean; status: XVerificationStatus };

/** No client registry reads or cached identity fallback: only authenticated server evidence. */
export async function readXVerification(userId: string): Promise<XVerification> {
  const failed = (status: XVerificationStatus = "unavailable"): XVerification => ({ verified: false, pending: false, status });
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token || session.user.id !== userId) return failed("invalid_session");
    const { data, error } = await supabase.functions.invoke("x-verification-status", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { data: { session: current } } = await supabase.auth.getSession();
    if (!current || current.user.id !== userId || current.access_token !== session.access_token) return failed("invalid_session");
    if (error) return failed(error.context?.status === 401 ? "invalid_session" : "unavailable");
    if (data?.builder_id !== userId || !["pending", "relinked", "rewarded", "no_reset"].includes(data?.status)) return failed();
    return {
      status: data.status,
      verified: (data.status === "rewarded" || data.status === "no_reset") && data.verified === true,
      pending: data.status === "pending" || data.status === "relinked",
    };
  } catch {
    return failed();
  }
}
