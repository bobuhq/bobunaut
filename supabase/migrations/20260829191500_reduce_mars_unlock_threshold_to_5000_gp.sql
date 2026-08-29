create or replace function public.get_mars_unlock_threshold()
returns bigint
language sql
immutable
security definer
set search_path = public, pg_temp
as $function$
  select 5000::bigint;
$function$;

comment on function public.get_mars_unlock_threshold() is
  'Returns the authoritative Total GP threshold required to permanently unlock BOBU Mars access.';

revoke all on function public.get_mars_unlock_threshold()
from public;

grant execute on function public.get_mars_unlock_threshold()
to authenticated;
