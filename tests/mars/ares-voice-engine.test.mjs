import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const BASE =
  "../../src/core/mars/exploration/multiplayer/";

const BUILDER =
  "11111111-1111-4111-8111-111111111111";

const REMOTE =
  "22222222-2222-4222-8222-222222222222";

const GENERATION =
  "33333333-3333-4333-8333-333333333333";

const OTHER =
  "44444444-4444-4444-8444-444444444444";

function compile(name) {
  return ts.transpileModule(
    readFileSync(
      new URL(BASE + name, import.meta.url),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

const proximityCode =
  compile("AresVoiceProximity.ts");

const engineCode =
  compile("AresColonyVoiceEngine.ts");

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });

  return { promise, resolve, reject };
}

async function flush() {
  for (let i = 0; i < 30; i++) {
    await Promise.resolve();
  }
}

function environment(options = {}) {
  let now = 100000;
  let timerId = 0;
  let authorized = options.authorized ?? true;
  let tokenCalls = 0;
  let heartbeatCalls = 0;

  const timers = new Map();
  const elements = new Set();
  const rooms = [];

  class TestDate extends Date {
    static now() { return now; }
  }

  function setTimer(fn, ms) {
    const id = ++timerId;
    timers.set(id, { fn, ms });
    return id;
  }

  function clearTimer(id) {
    timers.delete(id);
  }

  const proximity = {};

  runInNewContext(proximityCode, {
    exports: proximity,
    Date: TestDate,
  });

  const events = {
    TrackSubscribed: "subscribed",
    TrackUnsubscribed: "unsubscribed",
    Disconnected: "disconnected",
  };

  class Room {
    constructor() {
      rooms.push(this);

      this.handlers = new Map();
      this.disconnectCalls = 0;
      this.microphoneCalls = [];

      this.activeSpeakers = [];
      this.remoteParticipants = new Map();
      this.canPlaybackAudio = true;

      this.localParticipant = {
        identity: options.identity ??
          `${BUILDER}:${GENERATION}`,

        isMicrophoneEnabled: false,

        setMicrophoneEnabled: async enabled => {
          this.microphoneCalls.push(enabled);

          if (enabled && options.microphoneError) {
            throw new Error("PERMISSION_DENIED");
          }

          if (enabled && options.microphoneGate) {
            await options.microphoneGate.promise;
          }

          this.localParticipant.isMicrophoneEnabled =
            enabled;
        },
      };
    }

    on(event, fn) {
      const list = this.handlers.get(event) ?? [];
      list.push(fn);
      this.handlers.set(event, list);
      return this;
    }

    emit(event, ...args) {
      for (const fn of this.handlers.get(event) ?? []) {
        fn(...args);
      }
    }

    async connect() {
      if (options.connectGate) {
        await options.connectGate.promise;
      }
    }

    async disconnect() {
      this.disconnectCalls++;
      this.localParticipant.isMicrophoneEnabled = false;
      this.emit(events.Disconnected);
    }

    async startAudio() {
      this.canPlaybackAudio = true;
    }
  }

  const backend = {
    functions: {
      async invoke(name, request) {
        tokenCalls++;

        assert.equal(
          name,
          "ares-colony-voice-token"
        );

        assert.equal(request.method, "POST");

        if (options.tokenGate) {
          await options.tokenGate.promise;
        }

        return {
          data: {
            url: "wss://voice.example.invalid",
            token: "LOCAL_TEST_TOKEN_ONLY",
            generationId: GENERATION,
            expiresIn: 60,
          },
          error: null,
        };
      },
    },

    rpc(name, args) {
      assert.equal(
        name,
        "ares_voice_heartbeat_v1"
      );

      assert.equal(
        args.p_generation_id,
        GENERATION
      );

      return {
        async abortSignal(signal) {
          heartbeatCalls++;

          if (options.heartbeatHang) {
            return new Promise(resolve => {
              signal.addEventListener(
                "abort",
                () => resolve({
                  data: false,
                  error: null,
                }),
                { once: true }
              );
            });
          }

          return {
            data: authorized,
            error: null,
          };
        },
      };
    },
  };

  const exports = {};

  runInNewContext(engineCode, {
    exports,

    require(name) {
      if (name === "./AresVoiceProximity") {
        return proximity;
      }

      if (name === "livekit-client") {
        return {
          Room,
          RoomEvent: events,
          Track: {
            Kind: { Audio: "audio" },
          },
        };
      }

      if (name.endsWith("/lib/supabase")) {
        return { supabase: backend };
      }

      throw new Error(
        "UNEXPECTED_TEST_IMPORT: " + name
      );
    },

    document: {
      body: {
        appendChild(element) {
          elements.add(element);
        },
      },
    },

    AbortController,
    Date: TestDate,
    setTimeout: setTimer,
    clearTimeout: clearTimer,
    console,
  });

  const engine =
    new exports.AresColonyVoiceEngine(backend);

  function positions(distance = 10, age = 0) {
    proximity.publishAresVoicePositions(
      BUILDER,
      { x: 0, y: 0, z: 0 },
      [{
        builderId: REMOTE,
        updatedAt: now - age,
        transform: {
          x: distance,
          y: 0,
          z: 0,
        },
      }]
    );
  }

  function track(kind = "audio") {
    return {
      kind,
      gain: 0,
      attaches: 0,
      detaches: 0,
      attached: new Set(),

      attach() {
        this.attaches++;

        const element = {
          muted: false,
          volume: 1,
          style: {},
          remove() {
            elements.delete(element);
          },
        };

        this.attached.add(element);

        return element;
      },

      detach(element) {
        this.detaches++;

        if (element) {
          this.attached.delete(element);
          return element;
        }

        const previous = [...this.attached];
        this.attached.clear();

        return previous;
      },

      setVolume(gain) {
        this.gain = gain;
      },
    };
  }

  function subscribe(
    room,
    audio,
    identity = `${REMOTE}:${GENERATION}`
  ) {
    room.emit(
      events.TrackSubscribed,
      audio,
      {},
      { identity }
    );
  }

  async function fireTimer(ms) {
    const item = [...timers.entries()]
      .find(([, timer]) => timer.ms === ms);

    assert.ok(item, `Missing timer: ${ms}`);

    timers.delete(item[0]);
    item[1].fn();

    await flush();
  }

  return {
    engine,
    proximity,
    rooms,
    events,
    timers,
    elements,
    positions,
    track,
    subscribe,
    fireTimer,
    setAuthorized(value) {
      authorized = value;
    },
    advance(ms) {
      now += ms;
    },
    counts() {
      return { tokenCalls, heartbeatCalls };
    },
  };
}

