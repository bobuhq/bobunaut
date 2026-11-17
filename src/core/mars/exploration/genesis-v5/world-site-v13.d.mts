export interface GenesisWorldSiteV13Response {
  status: 'registered';
  colony_id: string;
  release_digest: string;
  site_id: string;
  authority_epoch: number;
  registered_at: string;
  site: Record<string, unknown>;
}

export interface GenesisWorldSiteV13Validation {
  site: Record<string, unknown>;
  siteId: string;
  authorityEpoch: number;
}

export function validateGenesisWorldSiteV13(
  response: unknown,
  context: {
    colonyId: string;
    releaseDigest: string;
  }
): GenesisWorldSiteV13Validation;
