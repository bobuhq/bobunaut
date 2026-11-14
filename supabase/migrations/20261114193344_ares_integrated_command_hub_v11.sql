begin;
-- A topology change cannot free the old footprint while any browser lease survives.
do $preflight$ begin
 if exists(select 1 from public.ares_genesis_certificates_v11 where expires_at>statement_timestamp()
   and (revoked_at is null or revoked_at>statement_timestamp()-interval '60 seconds')) then
  raise exception 'Revoke V11 certificates and drain leases before changing campus topology';
 end if;
end $preflight$;
-- The existing Hub remains occupied. Only disjoint additions are newly reserved.
-- Never adopt an old distant-land certificate, entitlement or owner decision.
create function genesis_v11.integrated_reservations() returns jsonb language sql immutable
set search_path=pg_catalog as $fn$ select '[{"id":"greenhouse","kind":"box","x":-78,"z":-72,"halfWidth":10.1,"halfDepth":6.1},{"id":"habitat","kind":"box","x":-23,"z":-63,"halfWidth":7.6,"halfDepth":7.6},{"id":"relay-yellow","kind":"box","x":-104,"z":-60,"halfWidth":4.6,"halfDepth":4.6},{"id":"relay-red","kind":"box","x":-8,"z":-100,"halfWidth":4.6,"halfDepth":4.6},{"id":"relay-green","kind":"box","x":-8,"z":-20,"halfWidth":4.6,"halfDepth":4.6},{"id":"hub-approach","kind":"box","x":-44,"z":-50.5,"halfWidth":1.7999999999999998,"halfDepth":6.1},{"id":"courtyard","kind":"box","x":-42,"z":-47,"halfWidth":6.6,"halfDepth":5.6},{"id":"west-walk","kind":"box","x":-74,"z":-45,"halfWidth":30.6,"halfDepth":1.7999999999999998},{"id":"greenhouse-walk","kind":"box","x":-78,"z":-55,"halfWidth":1.7999999999999998,"halfDepth":10.6},{"id":"west-relay-walk","kind":"box","x":-104,"z":-50,"halfWidth":1.7999999999999998,"halfDepth":5.6},{"id":"research-walk","kind":"box","x":-26,"z":-53,"halfWidth":18.6,"halfDepth":1.7999999999999998},{"id":"research-approach","kind":"box","x":-23,"z":-54,"halfWidth":1.7999999999999998,"halfDepth":1.6},{"id":"east-walk","kind":"box","x":-3,"z":-53,"halfWidth":5.6,"halfDepth":1.7999999999999998},{"id":"east-service-walk","kind":"box","x":2,"z":-76.5,"halfWidth":1.7999999999999998,"halfDepth":24.1},{"id":"rear-relay-walk","kind":"box","x":-0.5,"z":-100,"halfWidth":3.1,"halfDepth":1.7999999999999998},{"id":"front-service-walk","kind":"box","x":2,"z":-36.5,"halfWidth":1.7999999999999998,"halfDepth":17.1},{"id":"front-relay-walk","kind":"box","x":-0.5,"z":-20,"halfWidth":3.1,"halfDepth":1.7999999999999998},{"id":"lamp-0","kind":"box","x":-46,"z":-50,"halfWidth":0.76,"halfDepth":0.76},{"id":"lamp-1","kind":"box","x":-38,"z":-44,"halfWidth":0.76,"halfDepth":0.76},{"id":"lamp-2","kind":"box","x":-66,"z":-43,"halfWidth":0.76,"halfDepth":0.76},{"id":"lamp-3","kind":"box","x":-86,"z":-43,"halfWidth":0.76,"halfDepth":0.76},{"id":"lamp-4","kind":"box","x":-20,"z":-55,"halfWidth":0.76,"halfDepth":0.76},{"id":"lamp-5","kind":"box","x":4,"z":-66,"halfWidth":0.76,"halfDepth":0.76},{"id":"lamp-6","kind":"box","x":4,"z":-28,"halfWidth":0.76,"halfDepth":0.76}]'::jsonb $fn$;
revoke all on function genesis_v11.integrated_reservations() from public,anon,authenticated;
grant execute on function genesis_v11.integrated_reservations() to service_role;
create table genesis_v11.integrated_allocations (
 proposal_id uuid primary key references genesis_v11.proposals(id),
 certificate_id uuid unique not null references public.ares_genesis_certificates_v11(revision),
 regions jsonb not null check(jsonb_typeof(regions)='array'),
 created_at timestamptz not null default statement_timestamp()
);
alter table genesis_v11.integrated_allocations enable row level security;
revoke all on genesis_v11.integrated_allocations from public,anon,authenticated,service_role;
-- Remove only obsolete placement/entitlement-shape checks, keeping auth, leases,
-- snapshot triggers, provenance, array types, immutability and uniqueness intact.
do $do$ declare r record; begin
 for r in select conrelid::regclass as tab,conname from pg_constraint
 where conrelid in ('public.ares_genesis_certificates_v11'::regclass,'genesis_v11.proposals'::regclass)
 and contype='c' and (pg_get_constraintdef(oid) like '%placement%' or pg_get_constraintdef(oid) like '%legalRegions%') loop
  execute format('alter table %s drop constraint %I',r.tab,r.conname);
 end loop;
