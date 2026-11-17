-- ARES shared flight collision snapshot; READ ONLY, no colony membership needed.
-- Does NOT grant colony ownership, placement, balances, inventory or write rights.
-- Deploy independently: pending V12/V13 migrations are not authorized by this file.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_ares_shared_flight_collision_v1()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  active_colonies integer;
  valid_colonies integer;
  building_records jsonb;
  legal_regions jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501';
  END IF;

  SELECT count(*) INTO active_colonies
    FROM public.mars_colonies c WHERE c.status='active';
  SELECT count(*) INTO valid_colonies FROM (
    SELECT c.id
      FROM public.mars_colonies c
      JOIN public.mars_colony_buildings b
        ON b.colony_id=c.id AND b.building_key='command_hub' AND b.status='active'
     WHERE c.status='active'
     GROUP BY c.id HAVING count(*)=1
  ) valid;
  IF active_colonies<>valid_colonies THEN
    RAISE EXCEPTION 'SHARED_ARES_OCCUPANCY_INCOMPLETE' USING ERRCODE='P0002';
  END IF;

  -- Fail closed on physical records whose dimensions cannot be resolved.
  IF EXISTS (
    SELECT 1 FROM public.mars_colony_buildings b
    JOIN public.mars_colonies c ON c.id=b.colony_id AND c.status='active'
    LEFT JOIN public.mars_building_definitions d ON d.building_key=b.building_key
    WHERE b.status<>'archived' AND (
      d.building_key IS NULL OR d.footprint_width IS NULL OR d.footprint_depth IS NULL
      OR b.grid_x IS NULL OR b.grid_z IS NULL
      OR coalesce(b.rotation_y,0) NOT IN (0,90,180,270)
      OR d.footprint_width NOT BETWEEN 1 AND 8 OR d.footprint_depth NOT BETWEEN 1 AND 8
    )
  ) THEN RAISE EXCEPTION 'INVALID_SHARED_ARES_BUILDING_GEOMETRY' USING ERRCODE='P0002'; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,'buildingKey',b.building_key,
    'gridX',b.grid_x,'gridZ',b.grid_z,
    'width',CASE WHEN coalesce(b.rotation_y,0) IN (90,270)
                THEN d.footprint_depth ELSE d.footprint_width END,
    'depth',CASE WHEN coalesce(b.rotation_y,0) IN (90,270)
                THEN d.footprint_width ELSE d.footprint_depth END,
    'rotationY',coalesce(b.rotation_y,0)
  ) ORDER BY b.id),'[]'::jsonb) INTO building_records
  FROM public.mars_colony_buildings b
  JOIN public.mars_colonies c ON c.id=b.colony_id AND c.status='active'
  JOIN public.mars_building_definitions d ON d.building_key=b.building_key
  WHERE b.status<>'archived';

  IF EXISTS (
    SELECT 1 FROM public.mars_colonies c
      JOIN public.mars_colony_buildings b ON b.colony_id=c.id
        AND b.building_key='command_hub' AND b.status='active'
      LEFT JOIN public.mars_command_hub_progression p ON p.command_hub_level=b.level
     WHERE c.status='active' AND (p.command_hub_level IS NULL OR p.map_min IS NULL
                                OR p.map_max IS NULL OR p.map_min>p.map_max)
  ) THEN RAISE EXCEPTION 'INVALID_SHARED_ARES_BUILDING_REGION' USING ERRCODE='P0002'; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'mapMin',p.map_min,'mapMax',p.map_max
  ) ORDER BY c.id),'[]'::jsonb) INTO legal_regions
  FROM public.mars_colonies c
  JOIN public.mars_colony_buildings b ON b.colony_id=c.id
    AND b.building_key='command_hub' AND b.status='active'
  JOIN public.mars_command_hub_progression p ON p.command_hub_level=b.level
  WHERE c.status='active';

  RETURN jsonb_build_object('status','ready','buildings',building_records,
                            'legalRegions',legal_regions);
END;
$function$;
REVOKE ALL ON FUNCTION public.get_ares_shared_flight_collision_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_ares_shared_flight_collision_v1() TO authenticated;
COMMIT;
