create or replace function increment_referral_count(
  target_builder_id uuid
)
returns void
language plpgsql
security definer
as $$
begin

  update public.builder_profiles
  set referral_count =
      referral_count + 1
  where builder_id = target_builder_id;

end;
$$;
