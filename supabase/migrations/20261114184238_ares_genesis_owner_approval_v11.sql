begin;
-- BOBU owner authority. No owner enrollment, land grant, route seed or approval.
create schema if not exists genesis_v11;
revoke all on schema genesis_v11 from public, anon, authenticated, service_role;
create table genesis_v11.owners (
 user_id uuid primary key,
 enabled boolean not null default true
);
create table genesis_v11.proposals (
 id uuid primary key default gen_random_uuid(),
 colony_id uuid not null references public.mars_colonies(id),
 release_digest text not null check(release_digest ~ '^[a-f0-9]{64}$'),
 evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
 evidence_uri text not null check(evidence_uri ~ '^https://[^[:space:]]+$'),
 world_snapshot jsonb not null,
 site jsonb not null,
 inventory jsonb not null,
 valid_until timestamptz not null,
 created_at timestamptz not null default statement_timestamp(),
 check(valid_until > created_at and valid_until <= created_at + interval '24 hours'),
 check((site @> '{"placement":{"x":-516,"z":-213,"rotationY":0},"occupancyComplete":true,"routesReserved":true,"placementReserved":true}') is true),
 check(jsonb_typeof(site->'occupied') is not distinct from 'array'),
 check(jsonb_typeof(site->'protectedRoutes') is not distinct from 'array'),
 check(jsonb_typeof(site->'reservedCells') is not distinct from 'array'),
 check((site->'legalRegions' = '[{"kind":"box","x":-530.5,"z":-210.5,"halfWidth":54.7,"halfDepth":67.7}]') is true),
 check((inventory @> '{"completeWorldCoverage":true,"externalRoutesComplete":true,"geometryValidated":true,"landmarkExtentsVerified":true,"mapping":{"origin_x":-50.75,"origin_z":-74.75,"scale":4.5,"yaw":0}}') is true),
 check(jsonb_typeof(inventory->'routes') is not distinct from 'array'),
 check(jsonb_array_length(inventory->'routes') > 0),
 check((inventory->>'terrainDigest' ~ '^[a-f0-9]{64}$') is true),
 check((length(inventory->>'sourceRevision') >= 7) is true),
 check((site->>'ownerProposalId' = id::text) is true)
);
create table genesis_v11.decisions (
 proposal_id uuid primary key references genesis_v11.proposals(id),
 owner_id uuid not null references genesis_v11.owners(user_id),
 approved boolean not null,
 decided_at timestamptz not null default statement_timestamp()
);
create table genesis_v11.issuance (
 proposal_id uuid primary key references genesis_v11.proposals(id),
 certificate_id uuid unique not null references public.ares_genesis_certificates_v11(revision)
);
alter table genesis_v11.owners enable row level security;
alter table genesis_v11.proposals enable row level security;
alter table genesis_v11.decisions enable row level security;
alter table genesis_v11.issuance enable row level security;
revoke all on all tables in schema genesis_v11 from public, anon, authenticated, service_role;
grant usage on schema genesis_v11 to service_role;
grant select,insert on genesis_v11.proposals to service_role;
-- Conservative server validation supplements the shipped-terrain offline verifier.
create function genesis_v11.validate_proposal() returns trigger language plpgsql
set search_path=pg_catalog as $$
declare a jsonb; r jsonb; b box; routes jsonb := '[]'::jsonb;
 campus box := box(point(-585.2,-278.2),point(-475.8,-142.8));
begin
 if new.world_snapshot <> public.ares_genesis_world_snapshot_v11() then raise exception 'Stale proposal snapshot'; end if;
 for a in select value from jsonb_array_elements(new.site->'occupied') union all
          select value from jsonb_array_elements(new.site->'protectedRoutes') union all
          select value from jsonb_array_elements(new.site->'reservedCells') loop
  if a->>'kind'='box' then
   if not ((a->>'halfWidth')::float8>0 and (a->>'halfDepth')::float8>0) then raise exception 'Invalid geometry'; end if;
   b:=box(point((a->>'x')::float8-(a->>'halfWidth')::float8,(a->>'z')::float8-(a->>'halfDepth')::float8),point((a->>'x')::float8+(a->>'halfWidth')::float8,(a->>'z')::float8+(a->>'halfDepth')::float8));
  elsif a->>'kind'='circle' then
   if not ((a->>'radius')::float8>0) then raise exception 'Invalid geometry'; end if;
   b:=box(point((a->>'x')::float8-(a->>'radius')::float8,(a->>'z')::float8-(a->>'radius')::float8),point((a->>'x')::float8+(a->>'radius')::float8,(a->>'z')::float8+(a->>'radius')::float8));
  else raise exception 'Invalid geometry kind'; end if;
  if b is null or not (b <@ box(point(-6350,-6350),point(6350,6350))) or b && campus then raise exception 'Geometry conflicts with campus or world bounds'; end if;
 end loop;
 for r in select value from jsonb_array_elements(new.inventory->'routes') loop
  if not ((r->>'xMax')::float8>(r->>'xMin')::float8 and (r->>'zMax')::float8>(r->>'zMin')::float8) then raise exception 'Invalid route'; end if;
  routes:=routes || jsonb_build_array(jsonb_build_object('id',r->>'route_key','kind','box','x',((r->>'xMin')::float8+(r->>'xMax')::float8)/2,'z',((r->>'zMin')::float8+(r->>'zMax')::float8)/2,'halfWidth',((r->>'xMax')::float8-(r->>'xMin')::float8)/2,'halfDepth',((r->>'zMax')::float8-(r->>'zMin')::float8)/2));
 end loop;
 if routes <> new.site->'protectedRoutes' then raise exception 'Route registry/site mismatch'; end if;
 return new;
