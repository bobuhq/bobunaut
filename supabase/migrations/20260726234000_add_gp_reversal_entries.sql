alter table public.builder_reward_ledger
add column if not exists entry_type text not null default 'credit';

alter table public.builder_reward_ledger
drop constraint if exists builder_reward_ledger_entry_type_check;

alter table public.builder_reward_ledger
add constraint builder_reward_ledger_entry_type_check
check (entry_type in ('credit', 'debit'));

create or replace function public.reverse_builder_gp(
  p_builder_id uuid,
  p_amount bigint,
  p_idempotency_key text,
  p_provider text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  reversed boolean,
  total_gp bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ledger_id uuid;
  v_total_gp bigint;
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Reversal amount must be greater than zero';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'Idempotency key is required';
  end if;

  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Reversal metadata must be a JSON object';
  end if;

  insert into public.builder_profiles (builder_id)
  values (p_builder_id)
  on conflict (builder_id) do nothing;

  insert into public.builder_reward_ledger (
    builder_id,
    reward_type,
    provider,
    amount,
    entry_type,
    idempotency_key,
    metadata
  )
  values (
    p_builder_id,
    'reward_reversal',
    nullif(trim(p_provider), ''),
    p_amount,
    'debit',
    trim(p_idempotency_key),
    p_metadata
  )
  on conflict (builder_id, idempotency_key)
  do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    select gp
    into v_total_gp
    from public.builder_profiles
    where builder_id = p_builder_id;

    return query
    select false, coalesce(v_total_gp, 0), null::uuid;

    return;
  end if;

  update public.builder_profiles
  set gp = greatest(gp - p_amount, 0)
  where builder_id = p_builder_id
  returning gp into v_total_gp;

  return query
  select true, v_total_gp, v_ledger_id;
end;
$$;

revoke all on function public.reverse_builder_gp(
  uuid,
  bigint,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.reverse_builder_gp(
  uuid,
  bigint,
  text,
  text,
  jsonb
) to service_role;

comment on function public.reverse_builder_gp(
  uuid,
  bigint,
  text,
  text,
  jsonb
) is
'Creates an immutable debit ledger entry and safely reduces Builder GP.';
