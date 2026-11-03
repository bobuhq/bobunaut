CREATE FUNCTION public.test_assert(ok boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT: %', msg; END IF; END $$;
CREATE FUNCTION public.expect_failure(sql text, msg text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean := false;
BEGIN
 BEGIN EXECUTE sql; EXCEPTION WHEN OTHERS THEN failed := true; END;
 PERFORM public.test_assert(failed,msg);
END $$;

CREATE TEMP TABLE fixture_builders AS
SELECT CASE WHEN i=55 THEN 'b0254257-5633-4050-a90d-59160c631e7a'::uuid
       ELSE ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid END AS id,
       i<=55 AS previously_rewarded FROM generate_series(1,60) i;
INSERT INTO auth.users SELECT id FROM fixture_builders;
INSERT INTO public.builder_profiles (builder_id,personal_gp,eligible_network_gp,pending_network_gp,gp) SELECT id,10000,321,123,10321 FROM auth.users;
INSERT INTO auth.identities (user_id,provider,provider_id,identity_data,created_at)
 SELECT id,'x','x-' || right(id::text,12),jsonb_build_object('sub','x-' || right(id::text,12)),now()-interval '1 day' FROM auth.users;
INSERT INTO auth.identities (user_id,provider,provider_id) SELECT id,'google',id::text FROM auth.users;
INSERT INTO auth.identities (user_id,provider,provider_id) SELECT id,'apple',id::text FROM auth.users;
INSERT INTO auth.identities (user_id,provider,provider_id) SELECT id,'email',id::text FROM auth.users;
INSERT INTO public.builder_social_identities (builder_id,provider,provider_user_id,verified,verified_at,reward_claimed,reward_claimed_at)
 SELECT id,'x','x-' || right(id::text,12),true,now(),previously_rewarded,
 CASE WHEN previously_rewarded THEN now() END FROM fixture_builders;
INSERT INTO public.builder_reward_ledger (builder_id,reward_type,provider,amount,idempotency_key)
 SELECT id,'social_verification','x',5000,'social-verification:x:' || id::text
 FROM fixture_builders WHERE previously_rewarded;
-- Exact legitimate production campaign record, alongside an OAuth credit.
SELECT * FROM public.award_builder_gp(
 'b0254257-5633-4050-a90d-59160c631e7a', 'signal_campaign', 500,
 'signal_campaign:d66e8038-6e9b-40ea-8f2e-00a33da2c448:b0254257-5633-4050-a90d-59160c631e7a',
 'x', '{"fixture":"legitimate campaign reward"}');
SELECT public.test_assert((SELECT count(*)=56 AND sum(amount)=275500 FROM public.builder_reward_ledger WHERE provider='x'),'production-shaped total includes 500 GP campaign');
CREATE TEMP TABLE original_profiles AS TABLE public.builder_profiles;
CREATE TEMP TABLE original_auth AS TABLE auth.identities;
CREATE TEMP TABLE original_social AS TABLE public.builder_social_identities;
CREATE TEMP TABLE original_ledger AS TABLE public.builder_reward_ledger;

BEGIN;
SELECT public.test_assert(NOT has_function_privilege('authenticated','public.claim_x_identity_reward(uuid,text,text)','EXECUTE'),'ordinary client cannot claim');
SELECT public.test_assert(NOT has_function_privilege('anon','public.claim_x_identity_reward(uuid,text,text)','EXECUTE'),'anonymous cannot claim');
SELECT public.test_assert(NOT has_function_privilege('service_role','public.reset_x_oauth_population(text)','EXECUTE'),'service role cannot reset');
SELECT public.test_assert(NOT has_table_privilege('authenticated','public.builder_x_oauth_resets','SELECT'),'registry private');
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('wzohxrpzyomdrexwcxpv')$q$,'staging rejected');
-- Each failing call is a PL/pgSQL subtransaction: all partial writes roll back.
UPDATE public.builder_profiles SET personal_gp=4999,gp=5320 WHERE builder_id=(SELECT min(id::text)::uuid FROM auth.users);
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'insufficient balance aborts');
SELECT public.test_assert((SELECT count(*)=0 FROM public.builder_x_oauth_resets),'failure leaves registry empty');
UPDATE public.builder_profiles p SET personal_gp=o.personal_gp,gp=o.gp FROM original_profiles o WHERE o.builder_id=p.builder_id;
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000061');
INSERT INTO auth.identities(user_id,provider,provider_id) VALUES ('00000000-0000-0000-0000-000000000061','x','extra');
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'population drift aborts');
DELETE FROM auth.identities WHERE provider_id='extra';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000061';
UPDATE public.builder_social_identities SET provider_user_id='wrong' WHERE builder_id='00000000-0000-0000-0000-000000000001';
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'provider mismatch aborts');
UPDATE public.builder_social_identities SET provider_user_id='x-000000000001' WHERE builder_id='00000000-0000-0000-0000-000000000001';

