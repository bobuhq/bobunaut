import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, beforeEach, afterEach } from "node:test";
import ts from "typescript";

const sourceRoot = "src/core/mars/exploration/audio/";
function moduleUrl(file, replace = text => text) {
  const code = ts.transpileModule(replace(readFileSync(sourceRoot + file, "utf8")), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return "data:text/javascript;base64," + Buffer.from(code).toString("base64");
}
const recordings = moduleUrl("AresOfficialAudio.ts");
const soundscape = moduleUrl("AresSoundscape.ts");
const movement = moduleUrl("MarsAudioEngine.ts");
const { AresArrivalSound, ARES_SOUND_PREFERENCE_KEY } = await import(moduleUrl("AresArrivalSound.ts", text => text
  .replace('"./AresOfficialAudio"', JSON.stringify(recordings))
  .replace('"./AresSoundscape"', JSON.stringify(soundscape))
  .replace('"./MarsAudioEngine"', JSON.stringify(movement))));
const { marsAudio } = await import(movement);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

class Parameter {
  value = 0;
  setValueAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
  targets = [];
  setTargetAtTime(v) { this.value = v; this.targets.push(v); }
}
class Context {
  static instances = [];
  static initialState = "running";
  static resumeMode = "resolve";
  state = Context.initialState;
  currentTime = 0;
  destination = {};
  sources = [];
  closed = false;
  resumed = 0;
  constructor() { Context.instances.push(this); }
  decodeAudioData(bytes) {
    const data = new DataView(bytes);
    return Promise.resolve({ numberOfChannels: data.getUint16(22, true), duration: data.getUint32(40, true) / data.getUint32(28, true) });
  }
  createGain() { return { gain: new Parameter(), connect() {}, disconnect() {} }; }
  createBuffer(_channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  createBufferSource() {
    const source = new AudioBufferSourceNode();
    source.playbackRate = new Parameter();
    source.connect = () => {};
    source.disconnect = () => { source.disconnected = true; };
    source.start = at => { source.started = at; };
    source.stop = at => { source.stopped = at; };
    this.sources.push(source); return source;
  }
  createBiquadFilter() { return { frequency: new Parameter(), Q: new Parameter(), connect() {}, disconnect() {} }; }
  createOscillator() {
    const source = { frequency: new Parameter(), detune: new Parameter(),
      connect() {}, disconnect() { this.disconnected = true; },
      start(at) { this.started = at; }, stop(at) { this.stopped = at; }, onended: null };
    this.sources.push(source);
    return source;
  }
  resume() {
    this.resumed++;
    if (Context.resumeMode === "reject") return Promise.reject(new Error("NotAllowedError"));
    if (Context.resumeMode === "pending") return new Promise(resolve => { this.resolveResume = () => { this.state = "running"; resolve(); }; });
    this.state = "running";
    return Promise.resolve();
  }
  close() { this.closed = true; this.state = "closed"; return Promise.resolve(); }
}
let sound;
let storage;
function gesture(type = "pointerdown", trusted = true, target = null) {
  const event = new Event(type);
  Object.defineProperty(event, "isTrusted", { value: trusted });
  if (target) Object.defineProperty(event, "target", { value: target });
  window.dispatchEvent(event);
}
beforeEach(() => {
  Context.instances = [];
  Context.initialState = "running";
  Context.resumeMode = "resolve";
  globalThis.window = Object.assign(new EventTarget(), { AudioContext: Context });
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  globalThis.KeyboardEvent = class extends Event {};
  globalThis.Element = class { closest() { return null; } };
  globalThis.AudioBufferSourceNode = class {};
  globalThis.fetch = async url => {
    const data = readFileSync("public" + url);
    return { ok: true, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
  };
  storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  sound = new AresArrivalSound();
  marsAudio.setContextProvider(sound.getRunningContext);
});
afterEach(async () => {
  sound.routeChanged("/mars");
  await marsAudio.stop();
  marsAudio.setEnabled(true);
  await wait(210);
});

test("one cue per entry, including StrictMode replay and ordinary surface remounts", async () => {
  sound.routeChanged("/mars/explore");
  sound.attachSurface()(); // StrictMode setup/cleanup before the deferred start.
  const detach = sound.attachSurface();
  await wait(10);
  assert.equal(Context.instances.length, 1);
  assert.equal(Context.instances[0].sources.length, 1);
  sound.routeChanged("/mars/explore/");
  gesture(); gesture("keydown"); gesture("touchend");
  detach();
  sound.attachSurface();
  await wait(80);
  assert.equal(Context.instances.length, 2);
  assert(Context.instances[0].closed);
  assert(Context.instances[0].sources.every(source => source.disconnected));
  sound.routeChanged("/mars");
  sound.routeChanged("/mars/explore");
  sound.attachSurface();
  await wait(10);
  assert.equal(Context.instances.length, 3);
  assert.equal(Context.instances[2].sources.length, 1);
});

test("no context or cue before the actual surface commits", async () => {
  sound.routeChanged("/mars/explore");
  await wait(10);
  assert.equal(Context.instances.length, 0);
});

test("suspended autoplay waits for a trusted touch, never synthetic gestures", async () => {
  Context.initialState = "suspended";
  sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10);
  const context = Context.instances[0];
  assert.equal(context.resumed, 0);
  gesture("pointerdown", false);
  assert.equal(context.resumed, 0);
  gesture("touchend");
  await wait(0);
  assert.equal(context.resumed, 1);
  assert.equal(context.sources.length, 1);
});

test("rejected resumes can retry on a later gesture without loops", async () => {
  Context.initialState = "suspended";
  Context.resumeMode = "reject";
  sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10);
  gesture(); await wait(10);
  const context = Context.instances[0];
  assert.equal(context.resumed, 1);
  assert.equal(context.sources.length, 0);
  Context.resumeMode = "resolve";
  gesture("keydown"); await wait(0);
  assert.equal(context.resumed, 2);
  assert.equal(context.sources.length, 1);
});

test("navigation cancels a pending resume; a late resolution cannot play", async () => {
  Context.initialState = "suspended"; Context.resumeMode = "pending";
  sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10); gesture();
  const context = Context.instances[0];
  sound.routeChanged("/mars");
  context.resolveResume(); await wait(0);
  assert(context.closed);
  assert.equal(context.sources.length, 0);
});

