-- V13: Do not invalidate campus authority on zero-row DML.
-- Local candidate; production deployment is NOT authorized.
-- Real row mutations still bump the authority epoch.
-- TRUNCATE remains conservatively invalidating.
BEGIN;

DO $fix$
DECLARE
    item text;
    schema_name text;
    table_name text;
    trigger_name text;
BEGIN
    FOR item IN
        SELECT unnest(ARRAY[
            'genesis_v10.world',
            'genesis_v10.mapping',
            'genesis_v10.entitlement',
            'genesis_v10.protected_routes_v5',
            'genesis_v10.occupancy',
            'genesis_v10.site_authority',
            'genesis_v11.owners',
            'public.mars_building_definitions',
            'public.mars_landmark_catalog',
            'public.mars_hidden_mission_catalog'
        ])
    LOOP
        schema_name := split_part(item, '.', 1);
        table_name := split_part(item, '.', 2);

        trigger_name := CASE item
            WHEN 'genesis_v11.owners'
                THEN 'genesis_owner_scope_epoch_v12'
            WHEN 'public.mars_building_definitions'
                THEN 'genesis_definitions_scope_epoch_v12'
            WHEN 'public.mars_landmark_catalog'
                THEN 'genesis_landmarks_scope_epoch_v12'
            WHEN 'public.mars_hidden_mission_catalog'
                THEN 'genesis_missions_scope_epoch_v12'
            ELSE 'genesis_scope_epoch_v12'
        END;

        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I ON %I.%I',
            trigger_name, schema_name, table_name
        );

        EXECUTE format(
            'CREATE TRIGGER %I
             AFTER INSERT OR UPDATE OR DELETE
             ON %I.%I
             FOR EACH ROW
             EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12()',
            trigger_name, schema_name, table_name
        );

        EXECUTE format(
            'CREATE TRIGGER %I
             AFTER TRUNCATE
             ON %I.%I
             FOR EACH STATEMENT
             EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12()',
            trigger_name || '_truncate',
            schema_name,
            table_name
        );
    END LOOP;
END
$fix$;

COMMIT;
