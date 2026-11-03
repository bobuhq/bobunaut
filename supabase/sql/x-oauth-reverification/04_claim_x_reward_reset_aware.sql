BEGIN;
create or replace function public.claim_x_identity_reward(
  p_builder_id uuid,
  p_provider_user_id text,
  p_username text default null
)
returns table (
  verified boolean,
  rewarded boolean,
  already_rewarded boolean,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  completed_at timestamptz,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider_user_id text;
  v_username text;
  v_existing_builder_id uuid;
  v_rewarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
  v_completed_at timestamptz;
  v_reward_gp constant bigint := 5000;
  v_reset public.builder_x_oauth_resets%rowtype;
  v_has_reset boolean := false;
  v_reward_key text;
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required.';
  end if;

  v_provider_user_id :=
    trim(coalesce(p_provider_user_id, ''));

  v_username :=
    nullif(trim(coalesce(p_username, '')), '');

  if v_provider_user_id = '' then
    raise exception 'X provider user ID is required.';
  end if;

  -- Shared release lock: administrative reset takes the exclusive lock.
  perform pg_catalog.pg_advisory_xact_lock_shared(81420261103);
  v_completed_at := clock_timestamp();
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('x:' || v_provider_user_id, 0));
  perform 1 from public.builder_profiles where builder_id = p_builder_id for update;
  if not found then raise exception 'Builder profile not found'; end if;

  -- Every claim, including first-time users, requires authoritative Auth proof.
  perform 1 from auth.identities ai
  where ai.user_id = p_builder_id and ai.provider = 'x'
    and ai.provider_id = v_provider_user_id
    and (ai.identity_data ->> 'sub' is null or ai.identity_data ->> 'sub' = v_provider_user_id)
  for share;
  if not found then raise exception 'Trusted X OAuth identity required'; end if;

  -- Reserve original provider IDs permanently, even while an owner is unlinked.
  if exists (select 1 from public.builder_x_oauth_resets r
             where r.old_provider_user_id = v_provider_user_id and r.builder_id <> p_builder_id) then
    raise exception 'X identity is reserved to its original Builder';
  end if;

  /*
   * Reset users must prove a newly linked X OAuth identity.
   * This check runs before changing verification or awarding GP.
   */
  select *
  into v_reset
  from public.builder_x_oauth_resets
  where builder_id = p_builder_id
  for update;

  v_has_reset := found;

  if v_has_reset then
    if v_provider_user_id is distinct from v_reset.old_provider_user_id then
      raise exception 'Original X account required';
    end if;
    if v_reset.previously_rewarded then
      if v_reset.reversed_at is null then
        raise exception
          'X OAuth reward reversal must be completed before re-verification';
      end if;

      if not exists (
        select 1
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = p_builder_id
          and ledger.provider = 'x'
          and ledger.entry_type = 'debit'
          and ledger.reward_type = 'reward_reversal'
          and ledger.amount = v_reward_gp
          and ledger.idempotency_key = concat(
            'social-verification:x:reversal:',
            p_builder_id::text
          )
      ) then
        raise exception 'Verified X GP reversal ledger entry is required';
      end if;
    else
      if v_reset.reversed_at is not null then
        raise exception 'Unexpected reversal for unrewarded X identity';
      end if;

      if exists (
        select 1
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = p_builder_id
          and ledger.provider = 'x'
          and ledger.entry_type = 'debit'
          and ledger.idempotency_key = concat(
            'social-verification:x:reversal:',
            p_builder_id::text
          )
      ) then
        raise exception 'Unexpected X reversal ledger entry';
      end if;
    end if;

    if v_reset.status = 'rewarded' then
      if not exists (select 1 from public.builder_reward_ledger l
        where l.builder_id = p_builder_id and l.idempotency_key = v_reset.reward_idempotency_key
          and l.provider = 'x' and l.reward_type = 'social_verification'
          and l.entry_type = 'credit' and l.amount = v_reward_gp) then
        raise exception 'Completed X reset is missing its replacement ledger credit';
      end if;
      return query
      select
        true,
        false,
        true,
        0::bigint,
        coalesce(profile.gp, 0),
        null::uuid,
        v_reset.rewarded_at,
        'already_rewarded'::text
      from public.builder_profiles as profile
      where profile.builder_id = p_builder_id;

      return;
    end if;

    if not public.verify_fresh_x_oauth_identity(
      p_builder_id,
      v_provider_user_id
    ) then
      return query
      select
        false,
        false,
        false,
        0::bigint,
        coalesce(profile.gp, 0),
        null::uuid,
        null::timestamptz,
        'fresh_x_oauth_required'::text
      from public.builder_profiles as profile
      where profile.builder_id = p_builder_id;

      return;
    end if;

    v_reward_key := v_reset.reward_idempotency_key;
  else
    v_reward_key := concat(
      'social-verification:x:',
      p_builder_id::text
    );
  end if;

  if exists (select 1 from public.builder_social_identities s
             where s.builder_id = p_builder_id and lower(s.provider) = 'x'
               and s.provider_user_id is distinct from v_provider_user_id) then
    raise exception 'Original X account required';
  end if;

  /*
   * One X identity may belong to only one Builder.
   */
  select identity.builder_id
  into v_existing_builder_id
  from public.builder_social_identities as identity
  where lower(identity.provider) = 'x'
    and identity.provider_user_id = v_provider_user_id
  limit 1
  for update;

  if (
    v_existing_builder_id is not null
    and v_existing_builder_id <> p_builder_id
  ) then
    return query
    select
      false,
      false,
      false,
      0::bigint,
      coalesce(profile.gp, 0),
      null::uuid,
      null::timestamptz,
      'identity_already_linked'::text
    from public.builder_profiles as profile
    where profile.builder_id = p_builder_id;

    if not found then
      return query
      select
        false,
        false,
        false,
        0::bigint,
        0::bigint,
        null::uuid,
        null::timestamptz,
        'identity_already_linked'::text;
    end if;

    return;
  end if;

  /*
   * Create or refresh the trusted X identity first.
   * The whole function remains one PostgreSQL transaction.
   */
  insert into public.builder_social_identities (
    builder_id,
    provider,
    provider_user_id,
    username,
    verified,
    verified_at,
    updated_at
  )
  values (
    p_builder_id,
    'x',
    v_provider_user_id,
    v_username,
    true,
    v_completed_at,
    v_completed_at
  )
  on conflict on constraint
    builder_social_identities_builder_id_provider_key
  do update
  set
    provider_user_id = excluded.provider_user_id,
    username = excluded.username,
    verified = true,
    verified_at = coalesce(
      public.builder_social_identities.verified_at,
      excluded.verified_at
    ),
    updated_at = excluded.updated_at;

  select
    reward.awarded,
    reward.total_gp,
    reward.ledger_id
  into
    v_rewarded,
    v_total_gp,
    v_ledger_id
  from public.award_builder_gp(
    p_builder_id,
    'social_verification',
    v_reward_gp,
    v_reward_key,
    'x',
    jsonb_build_object(
      'provider_user_id',
      v_provider_user_id,
      'username',
      v_username
    )
  ) as reward;

  -- An idempotency conflict must resolve to the exact intended credit.
  if not exists (select 1 from public.builder_reward_ledger l
    where l.builder_id = p_builder_id and l.idempotency_key = v_reward_key
      and l.provider = 'x' and l.reward_type = 'social_verification'
      and l.entry_type = 'credit' and l.amount = v_reward_gp) then
    raise exception 'X reward ledger credit mismatch';
  end if;

  update public.builder_social_identities
  set
    verified = true,
    verified_at = coalesce(
      verified_at,
      v_completed_at
    ),
    reward_claimed = true,
    reward_claimed_at = coalesce(
      reward_claimed_at,
      v_completed_at
    ),
    updated_at = v_completed_at
  where builder_id = p_builder_id
    and lower(provider) = 'x';

  /*
   * Complete the reset cycle in the same transaction
   * as the GP ledger credit and identity update.
   */
  if v_has_reset then
    -- Fresh X Auth identity has already been verified.
    -- Follow the registry's permitted state transitions.
    update public.builder_x_oauth_resets
    set
      status = 'relinked',
      relinked_at = coalesce(relinked_at, v_completed_at)
    where builder_id = p_builder_id
      and status = 'pending';

    update public.builder_x_oauth_resets
    set
      status = 'rewarded',
      relinked_at = coalesce(relinked_at, v_completed_at),
      rewarded_at = v_completed_at
    where builder_id = p_builder_id
      and status in ('pending', 'relinked')
      and (
        v_rewarded
        or exists (
          select 1
          from public.builder_reward_ledger as ledger
          where ledger.builder_id = p_builder_id
            and ledger.idempotency_key = v_reward_key
            and ledger.entry_type = 'credit'
            and ledger.amount = v_reward_gp
        )
      );

    if not found then
      raise exception
        'X OAuth reset reward could not be finalized';
    end if;
  end if;

  return query
  select
    true,
    v_rewarded,
    not v_rewarded,
    case
      when v_rewarded then v_reward_gp
      else 0::bigint
    end,
    coalesce(v_total_gp, 0),
    v_ledger_id,
    v_completed_at,
    case
      when v_rewarded then 'rewarded'
      else 'already_rewarded'
    end;
end;
$$;


revoke all
on function public.claim_x_identity_reward(
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.claim_x_identity_reward(
  uuid,
  text,
  text
)
to service_role;


comment on function public.claim_x_identity_reward(
  uuid,
  text,
  text
) is
  'Atomically links and verifies a trusted Supabase X OAuth identity, prevents cross-Builder identity reuse and credits the one-time 5000 GP reward.';

COMMIT;
