from pathlib import Path

root = Path.cwd()
client = root/'src/core/mars/exploration/genesis-v5/AresColonyOccupancyAdapter.ts'
scene = root/'src/core/mars/exploration/genesis-v5/AresGenesisCampusIntegration.tsx'

src = client.read_text()
old = "import {validateGenesisCertificate} from './certification.mjs';"
new = old + "\nimport {validateGenesisWorldSiteV13} from './world-site-v13.mjs';"
if src.count(old)!=1: raise SystemExit('STOP: unexpected adapter import; nothing changed')
src = src.replace(old,new)
append = '''
/** Read an independently registered world site. Only the authenticated RPC can
 * assert registration; browser storage and a 60s action lease are never sources.
 * A missing V13 RPC means an older backend; any OTHER backend error fails closed.
 */
export async function reviewAresGenesisWorldSiteV13() {
 const occupancy = await readAresColonyOccupancy();
 if (!occupancy.colonyId) return {status:'blocked' as const};
 const {data,error} = await supabase.rpc('get_ares_genesis_world_site_v13');
 if (error) {
  // Safe backwards compatibility until the V13 database migration is installed.
  if (error.code === 'PGRST202') return {status:'unavailable' as const};
  return {status:'blocked' as const};
 }
 if (!data || typeof data!=='object' || Array.isArray(data)) return {status:'blocked' as const};
 try {
  const result=data as Record<string,unknown>;
  const validated=validateGenesisWorldSiteV13(result,{
   colonyId:occupancy.colonyId, releaseDigest:release.sha256
  });
  return {status:'registered' as const,site:validated.site,siteId:validated.siteId};
 } catch {
  return {status:'blocked' as const};
 }
}
'''
if 'reviewAresGenesisWorldSiteV13' in src: raise SystemExit('STOP: V13 bridge already present')
client.write_text(src+append)

src = scene.read_text()
old="import {reviewAresGenesisPlacement} from './AresColonyOccupancyAdapter';"
new="import {reviewAresGenesisPlacement,reviewAresGenesisWorldSiteV13} from './AresColonyOccupancyAdapter';"
if src.count(old)!=1: raise SystemExit('STOP: unexpected scene import')
src=src.replace(old,new)
old="""    const review=await reviewAresGenesisPlacement();
    if(!active)return;
    if(review.status!=='approved' || !('site' in review) || !('expiresAt' in review)) {revoke();return;}
    // Approval is a fresh backend response; the scene is never authorized by site source constants.
    const approved=review.site;
    const expiresAt=review.expiresAt;
    if(expiryTimer)clearTimeout(expiryTimer);
    expiryTimer=setTimeout(revoke,Math.max(0,expiresAt-Date.now()-15000));"""
new="""    // V13: only an authenticated durable world-site read can authorize rendering.
    // Before V13 RPC installation, preserve the existing, independently verified V11 lease.
    const worldSite=await reviewAresGenesisWorldSiteV13();
    if(!active)return;
    const durable=worldSite.status==='registered';
    const review=worldSite.status==='unavailable' ? await reviewAresGenesisPlacement() : worldSite;
    if(!active)return;
    if((review.status!=='approved' && review.status!=='registered') || !('site' in review) || !review.site) {revoke();return;}
    const approved=review.site;
    const expiresAt=review.status==='approved'?review.expiresAt:null;
    if(expiryTimer){clearTimeout(expiryTimer);expiryTimer=undefined;}
    if(!durable && expiresAt!==null)
     expiryTimer=setTimeout(revoke,Math.max(0,expiresAt-Date.now()-15000));"""
if src.count(old)!=1: raise SystemExit('STOP: unexpected scene authorization flow')
src=src.replace(old,new)
old="if(active&&Date.now()<expiresAt-15000){setSite(next);setPlacementStatus('READY');}"
new="if(active&&(durable || (expiresAt!==null&&Date.now()<expiresAt-15000))){setSite(next);setPlacementStatus('READY');}"
if src.count(old)!=1: raise SystemExit('STOP: unexpected scene expiry flow')
src=src.replace(old,new)
scene.write_text(src)
print('V13_SCENE_BRIDGE_PATCHED: durable world read separate from 60s action leases')
