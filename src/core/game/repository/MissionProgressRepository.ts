import { supabase } from "../../../lib/supabase";

import {
  MISSION_STATUSES,
  type MissionProgress,
  type MissionStatus,
} from "../models";

interface MissionProgressRow {
  id: string;
  builder_id: string;
  mission_id: string;
  cycle_key: string;
  status: string;
  progress: number;
  version: number;
  last_event_at: string | null;
  completed_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

const missionProgressColumns = `
  id,
  builder_id,
  mission_id,
  cycle_key,
  status,
  progress,
  version,
  last_event_at,
  completed_at,
  claimed_at,
  created_at,
  updated_at
`;

const isMissionStatus = (
  value: string,
): value is MissionStatus =>
  MISSION_STATUSES.some(
    (status) => status === value,
  );

const mapMissionProgressRow = (
  row: MissionProgressRow,
): MissionProgress => {
  if (!isMissionStatus(row.status)) {
    throw new Error(
      `Unknown mission status received: ${row.status}`,
    );
  }

  return {
    missionId: row.mission_id,
    cycleKey: row.cycle_key,
    status: row.status,
    progress: row.progress,
    version: row.version,
    lastEventAt:
      row.last_event_at ?? undefined,
    completedAt:
      row.completed_at ?? undefined,
    claimedAt:
      row.claimed_at ?? undefined,
  };
};

const requireBuilderId = (
  builderId: string,
): string => {
  const normalizedBuilderId = builderId.trim();

  if (normalizedBuilderId.length === 0) {
    throw new Error(
      "Builder ID is required to load mission progress.",
    );
  }

  return normalizedBuilderId;
};

const requireMissionId = (
  missionId: string,
): string => {
  const normalizedMissionId = missionId.trim();

  if (normalizedMissionId.length === 0) {
    throw new Error(
      "Mission ID is required to load mission progress.",
    );
  }

  return normalizedMissionId;
};

const requireCycleKey = (
  cycleKey: string,
): string => {
  const normalizedCycleKey = cycleKey.trim();

  if (normalizedCycleKey.length === 0) {
    throw new Error(
      "Cycle key is required to load mission progress.",
    );
  }

  return normalizedCycleKey;
};

export const missionProgressRepository = {
  async loadByBuilder(
    builderId: string,
  ): Promise<MissionProgress[]> {
    const normalizedBuilderId =
      requireBuilderId(builderId);

    const { data, error } = await supabase
      .from("mission_progress")
      .select(missionProgressColumns)
      .eq("builder_id", normalizedBuilderId)
      .order("created_at", {
        ascending: true,
      })
      .returns<MissionProgressRow[]>();

    if (error) {
      throw new Error(
        `Mission progress could not be loaded: ${error.message}`,
      );
    }

    return (data ?? []).map(
      mapMissionProgressRow,
    );
  },

  async loadOne(
    builderId: string,
    missionId: string,
    cycleKey: string,
  ): Promise<MissionProgress | null> {
    const normalizedBuilderId =
      requireBuilderId(builderId);

    const normalizedMissionId =
      requireMissionId(missionId);

    const normalizedCycleKey =
      requireCycleKey(cycleKey);

    const { data, error } = await supabase
      .from("mission_progress")
      .select(missionProgressColumns)
      .eq("builder_id", normalizedBuilderId)
      .eq("mission_id", normalizedMissionId)
      .eq("cycle_key", normalizedCycleKey)
      .maybeSingle<MissionProgressRow>();

    if (error) {
      throw new Error(
        `Mission progress could not be loaded: ${error.message}`,
      );
    }

    return data
      ? mapMissionProgressRow(data)
      : null;
  },
};
