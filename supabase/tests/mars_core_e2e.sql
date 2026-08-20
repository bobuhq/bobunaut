\set ON_ERROR_STOP on
\pset pager off

-- ============================================================
-- BOBU UNIVERSE
-- MARS CORE E2E TEST V1
--
-- Verifies:
--
-- Builder
--   -> Mars Access
--   -> Colony
--   -> Sector
--   -> Building Construction
--   -> Building Upgrade
--   -> Resource Production Claim
--   -> 5 Mission Progress rows
--   -> 5 Mission Reward Claims
--   -> +1600 GP
--   -> Mission Reward Ledger
--   -> Mars Mission Contribution Ledger
--   -> Civilization Aggregate
--   -> Claim Idempotency
--
-- Entire test is rolled back.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Test constants
-- ------------------------------------------------------------

create temporary table mars_e2e_state (
  builder_id uuid not null,
  colony_id uuid,
  sector_id uuid,
  starting_gp bigint not null,
  civilization_before_claims bigint,
  civilization_after_claims bigint
) on commit drop;

insert into mars_e2e_state (
  builder_id,
  starting_gp
)
values (
  '77777777-7777-4777-8777-777777777777',
  20000
);

-- ------------------------------------------------------------
-- 1. Test auth user
-- ------------------------------------------------------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000',
  builder_id,
  'authenticated',
  'authenticated',
  'mars-core-e2e@bobu.test',
  crypt('BOBU-MARS-E2E-ONLY', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Mars Core E2E"}'::jsonb,
  now(),
  now(),
  false,
  false
from mars_e2e_state;

-- Signup trigger should create builder_profiles.
-- Make authoritative GP state deterministic.

update public.builder_profiles bp
set
  gp = state.starting_gp,
  personal_gp = state.starting_gp,
  pending_network_gp = 0,
  eligible_network_gp = 0,
  updated_at = now()
from mars_e2e_state state
where bp.builder_id = state.builder_id;

do $$
declare
  v_count bigint;
  v_gp bigint;
  v_personal bigint;
begin
  select count(*), max(bp.gp), max(bp.personal_gp)
  into v_count, v_gp, v_personal
  from public.builder_profiles bp
  where bp.builder_id =
    '77777777-7777-4777-8777-777777777777';

  if v_count <> 1 then
    raise exception
      'E2E FAIL: Builder profile was not created.';
  end if;

  if v_gp <> 20000 or v_personal <> 20000 then
    raise exception
      'E2E FAIL: Builder GP bootstrap invalid. gp=%, personal_gp=%',
      v_gp,
      v_personal;
  end if;
end
$$;

-- ------------------------------------------------------------
-- Allow the authenticated test role to use shared E2E state.
--
-- The temp table is created while current_role = postgres.
-- Five production RPCs are intentionally executed as the
-- authenticated role, so explicit temp-table privileges are
-- required for the remainder of this transaction.
-- ------------------------------------------------------------

grant select, update
on mars_e2e_state
to authenticated;

-- ------------------------------------------------------------
-- 2. Authenticated JWT context
-- ------------------------------------------------------------

select set_config(
  'request.jwt.claim.sub',
  '77777777-7777-4777-8777-777777777777',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

set local role authenticated;

-- ------------------------------------------------------------
-- 3. Mars access
-- ------------------------------------------------------------

do $$
declare
  v_unlocked boolean;
begin
  select public.ensure_my_mars_access()
  into v_unlocked;

  if v_unlocked is distinct from true then
    raise exception
      'E2E FAIL: Mars access was not unlocked.';
  end if;
end
$$;

do $$
declare
  v_count bigint;
begin
  select count(*)
  into v_count
  from public.builder_mars_access
  where builder_id =
    '77777777-7777-4777-8777-777777777777'
    and unlocked = true
    and unlock_gp = 20000;

  if v_count <> 1 then
    raise exception
      'E2E FAIL: Persistent Mars access row invalid.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 4. Create Colony
-- ------------------------------------------------------------

with created as (
  select *
  from public.create_my_mars_colony(
    'Mars Core E2E Colony',
    'general'
  )
)
update mars_e2e_state state
set colony_id = created.colony_id
from created;

reset role;

do $$
declare
  v_colony uuid;
begin
  select colony_id
  into v_colony
  from mars_e2e_state;

  if v_colony is null then
    raise exception
      'E2E FAIL: Colony was not created.';
  end if;

  if not exists (
    select 1
    from public.mars_colonies c
    where c.id = v_colony
      and c.status = 'active'
      and c.leader_builder_id =
        '77777777-7777-4777-8777-777777777777'
  ) then
    raise exception
      'E2E FAIL: Colony state invalid.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 5. Assign active sector
-- ------------------------------------------------------------

update mars_e2e_state
set sector_id = (
  select sector.id
  from public.mars_sectors sector
  where sector.status = 'active'
    and sector.current_colonies < sector.max_colonies
  order by sector.sector_code
  limit 1
);

do $$
declare
  v_sector uuid;
begin
  select sector_id
  into v_sector
  from mars_e2e_state;

  if v_sector is null then
    raise exception
      'E2E FAIL: No active Mars sector available.';
  end if;
end
$$;

set local role authenticated;

select *
from public.assign_my_colony_to_mars_sector(
  (
    select sector_id
    from mars_e2e_state
  )
);

reset role;

-- ------------------------------------------------------------
-- 6. Bootstrap Colony resources
--
-- This is test setup only. It does NOT simulate production.
-- The following Construct / Upgrade / Claim operations are
-- the real production RPCs.
-- ------------------------------------------------------------

insert into public.mars_colony_resources (
  colony_id,
  materials,
  energy,
  water,
  science,
  food,
  created_at,
  updated_at
)
select
  colony_id,
  5000,
  5000,
  5000,
  5000,
  5000,
  now(),
  now()
from mars_e2e_state
on conflict (colony_id)
do update set
  materials = 5000,
  energy = 5000,
  water = 5000,
  science = 5000,
  food = 5000,
  updated_at = now();

-- ------------------------------------------------------------
-- 7. Construct Energy building
-- ------------------------------------------------------------

set local role authenticated;

select *
from public.construct_my_mars_colony_building(
  'energy'
);

reset role;

do $$
declare
  v_level integer;
begin
  select building.level
  into v_level
  from public.mars_colony_buildings building
  where building.colony_id = (
    select colony_id
    from mars_e2e_state
  )
    and building.building_key = 'energy';

  if v_level <> 1 then
    raise exception
      'E2E FAIL: Energy building construction invalid. Level=%',
      v_level;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 8. Upgrade Energy 1 -> 2
-- ------------------------------------------------------------

set local role authenticated;

select *
from public.upgrade_my_mars_colony_building(
  'energy'
);

reset role;

do $$
declare
  v_level integer;
begin
  select building.level
  into v_level
  from public.mars_colony_buildings building
  where building.colony_id = (
    select colony_id
    from mars_e2e_state
  )
    and building.building_key = 'energy';

  if v_level <> 2 then
    raise exception
      'E2E FAIL: Energy building upgrade invalid. Level=%',
      v_level;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 9. Simulate elapsed production time
--
-- We alter only the production clock, not resource results.
-- claim_my_mars_colony_resources() must calculate the actual
-- claim server-side using the real production rates.
-- ------------------------------------------------------------

insert into public.mars_colony_production_state (
  colony_id,
  last_claim_at,
  updated_at
)
select
  colony_id,
  now() - interval '2 hours',
  now()
from mars_e2e_state
on conflict (colony_id)
do update set
  last_claim_at = now() - interval '2 hours',
  updated_at = now();

set local role authenticated;

select *
from public.claim_my_mars_colony_resources();

reset role;

do $$
declare
  v_last_claim timestamptz;
begin
  select production.last_claim_at
  into v_last_claim
  from public.mars_colony_production_state production
  where production.colony_id = (
    select colony_id
    from mars_e2e_state
  );

  if v_last_claim is null
     or v_last_claim < now() - interval '5 minutes'
  then
    raise exception
      'E2E FAIL: Resource claim did not advance production clock.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 10. Verify all 5 Mars missions completed
-- ------------------------------------------------------------

do $$
declare
  v_rows bigint;
  v_completed bigint;
  v_progress bigint;
begin
  select
    count(*),
    count(*) filter (
      where progress.status = 'completed'
        and progress.completed_at is not null
    ),
    count(*) filter (
      where progress.progress >= 1
    )
  into
    v_rows,
    v_completed,
    v_progress
  from public.mission_progress progress
  where progress.builder_id =
    '77777777-7777-4777-8777-777777777777'
    and progress.mission_id in (
      'mars-create-colony',
      'mars-assign-sector',
      'mars-construct-building',
      'mars-upgrade-building',
      'mars-claim-resources'
    )
    and progress.cycle_key = 'lifetime';

  if v_rows <> 5 then
    raise exception
      'E2E FAIL: Expected 5 Mars mission rows, got %.',
      v_rows;
  end if;

  if v_completed <> 5 then
    raise exception
      'E2E FAIL: Expected 5 completed Mars missions, got %.',
      v_completed;
  end if;

  if v_progress <> 5 then
    raise exception
      'E2E FAIL: Expected all Mars mission progress >= 1.';
  end if;
end
$$;

-- Diagnostic output.

select
  mission_id,
  cycle_key,
  progress,
  status,
  completed_at
from public.mission_progress
where builder_id =
  '77777777-7777-4777-8777-777777777777'
  and mission_id like 'mars-%'
order by mission_id;

-- ------------------------------------------------------------
-- 11. Capture Civilization aggregate BEFORE mission claims
--
-- Action-level contributions may already exist. We measure
-- mission-claim contribution delta independently.
-- ------------------------------------------------------------

update mars_e2e_state
set civilization_before_claims = (
  select civilization.total_contribution
  from public.mars_civilization_state civilization
  where civilization.status = 'active'
  order by civilization.created_at
  limit 1
);

-- ------------------------------------------------------------
-- 12. Claim all five mission rewards
-- ------------------------------------------------------------

set local role authenticated;

select *
from public.claim_my_mission_reward(
  'mars-create-colony',
  'lifetime'
);

select *
from public.claim_my_mission_reward(
  'mars-assign-sector',
  'lifetime'
);

select *
from public.claim_my_mission_reward(
  'mars-construct-building',
  'lifetime'
);

select *
from public.claim_my_mission_reward(
  'mars-upgrade-building',
  'lifetime'
);

select *
from public.claim_my_mission_reward(
  'mars-claim-resources',
  'lifetime'
);

reset role;

-- ------------------------------------------------------------
-- 13. GP assertion
--
-- 20,000 starting GP + 1,600 mission GP = 21,600.
-- ------------------------------------------------------------

do $$
declare
  v_gp bigint;
  v_personal_gp bigint;
begin
  select
    profile.gp,
    profile.personal_gp
  into
    v_gp,
    v_personal_gp
  from public.builder_profiles profile
  where profile.builder_id =
    '77777777-7777-4777-8777-777777777777';

  if v_gp <> 21600 then
    raise exception
      'E2E FAIL: Expected Total GP 21600, got %.',
      v_gp;
  end if;

  if v_personal_gp <> 21600 then
    raise exception
      'E2E FAIL: Expected Personal GP 21600, got %.',
      v_personal_gp;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 14. Mission reward ledger assertion
-- ------------------------------------------------------------

do $$
declare
  v_rows bigint;
  v_amount bigint;
begin
  select
    count(*),
    coalesce(sum(ledger.amount), 0)
  into
    v_rows,
    v_amount
  from public.builder_reward_ledger ledger
  where ledger.builder_id =
    '77777777-7777-4777-8777-777777777777'
    and ledger.reward_type = 'mission'
    and ledger.idempotency_key in (
      'mission:mars-create-colony:lifetime',
      'mission:mars-assign-sector:lifetime',
      'mission:mars-construct-building:lifetime',
      'mission:mars-upgrade-building:lifetime',
      'mission:mars-claim-resources:lifetime'
    );

  if v_rows <> 5 then
    raise exception
      'E2E FAIL: Expected 5 mission ledger rows, got %.',
      v_rows;
  end if;

  if v_amount <> 1600 then
    raise exception
      'E2E FAIL: Expected 1600 GP in mission ledger, got %.',
      v_amount;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 15. Mission Mars contribution ledger assertion
-- ------------------------------------------------------------

do $$
declare
  v_rows bigint;
  v_amount bigint;
  v_exploration bigint;
  v_general bigint;
begin
  select
    count(*),
    coalesce(sum(ledger.amount), 0),
    coalesce(sum(ledger.amount) filter (
      where ledger.contribution_type = 'exploration'
    ), 0),
    coalesce(sum(ledger.amount) filter (
      where ledger.contribution_type = 'general'
    ), 0)
  into
    v_rows,
    v_amount,
    v_exploration,
    v_general
  from public.mars_contribution_ledger ledger
  where ledger.builder_id =
    '77777777-7777-4777-8777-777777777777'
    and ledger.source_type = 'mission'
    and ledger.source_reference_id in (
      'mission:mars-create-colony:lifetime',
      'mission:mars-assign-sector:lifetime',
      'mission:mars-construct-building:lifetime',
      'mission:mars-upgrade-building:lifetime',
      'mission:mars-claim-resources:lifetime'
    );

  if v_rows <> 5 then
    raise exception
      'E2E FAIL: Expected 5 mission contribution rows, got %.',
      v_rows;
  end if;

  if v_amount <> 1600 then
    raise exception
      'E2E FAIL: Expected 1600 total mission contribution, got %.',
      v_amount;
  end if;

  if v_exploration <> 250 then
    raise exception
      'E2E FAIL: Expected 250 exploration contribution, got %.',
      v_exploration;
  end if;

  if v_general <> 1350 then
    raise exception
      'E2E FAIL: Expected 1350 general contribution, got %.',
      v_general;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 16. Civilization aggregate delta
-- ------------------------------------------------------------

update mars_e2e_state
set civilization_after_claims = (
  select civilization.total_contribution
  from public.mars_civilization_state civilization
  where civilization.status = 'active'
  order by civilization.created_at
  limit 1
);

do $$
declare
  v_before bigint;
  v_after bigint;
begin
  select
    civilization_before_claims,
    civilization_after_claims
  into
    v_before,
    v_after
  from mars_e2e_state;

  if v_before is null or v_after is null then
    raise exception
      'E2E FAIL: Active Civilization aggregate not found.';
  end if;

  if (v_after - v_before) <> 1600 then
    raise exception
      'E2E FAIL: Expected Civilization mission delta 1600, got %.',
      (v_after - v_before);
  end if;
end
$$;

-- ------------------------------------------------------------
-- 17. Mission claim state
-- ------------------------------------------------------------

do $$
declare
  v_claimed bigint;
begin
  select count(*)
  into v_claimed
  from public.mission_progress progress
  where progress.builder_id =
    '77777777-7777-4777-8777-777777777777'
    and progress.mission_id in (
      'mars-create-colony',
      'mars-assign-sector',
      'mars-construct-building',
      'mars-upgrade-building',
      'mars-claim-resources'
    )
    and progress.status = 'claimed'
    and progress.claimed_at is not null;

  if v_claimed <> 5 then
    raise exception
      'E2E FAIL: Expected 5 claimed Mars missions, got %.',
      v_claimed;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 18. Idempotency
--
-- Second claim must return claimed_now=false and must not
-- create new reward/contribution ledger entries.
-- ------------------------------------------------------------

create temporary table mars_e2e_second_claims (
  mission_id text,
  claimed_now boolean
) on commit drop;

grant select, insert
on mars_e2e_second_claims
to authenticated;

set local role authenticated;

insert into mars_e2e_second_claims
select mission_id, claimed_now
from public.claim_my_mission_reward(
  'mars-create-colony',
  'lifetime'
);

insert into mars_e2e_second_claims
select mission_id, claimed_now
from public.claim_my_mission_reward(
  'mars-assign-sector',
  'lifetime'
);

insert into mars_e2e_second_claims
select mission_id, claimed_now
from public.claim_my_mission_reward(
  'mars-construct-building',
  'lifetime'
);

insert into mars_e2e_second_claims
select mission_id, claimed_now
from public.claim_my_mission_reward(
  'mars-upgrade-building',
  'lifetime'
);

insert into mars_e2e_second_claims
select mission_id, claimed_now
from public.claim_my_mission_reward(
  'mars-claim-resources',
  'lifetime'
);

reset role;

do $$
declare
  v_rows bigint;
  v_false bigint;
  v_gp bigint;
  v_reward_rows bigint;
  v_contribution_rows bigint;
begin
  select
    count(*),
    count(*) filter (
      where claimed_now = false
    )
  into
    v_rows,
    v_false
  from mars_e2e_second_claims;

  if v_rows <> 5 or v_false <> 5 then
    raise exception
      'E2E FAIL: Mission claim idempotency failed.';
  end if;

  select profile.gp
  into v_gp
  from public.builder_profiles profile
  where profile.builder_id =
    '77777777-7777-4777-8777-777777777777';

  if v_gp <> 21600 then
    raise exception
      'E2E FAIL: Duplicate claim changed GP to %.',
      v_gp;
  end if;

  select count(*)
  into v_reward_rows
  from public.builder_reward_ledger ledger
  where ledger.builder_id =
    '77777777-7777-4777-8777-777777777777'
    and ledger.reward_type = 'mission'
    and ledger.idempotency_key like 'mission:mars-%:lifetime';

  if v_reward_rows <> 5 then
    raise exception
      'E2E FAIL: Duplicate reward ledger entries detected.';
  end if;

  select count(*)
  into v_contribution_rows
  from public.mars_contribution_ledger ledger
  where ledger.builder_id =
    '77777777-7777-4777-8777-777777777777'
    and ledger.source_type = 'mission'
    and ledger.source_reference_id like
      'mission:mars-%:lifetime';

  if v_contribution_rows <> 5 then
    raise exception
      'E2E FAIL: Duplicate mission contribution entries detected.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 19. Final E2E summary
-- ------------------------------------------------------------

select
  'MARS_CORE_E2E_PASS' as result,
  profile.gp as final_gp,
  profile.personal_gp,
  (
    select count(*)
    from public.mission_progress progress
    where progress.builder_id = profile.builder_id
      and progress.mission_id like 'mars-%'
      and progress.status = 'claimed'
  ) as claimed_missions,
  (
    select count(*)
    from public.builder_reward_ledger ledger
    where ledger.builder_id = profile.builder_id
      and ledger.reward_type = 'mission'
      and ledger.idempotency_key like
        'mission:mars-%:lifetime'
  ) as mission_reward_rows,
  (
    select count(*)
    from public.mars_contribution_ledger ledger
    where ledger.builder_id = profile.builder_id
      and ledger.source_type = 'mission'
      and ledger.source_reference_id like
        'mission:mars-%:lifetime'
  ) as mission_contribution_rows,
  (
    select coalesce(sum(ledger.amount), 0)
    from public.mars_contribution_ledger ledger
    where ledger.builder_id = profile.builder_id
      and ledger.source_type = 'mission'
      and ledger.source_reference_id like
        'mission:mars-%:lifetime'
  ) as mission_contribution_total
from public.builder_profiles profile
where profile.builder_id =
  '77777777-7777-4777-8777-777777777777';

-- ------------------------------------------------------------
-- Nothing survives this test.
-- ------------------------------------------------------------

rollback;
