begin;

alter table public.mars_devnet_faucet_requests
  drop constraint if exists mars_devnet_faucet_requests_amount_lamports_check;

alter table public.mars_devnet_faucet_requests
  add constraint mars_devnet_faucet_requests_amount_lamports_check
  check (amount_lamports = 1610000000);

commit;
