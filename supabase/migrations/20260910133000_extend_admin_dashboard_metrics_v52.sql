-- BOBU Universe
-- V52: Admin Dashboard registered-user metrics
--
-- Canonical public launch date:
-- 2026-08-17 00:00:00 UTC
--
-- Security:
-- - auth.users remains inaccessible to the browser.
-- - Metrics are exposed only through this SECURITY DEFINER RPC.
-- - Existing Admin Console RBAC is preserved through
--   has_admin_console_access().

drop function if exists public.get_admin_dashboard_metrics();

create function public.get_admin_dashboard_metrics()
returns table (
  total_registered_users bigint,
  users_since_launch bigint,
  total_gp bigint,
  active_miners bigint
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
begin
  if not public.has_admin_console_access() then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    (
      select count(*)
      from auth.users
    )::bigint as total_registered_users,

    (
      select count(*)
      from auth.users
      where created_at >= timestamptz '2026-08-17 00:00:00+00'
    )::bigint as users_since_launch,

    (
      select coalesce(sum(gp), 0)
      from public.builder_profiles
    )::bigint as total_gp,

    (
      select count(*)
      from public.builder_mining_sessions
      where status = 'active'
        and ends_at > now()
    )::bigint as active_miners;
end;
$function$;

revoke all on function public.get_admin_dashboard_metrics() from public;
revoke all on function public.get_admin_dashboard_metrics() from anon;
grant execute on function public.get_admin_dashboard_metrics() to authenticated;
grant execute on function public.get_admin_dashboard_metrics() to service_role;

comment on function public.get_admin_dashboard_metrics() is
  'Admin Console dashboard metrics. Registered-user metrics are derived server-side from auth.users. Launch date: 2026-08-17 UTC.';
