-- ============================================================
-- BOBU UNIVERSE
-- Harden Builder Civilization referral network
-- ============================================================

begin;

-- Existing valid connections remain unchanged.
-- New Builder connections must begin as pending.
alter table public.builder_referrals
alter column status set default 'pending';

-- Stop the migration instead of silently deleting bad data.
do $$
begin
  if exists (
    select 1
    from public.builder_referrals
    where referrer_id = referred_id
  ) then
    raise exception
      'Builder referral network contains self-referrals';
  end if;

  if exists (
    select referred_id
    from public.builder_referrals
    group by referred_id
    having count(*) > 1
  ) then
    raise exception
      'A referred Builder is connected to multiple referrers';
  end if;

  if exists (
    select 1
    from public.builder_referrals
    where status not in (
      'pending',
      'active',
      'blocked',
      'revoked'
    )
  ) then
    raise exception
      'Builder referral network contains an invalid status';
  end if;
end;
$$;

-- A Builder cannot invite themselves.
alter table public.builder_referrals
drop constraint if exists
builder_referrals_no_self_referral;

alter table public.builder_referrals
add constraint builder_referrals_no_self_referral
check (referrer_id <> referred_id);

-- Every referred Builder can have exactly one direct referrer.
create unique index if not exists
builder_referrals_referred_unique_idx
on public.builder_referrals(referred_id);

-- Explicit lifecycle states for activation.
alter table public.builder_referrals
drop constraint if exists
builder_referrals_status_check;

alter table public.builder_referrals
add constraint builder_referrals_status_check
check (
  status in (
    'pending',
    'active',
    'blocked',
    'revoked'
  )
);

comment on column public.builder_referrals.status is
'Builder Civilization connection state. New connections begin pending and become active only after Builder activation requirements are completed.';

commit;
