begin;

-- ============================================================
-- BOBU UNIVERSE
-- Admin Security Center + Immutable Audit Logs
-- ============================================================

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  action text not null
    check (
      char_length(trim(action)) between 1 and 120
    ),

  target_type text not null
    check (
      char_length(trim(target_type)) between 1 and 80
    ),

  target_id text,

  severity text not null default 'info'
    check (
      severity in (
        'info',
        'warning',
        'critical'
      )
    ),

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now()
);

create index if not exists
  admin_audit_logs_created_idx
on public.admin_audit_logs(created_at desc);

create index if not exists
  admin_audit_logs_action_idx
on public.admin_audit_logs(action);

create index if not exists
  admin_audit_logs_severity_idx
on public.admin_audit_logs(severity);

create index if not exists
  admin_audit_logs_actor_idx
on public.admin_audit_logs(actor_user_id);

alter table public.admin_audit_logs
enable row level security;

revoke all
on table public.admin_audit_logs
from public, anon, authenticated;


-- ============================================================
-- IMMUTABLE AUDIT HISTORY
-- ============================================================

create or replace function
public.prevent_admin_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  raise exception
    'admin_audit_logs is immutable; update and delete operations are not allowed';
end;
$function$;

drop trigger if exists
  prevent_admin_audit_logs_update
on public.admin_audit_logs;

create trigger prevent_admin_audit_logs_update
before update on public.admin_audit_logs
for each row
execute function
  public.prevent_admin_audit_log_mutation();

drop trigger if exists
  prevent_admin_audit_logs_delete
on public.admin_audit_logs;

create trigger prevent_admin_audit_logs_delete
before delete on public.admin_audit_logs
for each row
execute function
  public.prevent_admin_audit_log_mutation();


-- ============================================================
-- ADMIN USER CHANGE AUDIT TRIGGER
-- ============================================================

create or replace function
public.audit_admin_user_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_user_id uuid := auth.uid();
  v_action text;
  v_severity text := 'info';
  v_target_user_id uuid;
  v_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'admin_user_created';
    v_severity := 'warning';
    v_target_user_id := new.user_id;

    v_metadata := jsonb_build_object(
      'newRole', new.role,
      'newActive', new.active,
      'createdBy', new.created_by
    );

  elsif tg_op = 'UPDATE' then
    v_target_user_id := new.user_id;

    if old.role is distinct from new.role then
      v_action := 'admin_role_changed';
      v_severity := 'critical';

      v_metadata := jsonb_build_object(
        'previousRole', old.role,
        'newRole', new.role,
        'previousActive', old.active,
        'newActive', new.active
      );

    elsif old.active is distinct from new.active then
      v_action := 'admin_access_changed';
      v_severity := 'critical';

      v_metadata := jsonb_build_object(
        'role', new.role,
        'previousActive', old.active,
        'newActive', new.active
      );

    else
      v_action := 'admin_user_updated';

      v_metadata := jsonb_build_object(
        'role', new.role,
        'active', new.active
      );
    end if;

  elsif tg_op = 'DELETE' then
    v_action := 'admin_user_deleted';
    v_severity := 'critical';
    v_target_user_id := old.user_id;

    v_metadata := jsonb_build_object(
      'previousRole', old.role,
      'previousActive', old.active
    );

  else
    return null;
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    severity,
    metadata
  )
  values (
    v_actor_user_id,
    v_action,
    'admin_user',
    v_target_user_id::text,
    v_severity,
    coalesce(v_metadata, '{}'::jsonb)
  );

  return coalesce(new, old);
end;
$function$;

drop trigger if exists
  audit_admin_users_changes
on public.admin_users;

create trigger audit_admin_users_changes
after insert or update or delete
on public.admin_users
for each row
execute function public.audit_admin_user_changes();


-- ============================================================
-- SECURITY CENTER READ MODEL
-- ============================================================

