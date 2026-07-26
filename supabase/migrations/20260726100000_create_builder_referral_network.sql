-- ============================================================
-- BOBU UNIVERSE
-- Builder Referral Network Foundation
-- ============================================================


alter table public.builder_profiles
add column if not exists referred_by uuid;


alter table public.builder_profiles
add column if not exists referral_count bigint default 0;


create table if not exists public.builder_referrals (
  id uuid primary key default gen_random_uuid(),

  referrer_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  referred_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  status text not null default 'active',

  created_at timestamptz default now(),

  unique(referrer_id, referred_id)
);


create index if not exists builder_referrals_referrer_idx
on public.builder_referrals(referrer_id);


create index if not exists builder_referrals_referred_idx
on public.builder_referrals(referred_id);


comment on table public.builder_referrals is
'Builder Civilization Network connection graph. Each row represents one Builder referral relationship.';
