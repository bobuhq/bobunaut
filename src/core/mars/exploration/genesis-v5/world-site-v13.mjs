import {checkIntegratedFootprint,INTEGRATED_LAYOUT,HUB_PLACEMENT} from './integrated-campus.mjs';

/** Validate the owner/epoch-gated response of the authenticated V13 world-site RPC.
 * This validates server-supplied site identity and geometry. It never creates authority.
 * Unlike the 60s action lease, an approved durable site has no browser expiry.
 */
export function validateGenesisWorldSiteV13(response,{colonyId,releaseDigest}) {
 if (!response || response.status!=='registered' || response.colony_id!==colonyId ||
     response.release_digest!==releaseDigest ||
     typeof response.site_id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.site_id) ||
     !Number.isSafeInteger(response.authority_epoch) || response.authority_epoch<0 ||
     typeof response.registered_at!=='string' || !Number.isFinite(Date.parse(response.registered_at)))
   throw Error('V13 world-site identity or authority mismatch');
 const site=response.site;
 if (!site || site.layout!==INTEGRATED_LAYOUT || site.placement?.x!==HUB_PLACEMENT.x ||
     site.placement?.z!==HUB_PLACEMENT.z || site.placement?.rotationY!==HUB_PLACEMENT.rotationY ||
     site.occupancyComplete!==true || site.routesReserved!==true || site.placementReserved!==true)
   throw Error('V13 world-site placement contract mismatch');
 checkIntegratedFootprint(site);
 return {site,siteId:response.site_id,authorityEpoch:response.authority_epoch};
}
