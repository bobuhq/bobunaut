begin;

-- No seed approvals, player updates, resource grants or production activation.
-- Service operators may record certificates only after independent world, route,
-- entitlement, reservation and release evidence has been verified.
create table public.ares_genesis_certificates_v11 (
  revision uuid primary key default gen_random_uuid(),
  colony_id uuid not null references public.mars_colonies(id) on delete restrict,
  release_digest text not null check (release_digest ~ '^[a-f0-9]{64}$'),
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_uri text not null check (evidence_uri ~ '^https://[^[:space:]]+$'),
  issued_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  world_snapshot jsonb not null,
  site jsonb not null,
  check (expires_at > issued_at and expires_at <= issued_at + interval '24 hours'),
  check (jsonb_typeof(world_snapshot) = 'object'),
  check (jsonb_typeof(site) = 'object'),
  check (site @> '{"placement":{"x":-516,"z":-213,"rotationY":0},"occupancyComplete":true,"routesReserved":true,"placementReserved":true}'::jsonb),
  check (jsonb_typeof(site->'occupied') is not distinct from 'array'),
  check (jsonb_typeof(site->'protectedRoutes') is not distinct from 'array'),
  check (jsonb_typeof(site->'reservedCells') is not distinct from 'array'),
  check (jsonb_typeof(site->'legalRegions') is not distinct from 'array'),
  check (jsonb_array_length(site->'legalRegions') > 0)
);
-- One world reservation at a time. Renewal atomically revokes the previous row
-- and inserts a freshly verified snapshot; expiry alone does not free this slot.
create unique index ares_genesis_one_world_reservation_v11
  on public.ares_genesis_certificates_v11 ((true)) where revoked_at is null;
alter table public.ares_genesis_certificates_v11 enable row level security;
revoke all on public.ares_genesis_certificates_v11 from public, anon, authenticated;
grant select, insert, update on public.ares_genesis_certificates_v11 to service_role;

-- Monotonic epoch prevents an old certificate becoming valid again when
-- a building moves away and subsequently returns to its original coordinates.
create table public.ares_genesis_world_epoch_v11 (
  singleton boolean primary key default true check (singleton),
  epoch bigint not null default 0
);
insert into public.ares_genesis_world_epoch_v11 default values;
alter table public.ares_genesis_world_epoch_v11 enable row level security;
revoke all on public.ares_genesis_world_epoch_v11 from public, anon, authenticated, service_role;
create function public.bump_ares_genesis_world_epoch_v11()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (select 1 from public.ares_genesis_certificates_v11
    where revoked_at is null and expires_at > statement_timestamp()) then
    update public.ares_genesis_world_epoch_v11 set epoch = epoch + 1 where singleton;
  end if;
  return null;
end;
$$;
revoke all on function public.bump_ares_genesis_world_epoch_v11() from public, anon, authenticated;
create trigger ares_genesis_building_epoch_v11 after insert or update or delete or truncate
  on public.mars_colony_buildings for each statement execute function public.bump_ares_genesis_world_epoch_v11();
create trigger ares_genesis_definition_epoch_v11 after insert or update or delete or truncate
  on public.mars_building_definitions for each statement execute function public.bump_ares_genesis_world_epoch_v11();
create trigger ares_genesis_colony_epoch_v11 after insert or update or delete or truncate
  on public.mars_colonies for each statement execute function public.bump_ares_genesis_world_epoch_v11();

-- Conservative global snapshot: every colony's building and catalog state.
-- Any change, including unrelated upgrades, invalidates the certificate.
-- External fixed geometry, terrain, protected routes and entitlement evidence
-- are covered by the release digest and separately verified certificate evidence.
create function public.ares_genesis_world_snapshot_v11()
returns jsonb language sql stable security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'buildings', coalesce((select jsonb_agg(to_jsonb(b) order by b.id) from public.mars_colony_buildings b), '[]'::jsonb),
    'definitions', coalesce((select jsonb_agg(to_jsonb(d) order by d.building_key) from public.mars_building_definitions d), '[]'::jsonb),
    'epoch', (select epoch from public.ares_genesis_world_epoch_v11 where singleton),
    'colonies', coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.mars_colonies c), '[]'::jsonb)
  );
$$;
revoke all on function public.ares_genesis_world_snapshot_v11() from public, anon, authenticated;
grant execute on function public.ares_genesis_world_snapshot_v11() to service_role;

-- Geometry shared by issuance and placement reservation enforcement. Effective
-- dimensions rotate once, using the deployed 4.5m grid and (-50.75,-74.75) anchor.
create function public.ares_genesis_building_conflicts_v11(gx integer, gz integer, rotation integer, width integer, depth integer)
returns boolean language sql immutable
set search_path = pg_catalog, public
as $$
  select case when gx is null or gz is null or rotation is null or rotation not in (0,90,180,270)
    or width is null or depth is null or width not between 1 and 8 or depth not between 1 and 8
    then true else
      abs((-50.75 + (gx + ((case when rotation in (90,270) then depth else width end)-1)/2.0)*4.5) - (-530.5))
        <= 54.7 + (case when rotation in (90,270) then depth else width end)*2.25 + 1.2
      and abs((-74.75 + (gz + ((case when rotation in (90,270) then width else depth end)-1)/2.0)*4.5) - (-210.5))
        <= 67.7 + (case when rotation in (90,270) then width else depth end)*2.25 + 1.2
    end;
