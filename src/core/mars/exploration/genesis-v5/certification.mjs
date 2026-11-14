import {checkV11Footprint} from './v11-footprint.mjs';
/** Validate an authenticated server response. This never issues a certificate. */
export function validateGenesisCertificate(result,{colonyId,releaseDigest,now=Date.now()}) {
 if(!result || result.status!=='approved' || result.colony_id!==colonyId || result.release_digest!==releaseDigest || !/^[a-f0-9]{64}$/.test(result.evidence_digest ?? '') || typeof result.revision!=='string' || !result.revision)throw Error('Certificate identity or release mismatch');
 const issued=Date.parse(result.issued_at),expires=Date.parse(result.expires_at),server=Date.parse(result.server_time);
 if(![issued,expires,server,now].every(Number.isFinite) || issued>server || server-issued>86400000 || expires<=server+30000 || expires>server+60000 || expires-issued>86400000 || Math.abs(server-now)>30000 || expires<=now+30000)throw Error('Certificate lease invalid');
 const site=result.site,p=site?.placement;
 if(!p || p.x!==-516 || p.z!==-213 || p.rotationY!==0 || site.occupancyComplete!==true || site.routesReserved!==true || site.placementReserved!==true)throw Error('Incomplete certified site');
 checkV11Footprint(p,{obstacles:site.occupied,protectedRoutes:site.protectedRoutes,reservedCells:site.reservedCells,legalRegions:site.legalRegions});
 return {expiresAt:expires,site};
}
