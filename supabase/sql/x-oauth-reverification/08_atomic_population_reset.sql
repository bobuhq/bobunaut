-- Installs an administrator-only operation. DOES NOT execute it.
BEGIN;
CREATE OR REPLACE FUNCTION public.reset_x_oauth_population(p_project_ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_reset_at timestamptz;
BEGIN
  IF p_project_ref IS DISTINCT FROM 'pvemtnmeewyaqgindocs' THEN
    RAISE EXCEPTION 'Production project acknowledgement required';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(81420261103);
  -- Freeze the population, balances and ledger through validation and mutation.
  LOCK TABLE auth.identities IN SHARE MODE;
  LOCK TABLE public.builder_profiles, public.builder_social_identities,
    public.builder_reward_ledger, public.builder_x_oauth_resets IN EXCLUSIVE MODE;
  v_reset_at := clock_timestamp();
  IF EXISTS (SELECT 1 FROM public.builder_x_oauth_resets) THEN
    RAISE EXCEPTION 'Reset registry must be empty; repeated execution refused';
  END IF;
  CREATE TEMP TABLE x_reset_population ON COMMIT DROP AS
  SELECT ai.user_id AS builder_id, ai.id AS identity_id, ai.provider_id,
    s.provider_user_id AS social_provider_id, s.reward_claimed,
    p.personal_gp, p.gp, p.eligible_network_gp,
    p.pending_network_gp,
    (SELECT count(*) FROM public.builder_reward_ledger l
      WHERE l.builder_id = ai.user_id AND ((lower(l.provider) = 'x' AND l.reward_type IN ('social_verification', 'reward_reversal'))
          OR lower(l.idempotency_key) LIKE 'social-verification:x:%')) AS oauth_record_count,
    (SELECT count(*) FROM public.builder_reward_ledger l
      WHERE l.builder_id = ai.user_id AND l.provider = 'x'
      AND l.entry_type = 'credit' AND l.reward_type = 'social_verification'
      AND l.amount = 5000
      AND l.idempotency_key = 'social-verification:x:' || ai.user_id::text) AS credit_count
  FROM auth.identities ai
  LEFT JOIN public.builder_profiles p ON p.builder_id = ai.user_id
  LEFT JOIN public.builder_social_identities s ON s.builder_id = ai.user_id AND lower(s.provider) = 'x'
  WHERE ai.provider = 'x';

  IF (SELECT count(*) FROM x_reset_population) <> 60
     OR (SELECT count(DISTINCT builder_id) FROM x_reset_population) <> 60
     OR (SELECT count(DISTINCT provider_id) FROM x_reset_population) <> 60
     OR (SELECT count(*) FROM x_reset_population WHERE credit_count = 1) <> 55
     OR (SELECT count(*) FROM x_reset_population WHERE credit_count = 0) <> 5
     OR (SELECT sum(credit_count * 5000) FROM x_reset_population) <> 275000 THEN
    RAISE EXCEPTION 'STOP: expected 60 connected / 55 rewarded / 5 unrewarded / 275000 GP';
  END IF;
  IF EXISTS (SELECT 1 FROM x_reset_population WHERE
       personal_gp IS NULL OR gp IS NULL OR eligible_network_gp IS NULL
       OR personal_gp < 0 OR gp <> personal_gp + eligible_network_gp
       OR provider_id IS NULL OR btrim(provider_id) = ''
       OR (social_provider_id IS NOT NULL AND social_provider_id <> provider_id)
       OR oauth_record_count <> credit_count OR credit_count NOT IN (0,1)
       OR (credit_count = 1 AND (personal_gp < 5000 OR reward_claimed IS DISTINCT FROM true))
       OR (credit_count = 0 AND reward_claimed IS TRUE)) THEN
    RAISE EXCEPTION 'STOP: identity, historical reward or balance validation failed';
  END IF;
  -- Validate the OAuth namespace globally, including users outside the population.
  -- Unrelated X campaign credits are neither OAuth evidence nor reversal targets.
  -- Ambiguous generic X reward_reversal rows still require manual review.
  IF (SELECT count(*) FROM public.builder_reward_ledger l WHERE ((lower(l.provider) = 'x' AND l.reward_type IN ('social_verification', 'reward_reversal'))
          OR lower(l.idempotency_key) LIKE 'social-verification:x:%')) <> 55
     OR EXISTS (SELECT 1 FROM public.builder_reward_ledger l
       WHERE ((lower(l.provider) = 'x' AND l.reward_type IN ('social_verification', 'reward_reversal'))
          OR lower(l.idempotency_key) LIKE 'social-verification:x:%')
         AND (l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text) IS NOT TRUE) THEN
    RAISE EXCEPTION 'STOP: duplicate, malformed, reversed or inconsistent X OAuth ledger history';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.identities ai JOIN x_reset_population p ON ai.id = p.identity_id
    WHERE ai.identity_data ->> 'sub' IS NOT NULL AND ai.identity_data ->> 'sub' <> p.provider_id) THEN
    RAISE EXCEPTION 'STOP: Auth provider binding mismatch';
  END IF;

  INSERT INTO public.builder_x_oauth_resets
    (builder_id, reset_at, old_auth_identity_id, old_provider_user_id,
     previously_rewarded, reward_idempotency_key, reversed_at)
  SELECT builder_id, v_reset_at, identity_id, provider_id, credit_count = 1,
    'social-verification:x:reset-v2:' || builder_id::text,
    CASE WHEN credit_count = 1 THEN v_reset_at END
  FROM x_reset_population;

  INSERT INTO public.builder_reward_ledger
    (builder_id, reward_type, provider, amount, entry_type, idempotency_key, metadata)
  SELECT builder_id, 'reward_reversal', 'x', 5000, 'debit',
    'social-verification:x:reversal:' || builder_id::text,
    jsonb_build_object('reason', 'x_oauth_reverification', 'reset_at', v_reset_at)
  FROM x_reset_population WHERE credit_count = 1;

  UPDATE public.builder_profiles p SET personal_gp = p.personal_gp - 5000,
    gp = p.gp - 5000
  FROM x_reset_population b WHERE p.builder_id = b.builder_id AND b.credit_count = 1;

  UPDATE public.builder_social_identities s SET verified = false, verified_at = NULL,
    reward_claimed = false, reward_claimed_at = NULL, updated_at = v_reset_at
  FROM x_reset_population b WHERE s.builder_id = b.builder_id AND lower(s.provider) = 'x';

  IF EXISTS (SELECT 1 FROM x_reset_population b JOIN public.builder_profiles p USING (builder_id)
    WHERE p.personal_gp IS DISTINCT FROM b.personal_gp - b.credit_count * 5000
       OR p.gp IS DISTINCT FROM b.gp - b.credit_count * 5000
       OR p.eligible_network_gp IS DISTINCT FROM b.eligible_network_gp
       OR p.pending_network_gp IS DISTINCT FROM b.pending_network_gp)
    OR (SELECT count(*) FROM public.builder_x_oauth_resets) <> 60
    OR (SELECT count(*) FROM public.builder_reward_ledger l
      JOIN public.builder_x_oauth_resets r ON r.builder_id = l.builder_id
      WHERE l.provider = 'x' AND l.entry_type = 'debit' AND l.reward_type = 'reward_reversal'
        AND l.idempotency_key = 'social-verification:x:reversal:' || r.builder_id::text) <> 55
    OR (SELECT sum(amount) FROM public.builder_reward_ledger l
      JOIN public.builder_x_oauth_resets r ON r.builder_id = l.builder_id
      WHERE l.provider = 'x' AND l.entry_type = 'debit' AND l.reward_type = 'reward_reversal'
        AND l.idempotency_key = 'social-verification:x:reversal:' || r.builder_id::text) <> 275000 THEN
    RAISE EXCEPTION 'STOP: reset postconditions failed';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_x_oauth_population(text) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
