-- Read-only. Run against the independently verified PRODUCTION endpoint only.
-- Never substitute staging. Run immediately before the approval/execution window.
BEGIN READ ONLY;
SELECT current_database(), current_user, version();
SELECT count(*) AS x_auth_identities, count(DISTINCT user_id) AS connected_users,
       count(DISTINCT provider_id) AS distinct_x_accounts
FROM auth.identities WHERE provider = 'x';
-- All-X totals are informational: campaign rewards are outside this reset.
SELECT count(*) AS x_ledger_entries, sum(amount) AS x_ledger_amount
FROM public.builder_reward_ledger WHERE lower(provider) = 'x';
SELECT count(*) AS oauth_verification_credits, coalesce(sum(l.amount), 0) AS oauth_verification_gp
FROM public.builder_reward_ledger l WHERE l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text;
SELECT l.reward_type, l.entry_type, count(*) AS unrelated_x_records, sum(l.amount) AS unrelated_x_amount
FROM public.builder_reward_ledger l
WHERE lower(l.provider) = 'x' AND NOT ((lower(l.provider) = 'x' AND l.reward_type IN ('social_verification', 'reward_reversal'))
          OR lower(l.idempotency_key) LIKE 'social-verification:x:%')
GROUP BY l.reward_type, l.entry_type;
DO $$
DECLARE
  v_registry_has_rows boolean;
BEGIN
 IF (SELECT count(*) FROM auth.identities WHERE provider='x') <> 60
 OR (SELECT count(DISTINCT user_id) FROM auth.identities WHERE provider='x') <> 60
 OR (SELECT count(DISTINCT provider_id) FROM auth.identities WHERE provider='x') <> 60
 OR (SELECT count(*) FROM public.builder_reward_ledger l WHERE ((lower(l.provider) = 'x' AND l.reward_type IN ('social_verification', 'reward_reversal'))
          OR lower(l.idempotency_key) LIKE 'social-verification:x:%')) <> 55
 OR (SELECT count(*) FROM public.builder_reward_ledger l WHERE l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text) <> 55
 OR (SELECT count(DISTINCT l.builder_id) FROM public.builder_reward_ledger l WHERE l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text) <> 55
 OR (SELECT count(*) FROM public.builder_reward_ledger l JOIN auth.identities ai ON ai.user_id=l.builder_id AND ai.provider='x'
     WHERE l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text) <> 55
 OR (SELECT coalesce(sum(l.amount), 0) FROM public.builder_reward_ledger l WHERE l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text) <> 275000
 OR (SELECT count(*) FROM auth.identities ai WHERE ai.provider='x' AND NOT EXISTS
     (SELECT 1 FROM public.builder_reward_ledger l WHERE l.builder_id=ai.user_id AND l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text)) <> 5 THEN
   RAISE EXCEPTION 'STOP: production baseline mismatch (60/55/5/275000 required)';
 END IF;
 IF EXISTS (
   SELECT 1 FROM auth.identities ai
   LEFT JOIN public.builder_profiles p ON p.builder_id=ai.user_id
   LEFT JOIN public.builder_social_identities s ON s.builder_id=ai.user_id AND lower(s.provider)='x'
   WHERE ai.provider='x' AND (
     p.builder_id IS NULL OR p.personal_gp IS NULL OR p.gp IS NULL OR p.eligible_network_gp IS NULL
     OR p.personal_gp<0 OR p.gp<>p.personal_gp+p.eligible_network_gp
     OR ai.provider_id IS NULL OR btrim(ai.provider_id)=''
     OR (ai.identity_data->>'sub' IS NOT NULL AND ai.identity_data->>'sub'<>ai.provider_id)
     OR (s.provider_user_id IS NOT NULL AND s.provider_user_id<>ai.provider_id)
     OR (EXISTS (SELECT 1 FROM public.builder_reward_ledger l WHERE l.builder_id=ai.user_id AND l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text)
         AND (p.personal_gp<5000 OR s.reward_claimed IS DISTINCT FROM true))
     OR (NOT EXISTS (SELECT 1 FROM public.builder_reward_ledger l WHERE l.builder_id=ai.user_id AND l.provider = 'x' AND l.reward_type = 'social_verification'
          AND l.entry_type = 'credit' AND l.amount = 5000
          AND l.idempotency_key = 'social-verification:x:' || l.builder_id::text)
         AND s.reward_claimed IS TRUE)
   )
 ) THEN RAISE EXCEPTION 'STOP: identity, reward flags or GP balances invalid'; END IF;
 IF to_regclass('public.builder_x_oauth_resets') IS NOT NULL THEN
   EXECUTE
     'SELECT EXISTS (SELECT 1 FROM public.builder_x_oauth_resets)'
   INTO STRICT v_registry_has_rows;

   IF v_registry_has_rows THEN
     RAISE EXCEPTION 'STOP: production reset registry is not empty';
   END IF;
 END IF;
 RAISE NOTICE 'Preflight passed: 60 connected, 55 rewarded, 5 without OAuth rewards, 275000 GP OAuth reversal. Unrelated X rewards excluded. No changes made.';
END $$;
ROLLBACK;
