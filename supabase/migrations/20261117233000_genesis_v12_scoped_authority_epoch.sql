-- Follow-up to V12 candidate migration. LOCAL TEST ONLY: do not deploy
-- without real owner evidence and production rollout review.
BEGIN;
-- Conservative generation: only authority/catalog edits invalidate an owner
-- approval. Ordinary NON-COLLIDING player building changes are allowed.
CREATE TABLE genesis_v11.scope_epoch_v12 (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 epoch bigint NOT NULL DEFAULT 0 CHECK(epoch>=0),
 changed_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
INSERT INTO genesis_v11.scope_epoch_v12(singleton) VALUES(true);
ALTER TABLE genesis_v11.scope_epoch_v12 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON genesis_v11.scope_epoch_v12 FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE genesis_v11.persistent_grants_v12 ADD COLUMN scope_epoch bigint NOT NULL DEFAULT 0;

CREATE FUNCTION genesis_v11.bump_scope_epoch_v12()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 UPDATE genesis_v11.scope_epoch_v12 SET epoch=epoch+1,changed_at=statement_timestamp() WHERE singleton;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION genesis_v11.bump_scope_epoch_v12() FROM PUBLIC,anon,authenticated,service_role;
-- Authority/collateral mutations must not revive a historical grant even if
-- their previous values are later restored (ABA resistance).
DO $do$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['world','mapping','entitlement','protected_routes_v5','occupancy','site_authority'] LOOP
  EXECUTE format('CREATE TRIGGER genesis_scope_epoch_v12 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON genesis_v10.%I FOR EACH STATEMENT EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12()',tbl);
 END LOOP;
END $do$;
CREATE TRIGGER genesis_owner_scope_epoch_v12 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
 ON genesis_v11.owners FOR EACH STATEMENT EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12();
CREATE TRIGGER genesis_definitions_scope_epoch_v12 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
 ON public.mars_building_definitions FOR EACH STATEMENT EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12();
CREATE TRIGGER genesis_landmarks_scope_epoch_v12 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
 ON public.mars_landmark_catalog FOR EACH STATEMENT EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12();
CREATE TRIGGER genesis_missions_scope_epoch_v12 AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
 ON public.mars_hidden_mission_catalog FOR EACH STATEMENT EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12();
-- Evidence can be permanently rejected, never silently un-rejected/rebound.
CREATE FUNCTION genesis_v11.guard_verified_evidence_v12()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Verified evidence cannot be deleted'; END IF;
 IF (to_jsonb(NEW)-'rejected_at') <> (to_jsonb(OLD)-'rejected_at')
    OR OLD.rejected_at IS NOT NULL OR NEW.rejected_at IS NULL THEN
  RAISE EXCEPTION 'Evidence is immutable; only first rejection is allowed';
 END IF;
 NEW.rejected_at:=statement_timestamp();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION genesis_v11.guard_verified_evidence_v12() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER verified_evidence_immutable_v12 BEFORE UPDATE OR DELETE
 ON genesis_v11.verified_evidence_v12 FOR EACH ROW EXECUTE FUNCTION genesis_v11.guard_verified_evidence_v12();
CREATE TRIGGER evidence_scope_epoch_v12 AFTER UPDATE OR DELETE OR TRUNCATE
 ON genesis_v11.verified_evidence_v12 FOR EACH STATEMENT EXECUTE FUNCTION genesis_v11.bump_scope_epoch_v12();

CREATE OR REPLACE FUNCTION public.activate_ares_genesis_persistent_v12(proposal uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE p genesis_v11.proposals%ROWTYPE; owner_uuid uuid; new_grant uuid; e bigint;
BEGIN
  owner_uuid := auth.uid();
  IF owner_uuid IS NULL THEN RAISE EXCEPTION 'OWNER_LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM genesis_v11.owners o WHERE o.user_id=owner_uuid AND o.enabled FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOBU_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO STRICT p FROM genesis_v11.proposals WHERE id=proposal FOR SHARE;
  PERFORM 1 FROM genesis_v11.decisions d WHERE d.proposal_id=p.id AND d.owner_id=owner_uuid AND d.approved;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXPLICIT_MATCHING_OWNER_APPROVAL_REQUIRED'; END IF;
  IF p.valid_until <= statement_timestamp()+interval '60 seconds' THEN
    RAISE EXCEPTION 'PROPOSAL_EXPIRED'; END IF;
  IF p.world_snapshot <> public.ares_genesis_world_snapshot_v11() THEN
    RAISE EXCEPTION 'WORLD_SNAPSHOT_CHANGED'; END IF;
  IF p.release_digest <> '5e89de66450d5c83f71a2eb6d2f426252337dafc743e7c51961367718b298611' THEN
    RAISE EXCEPTION 'V12_RELEASE_DIGEST_REQUIRED'; END IF;
  PERFORM 1 FROM genesis_v11.verified_evidence_v12 e
    WHERE e.evidence_digest=p.evidence_digest AND e.evidence_uri=p.evidence_uri
      AND e.release_digest=p.release_digest AND e.rejected_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'IMMUTABLE_EVIDENCE_NOT_VERIFIED'; END IF;
  IF NOT (p.inventory @> '{"completeWorldCoverage":true,"externalRoutesComplete":true,"geometryValidated":true,"landmarkExtentsVerified":true}'::jsonb)
     OR jsonb_typeof(p.inventory->'routes') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p.inventory->'routes')=0
     OR jsonb_typeof(p.inventory->'landmarkExtents') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p.inventory->'landmarkExtents')<>3 THEN
    RAISE EXCEPTION 'COMPLETE_ROUTE_AND_LANDMARK_EVIDENCE_REQUIRED'; END IF;
  PERFORM genesis_v11.validate_integrated_site(p.site);
  -- Serialize with building mutations and concurrent grant activations.
  LOCK TABLE public.mars_colony_buildings,public.mars_building_definitions,
    public.mars_colonies,public.mars_landmark_catalog,public.mars_hidden_mission_catalog IN SHARE MODE;
  IF p.world_snapshot<>public.ares_genesis_world_snapshot_v11() THEN RAISE EXCEPTION 'WORLD_CHANGED_DURING_ACTIVATION'; END IF;
  IF EXISTS (SELECT 1 FROM public.mars_colony_buildings b
     LEFT JOIN public.mars_building_definitions def ON def.building_key=b.building_key
     WHERE b.status<>'archived' AND public.ares_genesis_building_conflicts_v11(
        b.grid_x,b.grid_z,b.rotation_y,def.footprint_width,def.footprint_depth)) THEN
    RAISE EXCEPTION 'ACTIVE_BUILDING_COLLISION'; END IF;
  SELECT epoch INTO STRICT e FROM genesis_v11.scope_epoch_v12 WHERE singleton FOR SHARE;
  INSERT INTO genesis_v11.persistent_grants_v12
    (proposal_id,colony_id,owner_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,scope_epoch)
    VALUES (p.id,p.colony_id,owner_uuid,p.release_digest,p.evidence_digest,p.evidence_uri,p.world_snapshot,p.site,p.inventory,e)
    RETURNING grant_id INTO new_grant;
  RETURN new_grant;
