-- ============================================================
-- BOBU UNIVERSE
-- BOBU Signal Campaigns v1
--
-- Campaign definitions + trusted verification state.
-- This migration DOES NOT award GP.
-- ============================================================

create table if not exists public.bobu_signal_campaigns (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,
  title text not null,
  description text not null default '',

  platform text not null default 'x'
    check (platform = 'x'),

  post_url text not null,
  post_id text not null,

  reward_gp bigint not null
    check (reward_gp >= 50),

  require_repost boolean not null default true,
  require_reply boolean not null default true,

  starts_at timestamptz,
  ends_at timestamptz,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'active',
        'paused',
        'completed',
        'archived'
      )
    ),

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bobu_signal_campaign_window_check
    check (
      ends_at is null
      or starts_at is null
      or ends_at > starts_at
    )
);

create index if not exists
  bobu_signal_campaigns_status_idx
on public.bobu_signal_campaigns (
  status,
  starts_at,
  ends_at
);

create index if not exists
  bobu_signal_campaigns_post_id_idx
on public.bobu_signal_campaigns (post_id);


create table if not exists
public.bobu_signal_campaign_claims (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.bobu_signal_campaigns(id)
    on delete cascade,

  builder_id uuid not null,

  x_provider_user_id text not null,
  x_username text,

  repost_verified boolean not null default false,
  reply_verified boolean not null default false,

  repost_verified_at timestamptz,
  reply_verified_at timestamptz,

  verification_status text not null default 'pending'
    check (
      verification_status in (
        'pending',
        'verified',
        'failed'
      )
    ),

  verification_metadata jsonb
    not null default '{}'::jsonb,

  verified_at timestamptz,

  reward_awarded boolean not null default false,
  reward_ledger_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (campaign_id, builder_id),
  unique (campaign_id, x_provider_user_id)
);

create index if not exists
  bobu_signal_campaign_claims_builder_idx
on public.bobu_signal_campaign_claims (
  builder_id,
  created_at desc
);

create index if not exists
  bobu_signal_campaign_claims_campaign_idx
on public.bobu_signal_campaign_claims (
  campaign_id,
  verification_status
);


drop trigger if exists
  bobu_signal_campaigns_set_updated_at
on public.bobu_signal_campaigns;

create trigger bobu_signal_campaigns_set_updated_at
before update on public.bobu_signal_campaigns
for each row
execute function public.bobu_set_updated_at();


drop trigger if exists
  bobu_signal_campaign_claims_set_updated_at
on public.bobu_signal_campaign_claims;

create trigger bobu_signal_campaign_claims_set_updated_at
before update on public.bobu_signal_campaign_claims
for each row
execute function public.bobu_set_updated_at();


alter table public.bobu_signal_campaigns
  enable row level security;

alter table public.bobu_signal_campaign_claims
  enable row level security;


drop policy if exists
  bobu_signal_campaigns_read_active
on public.bobu_signal_campaigns;

create policy bobu_signal_campaigns_read_active
on public.bobu_signal_campaigns
for select
to anon, authenticated
using (
  status = 'active'
  and (
    starts_at is null
    or starts_at <= now()
  )
  and (
    ends_at is null
    or ends_at > now()
  )
);


drop policy if exists
  bobu_signal_claims_read_own
on public.bobu_signal_campaign_claims;

create policy bobu_signal_claims_read_own
on public.bobu_signal_campaign_claims
for select
to authenticated
using (
  builder_id = auth.uid()
);


revoke insert, update, delete
on public.bobu_signal_campaigns
from anon, authenticated;

revoke insert, update, delete
on public.bobu_signal_campaign_claims
from anon, authenticated;


create or replace function
public.get_active_signal_campaigns()
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  platform text,
  post_url text,
  post_id text,
  reward_gp bigint,
  require_repost boolean,
  require_reply boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  builder_verification_status text,
  reward_awarded boolean
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  select
    campaign.id,
    campaign.slug,
    campaign.title,
    campaign.description,
    campaign.platform,
    campaign.post_url,
    campaign.post_id,
    campaign.reward_gp,
    campaign.require_repost,
    campaign.require_reply,
    campaign.starts_at,
    campaign.ends_at,
    claim.verification_status,
    coalesce(claim.reward_awarded, false)
  from public.bobu_signal_campaigns as campaign
  left join public.bobu_signal_campaign_claims as claim
    on claim.campaign_id = campaign.id
   and claim.builder_id = auth.uid()
  where campaign.status = 'active'
    and (
      campaign.starts_at is null
      or campaign.starts_at <= now()
    )
    and (
      campaign.ends_at is null
      or campaign.ends_at > now()
    )
  order by
    campaign.starts_at desc nulls last,
    campaign.created_at desc;
$$;

revoke all
on function public.get_active_signal_campaigns()
from public;

grant execute
on function public.get_active_signal_campaigns()
to anon, authenticated;


comment on table public.bobu_signal_campaigns is
  'Admin-managed BOBU Signal campaigns.';

comment on table public.bobu_signal_campaign_claims is
  'Trusted X activity verification state for BOBU Signal campaigns.';


