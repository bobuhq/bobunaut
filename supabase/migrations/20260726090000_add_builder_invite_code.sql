-- ============================================================
-- BOBU UNIVERSE
-- Builder Invite Code Foundation
-- ============================================================

alter table public.builder_profiles
add column if not exists invite_code text;


create unique index if not exists
builder_profiles_invite_code_unique_idx
on public.builder_profiles(invite_code)
where invite_code is not null;


comment on column public.builder_profiles.invite_code is
'Unique Builder invitation code used for future Builder Civilization network connections.';