SAVEPOINT malformed_history;
INSERT INTO public.builder_reward_ledger(builder_id,reward_type,provider,amount,idempotency_key)
VALUES ('00000000-0000-0000-0000-000000000001','social_verification','x',5000,'unexpected-history');
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'unexpected historical reward stops reset');
ROLLBACK TO malformed_history;
CREATE FUNCTION public.fail_mid_reset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.entry_type='debit' AND NEW.builder_id='00000000-0000-0000-0000-000000000028'::uuid THEN
 RAISE EXCEPTION 'injected ledger failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER fail_mid_reset BEFORE INSERT ON public.builder_reward_ledger FOR EACH ROW EXECUTE FUNCTION public.fail_mid_reset();
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'mid-transaction failure aborts entire reset');
SELECT public.test_assert((SELECT count(*)=0 FROM public.builder_x_oauth_resets),'injected failure rolls registry back');
SELECT public.test_assert((SELECT count(*)=56 FROM public.builder_reward_ledger),'injected failure leaves no debits');
DROP TRIGGER fail_mid_reset ON public.builder_reward_ledger;
SET LOCAL ROLE authenticated;
SELECT public.expect_failure($q$SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001')$q$,'authenticated RPC execution denied');
SELECT public.expect_failure($q$SELECT * FROM public.builder_x_oauth_resets$q$,'authenticated registry read denied');
RESET ROLE;
ROLLBACK;

-- Full reset rehearsal rolled back with database transaction semantics.
BEGIN;
SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs');
SELECT public.test_assert((SELECT count(*)=60 FROM public.builder_x_oauth_resets),'60 registry entries');
SELECT public.test_assert((SELECT previously_rewarded AND reversed_at IS NOT NULL FROM public.builder_x_oauth_resets
 WHERE builder_id='b0254257-5633-4050-a90d-59160c631e7a'),'campaign-plus-OAuth user classified by OAuth credit');
SELECT public.test_assert((SELECT personal_gp=5500 AND gp=5821 FROM public.builder_profiles
 WHERE builder_id='b0254257-5633-4050-a90d-59160c631e7a'),'500 campaign GP retained after exact 5000 OAuth debit');
SELECT public.test_assert((SELECT to_jsonb(l)=to_jsonb(o) FROM public.builder_reward_ledger l
 JOIN original_ledger o USING(id) WHERE l.reward_type='signal_campaign'),'exact production campaign ledger row unchanged');
SELECT public.test_assert((SELECT count(*)=55 AND sum(amount)=275000 FROM public.builder_reward_ledger WHERE entry_type='debit'),'55 debits, 275000 GP');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.builder_profiles p JOIN original_profiles o USING(builder_id) WHERE
 p.personal_gp <> o.personal_gp - CASE WHEN EXISTS (SELECT 1 FROM original_ledger l WHERE l.builder_id=p.builder_id AND l.reward_type='social_verification') THEN 5000 ELSE 0 END
 OR p.gp <> o.gp - CASE WHEN EXISTS (SELECT 1 FROM original_ledger l WHERE l.builder_id=p.builder_id AND l.reward_type='social_verification') THEN 5000 ELSE 0 END
 OR p.eligible_network_gp<>o.eligible_network_gp OR p.pending_network_gp<>o.pending_network_gp),'exact balances and untouched network GP');
