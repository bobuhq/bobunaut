import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root = 'src/core/mars/exploration/';
const metadata = JSON.parse(readFileSync('docs/ares-official-audio-v3/asset-metadata.json'));
for (const asset of metadata) test(`approved bytes, PCM metadata and complete samples: ${asset.file}`, () => {
  const bytes = readFileSync('public/audio/ares-official-v3/' + asset.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  assert.equal(bytes.length, asset.bytes); assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length); assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt16LE(20), 1); assert.equal(bytes.readUInt16LE(22), 2);
  assert.equal(bytes.readUInt32LE(24), 44100); assert.equal(bytes.readUInt16LE(34), 16);
  assert.equal(bytes.readUInt32LE(40) + 44, bytes.length);
  assert.equal(bytes.readUInt32LE(40) / bytes.readUInt32LE(28), asset.duration);
});
test('all four console recordings are distinct approved assets', () => {
  assert.equal(new Set(metadata.filter(m => m.file.includes('Console')).map(m => m.sha256)).size, 4);
});

// Execute actual guarded handler bodies, replacing ONLY external side effects.
// This is not authenticated backend validation and never invokes a real RPC.
function extract(file, name) {
  const text = readFileSync(root + file, 'utf8'), source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source); assert(found, name);
  const raw = ts.isFunctionDeclaration(found) ? found.getText(source) : `const ${name} = ${found.getText(source)};`;
  return ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
}
function handler(file, name, dependencies) {
  return new Function(...Object.keys(dependencies), extract(file, name) + `; return ${name};`)(...Object.values(dependencies));
}
const noop = () => {};
test('Mission actual access handler: near + not busy only, no proximity/restore playback', async () => {
  const cues = [], nearRef = { current: false }, busyRef = { current: false }; let requests = 0;
  const call = handler('missions/AresMissionTerminal.tsx', 'accessTerminal', { nearRef, busyRef, aresArrivalSound: { terminal: kind => cues.push(kind) }, setBusy: noop, setError: noop,
    accessMyAresMissionTerminal: async () => { requests++; return {}; }, setMission: noop, onMission: noop });
  await call(); assert.deepEqual(cues, []);
  nearRef.current = true; busyRef.current = true; await call(); assert.deepEqual(cues, []);
  busyRef.current = false; await call(); assert.deepEqual(cues, ['mission']); assert.equal(requests, 1);
});
test('Research actual start handler: claimed mission + near + ready/error required; restore stays silent', async () => {
  const cues = [];
  const dependencies = { missionKey: 'test', missionClaimed: true, isNear: true, state: 'ready', aresArrivalSound: { terminal: kind => cues.push(kind) }, setProgress: noop, setState: noop,
    startMyAresResearch: async () => ({ status: 'analyzing' }), getMyAresResearch: async () => ({}), setResearch: noop };
  for (const change of [{ missionKey: null }, { missionClaimed: false }, { isNear: false }, { state: 'analyzing' }]) await handler('research/useAresResearchTerminal.ts', 'beginResearch', { ...dependencies, ...change })();
  assert.deepEqual(cues, []);
  await handler('research/useAresResearchTerminal.ts', 'beginResearch', dependencies)(); assert.deepEqual(cues, ['research']);
  assert(!extract('research/useAresResearchTerminal.ts', 'restoreResearch').includes('aresArrivalSound.terminal'));
});
test('Upgrade actual handler rejects unavailable, busy or distant requests before sound', async () => {
  const cues = []; let requests = 0;
  const dependencies = { nearby: true, upgrade: { can_upgrade: true }, upgrading: false, aresArrivalSound: { terminal: kind => cues.push(kind) }, setUpgrading: noop, setError: noop,
    upgradeMyMarsColonyBuilding: async () => { requests++; }, loadUpgrade: async () => {}, onUpgraded: noop };
  for (const change of [{ nearby: false }, { upgrade: null }, { upgrade: { can_upgrade: false } }, { upgrading: true }]) await handler('commandhub/AresCommandHubUpgradeTerminal.tsx', 'handleUpgrade', { ...dependencies, ...change })();
  assert.deepEqual(cues, []);
  await handler('commandhub/AresCommandHubUpgradeTerminal.tsx', 'handleUpgrade', dependencies)();
  assert.deepEqual(cues, ['upgrade']); assert.equal(requests, 1);
});
test('Command has no production event: do not invent a proximity or frame trigger', () => {
  const hub = readFileSync(root + 'commandhub/AresCommandHub.tsx', 'utf8');
  const visuals = readFileSync(root + 'commandhub/AresCommandCenterV2Visuals.tsx', 'utf8');
  assert.match(visuals, /architectural visuals only/);
  assert(!extract('commandhub/AresCommandCenterV2Visuals.tsx', 'CommandConsole').includes('onClick'));
  assert(!hub.includes('.terminal("command")')); // Explicit integration limitation, not a fake event.
});
test('existing mobile click/touch bridge continues to dispatch the interaction key', () => {
  const source = readFileSync(root + 'components/AresMobileActions.tsx', 'utf8');
  assert.match(source, /window.dispatchEvent/); assert.match(source, /"KeyE"/); assert.match(source, /onPointerDown=\{handleInteractionDown\}/); assert.match(source, /onPointerUp=\{handleInteractionUp\}/);
});
