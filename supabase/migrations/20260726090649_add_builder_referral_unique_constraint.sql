alter table public.builder_referrals
add constraint builder_referrals_unique_pair
unique (referrer_id, referred_id);
