-- BOBU Genesis V13: durable world-site registration, separate from browser leases.
-- ADDITIVE CANDIDATE. Local tests required; NOT production-authorized.
-- Depends on both V12 migrations; intentionally does NOT change the existing
-- V10 placement RPC, ARES flight, landing rewards, or legacy certificates.
BEGIN;
CREATE TABLE genesis_v11.world_sites_v13 (
  site_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES genesis_v11.proposals(id),
  grant_id uuid NOT NULL UNIQUE REFERENCES genesis_v11.persistent_grants_v12(grant_id),
  colony_id uuid NOT NULL REFERENCES public.mars_colonies(id),
  owner_id uuid NOT NULL REFERENCES genesis_v11.owners(user_id),
  release_digest text NOT NULL CHECK (release_digest ~ '^[a-f0-9]{64}$'),
  site jsonb NOT NULL,
  authority_epoch bigint NOT NULL CHECK (authority_epoch >= 0),
  registered_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  disabled_at timestamptz
);
CREATE UNIQUE INDEX world_sites_v13_one_enabled
  ON genesis_v11.world_sites_v13 ((true)) WHERE disabled_at IS NULL;
ALTER TABLE genesis_v11.world_sites_v13 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON genesis_v11.world_sites_v13 FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION genesis_v11.guard_world_site_v13()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'WORLD_SITE_AUDIT_IMMUTABLE'; END IF;
  IF TG_OP='UPDATE' THEN
    IF (to_jsonb(NEW)-'disabled_at')<>(to_jsonb(OLD)-'disabled_at')
       OR OLD.disabled_at IS NOT NULL OR NEW.disabled_at IS NULL THEN
      RAISE EXCEPTION 'WORLD_SITE_AUDIT_IMMUTABLE';
    END IF;
    NEW.disabled_at:=statement_timestamp();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION genesis_v11.guard_world_site_v13() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER world_site_v13_immutable BEFORE UPDATE OR DELETE
  ON genesis_v11.world_sites_v13 FOR EACH ROW
  EXECUTE FUNCTION genesis_v11.guard_world_site_v13();

-- The real authenticated owner registers ONLY an existing currently valid V12
-- persistent grant. V11 expired certificates cannot create a world site.
CREATE FUNCTION public.register_ares_genesis_world_site_v13(proposal uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE g genesis_v11.persistent_grants_v12%ROWTYPE;
        owner_uuid uuid; e bigint; result uuid;
BEGIN
  owner_uuid:=auth.uid();
  IF owner_uuid IS NULL THEN RAISE EXCEPTION 'OWNER_LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
  -- Serialize registration with authority-epoch changes and other registrations.
  SELECT epoch INTO STRICT e FROM genesis_v11.scope_epoch_v12 WHERE singleton FOR SHARE;
  SELECT * INTO g FROM genesis_v11.persistent_grants_v12
    WHERE proposal_id=proposal AND owner_id=owner_uuid AND revoked_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MATCHING_OWNER_GRANT_REQUIRED' USING ERRCODE='42501'; END IF;
  IF g.scope_epoch<>e OR
     (genesis_v11.valid_persistent_grant_v12(g.colony_id)).grant_id IS DISTINCT FROM g.grant_id THEN
    RAISE EXCEPTION 'VALID_PERSISTENT_GRANT_REQUIRED' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM genesis_v11.owners WHERE user_id=owner_uuid AND enabled FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOBU_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
  PERFORM genesis_v11.validate_integrated_site(g.site);
  INSERT INTO genesis_v11.world_sites_v13
    (proposal_id,grant_id,colony_id,owner_id,release_digest,site,authority_epoch)
    VALUES(g.proposal_id,g.grant_id,g.colony_id,g.owner_id,g.release_digest,g.site,e)
    RETURNING site_id INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.register_ares_genesis_world_site_v13(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_ares_genesis_world_site_v13(uuid) TO authenticated;

-- World registration is durable. This read never checks a 24-hour certificate,
-- 60-second browser lease or the global building-row snapshot. It DOES check
-- revocation, owner and authority epoch. A temporary browser/network failure
-- cannot delete a registered row; it also cannot manufacture authorization.
CREATE FUNCTION public.get_ares_genesis_world_site_v13()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE colony uuid; n integer; w genesis_v11.world_sites_v13%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT count(*),(array_agg(colony_id))[1] INTO n,colony
    FROM public.mars_colony_memberships
    WHERE builder_id=auth.uid() AND status='active';
  IF n<>1 THEN RETURN jsonb_build_object('status','blocked','reason','Unambiguous colony required'); END IF;
  SELECT ws.* INTO w FROM genesis_v11.world_sites_v13 ws
  JOIN genesis_v11.owners o ON o.user_id=ws.owner_id AND o.enabled
  JOIN genesis_v11.persistent_grants_v12 g ON g.grant_id=ws.grant_id AND g.revoked_at IS NULL
  JOIN genesis_v11.scope_epoch_v12 e ON e.singleton AND e.epoch=ws.authority_epoch
  WHERE ws.colony_id=colony AND ws.disabled_at IS NULL
    AND g.owner_id=ws.owner_id AND g.colony_id=ws.colony_id
    AND g.proposal_id=ws.proposal_id AND g.release_digest=ws.release_digest
    AND g.scope_epoch=ws.authority_epoch AND g.site=ws.site;
  IF NOT FOUND THEN
    -- Legacy V6 is available only if this colony has NEVER received
    -- a persistent grant or a V13 registration.
    IF NOT EXISTS (
      SELECT 1 FROM genesis_v11.world_sites_v13
      WHERE colony_id=colony
    ) AND NOT EXISTS (
      SELECT 1 FROM genesis_v11.persistent_grants_v12
      WHERE colony_id=colony
    ) THEN
      RETURN jsonb_build_object(
        'status','unregistered',
        'reason','No V13 authority has ever been registered'
      );
    END IF;
    RETURN jsonb_build_object(
      'status','blocked',
      'reason','No current durable world-site authority'
    );
  END IF;
  RETURN jsonb_build_object('status','registered','site_id',w.site_id,
    'colony_id',w.colony_id,'release_digest',w.release_digest,
    'registered_at',w.registered_at,'authority_epoch',w.authority_epoch,'site',w.site);
END $$;
REVOKE ALL ON FUNCTION public.get_ares_genesis_world_site_v13()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ares_genesis_world_site_v13() TO authenticated;

CREATE FUNCTION public.disable_ares_genesis_world_site_v13(proposal uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM genesis_v11.owners WHERE user_id=auth.uid() AND enabled
  ) THEN RAISE EXCEPTION 'BOBU_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
  UPDATE genesis_v11.world_sites_v13
     SET disabled_at=statement_timestamp()
   WHERE proposal_id=proposal AND owner_id=auth.uid() AND disabled_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.disable_ares_genesis_world_site_v13(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.disable_ares_genesis_world_site_v13(uuid) TO authenticated;
COMMIT;