function near(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `Expected ${expected}; got ${actual}`
  );
}

// PROXIMITY CONTRACT

for (const [distance, expected] of [
  [0, 1],
  [10, 1],
  [20, 1],
  [25, 0.7],
  [30, 0.4],
  [40, 0.2],
  [50, 0],
  [100, 0],
]) {
  test(`proximity ${distance}m => ${expected}`, () => {
    const e = environment();

    near(
      e.proximity.aresVoiceGain(distance),
      expected
    );
  });
}

test("invalid distances are silent", () => {
  const e = environment();

  for (const value of [-1, NaN, Infinity]) {
    assert.equal(
      e.proximity.aresVoiceGain(value),
      0
    );
  }
});

test("unknown snapshot and wrong listener are silent", () => {
  const e = environment();

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    0
  );

  e.positions();

  assert.equal(
    e.proximity.getAresVoiceGain(OTHER, REMOTE),
    0
  );

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, OTHER),
    0
  );
});

test("listener snapshot expires at 1500ms", () => {
  const e = environment();

  e.positions();
  e.advance(1499);

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    1
  );

  e.advance(1);

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    0
  );
});

test("remote presence expires at 4000ms", () => {
  const e = environment();

  e.positions(10, 3999);

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    1
  );

  e.positions(10, 4000);

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    0
  );
});

