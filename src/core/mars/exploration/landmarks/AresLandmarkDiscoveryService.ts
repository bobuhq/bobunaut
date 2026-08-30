import {
  supabase,
} from "../../../../lib/supabase";

export type AresLandmarkDiscoveryStatus =
  | "surveying"
  | "discovered";

export type AresLandmarkDiscovery = {
  landmarkKey: string;
  landmarkTitle: string;
  classification: string;
  status: AresLandmarkDiscoveryStatus;
  surveyStartedAt: string;
  discoveredAt: string | null;
};

type LandmarkDiscoveryRow = {
  landmark_key: string;
  landmark_title: string;
  classification: string;
  status: AresLandmarkDiscoveryStatus;
  survey_started_at: string;
  discovered_at: string | null;
};

function mapLandmarkDiscovery(
  row: LandmarkDiscoveryRow,
): AresLandmarkDiscovery {
  return {
    landmarkKey:
      row.landmark_key,
    landmarkTitle:
      row.landmark_title,
    classification:
      row.classification,
    status:
      row.status,
    surveyStartedAt:
      row.survey_started_at,
    discoveredAt:
      row.discovered_at,
  };
}

export async function getMyAresLandmarkDiscoveries():
  Promise<AresLandmarkDiscovery[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_ares_landmark_discoveries",
    );

  if (error) {
    throw error;
  }

  return (
    (
      data as
        | LandmarkDiscoveryRow[]
        | null
    ) ?? []
  ).map(
    mapLandmarkDiscovery,
  );
}

export async function startMyAresLandmarkSurvey(
  landmarkKey: string,
): Promise<AresLandmarkDiscovery> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "start_my_ares_landmark_survey",
      {
        p_landmark_key:
          landmarkKey,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    (
      data as
        | LandmarkDiscoveryRow[]
        | null
    )?.[0];

  if (!row) {
    throw new Error(
      "Landmark survey did not return a record",
    );
  }

  return mapLandmarkDiscovery(
    row,
  );
}

export async function completeMyAresLandmarkSurvey(
  landmarkKey: string,
): Promise<AresLandmarkDiscovery> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "complete_my_ares_landmark_survey",
      {
        p_landmark_key:
          landmarkKey,
      },
    );

  if (error) {
    throw error;
  }

  const row =
    (
      data as
        | LandmarkDiscoveryRow[]
        | null
    )?.[0];

  if (!row) {
    throw new Error(
      "Landmark survey completion did not return a record",
    );
  }

  return mapLandmarkDiscovery(
    row,
  );
}