test("a late resume after remount cannot start the old cue or duplicate the new one", async () => {
  Context.initialState = "suspended"; Context.resumeMode = "pending";
  sound.routeChanged("/mars/explore"); const detach = sound.attachSurface();
  await wait(10); gesture();
  const old = Context.instances[0];
  detach(); sound.attachSurface(); await wait(10);
  old.resolveResume(); await wait(0);
  assert.equal(old.sources.length, 0);
  Context.resumeMode = "resolve"; gesture(); await wait(0);
  assert.equal(Context.instances[1].sources.length, 1);
});

test("persistent mute prevents allocation; unmute does not replay this entry", async () => {
  sound.setEnabled(false);
  assert.equal(storage.get(ARES_SOUND_PREFERENCE_KEY), "off");
  sound = new AresArrivalSound();
  assert.equal(sound.getEnabled(), false);
  sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10); gesture();
  assert.equal(Context.instances.length, 0);
  sound.setEnabled(true); gesture(); await wait(10);
  assert.equal(Context.instances.length, 1);
  assert.equal(Context.instances[0].sources.length, 10, "Unmute starts ambience without replaying arrival");
  sound.routeChanged("/mars"); sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10);
  sound.setEnabled(false); await wait(210);
  assert(Context.instances.every(context => context.closed));
});

test("mute control pointerdown cannot accidentally unlock pending arrival", async () => {
  Context.initialState = "suspended";
  sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10);
  const button = new Element(); button.closest = () => button;
  gesture("pointerdown", true, button);
  sound.setEnabled(false); gesture();
  assert.equal(Context.instances[0].resumed, 0);
  assert(Context.instances[0].closed);
});

