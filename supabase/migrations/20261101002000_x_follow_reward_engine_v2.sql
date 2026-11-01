-- X Follow V2: internal-only accounting engine.
-- IMPORTANT: No external caller may submit a follow verdict to this function.
-- Integrate only after a server-side X API verifier authenticates the evidence.
-- Does not import, modify, or reverse any legacy X rewards.
begin;

create or replace function public.process_x_follow_verdict_v2(
  p_builder_id uuid,
  p_x_user_id text,
  p_following boolean
)
returns table(action text, cycle integer, total_gp bigint)
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_profile public.builder_profiles%rowtype;
  v_state public.builder_x_follow_state_v2%rowtype;
  v_cycle public.builder_x_reward_cycles_v2%rowtype;
  v_ledger uuid;
  v_cycle_number integer;
  v_key text;
begin
  if p_builder_id is null or p_x_user_id is null or btrim(p_x_user_id) = '' or p_following is null then
    raise exception 'Invalid verified follow input';
  end if;

  -- Serialize all changes for one Builder; never operate on a missing profile.
  select * into v_profile from public.builder_profiles
    where builder_id = p_builder_id for update;
  if not found then
    raise exception 'Builder profile missing';
  end if;

  select * into v_state from public.builder_x_follow_state_v2
    where builder_id = p_builder_id for update;
  if found and v_state.x_user_id <> p_x_user_id then
    raise exception 'X identity mismatch';
  end if;

  -- A legacy X reward is not automatically migrated or awarded again.
  if not found then
    if exists (
      select 1 from public.builder_reward_ledger
      where builder_id = p_builder_id and provider = 'x'
        and reward_type = 'social_verification' and entry_type = 'credit'
    ) then
      return query select 'legacy_review_required'::text, null::integer, v_profile.gp;
      return;
    end if;
    insert into public.builder_x_follow_state_v2(builder_id,x_user_id)
      values(p_builder_id,p_x_user_id);
  end if;

  select * into v_cycle from public.builder_x_reward_cycles_v2
    where builder_id = p_builder_id and status in ('active','reversal_pending')
    for update;

  if p_following then
    update public.builder_x_follow_state_v2
      set follow_status = 'following', last_checked_at = now(),
          next_check_at = now() + interval '30 days', updated_at = now()
      where builder_id = p_builder_id;

    if v_cycle.id is not null then
      if v_cycle.status = 'reversal_pending' then
        -- No debit was posted; restore the existing cycle without new GP.
        update public.builder_x_reward_cycles_v2
          set status = 'active'
          where id = v_cycle.id
            and reversal_ledger_id is null;

        if not found then
          raise exception 'Cannot reactivate reversed X reward cycle';
        end if;

        return query select 'reactivated'::text,
          v_cycle.cycle_number, v_profile.gp;
        return;
      end if;

      return query select 'already_active'::text,
        v_cycle.cycle_number, v_profile.gp;
      return;
    end if;

    select coalesce(max(cycle_number),0)+1 into v_cycle_number
      from public.builder_x_reward_cycles_v2 where builder_id = p_builder_id;
    v_key := 'x-follow-v2:award:' || p_builder_id::text || ':' || v_cycle_number::text;
    insert into public.builder_reward_ledger
      (builder_id,reward_type,provider,amount,entry_type,idempotency_key,metadata)
      values(p_builder_id,'x_follow_v2','x',5000,'credit',v_key,
             jsonb_build_object('cycle',v_cycle_number,'verified_x_user_id',p_x_user_id))
      returning id into v_ledger;
    update public.builder_profiles
      set personal_gp = personal_gp + 5000,
          gp = personal_gp + 5000 + eligible_network_gp
      where builder_id = p_builder_id returning * into v_profile;
    insert into public.builder_x_reward_cycles_v2
      (builder_id,cycle_number,status,award_ledger_id)
      values(p_builder_id,v_cycle_number,'active',v_ledger);
    return query select 'awarded'::text,v_cycle_number,v_profile.gp;
    return;
  end if;

  update public.builder_x_follow_state_v2
    set follow_status = 'not_following', last_checked_at = now(),
        next_check_at = now() + interval '30 days', updated_at = now()
    where builder_id = p_builder_id;

  if v_cycle.id is null then
    return query select 'no_active_cycle'::text,null::integer,v_profile.gp;
    return;
  end if;

  if v_profile.personal_gp < 5000 then
    update public.builder_x_reward_cycles_v2 set status = 'reversal_pending'
      where id = v_cycle.id;
    return query select 'reversal_pending'::text,v_cycle.cycle_number,v_profile.gp;
    return;
  end if;

  v_key := 'x-follow-v2:reversal:' || v_cycle.id::text;
  insert into public.builder_reward_ledger
    (builder_id,reward_type,provider,amount,entry_type,idempotency_key,metadata)
    values(p_builder_id,'reward_reversal','x',5000,'debit',v_key,
           jsonb_build_object('cycle',v_cycle.cycle_number,'award_ledger_id',v_cycle.award_ledger_id))
    returning id into v_ledger;
  update public.builder_profiles
    set personal_gp = personal_gp - 5000,
        gp = personal_gp - 5000 + eligible_network_gp
    where builder_id = p_builder_id returning * into v_profile;
  update public.builder_x_reward_cycles_v2
    set status='revoked',reversal_ledger_id=v_ledger,revoked_at=now()
    where id = v_cycle.id;
  return query select 'revoked'::text,v_cycle.cycle_number,v_profile.gp;
end;
$fn$;

-- No grant to service_role: only a deliberately privileged, vetted server-side
-- verification workflow should ever be able to submit trusted verdicts.
revoke all on function public.process_x_follow_verdict_v2(uuid,text,boolean)
  from public,anon,authenticated,service_role;
commit;
