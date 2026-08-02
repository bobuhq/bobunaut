-- ============================================================
-- BOBU UNIVERSE
-- Instagram OAuth State Store
--
-- Stores short-lived, one-time OAuth states so Instagram
-- callbacks can be matched securely to the initiating Builder.
-- ============================================================

create table if not exists public.instagram_oauth_states (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete cascade,

  state_hash text not null unique,

  redirect_origin text not null
    check (
      char_length(trim(redirect_origin))
      between 1 and 500
    ),

  expires_at timestamptz not null,

  used_at timestamptz,

  created_at timestamptz not null default now(),

  check (expires_at > created_at)
);


create index if not exists
  instagram_oauth_states_builder_idx
on public.instagram_oauth_states(builder_id);


create index if not exists
  instagram_oauth_states_expires_idx
on public.instagram_oauth_states(expires_at);


create index if not exists
  instagram_oauth_states_unused_idx
on public.instagram_oauth_states(builder_id, expires_at)
where used_at is null;


alter table public.instagram_oauth_states
  enable row level security;


/*
 * Browser clients must never read, create, alter or consume
 * Instagram OAuth states directly. Edge Functions use the
 * service-role client.
 */
revoke all
on table public.instagram_oauth_states
from public, anon, authenticated;


comment on table public.instagram_oauth_states is
  'Server-only, short-lived and one-time state records for secure Instagram OAuth account linking.';


-- ============================================================
-- ATOMIC STATE CONSUMPTION
-- ============================================================

create or replace function public.consume_instagram_oauth_state(
  p_state_hash text
)
returns table (
  consumed boolean,
  builder_id uuid,
  redirect_origin text,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state public.instagram_oauth_states;
  v_state_hash text;
begin
  v_state_hash :=
    trim(coalesce(p_state_hash, ''));

  if v_state_hash = '' then
    raise exception
      'Instagram OAuth state hash is required.';
  end if;

  select oauth_state.*
  into v_state
  from public.instagram_oauth_states as oauth_state
  where oauth_state.state_hash = v_state_hash
  for update;

  if not found then
    return query
    select
      false,
      null::uuid,
      null::text,
      'state_not_found'::text;

    return;
  end if;

  if v_state.used_at is not null then
    return query
    select
      false,
      v_state.builder_id,
      v_state.redirect_origin,
      'state_already_used'::text;

    return;
  end if;

  if v_state.expires_at <= now() then
    return query
    select
      false,
      v_state.builder_id,
      v_state.redirect_origin,
      'state_expired'::text;

    return;
  end if;

  update public.instagram_oauth_states
  set used_at = now()
  where id = v_state.id
    and used_at is null;

  return query
  select
    true,
    v_state.builder_id,
    v_state.redirect_origin,
    'consumed'::text;
end;
$$;


revoke all
on function public.consume_instagram_oauth_state(text)
from public, anon, authenticated;


grant execute
on function public.consume_instagram_oauth_state(text)
to service_role;


comment on function public.consume_instagram_oauth_state(text) is
  'Atomically validates and consumes a short-lived Instagram OAuth state and returns its Builder and approved redirect origin.';