end $$;
create trigger validate_proposal before insert on genesis_v11.proposals for each row execute function genesis_v11.validate_proposal();
-- Immutable proposals/decisions, even with accidental future broad grants.
create function genesis_v11.immutable() returns trigger language plpgsql
set search_path=pg_catalog as $$ begin raise exception 'Owner review records are immutable'; end $$;
create trigger immutable_proposal before update or delete on genesis_v11.proposals for each row execute function genesis_v11.immutable();
create trigger immutable_decision before update or delete on genesis_v11.decisions for each row execute function genesis_v11.immutable();

create function public.get_ares_genesis_owner_proposal_v11(proposal uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not exists(select 1 from genesis_v11.owners where user_id=auth.uid() and enabled) then
  raise exception 'BOBU_OWNER_REQUIRED' using errcode='42501';
 end if;
 return (select to_jsonb(p) from genesis_v11.proposals p where id=proposal);
end $$;
create function public.decide_ares_genesis_owner_proposal_v11(proposal uuid, approve boolean)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare p genesis_v11.proposals%rowtype;
begin
 perform 1 from genesis_v11.owners where user_id=auth.uid() and enabled for share;
 if auth.uid() is null or not found then raise exception 'BOBU_OWNER_REQUIRED' using errcode='42501'; end if;
 select * into strict p from genesis_v11.proposals where id=proposal for share;
 if p.valid_until <= statement_timestamp() or p.world_snapshot <> public.ares_genesis_world_snapshot_v11() then
  raise exception 'Proposal expired or world changed';
 end if;
 if approve is null then raise exception 'Explicit decision required'; end if;
 insert into genesis_v11.decisions(proposal_id,owner_id,approved) values(proposal,auth.uid(),approve);
end $$;

-- Enforce owner decision on ALL future inserts, including direct service inserts.
create function genesis_v11.require_owner_certificate() returns trigger language plpgsql security definer
set search_path=pg_catalog as $$
begin
 if not exists(select 1 from genesis_v11.proposals p join genesis_v11.decisions d on d.proposal_id=p.id
  join genesis_v11.owners o on o.user_id=d.owner_id and o.enabled
  where d.approved and p.id::text = new.site->>'ownerProposalId'
   and p.colony_id=new.colony_id and p.release_digest=new.release_digest
   and p.evidence_digest=new.evidence_digest and p.evidence_uri=new.evidence_uri
   and p.world_snapshot=new.world_snapshot and p.site=new.site
   and new.expires_at<=p.valid_until) then raise exception 'BOBU_OWNER_APPROVAL_REQUIRED'; end if;
 return new;
end $$;
create trigger require_owner_certificate_v11 before insert on public.ares_genesis_certificates_v11
 for each row execute function genesis_v11.require_owner_certificate();

-- Existing V11 snapshot, occupancy, reservation and uniqueness triggers still run.
create function public.issue_ares_genesis_owner_certificate_v11(proposal uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
<<issuer>>
declare p genesis_v11.proposals%rowtype; cert uuid; w uuid; r jsonb; b box; occupied_digest text; routes_digest text; prior genesis_v11.proposals%rowtype; prior_certificate uuid;
begin
 select * into strict p from genesis_v11.proposals where id=proposal for update;
 if exists(select 1 from genesis_v11.issuance where proposal_id=proposal) then raise exception 'Proposal already issued'; end if;
 if p.valid_until<=statement_timestamp()+interval '30 seconds' then raise exception 'Proposal expired'; end if;
 perform 1 from genesis_v11.decisions d join genesis_v11.owners o on o.user_id=d.owner_id and o.enabled
 where d.proposal_id=proposal and d.approved for share of o;
 if not found then raise exception 'BOBU_OWNER_APPROVAL_REQUIRED'; end if;
 lock table public.mars_colony_buildings,public.mars_building_definitions,public.mars_colonies,
 public.mars_landmark_catalog,public.mars_hidden_mission_catalog in share mode;
 if p.world_snapshot <> public.ares_genesis_world_snapshot_v11() then raise exception 'World changed'; end if;

 -- Publish the exact owner-approved registry records atomically with issuance.
 -- Plain INSERT intentionally refuses to overwrite any pre-existing authority.
 -- Renew only an identical route allocation previously issued by this workflow.
 -- Unknown legacy authority is never adopted or overwritten.
 select oldp.* into prior from genesis_v11.proposals oldp
 join genesis_v11.issuance oldi on oldi.proposal_id=oldp.id
 where oldp.colony_id=p.colony_id order by oldp.created_at desc limit 1;
 w:=gen_random_uuid();
 occupied_digest:=encode(sha256(convert_to((p.site->'occupied')::text,'UTF8')),'hex');
 routes_digest:=encode(sha256(convert_to((p.site->'protectedRoutes')::text,'UTF8')),'hex');
 if prior.id is not null then
  if prior.inventory->'routes' <> p.inventory->'routes' then raise exception 'Route changes require reviewed reconciliation and lease draining'; end if;
  select certificate_id into strict prior_certificate from genesis_v11.issuance where proposal_id=prior.id;
  lock table genesis_v10.world,genesis_v10.mapping,genesis_v10.entitlement,genesis_v10.protected_routes_v5,genesis_v10.occupancy,genesis_v10.site_authority in share row exclusive mode;
  select world into strict w from genesis_v10.mapping where colony=p.colony_id and evidence=prior.evidence_uri
    and origin_x=-50.75 and origin_z=-74.75 and scale=4.5 and yaw=0;
  if not exists(select 1 from genesis_v10.world where id=w and coverage_digest=prior.evidence_digest and revision=prior.release_digest)
    or not exists(select 1 from genesis_v10.entitlement where colony=p.colony_id and evidence=prior.evidence_uri and bounds ~= box(point(-585.2,-278.2),point(-475.8,-142.8)))
    or not exists(select 1 from genesis_v10.site_authority where singleton and world=w and approval_evidence=prior.evidence_uri)
    or (select count(*) from genesis_v10.occupancy where world=w and colony=p.colony_id and kind='campus' and not physical and evidence=prior.evidence_uri)<>1 then raise exception 'Prior allocation provenance changed'; end if;
  update public.ares_genesis_certificates_v11 set revoked_at=statement_timestamp() where revision=prior_certificate and revoked_at is null;
  update genesis_v10.world set revision=p.release_digest,coverage_until=p.valid_until,coverage_digest=p.evidence_digest,enabled=true where id=w;
  update genesis_v10.mapping set revision=p.release_digest,valid_until=p.valid_until,evidence=p.evidence_uri where colony=p.colony_id;
  update genesis_v10.entitlement set valid_until=p.valid_until,evidence=p.evidence_uri where colony=p.colony_id;
  update genesis_v10.occupancy set expires_at=p.valid_until,evidence=p.evidence_uri where world=w and colony=p.colony_id and kind='campus' and not physical and evidence=prior.evidence_uri;
  update genesis_v10.site_authority set revision=p.release_digest,occupied=p.site->'occupied',protected_routes=p.site->'protectedRoutes',reserved_cells=p.site->'reservedCells',legal_regions=p.site->'legalRegions',occupancy_digest=occupied_digest,routes_digest=issuer.routes_digest,terrain_digest=p.inventory->>'terrainDigest',approval_evidence=p.evidence_uri,certified_at=statement_timestamp(),expires_at=p.valid_until,enabled=true where singleton;
  for r in select value from jsonb_array_elements(p.inventory->'routes') loop
   if not exists(select 1 from genesis_v10.protected_routes_v5 where route_key=r->>'route_key' and source_digest=r->>'source_digest' and status='reviewed'
    and bounds ~= box(point((r->>'xMin')::float8,(r->>'zMin')::float8),point((r->>'xMax')::float8,(r->>'zMax')::float8))) then raise exception 'Prior route provenance changed'; end if;
  end loop;
 else
 insert into genesis_v10.world(id,revision,coverage_until,coverage_digest,enabled)
 values(w,p.release_digest,p.valid_until,p.evidence_digest,true);
 insert into genesis_v10.mapping(colony,world,revision,origin_x,origin_z,scale,yaw,valid_until,evidence)
 values(p.colony_id,w,p.release_digest,-50.75,-74.75,4.5,0,p.valid_until,p.evidence_uri);
 insert into genesis_v10.entitlement(colony,bounds,valid_until,evidence)
 values(p.colony_id,box(point(-585.2,-278.2),point(-475.8,-142.8)),p.valid_until,p.evidence_uri);
 for r in select value from jsonb_array_elements(p.inventory->'routes') loop
  b:=box(point((r->>'xMin')::float8,(r->>'zMin')::float8),point((r->>'xMax')::float8,(r->>'zMax')::float8));
  if b is null or area(b)<=0 or not (b <@ box(point(-6350,-6350),point(6350,6350))) then raise exception 'Invalid route bounds'; end if;
  insert into genesis_v10.protected_routes_v5(sector_code,route_key,route_kind,bounds,source_revision,source_digest,status)
  values('ARES',r->>'route_key',r->>'route_kind',b,p.inventory->>'sourceRevision',r->>'source_digest','reviewed');
 end loop;
 insert into genesis_v10.occupancy(id,world,colony,kind,bounds,physical,expires_at,evidence)
 values(gen_random_uuid(),w,p.colony_id,'campus',box(point(-585.2,-278.2),point(-475.8,-142.8)),false,p.valid_until,p.evidence_uri);
 insert into genesis_v10.site_authority(singleton,world,revision,placement_x,placement_z,rotation_y,occupied,protected_routes,reserved_cells,legal_regions,occupancy_digest,routes_digest,terrain_digest,approval_evidence,certified_at,expires_at,enabled)
 values(true,w,p.release_digest,-516,-213,0,p.site->'occupied',p.site->'protectedRoutes',p.site->'reservedCells',p.site->'legalRegions',occupied_digest,routes_digest,p.inventory->>'terrainDigest',p.evidence_uri,statement_timestamp(),p.valid_until,true);
 end if;
 insert into public.ares_genesis_certificates_v11(colony_id,release_digest,evidence_digest,evidence_uri,expires_at,world_snapshot,site)
 values(p.colony_id,p.release_digest,p.evidence_digest,p.evidence_uri,p.valid_until,p.world_snapshot,p.site) returning revision into cert;
 insert into genesis_v11.issuance values(proposal,cert);
 return cert;
end $$;
create function public.withdraw_ares_genesis_owner_certificate_v11(proposal uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform 1 from genesis_v11.owners where user_id=auth.uid() and enabled for share;
 if auth.uid() is null or not found then raise exception 'BOBU_OWNER_REQUIRED' using errcode='42501'; end if;
 update public.ares_genesis_certificates_v11 c set revoked_at=statement_timestamp()
 from genesis_v11.issuance i where i.proposal_id=proposal and i.certificate_id=c.revision and c.revoked_at is null;
end $$;
revoke all on function public.withdraw_ares_genesis_owner_certificate_v11(uuid) from public,anon,authenticated,service_role;
grant execute on function public.withdraw_ares_genesis_owner_certificate_v11(uuid) to authenticated;
-- Authority edits invalidate approval even if later restored (the V11 epoch is monotonic).
-- Issuance writes registries BEFORE inserting the certificate to avoid self-invalidation.
do $do$ declare t text; begin
 foreach t in array array['world','mapping','entitlement','protected_routes_v5','occupancy','site_authority'] loop
  execute format('create trigger ares_genesis_authority_epoch_v11 after insert or update or delete or truncate on genesis_v10.%I for each statement execute function public.bump_ares_genesis_world_epoch_v11()',t);
 end loop;
end $do$;
create trigger ares_genesis_owner_epoch_v11 after insert or update or delete or truncate on genesis_v11.owners
 for each statement execute function public.bump_ares_genesis_world_epoch_v11();
revoke all on all functions in schema genesis_v11 from public,anon,authenticated,service_role;
revoke all on function public.get_ares_genesis_owner_proposal_v11(uuid), public.decide_ares_genesis_owner_proposal_v11(uuid,boolean), public.issue_ares_genesis_owner_certificate_v11(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_ares_genesis_owner_proposal_v11(uuid), public.decide_ares_genesis_owner_proposal_v11(uuid,boolean) to authenticated;
grant execute on function public.issue_ares_genesis_owner_certificate_v11(uuid) to service_role;
commit;
