import {checkIntegratedFootprint,HUB_PLACEMENT,INTEGRATED_LAYOUT} from './integrated-campus.mjs';
/** Validate an authenticated server response. This never issues a certificate. */
export function validateGenesisCertificate(result,{colonyId,releaseDigest,now=Date.now()}) {
 if(!result || result.status!=='approved' || result.colony_id!==colonyId || result.release_digest!==releaseDigest || !/^[a-f0-9]{64}$/.test(result.evidence_digest ?? '') || typeof result.revision!=='string' || !result.revision)throw Error('Certificate identity or release mismatch');
 const issued=Date.parse(result.issued_at),expires=Date.parse(result.expires_at),server=Date.parse(result.server_time);
 if(![issued,expires,server,now].every(Number.isFinite) || issued>server || server-issued>86400000 || expires<=server+30000 || expires>server+60000 || expires-issued>86400000 || Math.abs(server-now)>30000 || expires<=now+30000)throw Error('Certificate lease invalid');
 const site=result.site,p=site?.placement;
 if(!p || p.x!==HUB_PLACEMENT.x || p.z!==HUB_PLACEMENT.z || p.rotationY!==0 || site.occupancyComplete!==true || site.routesReserved!==true || site.placementReserved!==true)throw Error('Incomplete certified site');
 if(site.layout!==INTEGRATED_LAYOUT)throw Error('Obsolete campus certificate');
 checkIntegratedFootprint(site);
 return {expiresAt:expires,site};
}
