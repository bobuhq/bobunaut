-- ============================================================
-- BOBU UNIVERSE
-- Builder Preferences Engine v1.0
--
-- Shared preference source for:
-- - Web application
-- - Mobile application
-- - Future notification and communication services
-- ============================================================


-- ============================================================
-- BUILDER PREFERENCES
-- One canonical preference row per authenticated Builder.
-- ============================================================

create table if not exists public.builder_preferences (
  builder_id uuid primary key
    references auth.users(id)
    on delete cascade,

  preferred_language text not null default 'en'
    check (
      preferred_language in (
        'en',
        'tr',
        'de',
        'fr',
        'es',
        'zh',
        'ja',
        'ar'
      )
    ),

  theme_preference text not null default 'system'
    check (
      theme_preference in (
        'system',
        'light',
        'dark'
      )
    ),

  motion_preference text not null default 'system'
    check (
      motion_preference in (
        'system',
        'full',
        'reduced'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


comment on table public.builder_preferences is
  'Canonical cross-device Builder preferences for web and mobile clients.';

comment on column public.builder_preferences.preferred_language is
  'Preferred BOBU interface language.';

comment on column public.builder_preferences.theme_preference is
  'Preferred interface theme: system, light or dark.';

comment on column public.builder_preferences.motion_preference is
  'Preferred animation behavior: system, full or reduced.';


-- ============================================================
-- UPDATED_AT
-- Reuse the existing BOBU updated_at function.
-- ============================================================

drop trigger if exists builder_preferences_set_updated_at
  on public.builder_preferences;

create trigger builder_preferences_set_updated_at
before update on public.builder_preferences
for each row
execute function public.bobu_set_updated_at();


-- ============================================================
-- EXISTING BUILDERS
-- Create default preference rows for current accounts.
-- ============================================================

insert into public.builder_preferences (
  builder_id
)
select
  users.id
from auth.users as users
on conflict (builder_id)
do nothing;


-- ============================================================
-- NEW BUILDER SIGNUP
-- Keep Builder profile and preferences creation atomic inside
-- the existing signup handler.
-- ============================================================

create or replace function public.handle_new_builder()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin

  insert into public.builder_profiles (
    builder_id,
    level,
    xp,
    gp,
    reputation,
    referral_count
  )
  values (
    new.id,
    1,
    0,
    0,
    0,
    0
  )
  on conflict (builder_id)
  do nothing;

  insert into public.builder_preferences (
    builder_id
  )
  values (
    new.id
  )
  on conflict (builder_id)
  do nothing;

  return new;

end;
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- Builders may read only their own preferences.
-- Direct browser writes are not allowed.
-- ============================================================

alter table public.builder_preferences
  enable row level security;


drop policy if exists
  "Builders can read their own preferences"
  on public.builder_preferences;

create policy
  "Builders can read their own preferences"
on public.builder_preferences
for select
to authenticated
using (
  auth.uid() = builder_id
);


revoke all on table public.builder_preferences
  from anon, authenticated;

grant select on table public.builder_preferences
  to authenticated;


-- ============================================================
-- SECURE PREFERENCE UPDATE RPC
--
-- The authenticated Builder can update only their own row.
-- The client cannot provide a Builder ID.
-- Null parameters preserve the current value.
-- ============================================================

create or replace function public.update_my_builder_preferences(
  p_preferred_language text default null,
  p_theme_preference text default null,
  p_motion_preference text default null
)
returns public.builder_preferences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid;
  v_preferences public.builder_preferences;
begin

  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception
      'Authentication is required to update Builder preferences.';
  end if;

  if
    p_preferred_language is not null
    and p_preferred_language not in (
      'en',
      'tr',
      'de',
      'fr',
      'es',
      'zh',
      'ja',
      'ar'
    )
  then
    raise exception
      'Unsupported preferred language.';
  end if;

  if
    p_theme_preference is not null
    and p_theme_preference not in (
      'system',
      'light',
      'dark'
    )
  then
    raise exception
      'Unsupported theme preference.';
  end if;

  if
    p_motion_preference is not null
    and p_motion_preference not in (
      'system',
      'full',
      'reduced'
    )
  then
    raise exception
      'Unsupported motion preference.';
  end if;

  insert into public.builder_preferences (
    builder_id,
    preferred_language,
    theme_preference,
    motion_preference
  )
  values (
    v_builder_id,
    coalesce(p_preferred_language, 'en'),
    coalesce(p_theme_preference, 'system'),
    coalesce(p_motion_preference, 'system')
  )
  on conflict (builder_id)
  do update set
    preferred_language = coalesce(
      p_preferred_language,
      public.builder_preferences.preferred_language
    ),
    theme_preference = coalesce(
      p_theme_preference,
      public.builder_preferences.theme_preference
    ),
    motion_preference = coalesce(
      p_motion_preference,
      public.builder_preferences.motion_preference
    )
  returning *
  into v_preferences;

  return v_preferences;

end;
$$;


revoke all on function
  public.update_my_builder_preferences(
    text,
    text,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.update_my_builder_preferences(
    text,
    text,
    text
  )
to authenticated;


comment on function
  public.update_my_builder_preferences(
    text,
    text,
    text
  )
is
  'Securely updates preferences for the currently authenticated Builder.';