test("backgrounding drops the cue and closes audio rather than playing on return", async () => {
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  document.visibilityState = "hidden";
  document.dispatchEvent(new Event("visibilitychange"));
  await wait(80);
  assert(Context.instances[0].closed);
  document.visibilityState = "visible";
  document.dispatchEvent(new Event("visibilitychange")); gesture();
  assert.equal(Context.instances.length, 2);
  assert.equal(Context.instances[1].sources.length, 10, "Only ambience resumes");
});

test("foreground OS audio interruption closes the cue instead of queuing a late continuation", async () => {
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  const context = Context.instances[0];
  context.state = "suspended";
  context.onstatechange();
  assert(context.closed);
  assert.equal(context.onstatechange, null);
  gesture();
  assert.equal(Context.instances.length, 2);
  assert.equal(Context.instances[1].sources.length, 10);
});

test("WebKit fallback and blocked storage are supported", async () => {
  window.webkitAudioContext = Context; delete window.AudioContext;
  globalThis.localStorage = { getItem() { throw Error("SecurityError"); }, setItem() { throw Error("SecurityError"); } };
  sound.setEnabled(false); sound.setEnabled(true);
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  assert.equal(Context.instances[0].sources.length, 1);
});

test("unsupported audio skips gracefully", async () => {
  delete window.AudioContext;
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  gesture(); assert.equal(Context.instances.length, 0);
});

test("arrival hands off to one continuous soundscape and releases its finite sources", async () => {
  sound.routeChanged("/mars/explore"); sound.attachSurface();
  await wait(10);
  Context.instances[0].sources[0].onended();
  assert(!Context.instances[0].closed);
  assert(Context.instances[0].sources.slice(0, 1).every(source => source.disconnected));
  assert.equal(Context.instances[0].sources.length, 11);
  gesture(); assert.equal(Context.instances.length, 1);
  await marsAudio.unlock(); Context.instances[0].currentTime = 5; marsAudio.step();
  assert.equal(Context.instances.length, 1, "Movement uses the same context");
  sound.routeChanged("/mars"); await wait(210);
  assert(Context.instances[0].closed);
  assert(Context.instances[0].sources.every(source => source.disconnected));
});

test("mix updates create no sources, near-crystal gain is gated by interior, cues are throttled", async () => {
  sound.setEnabled(false); sound.routeChanged("/mars/explore"); sound.attachSurface();
  sound.setEnabled(true); await wait(10);
  const context = Context.instances[0];
  assert.equal(context.sources.length, 10);
  sound.setCrystalDistance(1);
  assert.equal(sound.soundscape.crystal.gain.value, 0);
  sound.setInterior(true);
  assert.equal(sound.soundscape.crystal.gain.value, 1);
  const targets = sound.soundscape.crystal.gain.targets.length;
  for (let i = 0; i < 100; i++) { sound.setInterior(true); sound.setCrystalDistance(1); }
  assert.equal(sound.soundscape.crystal.gain.targets.length, targets);
  assert.equal(context.sources.length, 10);
  sound.setCrystalDistance(9);
  assert.equal(sound.soundscape.crystal.gain.value, 0);
  sound.terminal("mission"); sound.terminal("mission"); sound.terminal("research");
  assert.equal(context.sources.length, 11);
  context.currentTime = 1.3; sound.terminal("research");
  assert.equal(context.sources.length, 12);
  sound.setEnabled(false);
  assert(context.sources.slice(0, 10).every(source => source.stopped === context.currentTime + 0.185), "Continuous native sources stop even if JS cleanup timers freeze");
  await wait(210);
  sound.terminal("research");
  assert.equal(context.sources.length, 12);
  assert(context.closed);
});

test("existing movement audio respects mute and catches rejected autoplay", async () => {
  marsAudio.setEnabled(false); await marsAudio.unlock();
  assert.equal(Context.instances.length, 0);
  marsAudio.setEnabled(true); Context.initialState = "suspended"; Context.resumeMode = "reject";
  await assert.doesNotReject(marsAudio.unlock());
});