SELECT public.test_assert(NOT EXISTS((TABLE auth.identities EXCEPT TABLE original_auth) UNION ALL (TABLE original_auth EXCEPT TABLE auth.identities)),'all auth identities preserved');
SELECT public.test_assert((SELECT count(*)=60 FROM public.builder_social_identities WHERE NOT verified AND NOT reward_claimed),'all X social flags reset');
SELECT public.expect_failure($q$SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs')$q$,'repeat reset refuses without duplicate debit');
SELECT public.expect_failure($q$UPDATE public.builder_reward_ledger SET amount=1$q$,'immutable ledger update');
SELECT public.expect_failure($q$DELETE FROM public.builder_reward_ledger$q$,'immutable ledger delete');
SELECT public.expect_failure($q$UPDATE public.builder_x_oauth_resets SET previously_rewarded=false WHERE previously_rewarded$q$,'registry immutable');
SELECT public.expect_failure($q$UPDATE public.builder_x_oauth_resets SET status='rewarded',rewarded_at=now()$q$,'cannot skip relink');
SELECT public.test_assert((SELECT reason='fresh_x_oauth_required' AND NOT verified FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001')),'stale identity blocked');
SELECT public.expect_failure($q$SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000002')$q$,'forged provider rejected');
-- User-controlled Auth unlink/relink simulated locally; never used in production reset.
DELETE FROM auth.identities WHERE provider='x' AND user_id='00000000-0000-0000-0000-000000000001';
SELECT public.expect_failure($q$SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001')$q$,'missing identity blocked');
INSERT INTO auth.identities(user_id,provider,provider_id,created_at) VALUES ('00000000-0000-0000-0000-000000000001','x','changed',clock_timestamp());
SELECT public.expect_failure($q$SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','changed')$q$,'original provider binding enforced');
DELETE FROM auth.identities WHERE provider_id='changed';
INSERT INTO auth.identities(user_id,provider,provider_id,created_at) VALUES ('00000000-0000-0000-0000-000000000001','x','x-000000000001',clock_timestamp());
UPDATE auth.identities ai SET created_at=r.reset_at FROM public.builder_x_oauth_resets r
WHERE ai.user_id=r.builder_id AND ai.provider='x' AND ai.user_id='00000000-0000-0000-0000-000000000001';
SELECT public.test_assert((SELECT reason='fresh_x_oauth_required' FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001')),'identity at reset timestamp is rejected');
UPDATE auth.identities SET created_at=clock_timestamp() WHERE user_id='00000000-0000-0000-0000-000000000001' AND provider='x';
SELECT public.test_assert((SELECT verified AND rewarded AND reward_gp=5000 FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001')),'fresh relink rewarded');
SELECT public.test_assert((SELECT verified AND NOT rewarded AND already_rewarded AND reward_gp=0 FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001')),'repeat claim idempotent');
DELETE FROM auth.identities WHERE provider='x' AND user_id='00000000-0000-0000-0000-000000000060';
INSERT INTO auth.identities(user_id,provider,provider_id,created_at) VALUES ('00000000-0000-0000-0000-000000000060','x','x-000000000060',clock_timestamp());
SELECT public.test_assert((SELECT rewarded FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000060','x-000000000060')),'previously unrewarded earns once');
SELECT public.test_assert((SELECT personal_gp=15000 FROM public.builder_profiles WHERE builder_id='00000000-0000-0000-0000-000000000060'),'unrewarded never deducted');
SAVEPOINT conflicting_key;
DELETE FROM auth.identities WHERE provider='x' AND user_id='00000000-0000-0000-0000-000000000002';
INSERT INTO auth.identities(user_id,provider,provider_id,created_at)
VALUES ('00000000-0000-0000-0000-000000000002','x','x-000000000002',clock_timestamp());
INSERT INTO public.builder_reward_ledger(builder_id,reward_type,provider,amount,idempotency_key)
VALUES ('00000000-0000-0000-0000-000000000002','other','x',4000,'social-verification:x:reset-v2:00000000-0000-0000-0000-000000000002');
SELECT public.expect_failure($q$SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000002','x-000000000002')$q$,'conflicting ledger key cannot finalize verification');
SELECT public.test_assert((SELECT status='pending' FROM public.builder_x_oauth_resets WHERE builder_id='00000000-0000-0000-0000-000000000002'),'ledger conflict keeps reset pending');
SELECT public.test_assert((SELECT NOT verified FROM public.builder_social_identities WHERE builder_id='00000000-0000-0000-0000-000000000002' AND provider='x'),'ledger conflict rolls social verification back');
ROLLBACK TO conflicting_key;
SAVEPOINT cross_account;
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000061');
INSERT INTO public.builder_profiles(builder_id) VALUES ('00000000-0000-0000-0000-000000000061');
DELETE FROM auth.identities WHERE provider='x' AND provider_id='x-000000000001';
INSERT INTO auth.identities(user_id,provider,provider_id) VALUES ('00000000-0000-0000-0000-000000000061','x','x-000000000001');
SELECT public.expect_failure($q$SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000061','x-000000000001')$q$,'original provider cannot move to another account');
ROLLBACK TO cross_account;
SELECT public.test_assert((SELECT count(*)=0 FROM original_ledger o LEFT JOIN public.builder_reward_ledger l ON l.id=o.id WHERE l IS NULL OR to_jsonb(l)<>to_jsonb(o)),'historical credits unchanged');
ROLLBACK;
SELECT public.test_assert(NOT EXISTS((TABLE public.builder_profiles EXCEPT TABLE original_profiles) UNION ALL (TABLE original_profiles EXCEPT TABLE public.builder_profiles)),'rollback restores every balance');
SELECT public.test_assert(NOT EXISTS((TABLE auth.identities EXCEPT TABLE original_auth) UNION ALL (TABLE original_auth EXCEPT TABLE auth.identities)),'rollback restores auth fixture');
SELECT public.test_assert(NOT EXISTS((TABLE public.builder_social_identities EXCEPT TABLE original_social) UNION ALL (TABLE original_social EXCEPT TABLE public.builder_social_identities)),'rollback restores social state');
SELECT public.test_assert(NOT EXISTS((TABLE public.builder_reward_ledger EXCEPT TABLE original_ledger) UNION ALL (TABLE original_ledger EXCEPT TABLE public.builder_reward_ledger)),'rollback restores ledger');
SELECT public.test_assert((SELECT count(*)=0 FROM public.builder_x_oauth_resets),'rollback restores empty registry');
\echo 'X OAuth SQL integration and rollback rehearsal passed'