$$;
revoke all on function public.ares_genesis_building_conflicts_v11(integer,integer,integer,integer,integer) from public, anon, authenticated;

-- Preserve all existing player rows and placement RPCs. A new conflicting write
-- is rejected during a live reservation and for 60s after revocation so that
-- already-issued browser leases can drain safely. Non-conflicting writes proceed.
create function public.guard_ares_genesis_reservation_v11()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare w integer; d integer;
begin
  if new.status = 'archived' then return new; end if;
  perform 1 from public.ares_genesis_certificates_v11 c
    where c.expires_at > statement_timestamp()
      and (c.revoked_at is null or c.revoked_at > statement_timestamp() - interval '60 seconds')
    for share;
  if not found then return new; end if;
  select footprint_width, footprint_depth into w,d
    from public.mars_building_definitions where building_key = new.building_key;
  if public.ares_genesis_building_conflicts_v11(new.grid_x,new.grid_z,new.rotation_y,w,d) then
    raise exception 'ARES_GENESIS_RESERVED: placement conflicts with a live campus reservation' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_ares_genesis_reservation_v11() from public, anon, authenticated;
create trigger guard_ares_genesis_reservation_v11 before insert or update
  on public.mars_colony_buildings for each row execute function public.guard_ares_genesis_reservation_v11();

create function public.guard_ares_genesis_catalog_v11()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform 1 from public.ares_genesis_certificates_v11 c
    where c.expires_at > statement_timestamp()
      and (c.revoked_at is null or c.revoked_at > statement_timestamp() - interval '60 seconds')
    for share;
  if found then
    raise exception 'ARES_GENESIS_RESERVED: revoke and drain leases before changing the footprint catalog' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function public.guard_ares_genesis_catalog_v11() from public, anon, authenticated;
create trigger guard_ares_genesis_catalog_v11 before insert or update or delete or truncate
  on public.mars_building_definitions for each statement execute function public.guard_ares_genesis_catalog_v11();

-- Serialize issuance against world mutations. Certificate history is immutable;
-- service operators can revoke and then insert a newly reviewed certificate.
create function public.guard_ares_genesis_certificate_v11()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if TG_OP = 'UPDATE' then
    if (to_jsonb(new) - 'revoked_at') <> (to_jsonb(old) - 'revoked_at')
       or old.revoked_at is not null or new.revoked_at is null then
      raise exception 'Certificates are immutable; revoke and recertify';
    end if;
    return new;
  end if;
  lock table public.mars_colony_buildings, public.mars_building_definitions,
    public.mars_colonies in share mode;
  if new.issued_at > statement_timestamp()
     or new.expires_at <= statement_timestamp() + interval '30 seconds'
     or new.world_snapshot <> public.ares_genesis_world_snapshot_v11() then
    raise exception 'Certificate world snapshot or lease invalid';
  end if;
  if exists (
    select 1 from public.mars_colony_buildings b
    left join public.mars_building_definitions d on d.building_key = b.building_key
    where b.status <> 'archived' and public.ares_genesis_building_conflicts_v11(
      b.grid_x,b.grid_z,b.rotation_y,d.footprint_width,d.footprint_depth)
  ) then
    raise exception 'Certificate blocked by live building occupancy';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_ares_genesis_certificate_v11() from public, anon, authenticated;
create trigger guard_ares_genesis_certificate_v11
before insert or update on public.ares_genesis_certificates_v11
for each row execute function public.guard_ares_genesis_certificate_v11();

-- Compatibility RPC name retained for the deployed host. No caller colony ID,
-- auth override, client approval flag, data mutation or approval fallback.
create function public.get_ares_genesis_placement_v10()
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  certificate public.ares_genesis_certificates_v11%rowtype;
  member_colony uuid;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select count(*), (array_agg(m.colony_id))[1] into member_count, member_colony
    from public.mars_colony_memberships m
    where m.builder_id = auth.uid() and m.status = 'active';
  if member_count <> 1 then
    return jsonb_build_object('status','blocked','reason','Unambiguous active colony required');
  end if;
  select * into certificate from public.ares_genesis_certificates_v11 c
    where c.colony_id = member_colony and c.revoked_at is null
      and c.issued_at <= statement_timestamp()
      and c.expires_at > statement_timestamp() + interval '30 seconds';
  if not found then
    return jsonb_build_object('status','blocked','reason','No current server certificate');
  end if;
  if certificate.world_snapshot <> public.ares_genesis_world_snapshot_v11() then
    return jsonb_build_object('status','blocked','reason','World changed; recertification required');
  end if;
  return jsonb_build_object('status','approved','revision',certificate.revision,
    'colony_id',certificate.colony_id,'release_digest',certificate.release_digest,
    'evidence_digest',certificate.evidence_digest,'issued_at',certificate.issued_at,
    'expires_at',least(certificate.expires_at, statement_timestamp() + interval '60 seconds'),'server_time',statement_timestamp(),
    'site',certificate.site);
end;
$$;
revoke all on function public.get_ares_genesis_placement_v10() from public, anon, authenticated;
grant execute on function public.get_ares_genesis_placement_v10() to authenticated;
commit;
