begin;

-- ============================================================
-- BOBU UNIVERSE
-- Admin Security v1
--
-- Admin authority is stored server-side.
-- No browser or normal Builder can assign admin roles.
-- ============================================================

create table if not exists public.admin_users (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  role text not null
    check (
      role in (
        'owner',
        'admin',
        'support',
        'analyst'
      )
    ),

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null
);

create index if not exists admin_users_active_role_idx
  on public.admin_users(active, role);

drop trigger if exists admin_users_set_updated_at
  on public.admin_users;

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row
execute function public.bobu_set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- No direct browser access to the table.
-- Reads happen through restricted RPC functions.
-- ============================================================

alter table public.admin_users
enable row level security;

revoke all on table public.admin_users
from public, anon, authenticated;


-- ============================================================
-- CURRENT ADMIN ACCESS
-- Returns only the authenticated user's own admin status.
-- ============================================================

create or replace function public.get_my_admin_access()
returns table (
  user_id uuid,
  role text,
  active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    admin.user_id,
    admin.role,
    admin.active
  from public.admin_users as admin
  where admin.user_id = auth.uid()
    and admin.active = true;
$$;


-- ============================================================
-- BOOLEAN ADMIN CHECK
-- Owner and admin roles count as full administrators.
-- Support and analyst remain restricted roles for future use.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users as admin
    where admin.user_id = auth.uid()
      and admin.active = true
      and admin.role in ('owner', 'admin')
  );
$$;


-- ============================================================
-- ANY ADMIN CONSOLE ACCESS
-- Includes restricted support and analyst roles.
-- ============================================================

create or replace function public.has_admin_console_access()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users as admin
    where admin.user_id = auth.uid()
      and admin.active = true
  );
$$;


-- ============================================================
-- FUNCTION PERMISSIONS
-- ============================================================

revoke all on function public.get_my_admin_access()
from public;

revoke all on function public.is_admin()
from public;

revoke all on function public.has_admin_console_access()
from public;

grant execute on function public.get_my_admin_access()
to authenticated;

grant execute on function public.is_admin()
to authenticated;

grant execute on function public.has_admin_console_access()
to authenticated;

commit;
