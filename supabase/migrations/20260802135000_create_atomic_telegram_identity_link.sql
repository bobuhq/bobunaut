-- ============================================================
-- BOBU UNIVERSE
-- Atomic Telegram Identity Link Engine
--
-- Securely links a Telegram identity to a Builder and consumes
-- the one-time verification token in a single transaction.
-- ============================================================

create or replace function public.link_telegram_identity(
  p_token_hash text,
  p_provider_user_id text,
  p_username text default null
)
returns table (
  linked boolean,
  builder_id uuid,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.builder_verification_tokens;
  v_existing_builder_id uuid;
  v_token_hash text;
  v_provider_user_id text;
begin
  v_token_hash := trim(coalesce(p_token_hash, ''));
  v_provider_user_id :=
    trim(coalesce(p_provider_user_id, ''));

  if v_token_hash = '' then
    raise exception 'Verification token hash is required.';
  end if;

  if v_provider_user_id = '' then
    raise exception 'Telegram user ID is required.';
  end if;

  /*
   * Lock the token row so two concurrent Telegram webhook
   * deliveries cannot consume the same token.
   */
  select token.*
  into v_token
  from public.builder_verification_tokens as token
  where token.provider = 'telegram'
    and token.token_hash = v_token_hash
  for update;

  if not found then
    return query
    select
      false,
      null::uuid,
      'token_not_found'::text;

    return;
  end if;

  if v_token.used_at is not null then
    return query
    select
      false,
      v_token.builder_id,
      'token_already_used'::text;

    return;
  end if;

  if v_token.expires_at <= now() then
    return query
    select
      false,
      v_token.builder_id,
      'token_expired'::text;

    return;
  end if;

  /*
   * One Telegram identity may belong to only one Builder.
   */
  select identity.builder_id
  into v_existing_builder_id
  from public.builder_social_identities as identity
  where lower(identity.provider) = 'telegram'
    and identity.provider_user_id = v_provider_user_id
  limit 1;

  if (
    v_existing_builder_id is not null
    and v_existing_builder_id <> v_token.builder_id
  ) then
    return query
    select
      false,
      v_token.builder_id,
      'identity_already_linked'::text;

    return;
  end if;

  insert into public.builder_social_identities (
    builder_id,
    provider,
    provider_user_id,
    username,
    updated_at
  )
  values (
    v_token.builder_id,
    'telegram',
    v_provider_user_id,
    nullif(trim(coalesce(p_username, '')), ''),
    now()
  )
  on conflict (builder_id, provider)
  do update
  set
    provider_user_id = excluded.provider_user_id,
    username = excluded.username,
    updated_at = now();

  update public.builder_verification_tokens
  set used_at = now()
  where id = v_token.id
    and used_at is null;

  return query
  select
    true,
    v_token.builder_id,
    'linked'::text;
end;
$$;


revoke all
on function public.link_telegram_identity(
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.link_telegram_identity(
  text,
  text,
  text
)
to service_role;


comment on function public.link_telegram_identity(
  text,
  text,
  text
) is
  'Atomically validates and consumes a Telegram verification token, prevents cross-Builder identity reuse, and links the Telegram identity.';