END; $$;

CREATE OR REPLACE FUNCTION genesis_v11.valid_persistent_grant_v12(colony uuid)
RETURNS genesis_v11.persistent_grants_v12
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE g genesis_v11.persistent_grants_v12%ROWTYPE;
BEGIN
  SELECT gg.* INTO g FROM genesis_v11.persistent_grants_v12 gg
  JOIN genesis_v11.owners o ON o.user_id=gg.owner_id AND o.enabled
  JOIN genesis_v11.proposals p ON p.id=gg.proposal_id
  JOIN genesis_v11.decisions d ON d.proposal_id=p.id AND d.approved AND d.owner_id=gg.owner_id
  JOIN genesis_v11.verified_evidence_v12 e ON e.evidence_digest=gg.evidence_digest
      AND e.evidence_uri=gg.evidence_uri AND e.release_digest=gg.release_digest AND e.rejected_at IS NULL
  WHERE gg.revoked_at IS NULL AND gg.colony_id=colony
    AND p.colony_id=gg.colony_id AND p.release_digest=gg.release_digest
    AND p.evidence_digest=gg.evidence_digest AND p.evidence_uri=gg.evidence_uri
    AND p.site=gg.site AND p.inventory=gg.inventory AND p.world_snapshot=gg.world_snapshot
    AND gg.release_digest='5e89de66450d5c83f71a2eb6d2f426252337dafc743e7c51961367718b298611'
    AND gg.site->>'layout'='integrated-command-hub-v11'
    AND gg.scope_epoch=(SELECT epoch FROM genesis_v11.scope_epoch_v12 WHERE singleton)
  LIMIT 1;
  RETURN g;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_ares_genesis_reservation_v11()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE w integer; d integer; grant_active boolean; cert_active boolean;
BEGIN
  IF NEW.status='archived' THEN RETURN NEW; END IF;
  -- Preserve browser leases for 60 seconds after owner withdrawal or
  -- a protected authority/catalog invalidation. Safe external building moves
  -- do not advance the authorization epoch.
  SELECT EXISTS (
    SELECT 1 FROM genesis_v11.persistent_grants_v12 g
    CROSS JOIN genesis_v11.scope_epoch_v12 e
    WHERE e.singleton AND (
      (g.revoked_at IS NULL AND g.scope_epoch=e.epoch AND
       g.grant_id=(genesis_v11.valid_persistent_grant_v12(g.colony_id)).grant_id)
      OR (g.revoked_at IS NOT NULL AND g.revoked_at>statement_timestamp()-interval '60 seconds')
      OR (g.scope_epoch<>e.epoch AND e.changed_at>statement_timestamp()-interval '60 seconds')
    )
  ) INTO grant_active;
  SELECT EXISTS (SELECT 1 FROM public.ares_genesis_certificates_v11 c
    WHERE c.expires_at>statement_timestamp()
      AND (c.revoked_at IS NULL OR c.revoked_at>statement_timestamp()-interval '60 seconds'))
    INTO cert_active;
  IF NOT grant_active AND NOT cert_active THEN RETURN NEW; END IF;
  SELECT footprint_width,footprint_depth INTO w,d FROM public.mars_building_definitions
    WHERE building_key=NEW.building_key;
  IF public.ares_genesis_building_conflicts_v11(NEW.grid_x,NEW.grid_z,NEW.rotation_y,w,d) THEN
    RAISE EXCEPTION 'ARES_GENESIS_RESERVED: placement conflicts with a live campus reservation'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;

COMMIT;