test("invalid spatial samples and audio backend failures cannot crash scene or terminal handlers", async () => {
  sound.setEnabled(false); sound.routeChanged("/mars/explore"); sound.attachSurface(); sound.setEnabled(true);
  assert.doesNotThrow(() => sound.setCrystalDistance(NaN));
  assert.doesNotThrow(() => sound.setCrystalDistance(Infinity));
  sound.soundscape.setMix = () => { throw Error("audio backend unavailable"); };
  assert.doesNotThrow(() => sound.setInterior(true));
  assert(Context.instances[0].closed);
  sound.setEnabled(false); sound.setEnabled(true);
  sound.recordings.terminal = () => { throw Error("audio backend unavailable"); };
  assert.doesNotThrow(() => sound.terminal("mission"));
  assert(Context.instances[1].closed);
});

test("a failed sparse timer voice stops silently instead of throwing or retrying", () => {
  sound.setEnabled(false); sound.routeChanged("/mars/explore"); sound.attachSurface();
  const nativeTimer = globalThis.setTimeout;
  let sparseCallback;
  try {
    globalThis.setTimeout = callback => { sparseCallback = callback; return 0; };
    sound.setEnabled(true);
  } finally { globalThis.setTimeout = nativeTimer; }
  const context = Context.instances[0];
  context.createOscillator = () => { throw Error("backend unavailable"); };
  assert.doesNotThrow(sparseCallback);
  assert(context.closed);
  assert(context.sources.every(source => source.disconnected));
});

for (const kind of ["mission", "research", "upgrade", "command"]) {
  test(`approved ${kind} recording plays once per accepted cue, without generic oscillators`, async () => {
    sound.setEnabled(false); sound.routeChanged("/mars/explore"); sound.attachSurface(); sound.setEnabled(true);
    await wait(10);
    const context = Context.instances[0], recordings = sound.recordings, expected = await recordings.load(kind);
    const before = context.sources.length;
    sound.terminal(kind); sound.terminal(kind);
    assert.equal(context.sources.length, before + 1);
    const source = context.sources.at(-1);
    assert.equal(source.buffer, expected); assert.equal(source.loop, false);
    assert.equal(source.stopped, expected.duration);
    source.onended(); assert.equal(source.buffer, null); assert(source.disconnected);
    context.currentTime = 1.21; sound.terminal(kind);
    assert.equal(context.sources.length, before + 2);
    sound.setEnabled(false); await wait(210);
    assert.equal(context.sources.at(-1).buffer, null);
    for (const collection of [recordings.buffers, recordings.pending, recordings.active, recordings.timers]) assert.equal(collection.size, 0);
  });
}

test("V3 uses the full 6.35-second recording and hands off only at natural end", async () => {
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  const context = Context.instances[0], source = context.sources[0];
  assert.equal(source.buffer.duration, 6.35); assert.equal(source.stopped, 6.35);
  assert.equal(source.loop, false); assert.equal(context.sources.length, 1);
  source.onended(); assert.equal(source.buffer, null);
  assert.equal(context.sources.length, 11); assert(sound.soundscape);
});

test("missing recording skips arrival without replacement and preserves ambience", async () => {
  globalThis.fetch = async () => ({ ok: false });
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  assert.equal(Context.instances[0].sources.length, 10);
  assert(sound.soundscape); sound.terminal("mission");
  assert.equal(Context.instances[0].sources.length, 10);
});

test("navigation during pending asset fetch cannot start a late recording", async () => {
  const resolves = [];
  globalThis.fetch = () => new Promise(resolve => resolves.push(resolve));
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  const context = Context.instances[0]; sound.routeChanged("/mars"); await wait(80);
  const bytes = readFileSync("public/audio/ares-official-v3/BOBU_Ares_Futuristic_Crystal_Resonance_V3_6s.wav");
  for (const resolve of resolves) resolve({ ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  await wait(10); assert(context.closed); assert.equal(context.sources.length, 0);
});

test("pagehide during arrival releases its buffer and returns with ambience only", async () => {
  sound.routeChanged("/mars/explore"); sound.attachSurface(); await wait(10);
  const source = Context.instances[0].sources[0];
  window.dispatchEvent(new Event("pagehide")); assert.equal(source.buffer, null);
  gesture(); await wait(10);
  assert.equal(Context.instances[1].sources.length, 10);
});