end $do$;
alter table public.ares_genesis_certificates_v11 add constraint integrated_site_contract check
 ((site @> '{"layout":"integrated-command-hub-v11","placement":{"x":-44,"z":-68,"rotationY":0},"occupancyComplete":true,"routesReserved":true,"placementReserved":true}') is true or revoked_at is not null) not valid;
alter table genesis_v11.proposals add constraint integrated_proposal_contract check
 ((site @> '{"layout":"integrated-command-hub-v11","placement":{"x":-44,"z":-68,"rotationY":0},"occupancyComplete":true,"routesReserved":true,"placementReserved":true}') is true) not valid;

create function genesis_v11.validate_integrated_site(s jsonb) returns void language plpgsql
set search_path=pg_catalog as $fn$
declare a jsonb; o jsonb; shape box; target box; r jsonb; contained boolean;
begin
 if (s->>'layout') is distinct from 'integrated-command-hub-v11' or
    (s->'placement') is distinct from '{"x":-44,"z":-68,"rotationY":0}'::jsonb or
    (s->'reservations') is distinct from genesis_v11.integrated_reservations() then raise exception 'OBSOLETE_OR_INVALID_INTEGRATED_LAYOUT'; end if;
 for a in select value from jsonb_array_elements(genesis_v11.integrated_reservations()) loop
  target:=box(point((a->>'x')::float8-(a->>'halfWidth')::float8,(a->>'z')::float8-(a->>'halfDepth')::float8),point((a->>'x')::float8+(a->>'halfWidth')::float8,(a->>'z')::float8+(a->>'halfDepth')::float8));
  contained:=false;
  for r in select value from jsonb_array_elements(s->'legalRegions') loop
   if r->>'kind'='box' and (r->>'halfWidth')::float8>0 and (r->>'halfDepth')::float8>0 and
    abs((a->>'x')::float8-(r->>'x')::float8)+(a->>'halfWidth')::float8 <= (r->>'halfWidth')::float8+1e-10 and
    abs((a->>'z')::float8-(r->>'z')::float8)+(a->>'halfDepth')::float8 <= (r->>'halfDepth')::float8+1e-10 then contained:=true; end if;
  end loop;
  if not contained then raise exception 'Integrated entitlement missing'; end if;
  for o in select value from jsonb_array_elements(s->'occupied') union all select value from jsonb_array_elements(s->'protectedRoutes') union all select value from jsonb_array_elements(s->'reservedCells') loop
   if o->>'kind'='box' then
    shape:=box(point((o->>'x')::float8-(o->>'halfWidth')::float8,(o->>'z')::float8-(o->>'halfDepth')::float8),point((o->>'x')::float8+(o->>'halfWidth')::float8,(o->>'z')::float8+(o->>'halfDepth')::float8));
    if not ((o->>'halfWidth')::float8>0 and (o->>'halfDepth')::float8>0) then raise exception 'Invalid obstacle'; end if;
   elsif o->>'kind'='circle' then
    -- Conservative circle bounds; no false-negative collision approval.
    shape:=box(point((o->>'x')::float8-(o->>'radius')::float8,(o->>'z')::float8-(o->>'radius')::float8),point((o->>'x')::float8+(o->>'radius')::float8,(o->>'z')::float8+(o->>'radius')::float8));
    if not ((o->>'radius')::float8>0) then raise exception 'Invalid obstacle'; end if;
   else raise exception 'Invalid obstacle kind'; end if;
   if shape is null or shape && target then raise exception 'Integrated occupancy/route conflict'; end if;
  end loop;
 end loop;
