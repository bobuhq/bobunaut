import { readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
// Only local Docker; no remote URLs or Supabase project access.
const container = 'supabase_db_BOBU-Universe-v0.2.1-Cinematic-Edition';
const database = `bobu_x_test_${Date.now()}`;
const read = path => readFileSync(path, 'utf8');
const ledger = read('supabase/migrations/20260725125301_create_builder_reward_engine.sql');
const gp = read('supabase/migrations/20260801094500_create_gp_storage_v2.sql');
const preflight = read('supabase/sql/x-oauth-reverification/09_production_preflight.sql');
// Exercise the exact production DO-block validation in positive and negative
// transaction fixtures, without nesting its top-level read-only transaction.
const preflightBody = preflight.slice(preflight.indexOf('DO $$')+5, preflight.indexOf('END $$;'))+'END;';
const preflightTestFunction = `CREATE FUNCTION public.test_production_preflight() RETURNS void LANGUAGE plpgsql AS $preflight_test$${preflightBody}$preflight_test$;`;
const sql = [
 `CREATE DATABASE ${database};\n\\connect ${database}`,
 read('tests/x-oauth/fixture.sql'),
 ledger.slice(ledger.indexOf('create table if not exists public.builder_reward_ledger'), ledger.indexOf('-- ROW LEVEL SECURITY')),
 "ALTER TABLE public.builder_reward_ledger ADD COLUMN entry_type text NOT NULL DEFAULT 'credit' CHECK(entry_type IN ('credit','debit'));",
 gp.slice(gp.indexOf('create or replace function public.award_builder_gp('),gp.indexOf('create or replace function public.reverse_builder_gp(')),
 read("supabase/migrations/20261103193000_complete_x_oauth_reverification.sql"),
 preflightTestFunction,
 read('tests/x-oauth/integration.sql').replace('CREATE TEMP TABLE original_profiles', () => read('supabase/sql/x-oauth-reverification/09_production_preflight.sql')+'\nCREATE TEMP TABLE original_profiles'),
 read('tests/x-oauth/campaign-regression.sql'),
].join('\n');
const result=spawnSync('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:sql,encoding:'utf8',maxBuffer:8*1024*1024});
process.stdout.write(result.stdout??''); process.stderr.write(result.stderr??'');
console.log(`Local test database (created only if Docker succeeded): ${database}`);
if(result.status!==0) process.exit(result.status??1);
function execute(sql) {
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]);
  let output=''; let error=''; child.stdout.on('data',chunk=>output+=chunk); child.stderr.on('data',chunk=>error+=chunk);
  child.on('error',reject); child.on('close',code=>code===0?resolve(output):reject(new Error(error)));
  child.stdin.end(sql);
 });
}
await execute(`SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs');
DELETE FROM auth.identities WHERE provider='x' AND user_id='00000000-0000-0000-0000-000000000001';
INSERT INTO auth.identities(user_id,provider,provider_id,created_at) VALUES ('00000000-0000-0000-0000-000000000001','x','x-000000000001',clock_timestamp());`);
await Promise.all(Array.from({length:4},()=>execute("SELECT * FROM public.claim_x_identity_reward('00000000-0000-0000-0000-000000000001','x-000000000001');")));
await execute(`SELECT public.test_assert((SELECT count(*)=1 FROM public.builder_reward_ledger WHERE idempotency_key='social-verification:x:reset-v2:00000000-0000-0000-0000-000000000001'),'concurrent replacement credit exactly once');
SELECT public.test_assert((SELECT personal_gp=10000 AND gp=10321 FROM public.builder_profiles WHERE builder_id='00000000-0000-0000-0000-000000000001'),'concurrent claim balance');`);
console.log('Four concurrent claims passed: one replacement credit, exact final balance');
