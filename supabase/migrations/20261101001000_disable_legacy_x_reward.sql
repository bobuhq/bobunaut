begin;

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
security invoker
set search_path = ''
as $$
begin
  return query
  select
    false,
    false,
    false,
    0::bigint,
    0::bigint,
    null::uuid,
    null::timestamptz,
    'x_follow_verification_required'::text;
end;
$$;

revoke all on function public.claim_x_identity_reward(
  uuid, text, text
) from public, anon, authenticated, service_role;

commit;
