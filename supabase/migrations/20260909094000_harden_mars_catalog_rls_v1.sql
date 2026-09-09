-- Harden Mars catalog API access.
-- No production data is modified by this migration.

-- ============================================================
-- 1. Discovery result catalog
-- Internal catalog consumed by SECURITY DEFINER server logic.
-- No direct anon/authenticated API access is required.
-- ============================================================

alter table public.mars_discovery_result_catalog
enable row level security;

revoke all
on public.mars_discovery_result_catalog
from public, anon, authenticated;


-- ============================================================
-- 2. Landmark catalog
-- Authenticated builders may read active/catalog data.
-- Client-side writes are not permitted.
-- ============================================================

alter table public.mars_landmark_catalog
enable row level security;

revoke all
on public.mars_landmark_catalog
from public, anon, authenticated;

grant select
on public.mars_landmark_catalog
to authenticated;

drop policy if exists
  "Authenticated builders can read Mars landmark catalog"
on public.mars_landmark_catalog;

create policy
  "Authenticated builders can read Mars landmark catalog"
on public.mars_landmark_catalog
for select
to authenticated
using (true);
