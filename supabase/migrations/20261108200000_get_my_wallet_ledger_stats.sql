-- BOBU Wallet full-history statistics
-- Read-only; uses the authenticated user's RLS permissions.

create or replace function public.get_my_wallet_ledger_stats()
returns table (
  builder_id uuid,
  lifetime_earned_gp numeric,
  lifetime_spent_gp numeric,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    auth.uid(),
    coalesce(sum(
      case when entry_type = 'credit'
        then abs(amount) else 0 end
    ), 0)::numeric,
    coalesce(sum(
      case when entry_type = 'debit'
        then abs(amount) else 0 end
    ), 0)::numeric,
    count(*)::bigint
  from public.builder_reward_ledger
  where builder_id = auth.uid()
$$;

revoke all on function public.get_my_wallet_ledger_stats()
from public, anon;

grant execute on function public.get_my_wallet_ledger_stats()
to authenticated;
