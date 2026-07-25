-- =====================================================
-- Builder Verification Tokens
-- One-time provider linking tokens
-- =====================================================

create table if not exists public.builder_verification_tokens (
    id uuid primary key default gen_random_uuid(),

    builder_id uuid not null
        references auth.users(id)
        on delete cascade,

    provider text not null
        check (provider in ('telegram', 'x', 'instagram')),

    token_hash text not null unique,

    expires_at timestamptz not null,

    used_at timestamptz,

    created_at timestamptz not null default now()
);

create index if not exists idx_verification_tokens_builder
on public.builder_verification_tokens(builder_id);

create index if not exists idx_verification_tokens_provider
on public.builder_verification_tokens(provider);

create index if not exists idx_verification_tokens_expires
on public.builder_verification_tokens(expires_at);

alter table public.builder_verification_tokens
enable row level security;

create policy "Users can view their own verification tokens"
on public.builder_verification_tokens
for select
using (auth.uid() = builder_id);

create policy "Users can create their own verification tokens"
on public.builder_verification_tokens
for insert
with check (auth.uid() = builder_id);