end $fn$;
create or replace function genesis_v11.validate_proposal() returns trigger language plpgsql
set search_path=pg_catalog as $fn$ begin
 if new.world_snapshot <> public.ares_genesis_world_snapshot_v11() then raise exception 'Stale proposal snapshot'; end if;
 if exists(select 1 from jsonb_array_elements(new.inventory->'routes') r where (r->>'source_digest' ~ '^[a-f0-9]{64}$') is not true or (length(r->>'route_key')>0) is not true or (r->>'route_kind' in ('entrance','walking','landing_access','service','emergency')) is not true) then raise exception 'Route provenance required'; end if;
 if new.site->'protectedRoutes' is distinct from (select coalesce(jsonb_agg(jsonb_build_object('id',r->>'route_key','kind','box','x',((r->>'xMin')::float8+(r->>'xMax')::float8)/2,'z',((r->>'zMin')::float8+(r->>'zMax')::float8)/2,'halfWidth',((r->>'xMax')::float8-(r->>'xMin')::float8)/2,'halfDepth',((r->>'zMax')::float8-(r->>'zMin')::float8)/2) order by ord),'[]'::jsonb) from jsonb_array_elements(new.inventory->'routes') with ordinality as t(r,ord)) then raise exception 'Route registry/site mismatch'; end if;
 perform genesis_v11.validate_integrated_site(new.site);return new;
end $fn$;
create function genesis_v11.guard_integrated_certificate() returns trigger language plpgsql
set search_path=pg_catalog as $fn$ begin perform genesis_v11.validate_integrated_site(new.site);return new;end $fn$;
create trigger integrated_certificate_geometry before insert on public.ares_genesis_certificates_v11
for each row execute function genesis_v11.guard_integrated_certificate();

-- Same shared grid conversion, now checked against each actual addition. The Hub
-- and all live player buildings remain obstacles; no building-key exception exists.
create or replace function public.ares_genesis_building_conflicts_v11(gx integer,gz integer,rotation integer,width integer,depth integer)
returns boolean language sql immutable set search_path=pg_catalog as $fn$
 select case when gx is null or gz is null or rotation is null or rotation not in(0,90,180,270)
 or width is null or depth is null or width not between 1 and 8 or depth not between 1 and 8 then true else
 exists(select 1 from jsonb_array_elements(genesis_v11.integrated_reservations()) a where
 abs((-50.75+(gx+((case when rotation in(90,270) then depth else width end)-1)/2.0)*4.5)-(a->>'x')::numeric)
 <= (a->>'halfWidth')::numeric+(case when rotation in(90,270) then depth else width end)*2.25+.6 and
 abs((-74.75+(gz+((case when rotation in(90,270) then width else depth end)-1)/2.0)*4.5)-(a->>'z')::numeric)
 <= (a->>'halfDepth')::numeric+(case when rotation in(90,270) then width else depth end)*2.25+.6) end;