-- ============================================================
-- Trusted Signal Campaign reward finalization
--
-- Called only from trusted server context after X activity
-- verification has succeeded.
-- ============================================================

create or replace function
public.finalize_signal_campaign_reward(
  p_campaign_id uuid,
  p_builder_id uuid,
  p_x_provider_user_id text,
  p_x_username text,
  p_repost_verified boolean,
  p_reply_verified boolean,
  p_verification_metadata jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  already_awarded boolean,
  reward_gp bigint,
  verification_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.bobu_signal_campaigns%rowtype;
  v_claim public.bobu_signal_campaign_claims%rowtype;
  v_idempotency_key text;
  v_reward_awarded boolean;
  v_reward_total_gp bigint;
  v_reward_ledger_id uuid;
begin
  -- This function must never trust a browser-supplied reward amount.
  select *
  into v_campaign
  from public.bobu_signal_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'SIGNAL_CAMPAIGN_NOT_FOUND';
  end if;

  if v_campaign.status <> 'active' then
    raise exception 'SIGNAL_CAMPAIGN_NOT_ACTIVE';
  end if;

  if (
    v_campaign.starts_at is not null
    and v_campaign.starts_at > now()
  ) then
    raise exception 'SIGNAL_CAMPAIGN_NOT_STARTED';
  end if;

  if (
    v_campaign.ends_at is not null
    and v_campaign.ends_at <= now()
  ) then
    raise exception 'SIGNAL_CAMPAIGN_ENDED';
  end if;

  if (
    v_campaign.require_repost
    and not p_repost_verified
  ) then
    raise exception 'SIGNAL_REPOST_NOT_VERIFIED';
  end if;

  if (
    v_campaign.require_reply
    and not p_reply_verified
  ) then
    raise exception 'SIGNAL_REPLY_NOT_VERIFIED';
  end if;

  insert into public.bobu_signal_campaign_claims (
    campaign_id,
    builder_id,
    x_provider_user_id,
    x_username,
    repost_verified,
    reply_verified,
    repost_verified_at,
    reply_verified_at,
    verification_status,
    verification_metadata,
    verified_at,
    reward_awarded
  )
  values (
    v_campaign.id,
    p_builder_id,
    p_x_provider_user_id,
    nullif(p_x_username, ''),
    p_repost_verified,
    p_reply_verified,
    case
      when p_repost_verified then now()
      else null
    end,
    case
      when p_reply_verified then now()
      else null
    end,
    'verified',
    coalesce(
      p_verification_metadata,
      '{}'::jsonb
    ),
    now(),
    false
  )
  on conflict (campaign_id, builder_id)
  do update set
    x_provider_user_id =
      excluded.x_provider_user_id,
    x_username =
      excluded.x_username,
    repost_verified =
      excluded.repost_verified,
    reply_verified =
      excluded.reply_verified,
    repost_verified_at =
      excluded.repost_verified_at,
    reply_verified_at =
      excluded.reply_verified_at,
    verification_status = 'verified',
    verification_metadata =
      excluded.verification_metadata,
    verified_at = now(),
    updated_at = now()
  returning *
  into v_claim;

  if v_claim.reward_awarded then
    return query
    select
      false,
      true,
      v_campaign.reward_gp,
      v_claim.verification_status;

    return;
  end if;

  v_idempotency_key :=
    'signal_campaign:' ||
    v_campaign.id::text ||
    ':' ||
    p_builder_id::text;

  select
    reward.awarded,
    reward.total_gp,
    reward.ledger_id
  into
    v_reward_awarded,
    v_reward_total_gp,
    v_reward_ledger_id
  from public.award_builder_gp(
    p_builder_id,
    'signal_campaign',
    v_campaign.reward_gp,
    v_idempotency_key,
    'x',
    jsonb_build_object(
      'campaign_id', v_campaign.id,
      'campaign_slug', v_campaign.slug,
      'post_id', v_campaign.post_id,
      'post_url', v_campaign.post_url,
      'platform', v_campaign.platform,
      'x_provider_user_id',
        p_x_provider_user_id,
      'x_username',
        nullif(p_x_username, '')
    )
  ) as reward;

  update public.bobu_signal_campaign_claims
  set
    reward_awarded = true,
    reward_ledger_id =
      coalesce(
        reward_ledger_id,
        v_reward_ledger_id
      ),
    updated_at = now()
  where
    campaign_id = v_campaign.id
    and builder_id = p_builder_id
  returning *
  into v_claim;

  return query
  select
    coalesce(v_reward_awarded, false),
    not coalesce(v_reward_awarded, false),
    case
      when coalesce(v_reward_awarded, false)
        then v_campaign.reward_gp
      else 0::bigint
    end,
    v_claim.verification_status;
end;
$$;


revoke all
on function public.finalize_signal_campaign_reward(
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.finalize_signal_campaign_reward(
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  jsonb
)
to service_role;


comment on function
public.finalize_signal_campaign_reward(
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  jsonb
)
is
  'Server-only atomic BOBU Signal Campaign verification and GP finalization.';
