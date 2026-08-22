begin;

-- ============================================================
-- BOBU MARS
-- Controlled live Market / Placement verification resources
--
-- Scope: Bobu Genesis Colony only.
-- No GP / Mining / Wallet / Referral side effects.
-- Existing higher balances are preserved.
-- ============================================================

do $$
declare
  v_colony_id uuid;
begin
  select c.id
  into v_colony_id
  from public.mars_colonies c
  where c.name = 'Bobu Genesis'
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'BOBU_GENESIS_COLONY_NOT_FOUND';
  end if;

  update public.mars_colony_resources r
  set
    materials = greatest(r.materials, 5000),
    energy    = greatest(r.energy, 5000),
    water     = greatest(r.water, 5000),
    science   = greatest(r.science, 5000),
    food      = greatest(r.food, 5000),
    updated_at = now()
  where r.colony_id = v_colony_id;

  if not found then
    raise exception 'BOBU_GENESIS_RESOURCES_NOT_FOUND';
  end if;
end;
$$;

commit;