test("only snapshot owner can clear positions", () => {
  const e = environment();

  e.positions();

  e.proximity.clearAresVoicePositions(OTHER);

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    1
  );

  e.proximity.clearAresVoicePositions(BUILDER);

  assert.equal(
    e.proximity.getAresVoiceGain(BUILDER, REMOTE),
    0
  );
});

// CONNECTION AND AUTHORIZATION

test("join authorizes without opening microphone", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  assert.equal(e.engine.isConnected, true);
  assert.equal(e.engine.microphoneEnabled, false);
  assert.equal(e.rooms[0].microphoneCalls.length, 0);
  assert.equal(e.counts().tokenCalls, 1);
  assert.equal(e.counts().heartbeatCalls, 1);

  await e.engine.leave();
});

test("missing access token never connects", async () => {
  const e = environment();

  await assert.rejects(e.engine.join(""));

  assert.equal(e.counts().tokenCalls, 0);
  assert.equal(e.engine.isConnected, false);
});

test("initial authorization rejection fails closed", async () => {
  const e = environment({ authorized: false });

  await assert.rejects(
    e.engine.join("LOCAL_ACCESS"),
    /VOICE_AUTHORIZATION_LOST/
  );

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.timers.size, 0);
  assert.ok(e.rooms[0].disconnectCalls > 0);
});

test("invalid participant identity cannot connect", async () => {
  const e = environment({ identity: "invalid" });

  await assert.rejects(
    e.engine.join("LOCAL_ACCESS"),
    /VOICE_IDENTITY_MISMATCH/
  );

  assert.equal(e.engine.isConnected, false);
});

test("duplicate join is blocked", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  await assert.rejects(
    e.engine.join("LOCAL_ACCESS"),
    /VOICE_ALREADY_CONNECTED/
  );

  assert.equal(e.counts().tokenCalls, 1);

  await e.engine.leave();
});

test("heartbeat loss disconnects and closes microphone", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  await e.engine.setMicrophoneEnabled(true);

  assert.equal(e.engine.microphoneEnabled, true);

  e.setAuthorized(false);

  await e.fireTimer(30000);

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.engine.microphoneEnabled, false);

  assert.equal(
    e.engine.connectionError,
    "VOICE_AUTHORIZATION_LOST"
  );

  assert.equal(e.timers.size, 0);
});

test("initial heartbeat timeout fails closed", async () => {
  const e = environment({ heartbeatHang: true });

  const joining = e.engine.join("LOCAL_ACCESS");

  const rejected = assert.rejects(
    joining,
    /VOICE_AUTHORIZATION_LOST/
  );

  await flush();
  await e.fireTimer(10000);
  await rejected;

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.timers.size, 0);
});

test("leaving during token request prevents stale connection", async () => {
  const gate = deferred();

  const e = environment({ tokenGate: gate });

  const joining = e.engine.join("LOCAL_ACCESS");

  await flush();
  await e.engine.leave();

  gate.resolve();
  await joining;

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.counts().heartbeatCalls, 0);
  assert.equal(e.timers.size, 0);
});

test("leaving during SDK connect prevents stale connection", async () => {
  const gate = deferred();

  const e = environment({ connectGate: gate });

  const joining = e.engine.join("LOCAL_ACCESS");

  await flush();
  await e.engine.leave();

  gate.resolve();
  await joining;

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.counts().heartbeatCalls, 0);
  assert.equal(e.timers.size, 0);
});

// MICROPHONE CONTRACT

test("microphone requires authorized connection", async () => {
  const e = environment();

  await assert.rejects(
    e.engine.setMicrophoneEnabled(true),
    /VOICE_NOT_AUTHORIZED/
  );

  assert.equal(e.rooms.length, 0);
});

