import {
  supabase,
} from "../../../../lib/supabase";

export type AresHiddenMission = {
  missionKey: string;
  title: string;
  briefing: string;
  targetX: number;
  targetZ: number;
  targetRadius: number;
  rewardGp: number;
  cycleKey: string;
  status:
    | "accepted"
    | "completed"
    | "claimed";
  acceptedAt: string;
  acceptedNow?: boolean;
};

type MissionRow = {
  mission_key: string;
  title: string;
  briefing: string;
  target_x: number;
  target_z: number;
  target_radius: number;
  reward_gp: number;
  cycle_key: string;
  status:
    | "accepted"
    | "completed"
    | "claimed";
  accepted_at: string;
  accepted_now?: boolean;
};

function mapMission(
  row: MissionRow,
): AresHiddenMission {
  return {
    missionKey:
      row.mission_key,
    title:
      row.title,
    briefing:
      row.briefing,
    targetX:
      Number(
        row.target_x,
      ),
    targetZ:
      Number(
        row.target_z,
      ),
    targetRadius:
      Number(
        row.target_radius,
      ),
    rewardGp:
      Number(
        row.reward_gp,
      ),
    cycleKey:
      row.cycle_key,
    status:
      row.status,
    acceptedAt:
      row.accepted_at,
    acceptedNow:
      row.accepted_now,
  };
}

export async function getMyAresHiddenMission():
Promise<AresHiddenMission | null> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_ares_hidden_mission",
    );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(
      data,
    )
      ? data[0]
      : null;

  if (!row) {
    return null;
  }

  return mapMission(
    row as MissionRow,
  );
}

export async function accessMyAresMissionTerminal():
Promise<AresHiddenMission> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "access_my_ares_mission_terminal",
    );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(
      data,
    )
      ? data[0]
      : null;

  if (!row) {
    throw new Error(
      "Mission terminal returned no mission.",
    );
  }

  return mapMission(
    row as MissionRow,
  );
}

export type AresHiddenMissionScan = {
  missionKey: string;
  cycleKey: string;
  scanStartedAt: string;
  earliestCompleteAt: string;
};

export type AresHiddenMissionCompletion = {
  completedNow: boolean;
  missionKey: string;
  cycleKey: string;
  rewardGp: number;
  totalGp: number;
  ledgerId:
    | string
    | null;
  status:
    | "accepted"
    | "completed"
    | "claimed";
  completedAt:
    | string
    | null;
};

export async function startMyAresHiddenMissionScan(
  missionKey: string,
): Promise<AresHiddenMissionScan> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "start_my_ares_hidden_mission_scan",
      {
        p_mission_key:
          missionKey,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(
      data,
    )
      ? data[0]
      : null;

  if (!row) {
    throw new Error(
      "Mission scan start returned no data.",
    );
  }

  return {
    missionKey:
      row.mission_key,
    cycleKey:
      row.cycle_key,
    scanStartedAt:
      row.scan_started_at,
    earliestCompleteAt:
      row.earliest_complete_at,
  };
}

export async function completeMyAresHiddenMission(
  missionKey: string,
): Promise<AresHiddenMissionCompletion> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "complete_my_ares_hidden_mission",
      {
        p_mission_key:
          missionKey,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(
      data,
    )
      ? data[0]
      : null;

  if (!row) {
    throw new Error(
      "Mission completion returned no data.",
    );
  }

  return {
    completedNow:
      Boolean(
        row.completed_now,
      ),
    missionKey:
      row.mission_key,
    cycleKey:
      row.cycle_key,
    rewardGp:
      Number(
        row.reward_gp,
      ),
    totalGp:
      Number(
        row.total_gp,
      ),
    ledgerId:
      row.ledger_id,
    status:
      row.status,
    completedAt:
      row.completed_at,
  };
}
