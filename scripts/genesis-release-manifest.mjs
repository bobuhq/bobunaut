import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, relative} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(path,e.name)):[resolve(path,e.name)]);}
const files=[...['src','public'].flatMap(p=>walk(resolve(root,p))),...['package.json','package-lock.json','vite.config.ts','tsconfig.app.json','scripts/genesis-release-manifest.mjs','scripts/genesis-source-evidence.mjs','scripts/genesis-owner-package.mjs','scripts/genesis-verify-owner-proposal.mjs','scripts/genesis-live-approval.mjs','supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql','supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql','docs/genesis-v11-integrated-live-geometry.json','supabase/migrations/20261114120000_ares_genesis_certification_v11.sql'].map(p=>resolve(root,p))].filter(p=>relative(root,p)!=='src/core/mars/genesis-release.json').sort();
const hash=createHash('sha256');
for(const file of files){const bytes=readFileSync(file);hash.update(relative(root,file)+'\0'+bytes.length+'\0');hash.update(bytes);}
const manifest={schema:1,sha256:hash.digest('hex'),files:files.length};
const target=resolve(root,'src/core/mars/genesis-release.json');
const expected=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--write'))writeFileSync(target,expected);
else if(readFileSync(target,'utf8')!==expected)throw Error('Genesis release manifest is stale. Regenerate and recertify the changed release.');
console.log('Genesis release digest:',manifest.sha256);
