begin;

create or replace function public.get_admin_reward_ledger(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null,
  p_entry_type text default null,
  p_reward_type text default null
)
returns table (
  ledger_id uuid,
  builder_id uuid,
  username text,
  display_name text,
  reward_type text,
  provider text,
  entry_type text,
  amount bigint,
  idempotency_key text,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    ledger.id,
    ledger.builder_id,
    profile.username,
    profile.display_name,
    ledger.reward_type,
    ledger.provider,
    ledger.entry_type,
    ledger.amount,
    ledger.idempotency_key,
    ledger.metadata,
    ledger.created_at
  from public.builder_reward_ledger as ledger
  join public.builder_profiles as profile
    on profile.builder_id = ledger.builder_id
  where public.has_admin_console_access()
    and (
      p_search is null
      or trim(p_search) = ''
      or profile.username ilike '%' || trim(p_search) || '%'
      or profile.display_name ilike '%' || trim(p_search) || '%'
      or ledger.builder_id::text ilike '%' || trim(p_search) || '%'
      or ledger.idempotency_key ilike '%' || trim(p_search) || '%'
      or ledger.reward_type ilike '%' || trim(p_search) || '%'
    )
    and (
      p_entry_type is null
      or trim(p_entry_type) = ''
      or ledger.entry_type = lower(trim(p_entry_type))
    )
    and (
      p_reward_type is null
      or trim(p_reward_type) = ''
      or ledger.reward_type = trim(p_reward_type)
    )
  order by ledger.created_at desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$function$;

create or replace function public.get_admin_mining_sessions(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null,
  p_status text default null
)
returns table (
  session_id uuid,
  builder_id uuid,
  username text,
  display_name text,
  status text,
  started_at timestamptz,
  ends_at timestamptz,
  claimed_at timestamptz,
  base_rate_per_hour numeric,
  active_referral_count bigint,
  referral_bonus_rate numeric,
  total_rate_per_hour numeric,
  reward_gp bigint,
  ledger_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    session.id,
    session.builder_id,
    profile.username,
    profile.display_name,
    session.status,
    session.started_at,
    session.ends_at,
    session.claimed_at,
    session.base_rate_per_hour,
    session.active_referral_count,
    session.referral_bonus_rate,
    session.total_rate_per_hour,
    session.reward_gp,
    session.ledger_id,
    session.created_at,
    session.updated_at
  from public.builder_mining_sessions as session
  join public.builder_profiles as profile
    on profile.builder_id = session.builder_id
  where public.has_admin_console_access()
    and (
      p_search is null
      or trim(p_search) = ''
      or profile.username ilike '%' || trim(p_search) || '%'
      or profile.display_name ilike '%' || trim(p_search) || '%'
      or session.builder_id::text ilike '%' || trim(p_search) || '%'
      or session.id::text ilike '%' || trim(p_search) || '%'
    )
    and (
      p_status is null
      or trim(p_status) = ''
      or session.status = lower(trim(p_status))
    )
  order by session.created_at desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$function$;

revoke all on function public.get_admin_reward_ledger(
  integer,
  integer,
  text,
  text,
  text
) from public, anon;

revoke all on function public.get_admin_mining_sessions(
  integer,
  integer,
  text,
  text
) from public, anon;

grant execute on function public.get_admin_reward_ledger(
  integer,
  integer,
  text,
  text,
  text
) to authenticated;

grant execute on function public.get_admin_mining_sessions(
  integer,
  integer,
  text,
  text
) to authenticated;

commit;
