-- Read-only reproduction of core certification observations. No identity spoofing.
begin read only;
with snapshot as (
  select public.ares_genesis_world_snapshot_v11() as body
)
select statement_timestamp() as observed_at,
       encode(sha256(convert_to(body::text,'UTF8')),'hex') as snapshot_sha256,
       octet_length(body::text) as snapshot_bytes,
       body->'epoch' as epoch,
       jsonb_array_length(body->'colonies') as colonies,
       jsonb_array_length(body->'buildings') as building_records,
       jsonb_array_length(body->'landmarks') as landmarks,
       jsonb_array_length(body->'mission_catalog') as missions
from snapshot;
select genesis_v10.audit_ares_candidate_geometry_v3();
select * from genesis_v10.authority_readiness_v2();
select 'world' as authority, count(*) from genesis_v10.world
union all select 'mapping',count(*) from genesis_v10.mapping
union all select 'entitlement',count(*) from genesis_v10.entitlement
union all select 'protected_routes',count(*) from genesis_v10.protected_routes_v5
union all select 'occupancy',count(*) from genesis_v10.occupancy
union all select 'site_authority',count(*) from genesis_v10.site_authority
union all select 'v11_certificates',count(*) from public.ares_genesis_certificates_v11;
select id,status,source_revision,expires_at,
       expires_at<=statement_timestamp() as expired,
       jsonb_array_length(routes_inventory) as route_count,
       source_inventory->'server_verified' as server_verified,
       source_inventory->'complete_world_coverage' as complete_world_coverage
from genesis_v10.authority_evidence_v2;
select has_function_privilege('authenticated','public.get_ares_genesis_placement_v10()','execute') as authenticated_can_call,
       has_function_privilege('anon','public.get_ares_genesis_placement_v10()','execute') as anonymous_can_call;
commit;
