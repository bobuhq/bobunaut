import { supabase } from "../../../../lib/supabase";

export type MarsDiscoveryCompletion = {
  completed_now: boolean;
  discovery_key: string;
  cycle_key: string;
  reward_gp: number;
  total_gp: number;
  ledger_id: string;
  discovered_at: string;
};

export async function completeMyAresDailyDiscovery(
  discoveryKey: string,
): Promise<MarsDiscoveryCompletion> {
  const { data, error } = await supabase.rpc(
    "complete_my_ares_daily_discovery",
    {
      p_discovery_key: discoveryKey,
    },
  );

  if (error) {
    throw error;
  }

  const rows =
    data as MarsDiscoveryCompletion[] | null;

  const completion = rows?.[0];

  if (!completion) {
    throw new Error(
      "Mars discovery completion returned no result.",
    );
  }

  return completion;
}
