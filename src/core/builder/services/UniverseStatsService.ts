import { supabase } from "../../../lib/supabase";

export interface UniverseStats {
  buildersJoined: number;
  galaxiesCreated: number;
  alliancesFormed: number;
  gpGenerated: number;
  newBuildersThisWeek: number;
}

interface UniverseStatsRow {
  builders_joined: number;
  galaxies_created: number;
  alliances_formed: number;
  gp_generated: number;
  new_builders_this_week: number;
}

const emptyUniverseStats: UniverseStats = {
  buildersJoined: 0,
  galaxiesCreated: 0,
  alliancesFormed: 0,
  gpGenerated: 0,
  newBuildersThisWeek: 0,
};

export const universeStatsService = {
  async load(): Promise<UniverseStats> {
    const { data, error } = await supabase
      .rpc("get_public_universe_stats");

    if (error) {
      throw error;
    }

    const row = Array.isArray(data)
      ? (data[0] as UniverseStatsRow | undefined)
      : undefined;

    if (!row) {
      return emptyUniverseStats;
    }

    return {
      buildersJoined: Number(row.builders_joined),
      galaxiesCreated: Number(row.galaxies_created),
      alliancesFormed: Number(row.alliances_formed),
      gpGenerated: Number(row.gp_generated),
      newBuildersThisWeek: Number(row.new_builders_this_week),
    };
  },
};
