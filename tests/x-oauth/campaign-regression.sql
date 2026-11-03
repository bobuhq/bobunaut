-- The baseline already includes the exact 500 GP production campaign record
-- on an OAuth-rewarded user. Add a separate campaign-only user transactionally.
BEGIN;
SELECT * FROM public.award_builder_gp(
 '00000000-0000-0000-0000-000000000060', 'signal_campaign', 500,
 'signal_campaign:d66e8038-6e9b-40ea-8f2e-00a33da2c448:00000000-0000-0000-0000-000000000060',
 'x', '{"fixture":"campaign only, no OAuth reward"}');
CREATE TEMP TABLE campaign_rows_before ON COMMIT DROP AS
 SELECT * FROM public.builder_reward_ledger WHERE reward_type='signal_campaign';
SELECT public.test_production_preflight();
SAVEPOINT oauth_flag_mismatch;
UPDATE public.builder_social_identities SET reward_claimed=false
 WHERE provider='x' AND builder_id='00000000-0000-0000-0000-000000000001';
SELECT public.expect_failure('SELECT public.test_production_preflight()','OAuth credit with unclaimed flag is inconsistent');
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'OAuth credit with unclaimed flag stops reset');
ROLLBACK TO oauth_flag_mismatch;
-- A campaign does not turn a false social reward flag into an OAuth reward.
SAVEPOINT campaign_flag_mismatch;
UPDATE public.builder_social_identities SET reward_claimed=true
 WHERE provider='x' AND builder_id='00000000-0000-0000-0000-000000000060';
SELECT public.expect_failure('SELECT public.test_production_preflight()','campaign-only claimed flag is inconsistent');
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'campaign-only claimed flag stops reset');
ROLLBACK TO campaign_flag_mismatch;
-- A campaign-only user does not need to fund an OAuth reversal. Keep its 500 GP
-- as its entire personal balance, plus the unchanged eligible network balance.
UPDATE public.builder_profiles SET personal_gp=500,gp=821
 WHERE builder_id='00000000-0000-0000-0000-000000000060';
SELECT public.test_production_preflight();
SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs');
SELECT public.test_assert((SELECT count(*)=55 FROM public.builder_x_oauth_resets WHERE previously_rewarded),'55 previously OAuth-rewarded users, campaigns excluded');
SELECT public.test_assert((SELECT count(*)=5 FROM public.builder_x_oauth_resets WHERE NOT previously_rewarded),'five without OAuth rewards includes campaign-only user');
SELECT public.test_assert((SELECT NOT previously_rewarded AND reversed_at IS NULL
 FROM public.builder_x_oauth_resets WHERE builder_id='00000000-0000-0000-0000-000000000060'),'campaign-only registry has no reversal');
SELECT public.test_assert((SELECT personal_gp=500 AND gp=821 AND eligible_network_gp=321 AND pending_network_gp=123
 FROM public.builder_profiles WHERE builder_id='00000000-0000-0000-0000-000000000060'),'campaign-only balance never deducted, even below 5000');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.builder_reward_ledger
 WHERE builder_id='00000000-0000-0000-0000-000000000060' AND entry_type='debit'),'campaign-only user receives no debit');
SELECT public.test_assert((SELECT count(*)=55 AND sum(amount)=275000
 FROM public.builder_reward_ledger WHERE entry_type='debit' AND reward_type='reward_reversal'
 AND idempotency_key LIKE 'social-verification:x:reversal:%'),'campaign scenario still reverses exactly 275000 OAuth GP');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM campaign_rows_before b
 LEFT JOIN public.builder_reward_ledger l USING(id) WHERE to_jsonb(l) IS DISTINCT FROM to_jsonb(b)),'both campaign credits preserved byte-for-byte');
DELETE FROM auth.identities WHERE provider='x' AND user_id='00000000-0000-0000-0000-000000000060';
INSERT INTO auth.identities(user_id,provider,provider_id,created_at)
 VALUES ('00000000-0000-0000-0000-000000000060','x','x-000000000060',clock_timestamp());
