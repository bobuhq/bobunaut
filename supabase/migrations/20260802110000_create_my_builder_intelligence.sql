begin;

create or replace function public.get_my_builder_intelligence()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();

  v_profile public.builder_profiles%rowtype;

  v_identity jsonb := '{}'::jsonb;
  v_mining jsonb := '{}'::jsonb;
  v_streak jsonb := '{}'::jsonb;
  v_network jsonb := '{}'::jsonb;
  v_missions jsonb := '{}'::jsonb;
  v_recommendations jsonb := '[]'::jsonb;

  v_telegram_verified boolean := false;
  v_x_verified boolean := false;
  v_instagram_verified boolean := false;
  v_wallet_verified boolean := false;

  v_required_identity_count integer := 0;
  v_mission_active_count integer := 0;
  v_mission_completed_count integer := 0;
  v_mission_claimed_count integer := 0;
  v_mission_locked_count integer := 0;

  v_galaxy_total integer := 0;
  v_galaxy_active integer := 0;
  v_galaxy_pending integer := 0;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  select profile.*
  into v_profile
  from public.builder_profiles as profile
  where profile.builder_id = v_builder_id;

  if not found then
    raise exception 'Builder profile was not found.'
      using errcode = 'P0002';
  end if;

  /*
   * Identity snapshot.
   */
  select
    coalesce(
      bool_or(
        lower(identity.provider) = 'telegram'
        and identity.verified = true
      ),
      false
    ),
    coalesce(
      bool_or(
        lower(identity.provider) = 'x'
        and identity.verified = true
      ),
      false
    ),
    coalesce(
      bool_or(
        lower(identity.provider) = 'instagram'
        and identity.verified = true
      ),
      false
    ),
    coalesce(
      bool_or(
        lower(identity.provider) = 'wallet'
        and identity.verified = true
      ),
      false
    )
  into
    v_telegram_verified,
    v_x_verified,
    v_instagram_verified,
    v_wallet_verified
  from public.builder_social_identities as identity
  where identity.builder_id = v_builder_id;

  v_required_identity_count :=
    (case when v_telegram_verified then 1 else 0 end) +
    (case when v_x_verified then 1 else 0 end);

  v_identity := jsonb_build_object(
    'telegram_verified', v_telegram_verified,
    'x_verified', v_x_verified,
    'instagram_verified', v_instagram_verified,
    'wallet_verified', v_wallet_verified,
    'required_completed', v_required_identity_count,
    'required_total', 2,
    'genesis_complete', v_required_identity_count = 2,
    'instagram_optional', true
  );

  /*
   * Mining snapshot.
   *
   * Existing authoritative mining RPCs remain the source of truth.
   * A failure in an optional read must not prevent the rest of the
   * intelligence snapshot from loading.
   */
  begin
    select to_jsonb(state)
    into v_mining
    from public.get_my_mining_state() as state
    limit 1;

    v_mining := coalesce(
      v_mining,
      jsonb_build_object(
        'available', false,
        'active', false,
        'claimable', false
      )
    );
  exception
    when others then
      v_mining := jsonb_build_object(
        'available', false,
        'active', false,
        'claimable', false,
        'status', 'unavailable'
      );
  end;

  begin
    select to_jsonb(streak)
    into v_streak
    from public.get_my_mining_streak() as streak
    limit 1;

    v_streak := coalesce(
      v_streak,
      jsonb_build_object(
        'available', false
      )
    );
  exception
    when others then
      v_streak := jsonb_build_object(
        'available', false,
        'status', 'unavailable'
      );
  end;

  /*
   * Mission summary.
   */
  select
    count(*) filter (
      where progress.status = 'active'
    ),
    count(*) filter (
      where progress.status = 'completed'
    ),
    count(*) filter (
      where progress.status = 'claimed'
    ),
    count(*) filter (
      where progress.status = 'locked'
    )
  into
    v_mission_active_count,
    v_mission_completed_count,
    v_mission_claimed_count,
    v_mission_locked_count
  from public.mission_progress as progress
  where progress.builder_id = v_builder_id;

  v_missions := jsonb_build_object(
    'active', coalesce(v_mission_active_count, 0),
    'completed_unclaimed',
      coalesce(v_mission_completed_count, 0),
    'claimed', coalesce(v_mission_claimed_count, 0),
    'locked', coalesce(v_mission_locked_count, 0),
    'total',
      coalesce(v_mission_active_count, 0) +
      coalesce(v_mission_completed_count, 0) +
      coalesce(v_mission_claimed_count, 0) +
      coalesce(v_mission_locked_count, 0)
  );

  /*
   * Galaxy and referral summary.
   */
  begin
    select
      count(*),
      count(*) filter (
        where galaxy.referral_status = 'active'
      ),
      count(*) filter (
        where galaxy.referral_status = 'pending'
      )
    into
      v_galaxy_total,
      v_galaxy_active,
      v_galaxy_pending
    from public.get_my_galaxy() as galaxy;
  exception
    when others then
      v_galaxy_total := coalesce(v_profile.referral_count, 0);
      v_galaxy_active := 0;
      v_galaxy_pending := 0;
  end;

  v_network := jsonb_build_object(
    'direct_referral_count',
      coalesce(v_profile.referral_count, 0),
    'galaxy_member_count',
      coalesce(v_galaxy_total, 0),
    'active_member_count',
      coalesce(v_galaxy_active, 0),
    'pending_member_count',
      coalesce(v_galaxy_pending, 0)
  );

  /*
   * Deterministic recommendations.
   * OpenAI receives recommendations generated from real state,
   * rather than inventing account actions.
   */
  if not v_telegram_verified then
    v_recommendations :=
      v_recommendations ||
      jsonb_build_array(
        jsonb_build_object(
          'priority', 1,
          'code', 'verify_telegram',
          'title', 'Verify Telegram',
          'route', '/identity'
        )
      );
  end if;

  if not v_x_verified then
    v_recommendations :=
      v_recommendations ||
      jsonb_build_array(
        jsonb_build_object(
          'priority', 1,
          'code', 'verify_x',
          'title', 'Verify X',
          'route', '/identity'
        )
      );
  end if;

  if not coalesce((v_mining ->> 'active')::boolean, false)
     and not coalesce((v_mining ->> 'claimable')::boolean, false)
  then
    v_recommendations :=
      v_recommendations ||
      jsonb_build_array(
        jsonb_build_object(
          'priority', 2,
          'code', 'activate_mining',
          'title', 'Activate Mining',
          'route', '/mining'
        )
      );
  end if;

  if coalesce((v_mining ->> 'claimable')::boolean, false) then
    v_recommendations :=
      v_recommendations ||
      jsonb_build_array(
        jsonb_build_object(
          'priority', 1,
          'code', 'claim_mining',
          'title', 'Claim Mining Reward',
          'route', '/mining'
        )
      );
  end if;

  if v_mission_completed_count > 0 then
    v_recommendations :=
      v_recommendations ||
      jsonb_build_array(
        jsonb_build_object(
          'priority', 1,
          'code', 'claim_missions',
          'title', 'Claim Completed Missions',
          'route', '/missions',
          'count', v_mission_completed_count
        )
      );
  end if;

  if not v_wallet_verified then
    v_recommendations :=
      v_recommendations ||
      jsonb_build_array(
        jsonb_build_object(
          'priority', 3,
          'code', 'wallet_not_active',
          'title', 'Wallet activation is not complete',
          'route', '/wallet'
        )
      );
  end if;

  return jsonb_build_object(
    'version', '2.0',
    'generated_at', now(),

    'profile', jsonb_build_object(
      'builder_id', v_profile.builder_id,
      'username', v_profile.username,
      'display_name', v_profile.display_name,
      'level', coalesce(v_profile.level, 1),
      'xp', coalesce(v_profile.xp, 0),
      'reputation', coalesce(v_profile.reputation, 0),
      'invite_code', v_profile.invite_code,
      'referral_count', coalesce(v_profile.referral_count, 0)
    ),

    'gp', jsonb_build_object(
      'personal_gp', coalesce(v_profile.personal_gp, 0),
      'eligible_network_gp',
        coalesce(v_profile.eligible_network_gp, 0),
      'pending_network_gp',
        coalesce(v_profile.pending_network_gp, 0),
      'total_gp', coalesce(v_profile.gp, 0)
    ),

    'identity', v_identity,

    'passport', jsonb_build_object(
      'unlocked', v_required_identity_count = 2,
      'genesis_builder', v_required_identity_count = 2,
      'level', coalesce(v_profile.level, 1),
      'xp', coalesce(v_profile.xp, 0),
      'reputation', coalesce(v_profile.reputation, 0)
    ),

    'wallet', jsonb_build_object(
      'verified', v_wallet_verified,
      'activated', v_wallet_verified,
      'migration_live', false,
      'migration_eligible', false,
      'available_gp', 0,
      'locked_gp', coalesce(v_profile.gp, 0),
      'message',
        case
          when v_wallet_verified then
            'Wallet identity is verified. GP migration is not live yet.'
          else
            'Wallet activation is required before any future GP migration.'
        end
    ),

    'mining', v_mining,
    'mining_streak', v_streak,
    'missions', v_missions,
    'network', v_network,
    'recommendations', v_recommendations
  );
end;
$$;

revoke all
on function public.get_my_builder_intelligence()
from public;

grant execute
on function public.get_my_builder_intelligence()
to authenticated;

comment on function public.get_my_builder_intelligence() is
  'Returns a read-only Builder Intelligence snapshot for the authenticated Builder.';

commit;
