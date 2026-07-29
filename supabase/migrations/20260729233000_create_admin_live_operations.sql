begin;

create or replace function public.get_admin_live_operations(
  p_event_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_event_limit integer;
  v_result jsonb;
begin
  if not public.has_admin_console_access() then
    raise exception 'Admin Console access required';
  end if;

  v_event_limit := least(
    greatest(coalesce(p_event_limit, 20), 1),
    100
  );

  select jsonb_build_object(
    'generatedAt',
    now(),

    'metrics',
    jsonb_build_object(
      'newBuildersToday',
      (
        select count(*)
        from public.builder_profiles as profile
        where profile.created_at >= date_trunc('day', now())
      ),

      'activeMiners',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.status = 'active'
          and mining.ends_at > now()
      ),

      'gpCreditsToday',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'credit'
          and ledger.created_at >= date_trunc('day', now())
      ), 0),

      'gpDebitsToday',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'debit'
          and ledger.created_at >= date_trunc('day', now())
      ), 0),

      'verificationsToday',
      (
        select count(*)
        from public.builder_social_identities as identity
        where identity.verified = true
          and identity.updated_at >= date_trunc('day', now())
      ),

      'referralsToday',
      (
        select count(*)
        from public.builder_referrals as referral
        where referral.created_at >= date_trunc('day', now())
      )
    ),

    'events',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'eventId', event.event_id,
          'eventType', event.event_type,
          'builderId', event.builder_id,
          'username', event.username,
          'displayName', event.display_name,
          'title', event.title,
          'description', event.description,
          'amount', event.amount,
          'entryType', event.entry_type,
          'provider', event.provider,
          'occurredAt', event.occurred_at,
          'metadata', event.metadata
        )
        order by event.occurred_at desc
      )
      from (
        select *
        from (
          select
            'ledger:' || ledger.id::text as event_id,
            'reward'::text as event_type,
            ledger.builder_id,
            profile.username,
            profile.display_name,

            case
              when ledger.entry_type = 'debit'
                then 'GP reversed'
              when lower(ledger.reward_type) like '%mining%'
                then 'Mining reward issued'
              when ledger.reward_type = 'social_verification'
                then 'Social verification rewarded'
              when lower(ledger.reward_type) like '%referral%'
                then 'Referral reward issued'
              when lower(ledger.reward_type) like '%mission%'
                then 'Mission reward issued'
              else 'GP reward issued'
            end as title,

            replace(
              initcap(
                replace(
                  replace(ledger.reward_type, '_', ' '),
                  '-',
                  ' '
                )
              ),
              'Gp',
              'GP'
            ) as description,

            ledger.amount,
            ledger.entry_type,
            ledger.provider,
            ledger.created_at as occurred_at,
            ledger.metadata

          from public.builder_reward_ledger as ledger

          left join public.builder_profiles as profile
            on profile.builder_id = ledger.builder_id

          union all

          select
            'mining-start:' || mining.id::text,
            'mining_started'::text,
            mining.builder_id,
            profile.username,
            profile.display_name,
            'Mining session started'::text,
            '24-hour Builder Mining session activated'::text,
            mining.reward_gp,
            null::text,
            null::text,
            mining.started_at,
            jsonb_build_object(
              'sessionId', mining.id,
              'status', mining.status,
              'endsAt', mining.ends_at,
              'ratePerHour', mining.total_rate_per_hour,
              'activeReferralCount',
                mining.active_referral_count
            )

          from public.builder_mining_sessions as mining

          left join public.builder_profiles as profile
            on profile.builder_id = mining.builder_id

          union all

          select
            'mining-claim:' || mining.id::text,
            'mining_claimed'::text,
            mining.builder_id,
            profile.username,
            profile.display_name,
            'Mining reward claimed'::text,
            'Completed mining reward transferred to GP ledger'::text,
            mining.reward_gp,
            'credit'::text,
            null::text,
            mining.claimed_at,
            jsonb_build_object(
              'sessionId', mining.id,
              'ledgerId', mining.ledger_id
            )

          from public.builder_mining_sessions as mining

          left join public.builder_profiles as profile
            on profile.builder_id = mining.builder_id

          where mining.claimed_at is not null

          union all

          select
            'builder:' || profile.builder_id::text,
            'builder_joined'::text,
            profile.builder_id,
            profile.username,
            profile.display_name,
            'New Builder joined'::text,
            'Builder profile created'::text,
            null::bigint,
            null::text,
            null::text,
            profile.created_at,
            '{}'::jsonb

          from public.builder_profiles as profile

          union all

          select
            'referral:' || referral.id::text,
            'referral_created'::text,
            referral.referred_id,
            referred_profile.username,
            referred_profile.display_name,
            'Referral connection created'::text,
            coalesce(
              referrer_profile.display_name,
              referrer_profile.username,
              'Builder'
            ) || ' invited a new Builder',
            null::bigint,
            null::text,
            null::text,
            referral.created_at,
            jsonb_build_object(
              'referrerId', referral.referrer_id,
              'referredId', referral.referred_id,
              'status', referral.status
            )

          from public.builder_referrals as referral

          left join public.builder_profiles
            as referred_profile
            on referred_profile.builder_id =
              referral.referred_id

          left join public.builder_profiles
            as referrer_profile
            on referrer_profile.builder_id =
              referral.referrer_id

          union all

          select
            'identity:' ||
              identity.builder_id::text ||
              ':' ||
              identity.provider,
            'identity_verified'::text,
            identity.builder_id,
            profile.username,
            profile.display_name,
            initcap(identity.provider) ||
              ' identity verified',
            'Builder identity verification completed'::text,
            null::bigint,
            null::text,
            identity.provider,
            identity.updated_at,
            jsonb_build_object(
              'provider', identity.provider,
              'verified', identity.verified
            )

          from public.builder_social_identities as identity

          left join public.builder_profiles as profile
            on profile.builder_id = identity.builder_id

          where identity.verified = true
        ) as operations

        where operations.occurred_at is not null
        order by operations.occurred_at desc
        limit v_event_limit
      ) as event
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$;

revoke all
on function public.get_admin_live_operations(integer)
from public, anon;

grant execute
on function public.get_admin_live_operations(integer)
to authenticated;

comment on function
public.get_admin_live_operations(integer) is
'Returns authorized read-only Admin Console operational metrics and a unified recent activity feed.';

commit;