test("microphone permission rejection does not publish", async () => {
  const e = environment({
    microphoneError: true,
  });

  await e.engine.join("LOCAL_ACCESS");

  await assert.rejects(
    e.engine.setMicrophoneEnabled(true),
    /PERMISSION_DENIED/
  );

  assert.equal(e.engine.microphoneEnabled, false);

  await e.engine.leave();
});

test("delayed microphone completion cannot survive leave", async () => {
  const gate = deferred();

  const e = environment({
    microphoneGate: gate,
  });

  await e.engine.join("LOCAL_ACCESS");

  const enabling =
    e.engine.setMicrophoneEnabled(true);

  const rejected = assert.rejects(
    enabling,
    /VOICE_CONNECTION_CANCELLED/
  );

  await flush();
  await e.engine.leave();

  gate.resolve();
  await rejected;

  assert.equal(e.engine.isConnected, false);

  assert.equal(
    e.rooms[0].localParticipant.isMicrophoneEnabled,
    false
  );
});

// REMOTE AUDIO CONTRACT

test("remote gain follows distance and individual mute", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  e.positions(25);

  const track = e.track();

  e.subscribe(e.rooms[0], track);

  near(track.gain, 0.7);

  e.engine.setBuilderMuted(REMOTE, true);

  assert.equal(track.gain, 0);

  e.engine.setBuilderMuted(REMOTE, false);

  near(track.gain, 0.7);

  e.positions(50);

  e.engine.refreshProximityAudio();

  assert.equal(track.gain, 0);

  await e.engine.leave();

  assert.equal(e.elements.size, 0);
});

test("untrusted identities and video tracks are ignored", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  e.subscribe(
    e.rooms[0],
    e.track(),
    "invalid"
  );

  e.subscribe(e.rooms[0], e.track("video"));

  assert.equal(e.elements.size, 0);

  await e.engine.leave();
});

test("unsubscribe removes remote audio", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  e.positions();

  const track = e.track();

  e.subscribe(e.rooms[0], track);

  assert.equal(e.elements.size, 1);

  e.rooms[0].emit(
    e.events.TrackUnsubscribed,
    track
  );

  assert.equal(e.elements.size, 0);

  await e.engine.leave();
});

test("old room events cannot attach audio after leave", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  const oldRoom = e.rooms[0];

  await e.engine.leave();
  await e.engine.join("LOCAL_ACCESS");

  e.subscribe(oldRoom, e.track());

  assert.equal(e.elements.size, 0);

  oldRoom.emit(e.events.Disconnected);

  assert.equal(e.engine.isConnected, true);

  await e.engine.leave();
});

// TARGETED REGRESSION PROBES

test("duplicate TrackSubscribed must not leak audio elements", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  e.positions();

  const track = e.track();

  e.subscribe(e.rooms[0], track);
  e.subscribe(e.rooms[0], track);

  const countDuringConnection = e.elements.size;

  await e.engine.leave();

  assert.equal(
    countDuringConnection,
    1,
    "One track must have only one audio element"
  );

  assert.equal(
    e.elements.size,
    0,
    "No orphan audio elements after leave"
  );
});

test("disconnect during pending connect cannot authorize stale room", async () => {
  const gate = deferred();

  const e = environment({
    connectGate: gate,
  });

  const joining = e.engine.join("LOCAL_ACCESS");

  await flush();

  const room = e.rooms[0];

  room.emit(e.events.Disconnected);

  gate.resolve();

  await joining.catch(() => undefined);

  const connected = e.engine.isConnected;
  const heartbeatCalls = e.counts().heartbeatCalls;

  await e.engine.leave();

  assert.equal(
    connected,
    false,
    "Disconnected pending room must stay unauthorized"
  );

  assert.equal(heartbeatCalls, 0);
});

// V27.4-F ADDITIONAL REGRESSIONS

