begin;

revoke all on function public.increment_referral_count(uuid)
from public, anon, authenticated, service_role;

comment on function public.increment_referral_count(uuid) is
'Legacy referral counter function. Disabled from external execution. Referral accounting must use the current secure referral reward/activation flow.';

commit;
