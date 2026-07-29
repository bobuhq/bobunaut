begin;

create or replace function public.get_admin_builder_intelligence(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  builder_id uuid,
  username text,
  display_name text,
  level integer,
  xp bigint,
  gp bigint,
  reputation bigint,
  referral_count bigint,
  invite_code text,
  created_at timestamptz,
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
set search_path = public, pg_temp
as $function$
  with base_builders as (
    select *
    from public.get_admin_builders(
      p_limit,
      p_offset,
      p_search
    )
  ),
  identity_status as (
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
    base.builder_id,
    base.username,
    base.display_name,
    base.level,
    coalesce(profile.xp, 0)::bigint as xp,
    base.gp,
    base.reputation,
    coalesce(base.referral_count, 0)::bigint,
    base.invite_code,
    base.created_at,
    base.mining_active,

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

  from base_builders as base

  join public.builder_profiles as profile
    on profile.builder_id = base.builder_id

  left join identity_status as status
    on status.builder_id = base.builder_id;
$function$;

revoke all on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
) from public, anon;

grant execute on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
) to authenticated;

comment on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
) is
'Returns Builder progression, mining and verified identity information to authorized Admin Console users.';

commit;
