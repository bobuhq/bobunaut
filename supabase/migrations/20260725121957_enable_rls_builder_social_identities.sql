alter table public.builder_social_identities
enable row level security;

drop policy if exists "Users can view their own social identities"
on public.builder_social_identities;

create policy "Users can view their own social identities"
on public.builder_social_identities
for select
to authenticated
using (auth.uid() = builder_id);
