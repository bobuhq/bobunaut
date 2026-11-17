import {spawnSync} from 'node:child_process';

// Temporary, narrowly-scoped risk exception for one development-only advisory.
// This is NOT a vulnerability fix. Every other advisory continues to fail CI.
// Renewing this exception requires a reviewed change after its expiration.
const expires = Date.parse('2026-12-01T00:00:00Z');
const allowed = ['fdir', 'picomatch', 'tinyglobby', 'vite'];
const advisory = 'GHSA-fc5q-39xc-vjpf';
if (Date.now() >= expires) {
  console.error('STOP: Picomatch temporary audit exception expired.');
  process.exit(1);
}
const audit = (args) => {
  const result = spawnSync('npm', ['audit', '--json', ...args], {
    encoding:'utf8', maxBuffer: 16 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (!result.stdout.trim()) throw new Error(`npm audit returned no JSON (${result.status}): ${result.stderr}`);
  const report = JSON.parse(result.stdout);
  if (report.error) throw new Error(JSON.stringify(report.error));
  if (!report.vulnerabilities || !report.metadata?.vulnerabilities) throw new Error('Unknown npm audit report format');
  return {report, status:result.status};
};
const prod = audit(['--omit=dev']);
if (prod.status !== 0 || prod.report.metadata.vulnerabilities.total !== 0) {
  console.error('STOP: Production dependencies have reported vulnerabilities.');
  process.exit(1);
}
const full = audit([]);
const vulnerabilities = full.report.vulnerabilities;
const names = Object.keys(vulnerabilities).sort();
if (names.length === 0 && full.status === 0) {
  console.log('AUDIT_FULL_CLEAN');
  process.exit(0);
}
const exact = names.length === allowed.length && names.every((name,i)=>name===allowed[i]);
const counts = full.report.metadata.vulnerabilities;
const countsMatch = counts.total === 4 && counts.high === 4 &&
  ['critical','moderate','low','info'].every(k=>(counts[k] ?? 0) === 0);
const allHigh = names.every(name=>vulnerabilities[name].severity === 'high');
const viaMatch = names.every(name=>
  vulnerabilities[name].via.some(v=>typeof v === 'string'
    ? (v === 'picomatch' || v === 'fdir' || v === 'tinyglobby')
    : v.name === 'picomatch' && v.url?.includes(advisory)));
const picomatchDirect = vulnerabilities.picomatch?.via.some(v=>
  typeof v === 'object' && v.name === 'picomatch' && v.url?.includes(advisory));
const noRuntime = names.every(name=>vulnerabilities[name].isDirect === false || name === 'vite');
if (!exact || !countsMatch || !allHigh || !viaMatch || !picomatchDirect || !noRuntime) {
  console.error('STOP: New or unexpected npm audit findings; exception DENIED.', {
    names, counts, exact, viaMatch, picomatchDirect, noRuntime
  });
  process.exit(1);
}
console.warn(`TEMPORARY_AUDIT_EXCEPTION: ${advisory} via ${names.join(', ')}; EXPIRES 2026-12-01 UTC`);
console.log('PRODUCTION_DEPENDENCIES_AUDIT_CLEAN');
