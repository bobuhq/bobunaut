import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

// Isolated local Docker PostgreSQL only. No hosted database connection.
const container = process.env.GENESIS_TEST_CONTAINER || 'supabase_db_BOBU-Universe-v0.2.1-Cinematic-Edition';
const db = `bobu_genesis_v12_persistent_${Date.now()}_${process.pid}`;
assert.match(db, /^bobu_genesis_v12_persistent_\d+_\d+$/);
const migration = 'supabase/migrations/20261117230000_genesis_v12_persistent_authorization.sql';
function sql(query, database=db) {
  return new Promise((resolve, reject) => {
    const child=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]);
    let out='',err='';
    child.stdout.on('data',b=>out+=b);
    child.stderr.on('data',b=>err+=b);
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(out.trim()):reject(Error(err)));
    child.stdin.on('error',()=>{});
    child.stdin.end(query);
  });
}
let created=false;
try {
  await sql(`create database ${db}`,'postgres');
  created=true;
  const fixture=readFileSync('tests/genesis-v11/fixture.sql','utf8').replace(/create role anon; create role authenticated; create role service_role bypassrls;/,'');
  const chain=[
    'supabase/migrations/20261114120000_ares_genesis_certification_v11.sql',
    'tests/genesis-v11/legacy-authority-fixture.sql',
    'supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql',
    'supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql',
    migration,
  ];
  await sql(fixture + chain.map(p=>readFileSync(p,'utf8')).join('\n'));
  assert.equal(await sql(`select count(*) from pg_class where relname in ('persistent_grants_v12','verified_evidence_v12') and relnamespace='genesis_v11'::regnamespace;`),'2');
  assert.equal(await sql(`select has_function_privilege('anon','public.activate_ares_genesis_persistent_v12(uuid)','EXECUTE');`),'f');
  assert.equal(await sql(`select has_function_privilege('authenticated','public.activate_ares_genesis_persistent_v12(uuid)','EXECUTE');`),'t');
  assert.equal(await sql(`select has_function_privilege('anon','public.get_ares_genesis_placement_v10()','EXECUTE');`),'f');
  assert.equal(await sql(`select count(*) from genesis_v11.persistent_grants_v12;`),'0');
  await assert.rejects(sql(`set role anon; select public.activate_ares_genesis_persistent_v12('00000000-0000-0000-0000-000000000010');`), /permission denied/);
  await assert.rejects(sql(`set role authenticated; select public.activate_ares_genesis_persistent_v12('00000000-0000-0000-0000-000000000010');`), /OWNER_LOGIN_REQUIRED/);
  console.log('V12_PERSISTENT_SCHEMA_PASS: full local migration chain, RLS tables, anonymous denial, authenticated owner identity enforcement');
  console.log('NOTE: End-to-end activation, revocation, lease and collision regression still require dedicated V12 fixtures.');
} finally {
  if(created) await sql(`drop database ${db}`,'postgres');
}
