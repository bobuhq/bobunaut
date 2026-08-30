import {
  supabase,
} from "../../../../lib/supabase";

export type AresResearch = {
  researchId: string;
  missionKey: string;
  title: string;
  cycleKey: string;
  status:
    | "ready"
    | "analyzing"
    | "completed";
  analysisStartedAt:
    | string
    | null;
  completedAt:
    | string
    | null;
};

type ResearchRow = {
  research_id: string;
  mission_key: string;
  title: string;
  cycle_key: string;
  status:
    | "ready"
    | "analyzing"
    | "completed";
  analysis_started_at:
    | string
    | null;
  completed_at:
    | string
    | null;
};

function mapResearch(
  row: ResearchRow,
): AresResearch {
  return {
    researchId:
      row.research_id,
    missionKey:
      row.mission_key,
    title:
      row.title,
    cycleKey:
      row.cycle_key,
    status:
      row.status,
    analysisStartedAt:
      row.analysis_started_at,
    completedAt:
      row.completed_at,
  };
}

export async function getMyAresResearch():
  Promise<AresResearch | null> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_ares_research",
    );

  if (error) {
    throw error;
  }

  const row =
    (
      data as
        | ResearchRow[]
        | null
    )?.[0];

  return row
    ? mapResearch(row)
    : null;
}

export async function startMyAresResearch(
  missionKey: string,
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "start_my_ares_research",
      {
        p_mission_key:
          missionKey,
      },
    );

  if (error) {
    throw error;
  }

  return (
    data as Array<{
      research_id: string;
      mission_key: string;
      status: string;
      analysis_started_at:
        string | null;
      earliest_complete_at:
        string | null;
    }>
  )[0];
}

export async function completeMyAresResearch(
  missionKey: string,
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "complete_my_ares_research",
      {
        p_mission_key:
          missionKey,
      },
    );

  if (error) {
    throw error;
  }

  return (
    data as Array<{
      completed_now:
        boolean;
      research_id:
        string;
      mission_key:
        string;
      cycle_key:
        string;
      status:
        string;
      completed_at:
        string | null;
    }>
  )[0];
}
