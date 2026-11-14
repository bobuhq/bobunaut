-- Isolated synthetic test data only; never apply to production.
create role anon; create role authenticated; create role service_role bypassrls;
 alter default privileges in schema public grant all on tables to service_role;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 grant execute on function auth.uid() to authenticated;
 create table public.mars_landmark_catalog(landmark_key text primary key, world_x double precision, world_z double precision);
create table public.mars_hidden_mission_catalog(mission_key text primary key, target_x double precision, target_z double precision);
create table public.mars_colonies(id uuid primary key, name text);
 create table public.mars_building_definitions(building_key text primary key, footprint_width int, footprint_depth int);
 create table public.mars_colony_buildings(id uuid primary key, colony_id uuid, building_key text, grid_x int, grid_z int default 0, rotation_y int default 0, status text default 'active');
 create table public.mars_colony_memberships(builder_id uuid, colony_id uuid, status text);
 insert into public.mars_colonies values ('00000000-0000-0000-0000-000000000001','Preserved colony');
 insert into public.mars_building_definitions values ('command_hub',4,4);
 insert into public.mars_colony_buildings(id,colony_id,building_key,grid_x) values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','command_hub',0);
 insert into public.mars_colony_memberships values ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','active');