SELECT public.test_assert((SELECT verified AND rewarded AND reward_gp=5000
 FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000060','x-000000000060')),'campaign-only user can earn OAuth reward after fresh relink');
SELECT public.test_assert((SELECT NOT rewarded AND already_rewarded
 FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000060','x-000000000060')),'campaign-only user earns OAuth reward only once');
SELECT public.test_assert((SELECT personal_gp=5500 AND gp=5821
 FROM public.builder_profiles WHERE builder_id='00000000-0000-0000-0000-000000000060'),'first OAuth credit adds exactly 5000 to preserved 500 campaign GP');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM campaign_rows_before b
 LEFT JOIN public.builder_reward_ledger l USING(id) WHERE to_jsonb(l) IS DISTINCT FROM to_jsonb(b)),'fresh OAuth reward does not alter either campaign row');
ROLLBACK;

-- Both SQL entry points must reject suspicious OAuth rows even when legitimate
-- unrelated X credits exist. Each injected row is rolled back by subtransaction.
DO $$
DECLARE c record;
BEGIN
 FOR c IN SELECT * FROM (VALUES
  ('duplicate OAuth reward','social_verification','x',5000::bigint,'credit','duplicate-oauth'),
  ('wrong OAuth amount','social_verification','x',500::bigint,'credit','social-verification:x:00000000-0000-0000-0000-000000000060'),
  ('null provider under OAuth key','social_verification',NULL,5000::bigint,'credit','social-verification:x:00000000-0000-0000-0000-000000000060'),
  ('wrong provider under OAuth key','social_verification','google',5000::bigint,'credit','social-verification:x:00000000-0000-0000-0000-000000000060'),
  ('campaign type under OAuth key','signal_campaign','x',5000::bigint,'credit','social-verification:x:00000000-0000-0000-0000-000000000060'),
  ('debit under OAuth credit key','social_verification','x',5000::bigint,'debit','social-verification:x:00000000-0000-0000-0000-000000000060'),
  ('existing OAuth reversal','reward_reversal','x',5000::bigint,'debit','social-verification:x:reversal:00000000-0000-0000-0000-000000000060'),
  ('ambiguous generic X reversal','reward_reversal','x',5000::bigint,'debit','unexpected-reversal'),
  ('mixed-case OAuth provider','social_verification','X',5000::bigint,'credit','social-verification:x:00000000-0000-0000-0000-000000000060')
 ) AS cases(label,reward_type,provider,amount,entry_type,reward_key)
 LOOP
  BEGIN
   INSERT INTO public.builder_reward_ledger(builder_id,reward_type,provider,amount,entry_type,idempotency_key)
   VALUES (CASE WHEN c.label='duplicate OAuth reward' THEN '00000000-0000-0000-0000-000000000001'::uuid
                ELSE '00000000-0000-0000-0000-000000000060'::uuid END,
           c.reward_type,c.provider,c.amount,c.entry_type,c.reward_key);
   PERFORM public.expect_failure('SELECT public.test_production_preflight()',c.label || ' rejected by preflight');
   PERFORM public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,c.label || ' rejected by reset');
   PERFORM public.test_assert((SELECT count(*)=0 FROM public.builder_x_oauth_resets),c.label || ' leaves empty registry');
   PERFORM public.test_assert((SELECT count(*)=0 FROM public.builder_reward_ledger WHERE idempotency_key LIKE 'social-verification:x:reversal:%'
     AND idempotency_key<>c.reward_key),c.label || ' leaves no new reversals');
   RAISE SQLSTATE 'ZX001'; -- Roll back the injected immutable row; never delete it.
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
 END LOOP;
END $$;
SELECT public.test_assert((SELECT count(*)=56 AND sum(amount)=275500 FROM public.builder_reward_ledger WHERE provider='x'),'all campaign regression transactions restore the 56-row production-shaped baseline');
SELECT public.test_production_preflight();
\echo 'X campaign regression passed: 500 GP preserved; campaign-only user not debited; OAuth reversal remains 275000 GP'
