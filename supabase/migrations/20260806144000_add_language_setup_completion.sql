-- ============================================================
-- BOBU UNIVERSE
-- Builder Language Setup v1.0
--
-- Production-safe language onboarding state shared by
-- Web, Mobile and future BOBU clients.
-- ============================================================

alter table public.builder_preferences
  add column if not exists
    language_setup_completed boolean not null default false,
  add column if not exists
    language_confirmed_at timestamptz;

comment on column
  public.builder_preferences.language_setup_completed
is
  'True after the Builder explicitly confirms a preferred interface language.';

comment on column
  public.builder_preferences.language_confirmed_at
is
  'Timestamp of the latest explicit Builder language confirmation.';


-- ============================================================
-- SUPPORTED LANGUAGES
--
-- Expand the database constraint to the same 13-language set
-- used by the production Web and Mobile clients.
-- ============================================================

alter table public.builder_preferences
  drop constraint if exists
    builder_preferences_preferred_language_check;

alter table public.builder_preferences
  add constraint
    builder_preferences_preferred_language_check
  check (
    preferred_language in (
      'en',
      'tr',
      'fi',
      'sv',
      'de',
      'fr',
      'es',
      'pt',
      'ru',
      'ar',
      'zh',
      'ja',
      'ko'
    )
  );


-- ============================================================
-- EXISTING BUILDERS
--
-- Existing production accounts must not be unexpectedly forced
-- through the new onboarding screen.
-- ============================================================

update public.builder_preferences
set
  language_setup_completed = true,
  language_confirmed_at = coalesce(
    language_confirmed_at,
    updated_at,
    created_at,
    now()
  )
where language_setup_completed = false;


-- ============================================================
-- SECURE PREFERENCE UPDATE RPC v2
--
-- Replace the previous 3-argument RPC with a backward-compatible
-- 4-argument function. The fourth parameter has a default value,
-- so currently deployed clients continue to work.
-- ============================================================

drop function if exists
  public.update_my_builder_preferences(
    text,
    text,
    text
  );

create or replace function
  public.update_my_builder_preferences(
    p_preferred_language text default null,
    p_theme_preference text default null,
    p_motion_preference text default null,
    p_language_setup_completed boolean default null
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
      'fi',
      'sv',
      'de',
      'fr',
      'es',
      'pt',
      'ru',
      'ar',
      'zh',
      'ja',
      'ko'
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
    motion_preference,
    language_setup_completed,
    language_confirmed_at
  )
  values (
    v_builder_id,
    coalesce(p_preferred_language, 'en'),
    coalesce(p_theme_preference, 'system'),
    coalesce(p_motion_preference, 'system'),
    coalesce(p_language_setup_completed, false),
    case
      when p_language_setup_completed = true
        then now()
      else null
    end
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
    ),
    language_setup_completed = coalesce(
      p_language_setup_completed,
      public.builder_preferences.language_setup_completed
    ),
    language_confirmed_at = case
      when p_language_setup_completed = true
        then now()
      when p_language_setup_completed = false
        then null
      else public.builder_preferences.language_confirmed_at
    end
  returning *
  into v_preferences;

  return v_preferences;
end;
$$;


revoke all on function
  public.update_my_builder_preferences(
    text,
    text,
    text,
    boolean
  )
from public, anon, authenticated;

grant execute on function
  public.update_my_builder_preferences(
    text,
    text,
    text,
    boolean
  )
to authenticated;

comment on function
  public.update_my_builder_preferences(
    text,
    text,
    text,
    boolean
  )
is
  'Securely updates preferences and explicit language setup state for the authenticated Builder.';