create or replace function
public.get_admin_security_center(
  p_event_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_event_limit integer;
  v_result jsonb;
begin
  if not public.has_admin_console_access() then
    raise exception 'Admin Console access required';
  end if;

  v_event_limit := least(
    greatest(coalesce(p_event_limit, 10), 1),
    50
  );

  select jsonb_build_object(
    'generatedAt',
    now(),

    'summary',
    jsonb_build_object(
      'totalAdmins',
      (
        select count(*)
        from public.admin_users
      ),

      'activeAdmins',
      (
        select count(*)
        from public.admin_users
        where active = true
      ),

      'inactiveAdmins',
      (
        select count(*)
        from public.admin_users
        where active = false
      ),

      'owners',
      (
        select count(*)
        from public.admin_users
        where role = 'owner'
          and active = true
      ),

      'criticalEvents',
      (
        select count(*)
        from public.admin_audit_logs
        where severity = 'critical'
          and created_at >= now() - interval '30 days'
      )
    ),

    'admins',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', admin_user.user_id,
          'email', auth_user.email,
          'role', admin_user.role,
          'active', admin_user.active,
          'createdAt', admin_user.created_at,
          'updatedAt', admin_user.updated_at,
          'createdBy', admin_user.created_by,
          'authCreatedAt', auth_user.created_at,
          'lastSignInAt', auth_user.last_sign_in_at
        )
        order by
          case admin_user.role
            when 'owner' then 1
            when 'admin' then 2
            when 'support' then 3
            else 4
          end,
          admin_user.created_at asc
      )
      from public.admin_users as admin_user
      left join auth.users as auth_user
        on auth_user.id = admin_user.user_id
    ), '[]'::jsonb),

    'recentEvents',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'auditId', event.id,
          'actorUserId', event.actor_user_id,
          'actorEmail', actor.email,
          'action', event.action,
          'targetType', event.target_type,
          'targetId', event.target_id,
          'severity', event.severity,
          'metadata', event.metadata,
          'createdAt', event.created_at
        )
        order by event.created_at desc
      )
      from (
        select *
        from public.admin_audit_logs
        order by created_at desc
        limit v_event_limit
      ) as event
      left join auth.users as actor
        on actor.id = event.actor_user_id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$;


-- ============================================================
-- AUDIT LOG SEARCH READ MODEL
-- ============================================================

create or replace function public.get_admin_audit_logs(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null,
  p_action text default null,
  p_severity text default null
)
returns table (
  audit_id uuid,
  actor_user_id uuid,
  actor_email text,
  action text,
  target_type text,
  target_id text,
  severity text,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    audit.id as audit_id,
    audit.actor_user_id,
    actor.email::text as actor_email,
    audit.action,
    audit.target_type,
    audit.target_id,
    audit.severity,
    audit.metadata,
    audit.created_at

  from public.admin_audit_logs as audit

  left join auth.users as actor
    on actor.id = audit.actor_user_id

  where public.has_admin_console_access()

    and (
      nullif(trim(p_search), '') is null
      or audit.action ilike
        '%' || trim(p_search) || '%'
      or audit.target_type ilike
        '%' || trim(p_search) || '%'
      or coalesce(audit.target_id, '') ilike
        '%' || trim(p_search) || '%'
      or coalesce(actor.email, '') ilike
        '%' || trim(p_search) || '%'
    )

    and (
      nullif(trim(p_action), '') is null
      or audit.action = trim(p_action)
    )

    and (
      nullif(trim(p_severity), '') is null
      or audit.severity = trim(p_severity)
    )

  order by audit.created_at desc

  limit least(
    greatest(coalesce(p_limit, 25), 1),
    100
  )

  offset greatest(coalesce(p_offset, 0), 0);
$function$;


-- ============================================================
-- FUNCTION PERMISSIONS
-- ============================================================

revoke all
on function
  public.prevent_admin_audit_log_mutation()
from public;

revoke all
on function
  public.audit_admin_user_changes()
from public;

revoke all
on function
  public.get_admin_security_center(integer)
from public, anon;

revoke all
on function
  public.get_admin_audit_logs(
    integer,
    integer,
    text,
    text,
    text
  )
from public, anon;

grant execute
on function
  public.get_admin_security_center(integer)
to authenticated;

grant execute
on function
  public.get_admin_audit_logs(
    integer,
    integer,
    text,
    text,
    text
  )
to authenticated;

comment on table public.admin_audit_logs is
'Immutable Admin Console security and authority change history.';

comment on function
public.get_admin_security_center(integer) is
'Returns authorized Admin Security Center summary, administrator accounts and recent security events.';

comment on function
public.get_admin_audit_logs(
  integer,
  integer,
  text,
  text,
  text
) is
'Returns searchable immutable Admin Console audit history.';

commit;
