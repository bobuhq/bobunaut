-- BOBU Genesis V12: Owner-approved persistent grant and on-demand 60s browser leases
-- IMPLEMENTATION CANDIDATE — DO NOT APPLY WITHOUT INTEGRATION TESTS + OWNER REVIEW
-- No backfill and no automatic migration of old approvals.
-- Historical certificates and their audit history remain unchanged.
BEGIN;

-- Only an operator who verified immutable HTTPS archive bytes may register evidence.
CREATE TABLE IF NOT EXISTS genesis_v11.verified_evidence_v12 (
  evidence_digest text PRIMARY KEY CHECK (evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_uri text NOT NULL CHECK (evidence_uri ~ '^https://[^[:space:]]+$'),
  release_digest text NOT NULL CHECK (release_digest ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  rejected_at timestamptz,
  CHECK (evidence_uri !~ '/rest/v1/rpc/')
);
ALTER TABLE genesis_v11.verified_evidence_v12 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON genesis_v11.verified_evidence_v12 FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS genesis_v11.persistent_grants_v12 (
  grant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES genesis_v11.proposals(id),
  colony_id uuid NOT NULL REFERENCES public.mars_colonies(id),
  owner_id uuid NOT NULL REFERENCES genesis_v11.owners(user_id),
  release_digest text NOT NULL CHECK (release_digest ~ '^[a-f0-9]{64}$'),
  evidence_digest text NOT NULL REFERENCES genesis_v11.verified_evidence_v12(evidence_digest),
  evidence_uri text NOT NULL CHECK (evidence_uri ~ '^https://[^[:space:]]+$'),
  world_snapshot jsonb NOT NULL,
  site jsonb NOT NULL,
  inventory jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS genesis_v12_one_live_grant ON genesis_v11.persistent_grants_v12 ((true)) WHERE revoked_at IS NULL;
ALTER TABLE genesis_v11.persistent_grants_v12 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON genesis_v11.persistent_grants_v12 FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION genesis_v11.guard_persistent_grant_v12()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW)-'revoked_at') <> (to_jsonb(OLD)-'revoked_at')
       OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL THEN
      RAISE EXCEPTION 'Persistent grants immutable; owner may only revoke';
    END IF;
    NEW.revoked_at := statement_timestamp();
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Persistent grant audit rows cannot be deleted';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION genesis_v11.guard_persistent_grant_v12() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS genesis_v12_grant_immutable ON genesis_v11.persistent_grants_v12;
CREATE TRIGGER genesis_v12_grant_immutable BEFORE UPDATE OR DELETE ON genesis_v11.persistent_grants_v12
FOR EACH ROW EXECUTE FUNCTION genesis_v11.guard_persistent_grant_v12();

-- Only a genuine enrolled owner with an approved NEW matching proposal may activate.
-- Operator-verified immutable evidence is an independent mandatory gate.
CREATE OR REPLACE FUNCTION public.activate_ares_genesis_persistent_v12(proposal uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE p genesis_v11.proposals%ROWTYPE; owner_uuid uuid; new_grant uuid;
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
  INSERT INTO genesis_v11.persistent_grants_v12
    (proposal_id,colony_id,owner_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory)
    VALUES (p.id,p.colony_id,owner_uuid,p.release_digest,p.evidence_digest,p.evidence_uri,p.world_snapshot,p.site,p.inventory)
    RETURNING grant_id INTO new_grant;
  RETURN new_grant;
END; $$;
REVOKE ALL ON FUNCTION public.activate_ares_genesis_persistent_v12(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_ares_genesis_persistent_v12(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.withdraw_ares_genesis_persistent_v12(proposal uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM genesis_v11.owners o WHERE o.user_id=auth.uid() AND o.enabled
  ) THEN RAISE EXCEPTION 'BOBU_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
  UPDATE genesis_v11.persistent_grants_v12 g
    SET revoked_at=statement_timestamp()
    WHERE g.proposal_id=proposal AND g.owner_id=auth.uid() AND g.revoked_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.withdraw_ares_genesis_persistent_v12(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_ares_genesis_persistent_v12(uuid) TO authenticated;

-- Runtime validity is recomputed against live backend state on EVERY access.
-- A durable grant does not freeze a historical snapshot or grant a permanent client token.
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
    AND gg.world_snapshot=public.ares_genesis_world_snapshot_v11()
  LIMIT 1;
  RETURN g;
END; $$;
REVOKE ALL ON FUNCTION genesis_v11.valid_persistent_grant_v12(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- Client keeps the existing 60-second lease validator; no cron or recurring owner approval.
-- When a grant exists but is invalid, FAIL CLOSED rather than falling back to certificates.
CREATE OR REPLACE FUNCTION public.get_ares_genesis_placement_v10()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE g genesis_v11.persistent_grants_v12%ROWTYPE;
        c public.ares_genesis_certificates_v11%ROWTYPE;
        colony uuid; n integer; ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT count(*),(array_agg(colony_id))[1] INTO n,colony FROM public.mars_colony_memberships
    WHERE builder_id=auth.uid() AND status='active';
  IF n<>1 THEN RETURN jsonb_build_object('status','blocked','reason','Unambiguous active colony required'); END IF;
  IF EXISTS(SELECT 1 FROM genesis_v11.persistent_grants_v12 WHERE colony_id=colony) THEN
    g:=genesis_v11.valid_persistent_grant_v12(colony);
    IF g.grant_id IS NULL THEN RETURN jsonb_build_object('status','blocked','reason','Genesis persistent grant invalid or revoked'); END IF;
    ts:=statement_timestamp();
    RETURN jsonb_build_object('status','approved','revision',g.grant_id,
      'colony_id',g.colony_id,'release_digest',g.release_digest,
      'evidence_digest',g.evidence_digest,'issued_at',ts,
      'expires_at',ts+interval '60 seconds','server_time',ts,'site',g.site);
  END IF;
  -- Legacy fallback is preserved until a valid new V12 grant is created.
  SELECT * INTO c FROM public.ares_genesis_certificates_v11
    WHERE colony_id=colony AND revoked_at IS NULL AND issued_at<=statement_timestamp()
    AND expires_at>statement_timestamp()+interval '30 seconds'
    AND site->>'layout'='integrated-command-hub-v11';
  IF NOT FOUND THEN RETURN jsonb_build_object('status','blocked','reason','No integrated Hub certificate'); END IF;
  IF c.world_snapshot<>public.ares_genesis_world_snapshot_v11() THEN
    RETURN jsonb_build_object('status','blocked','reason','World changed'); END IF;
  RETURN jsonb_build_object('status','approved','revision',c.revision,'colony_id',c.colony_id,
    'release_digest',c.release_digest,'evidence_digest',c.evidence_digest,
    'issued_at',c.issued_at,'expires_at',least(c.expires_at,statement_timestamp()+interval '60 seconds'),
    'server_time',statement_timestamp(),'site',c.site);
END; $$;
REVOKE ALL ON FUNCTION public.get_ares_genesis_placement_v10() FROM PUBLIC, anon;
-- Preserve original authenticated execute permissions; no new anonymous access.

-- Protect coordinates while a grant is valid, including when no timed certificate exists.
CREATE OR REPLACE FUNCTION public.guard_ares_genesis_reservation_v11()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE w integer; d integer; grant_active boolean; cert_active boolean;
BEGIN
  IF NEW.status='archived' THEN RETURN NEW; END IF;
  SELECT EXISTS (SELECT 1 FROM genesis_v11.persistent_grants_v12 g
    WHERE g.grant_id=(genesis_v11.valid_persistent_grant_v12(g.colony_id)).grant_id)
    INTO grant_active;
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
REVOKE ALL ON FUNCTION public.guard_ares_genesis_reservation_v11() FROM PUBLIC, anon, authenticated;

COMMIT;
