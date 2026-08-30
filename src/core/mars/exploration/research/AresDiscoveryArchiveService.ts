import {
  supabase,
} from "../../../../lib/supabase";

export type AresDiscoveryRecord = {
  archiveId: string;
  researchId: string;
  missionKey: string;
  missionTitle: string;
  cycleKey: string;
  classification: string;
  findingTitle: string;
  findingSummary: string;
  archiveCode: string;
  discoveredAt: string;
};

type ArchiveRow = {
  archive_id: string;
  research_id: string;
  mission_key: string;
  mission_title: string;
  cycle_key: string;
  classification: string;
  finding_title: string;
  finding_summary: string;
  archive_code: string;
  discovered_at: string;
};

function mapRecord(
  row: ArchiveRow,
): AresDiscoveryRecord {
  return {
    archiveId:
      row.archive_id,
    researchId:
      row.research_id,
    missionKey:
      row.mission_key,
    missionTitle:
      row.mission_title,
    cycleKey:
      row.cycle_key,
    classification:
      row.classification,
    findingTitle:
      row.finding_title,
    findingSummary:
      row.finding_summary,
    archiveCode:
      row.archive_code,
    discoveredAt:
      row.discovered_at,
  };
}

export async function getMyAresDiscoveryArchive():
  Promise<AresDiscoveryRecord[]> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_ares_discovery_archive",
    );

  if (error) {
    throw error;
  }

  return (
    (
      data as
        | ArchiveRow[]
        | null
    ) ?? []
  ).map(
    mapRecord,
  );
}
