import { supabase } from "../../lib/supabase";

export type MarsCivilizationOverview = {
  civilization_key: string;
  title: string;
  status: string;
  builders_joined: number;
  target_builder_count: number;
  total_contribution: number;
  energy: number;
  water: number;
  habitats: number;
  science: number;
  exploration: number;
  security: number;
  next_unlock_key: string | null;
  next_unlock_title: string | null;
  next_unlock_status: string | null;
  next_unlock_required_builders: number | null;
  next_unlock_required_contribution: number | null;
};

export async function getMarsCivilizationOverview(): Promise<MarsCivilizationOverview | null> {
  const { data, error } = await supabase.rpc(
    "get_mars_civilization_overview",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsCivilizationOverview[] | null;

  return rows?.[0] ?? null;
}