test("stale unsubscribe cannot remove current room audio", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  const oldRoom = e.rooms[0];
  const audio = e.track();

  e.positions();
  e.subscribe(oldRoom, audio);

  await e.engine.leave();
  await e.engine.join("LOCAL_ACCESS");

  const currentRoom = e.rooms[1];

  e.positions();
  e.subscribe(currentRoom, audio);

  assert.equal(e.elements.size, 1);

  oldRoom.emit(
    e.events.TrackUnsubscribed,
    audio
  );

  assert.equal(e.elements.size, 1);
  assert.equal(e.engine.isConnected, true);
  assert.equal(audio.gain, 1);

  currentRoom.emit(
    e.events.TrackUnsubscribed,
    audio
  );

  assert.equal(e.elements.size, 0);

  await e.engine.leave();
});

test("remote audio stays silent before initial authorization", async () => {
  const gate = deferred();

  const e = environment({
    connectGate: gate,
  });

  const joining = e.engine.join("LOCAL_ACCESS");

  await flush();

  e.positions();

  const audio = e.track();

  e.subscribe(e.rooms[0], audio);

  assert.equal(e.engine.isConnected, false);
  assert.equal(audio.gain, 0);

  gate.resolve();

  await joining;

  assert.equal(e.engine.isConnected, true);
  assert.equal(audio.gain, 1);

  await e.engine.leave();

  assert.equal(e.elements.size, 0);
});

test("pending room disconnect clears attached audio", async () => {
  const gate = deferred();

  const e = environment({
    connectGate: gate,
  });

  const joining = e.engine.join("LOCAL_ACCESS");

  await flush();

  const room = e.rooms[0];

  e.positions();
  e.subscribe(room, e.track());

  assert.equal(e.elements.size, 1);

  room.emit(e.events.Disconnected);

  assert.equal(e.elements.size, 0);
  assert.equal(e.engine.isConnected, false);

  gate.resolve();

  await joining;

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.counts().heartbeatCalls, 0);

  await e.engine.leave();
});

test("old microphone completion cannot close a newer room", async () => {
  const gate = deferred();

  const e = environment({
    microphoneGate: gate,
  });

  await e.engine.join("LOCAL_ACCESS");

  const oldRoom = e.rooms[0];

  const enabling =
    e.engine.setMicrophoneEnabled(true);

  const cancelled = assert.rejects(
    enabling,
    /VOICE_CONNECTION_CANCELLED/
  );

  await flush();
  await e.engine.leave();

  await e.engine.join("LOCAL_ACCESS");

  const newRoom = e.rooms[1];

  gate.resolve();

  await cancelled;

  assert.equal(
    oldRoom.localParticipant.isMicrophoneEnabled,
    false
  );

  assert.equal(e.engine.isConnected, true);
  assert.equal(newRoom.disconnectCalls, 0);
  assert.equal(e.engine.microphoneEnabled, false);

  await e.engine.leave();
});

test("repeated leave is safe and clears heartbeat timers", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  e.positions();
  e.subscribe(e.rooms[0], e.track());

  await e.engine.setMicrophoneEnabled(true);

  await e.engine.leave();
  await e.engine.leave();
  await e.engine.leave();

  assert.equal(e.engine.isConnected, false);
  assert.equal(e.engine.microphoneEnabled, false);
  assert.equal(e.elements.size, 0);
  assert.equal(e.timers.size, 0);
});

test("expired positions silence existing connected audio", async () => {
  const e = environment();

  await e.engine.join("LOCAL_ACCESS");

  e.positions(10);

  const audio = e.track();

  e.subscribe(e.rooms[0], audio);

  assert.equal(audio.gain, 1);

  e.advance(1500);

  e.engine.refreshProximityAudio();

  assert.equal(audio.gain, 0);

  e.positions(10);

  e.engine.refreshProximityAudio();

  assert.equal(audio.gain, 1);

  await e.engine.leave();
});
