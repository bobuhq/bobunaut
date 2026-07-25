-- =====================================================
-- Builder Social Identities
-- =====================================================

create table if not exists public.builder_social_identities (
    id uuid primary key default gen_random_uuid(),

    builder_id uuid not null references auth.users(id) on delete cascade,

    provider text not null,

    provider_user_id text not null,

    username text,

    verified boolean not null default false,

    verified_at timestamptz,

    reward_claimed boolean not null default false,

    reward_claimed_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique(provider, provider_user_id),

    unique(builder_id, provider)
);

create index if not exists idx_builder_social_builder
on public.builder_social_identities(builder_id);

create index if not exists idx_builder_social_provider
on public.builder_social_identities(provider);

create index if not exists idx_builder_social_verified
on public.builder_social_identities(verified);
-- Enable Row Level Security
alter table public.builder_social_identities
enable row level security;

-- Users can only read their own social identities
create policy "Users can view their own social identities"
on public.builder_social_identities
for select
using (auth.uid() = builder_id);

-- Users can only insert their own social identities
create policy "Users can insert their own social identities"
on public.builder_social_identities
for insert
with check (auth.uid() = builder_id);

-- Users can only update their own social identities
create policy "Users can update their own social identities"
on public.builder_social_identities
for update
using (auth.uid() = builder_id);