-- ============================================================
-- BOBU UNIVERSE
-- Builder Referral Unique Pair Compatibility Migration
--
-- Historical compatibility:
-- builder_referrals is created later by
-- 20260726100000_create_builder_referral_network.sql.
--
-- Clean replay:
-- If the table does not exist yet, this migration is a no-op.
--
-- Existing databases:
-- If the table exists and the named constraint is missing,
-- add it safely.
-- ============================================================

do $$
declare
  v_table regclass;
begin
  v_table := to_regclass('public.builder_referrals');

  if v_table is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'builder_referrals_unique_pair'
      and conrelid = v_table
  ) then
    execute
      'alter table public.builder_referrals
       add constraint builder_referrals_unique_pair
       unique (referrer_id, referred_id)';
  end if;
end
$$;
