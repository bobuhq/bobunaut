begin;

-- ============================================================
-- BOBU UNIVERSE
-- Admin Builder Intelligence + controlled GP grant V51
-- ============================================================

drop function if exists public.get_admin_builder_intelligence(
  integer,
  integer,
  text
);

create function public.get_admin_builder_intelligence(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  builder_id uuid,
  email text,
  username text,
  display_name text,
  level integer,
  gp bigint,
  reputation bigint,
  referral_count bigint,
  invite_code text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  signup_source text,
  mining_active boolean,
  telegram_verified boolean,
  x_verified boolean,
  instagram_verified boolean,
  wallet_verified boolean,
  verified boolean,
  genesis_builder boolean,
  passport_unlocked boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  with identity_status as (
    select
      identity.builder_id,
      bool_or(
        lower(identity.provider) = 'telegram'
        and identity.verified
      ) as telegram_verified,
      bool_or(
        lower(identity.provider) = 'x'
        and identity.verified
      ) as x_verified,
      bool_or(
        lower(identity.provider) = 'instagram'
        and identity.verified
      ) as instagram_verified,
      bool_or(
        lower(identity.provider) = 'wallet'
        and identity.verified
      ) as wallet_verified
    from public.builder_social_identities as identity
    group by identity.builder_id
  )
  select
    profile.builder_id,
    user_account.email::text,
    profile.username,
    profile.display_name,
    profile.level,
    profile.gp,
    coalesce(profile.reputation, 0)::bigint,
    coalesce(profile.referral_count, 0)::bigint,
    profile.invite_code,
    user_account.created_at,
    user_account.last_sign_in_at,

    case
      when profile.referred_by is not null
        then 'REFERRAL'::text
      else 'DIRECT'::text
    end as signup_source,

    exists (
      select 1
      from public.builder_mining_sessions as mining
      where mining.builder_id = profile.builder_id
        and mining.status = 'active'
        and mining.ends_at > now()
    ) as mining_active,

    coalesce(status.telegram_verified, false),
    coalesce(status.x_verified, false),
    coalesce(status.instagram_verified, false),
    coalesce(status.wallet_verified, false),

    (
      coalesce(status.telegram_verified, false)
      and coalesce(status.x_verified, false)
    ) as verified,

    (
      coalesce(status.telegram_verified, false)
      and coalesce(status.x_verified, false)
    ) as genesis_builder,

    (
      coalesce(status.telegram_verified, false)
      and coalesce(status.x_verified, false)
    ) as passport_unlocked

  from public.builder_profiles as profile

  join auth.users as user_account
    on user_account.id = profile.builder_id

  left join identity_status as status
    on status.builder_id = profile.builder_id

  where
    (
      public.has_admin_console_access()
      or auth.role() = 'service_role'
    )
    and (
      p_search is null
      or trim(p_search) = ''
      or profile.builder_id::text ilike '%' || trim(p_search) || '%'
      or coalesce(user_account.email, '') ilike '%' || trim(p_search) || '%'
      or coalesce(profile.username, '') ilike '%' || trim(p_search) || '%'
      or coalesce(profile.display_name, '') ilike '%' || trim(p_search) || '%'
      or coalesce(profile.invite_code, '') ilike '%' || trim(p_search) || '%'
    )

  order by user_account.created_at desc

  limit least(
    greatest(coalesce(p_limit, 25), 1),
    100
  )

  offset greatest(
    coalesce(p_offset, 0),
    0
  );
$function$;

revoke all
on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
)
from public, anon;

grant execute
on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
)
to authenticated, service_role;


-- ============================================================
-- CONTROLLED ADMIN GP GRANT
-- owner/admin only
-- Delegates accounting to canonical award_builder_gp().
-- ============================================================

create or replace function public.admin_grant_builder_gp_v1(
  p_builder_id uuid,
  p_amount bigint,
  p_reason text,
  p_idempotency_key text
)
returns table (
  awarded boolean,
  total_gp bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_reason text;
  v_email text;
  v_awarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Owner or admin authority required';
  end if;

  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'GP amount must be greater than zero';
  end if;

  if p_amount > 10000000 then
    raise exception 'GP amount exceeds the admin grant safety limit';
  end if;

  v_reason := trim(coalesce(p_reason, ''));

  if char_length(v_reason) < 3
     or char_length(v_reason) > 500 then
    raise exception 'Reason must contain between 3 and 500 characters';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) < 8
     or char_length(trim(p_idempotency_key)) > 200 then
    raise exception 'Valid idempotency key is required';
  end if;

  select user_account.email
  into v_email
  from auth.users as user_account
  where user_account.id = p_builder_id;

  if not found then
    raise exception 'Builder account not found';
  end if;

  select
    result.awarded,
    result.total_gp,
    result.ledger_id
  into
    v_awarded,
    v_total_gp,
    v_ledger_id
  from public.award_builder_gp(
    p_builder_id,
    'admin',
    p_amount,
    trim(p_idempotency_key),
    'admin',
    jsonb_build_object(
      'reason', v_reason,
      'granted_by', auth.uid(),
      'amount_gp', p_amount,
      'source', 'admin_console'
    )
  ) as result;

  if v_awarded then
    insert into public.admin_audit_logs (
      actor_user_id,
      action,
      target_type,
      target_id,
      severity,
      metadata
    )
    values (
      auth.uid(),
      'builder_gp_grant',
      'builder',
      p_builder_id::text,
      'warning',
      jsonb_build_object(
        'builderId', p_builder_id,
        'email', v_email,
        'amountGp', p_amount,
        'reason', v_reason,
        'ledgerId', v_ledger_id,
        'totalGp', v_total_gp,
        'idempotencyKey', trim(p_idempotency_key)
      )
    );
  end if;

  return query
  select
    v_awarded,
    v_total_gp,
    v_ledger_id;
end;
$function$;

revoke all
on function public.admin_grant_builder_gp_v1(
  uuid,
  bigint,
  text,
  text
)
from public, anon;

grant execute
on function public.admin_grant_builder_gp_v1(
  uuid,
  bigint,
  text,
  text
)
to authenticated, service_role;

comment on function public.admin_grant_builder_gp_v1(
  uuid,
  bigint,
  text,
  text
) is
'Owner/admin-only Builder GP grant. Uses the canonical Reward Engine and writes an Admin Audit entry.';

commit;