$fn$;
create or replace function public.issue_ares_genesis_owner_certificate_v11(proposal uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $fn$
declare p genesis_v11.proposals%rowtype; cert uuid; previous_site jsonb;
begin
 select * into strict p from genesis_v11.proposals where id=proposal for update;
 if exists(select 1 from genesis_v11.issuance where proposal_id=proposal) then raise exception 'Proposal already issued'; end if;
 perform 1 from genesis_v11.decisions d join genesis_v11.owners o on o.user_id=d.owner_id and o.enabled where d.proposal_id=proposal and d.approved for share of o;
 if not found then raise exception 'BOBU_OWNER_APPROVAL_REQUIRED'; end if;
 lock table public.mars_colony_buildings,public.mars_building_definitions,public.mars_colonies,public.mars_landmark_catalog,public.mars_hidden_mission_catalog in share mode;
 if p.world_snapshot<>public.ares_genesis_world_snapshot_v11() or p.valid_until<=statement_timestamp()+interval '30 seconds' then raise exception 'Stale proposal'; end if;
 perform genesis_v11.validate_integrated_site(p.site);
 select site into previous_site from public.ares_genesis_certificates_v11 where revoked_at is null for update;
 if found then
  if previous_site->>'layout' is distinct from 'integrated-command-hub-v11' or previous_site->'protectedRoutes' is distinct from p.site->'protectedRoutes' then raise exception 'Revoke obsolete allocation and drain leases before issuance'; end if;
  update public.ares_genesis_certificates_v11 set revoked_at=statement_timestamp() where revoked_at is null;
 end if;
 -- Also refuse overlap with any still-draining obsolete certificate.
 if exists(select 1 from public.ares_genesis_certificates_v11 where expires_at>statement_timestamp() and revoked_at>statement_timestamp()-interval '60 seconds' and site->>'layout' is distinct from 'integrated-command-hub-v11') then raise exception 'Obsolete certificate leases still draining'; end if;
 insert into public.ares_genesis_certificates_v11(colony_id,release_digest,evidence_digest,evidence_uri,expires_at,world_snapshot,site)
 values(p.colony_id,p.release_digest,p.evidence_digest,p.evidence_uri,p.valid_until,p.world_snapshot,p.site) returning revision into cert;
 insert into genesis_v11.issuance values(proposal,cert);
 insert into genesis_v11.integrated_allocations(proposal_id,certificate_id,regions) values(proposal,cert,genesis_v11.integrated_reservations());
 return cert;
end $fn$;
-- The authenticated compatibility RPC explicitly refuses the obsolete topology.
create or replace function public.get_ares_genesis_placement_v10() returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $fn$
declare c public.ares_genesis_certificates_v11%rowtype; colony uuid; n int;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 select count(*),(array_agg(colony_id))[1] into n,colony from public.mars_colony_memberships where builder_id=auth.uid() and status='active';
 if n<>1 then return jsonb_build_object('status','blocked','reason','Unambiguous active colony required'); end if;
 select * into c from public.ares_genesis_certificates_v11 where colony_id=colony and revoked_at is null and issued_at<=statement_timestamp() and expires_at>statement_timestamp()+interval '30 seconds' and site->>'layout'='integrated-command-hub-v11';
 if not found then return jsonb_build_object('status','blocked','reason','No integrated Hub certificate'); end if;
 if c.world_snapshot<>public.ares_genesis_world_snapshot_v11() then return jsonb_build_object('status','blocked','reason','World changed'); end if;
 return jsonb_build_object('status','approved','revision',c.revision,'colony_id',c.colony_id,'release_digest',c.release_digest,'evidence_digest',c.evidence_digest,'issued_at',c.issued_at,'expires_at',least(c.expires_at,statement_timestamp()+interval '60 seconds'),'server_time',statement_timestamp(),'site',c.site);
end $fn$;
revoke all on all functions in schema genesis_v11 from public,anon,authenticated;
grant execute on function genesis_v11.validate_integrated_site(jsonb) to service_role;
revoke all on function public.issue_ares_genesis_owner_certificate_v11(uuid) from public,anon,authenticated;
grant execute on function public.issue_ares_genesis_owner_certificate_v11(uuid) to service_role;
revoke all on function public.get_ares_genesis_placement_v10() from public,anon;
grant execute on function public.get_ares_genesis_placement_v10() to authenticated;
commit;
