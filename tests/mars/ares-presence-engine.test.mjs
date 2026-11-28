import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL(
    "../../src/core/mars/exploration/multiplayer/AresPresenceEngine.ts",
    import.meta.url
  ),
  "utf8"
);

const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const LOCAL =
  "11111111-1111-4111-8111-111111111111";

const REMOTE =
  "22222222-2222-4222-8222-222222222222";

const OTHER =
  "33333333-3333-4333-8333-333333333333";

function deferred() {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return { promise, resolve };
}

async function flush() {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function environment(options = {}) {
  let now = 100000;
  let timerId = 0;
  let response = "ok";
  let sendGate = null;

  const channels = [];
  const removed = [];
  const sent = [];
  const timers = new Map();

  class TestDate extends Date {
    static now() {
      return now;
    }
  }

  const supabase = {
    channel(name, config) {
      const channel = {
        name,
        config,
        receiver: null,
        subscriber: null,

        on(type, filter, callback) {
          assert.equal(type, "broadcast");
          assert.equal(filter.event, "player_state");
          this.receiver = callback;
          return this;
        },

        subscribe(callback) {
          this.subscriber = callback;

          if (!options.manualSubscribe) {
            callback("SUBSCRIBED");
          }

          return this;
        },

        async send(message) {
          sent.push(structuredClone(message));

          if (sendGate) {
            await sendGate.promise;
          }

          return response;
        },

        receive(payload) {
          this.receiver({ payload });
        },

        status(value) {
          this.subscriber(value);
        },
      };

      channels.push(channel);
      return channel;
    },

    async removeChannel(channel) {
      removed.push(channel);
      return "ok";
    },
  };

  const exports = {};

  runInNewContext(code, {
    exports,
    Date: TestDate,
    console,

    window: {
      setTimeout(fn, ms) {
        const id = ++timerId;
        timers.set(id, { fn, ms });
        return id;
      },

      clearTimeout(id) {
        timers.delete(id);
      },
    },

    require(name) {
      if (name === "three") {
        return {
          MathUtils: {
            euclideanModulo(n, m) {
              return ((n % m) + m) % m;
            },
          },
        };
      }

      if (name.endsWith("/lib/supabase")) {
        return { supabase };
      }

      throw new Error("UNEXPECTED_IMPORT: " + name);
    },
  });

  const engine = new exports.AresPresenceEngine();

  return {
    engine,
    channels,
    removed,
    sent,
    timers,

    advance(ms) {
      now += ms;
    },

    setResponse(value) {
      response = value;
    },

    setSendGate(value) {
      sendGate = value;
    },

    fireTimeout() {
      const entry = [...timers.entries()]
        .find(([, timer]) => timer.ms === 10000);

      assert.ok(entry, "Connection timeout missing");

      timers.delete(entry[0]);
      entry[1].fn();
    },

    payload(overrides = {}) {
      return {
        builderId: REMOTE,
        displayName: "Remote Builder",
        sector: "ares",
        x: 10,
        y: 0,
        z: 20,
        rotationY: 0,
        updatedAt: now,
        attack: null,
        parkedShip: null,
        ...overrides,
      };
    },
  };
}

function transform(overrides = {}) {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    attack: null,
    parkedShip: null,
    ...overrides,
  };
}

async function connected(options) {
  const e = environment(options);
  await e.engine.connect(LOCAL, "Local Builder");
  return e;
}

// EXISTING BEHAVIOR CONTRACT

test("connect uses existing ARES broadcast channel", async () => {
  const e = await connected();

  assert.equal(
    e.channels[0].name,
    "mars:explore:ares:v1"
  );

  assert.equal(
    e.channels[0].config.config.broadcast.self,
    false
  );

  assert.equal(
    e.channels[0].config.config.broadcast.ack,
    true
  );

  await e.engine.disconnect();
});

test("empty builder identity is rejected", async () => {
  const e = environment();

  await assert.rejects(e.engine.connect(" "));

  assert.equal(e.channels.length, 0);
});

test("disconnected engine cannot broadcast", async () => {
  const e = environment();

  await e.engine.updateTransform(transform(), true);

  assert.equal(e.sent.length, 0);
});

test("first transform publishes existing payload", async () => {
  const e = await connected();

  await e.engine.updateTransform(
    transform({ x: 12 }),
    true
  );

  assert.equal(e.sent.length, 1);
  assert.equal(e.sent[0].event, "player_state");
  assert.equal(e.sent[0].payload.builderId, LOCAL);
  assert.equal(e.sent[0].payload.sector, "ares");
  assert.equal(e.sent[0].payload.x, 12);

  await e.engine.disconnect();
});

test("movement retains 125ms send interval", async () => {
  const e = await connected();

  await e.engine.updateTransform(transform(), true);

  e.advance(124);

  await e.engine.updateTransform(transform({ x: 1 }));

  assert.equal(e.sent.length, 1);

  e.advance(1);

  await e.engine.updateTransform(transform({ x: 1 }));

  assert.equal(e.sent.length, 2);

  await e.engine.disconnect();
});

test("position epsilon suppresses tiny movement", async () => {
  const e = await connected();

  await e.engine.updateTransform(transform(), true);

  e.advance(125);

  await e.engine.updateTransform(
    transform({ x: 0.01 })
  );

  assert.equal(e.sent.length, 1);

  await e.engine.updateTransform(
    transform({ x: 0.03 })
  );

  assert.equal(e.sent.length, 2);

  await e.engine.disconnect();
});

test("forced heartbeat refreshes stationary player", async () => {
  const e = await connected();

  await e.engine.updateTransform(transform(), true);

  e.advance(1000);

  await e.engine.updateTransform(transform(), true);

  assert.equal(e.sent.length, 2);

  await e.engine.disconnect();
});

test("rotation wrap does not create false movement", async () => {
  const e = await connected();

  await e.engine.updateTransform(
    transform({ rotationY: Math.PI - 0.002 }),
    true
  );

  e.advance(125);

  await e.engine.updateTransform(
    transform({ rotationY: -Math.PI + 0.002 })
  );

  assert.equal(e.sent.length, 1);

  await e.engine.disconnect();
});

test("valid remote transform is published", async () => {
  const e = await connected();

  let latest = [];

  const unsubscribe = e.engine.subscribe(
    builders => { latest = builders; }
  );

  e.channels[0].receive(e.payload());

  assert.equal(latest.length, 1);
  assert.equal(latest[0].builderId, REMOTE);
  assert.equal(latest[0].transform.x, 10);

  unsubscribe();

  await e.engine.disconnect();
});

test("self and invalid sector broadcasts are ignored", async () => {
  const e = await connected();

  e.channels[0].receive(
    e.payload({ builderId: LOCAL })
  );

  e.channels[0].receive(
    e.payload({ sector: "hellas" })
  );

  e.channels[0].receive(
    e.payload({ x: Infinity })
  );

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  await e.engine.disconnect();
});

test("punch and spin state remain synchronized", async () => {
  const e = await connected();

  for (const kind of ["punch", "spin"]) {
    e.advance(125);

    await e.engine.updateTransform(
      transform({
        attack: {
          id: "attack-" + kind,
          kind,
        },
      })
    );
  }

  assert.equal(e.sent.length, 2);

  assert.equal(
    e.sent[0].payload.attack.kind,
    "punch"
  );

  assert.equal(
    e.sent[1].payload.attack.kind,
    "spin"
  );

  await e.engine.disconnect();
});

test("remote attack validation rejects unknown action", async () => {
  const e = await connected();

  e.channels[0].receive(
    e.payload({
      attack: { id: "invalid", kind: "unknown" },
    })
  );

  assert.equal(
    e.engine.getRemoteBuilders()[0].transform.attack,
    null
  );

  await e.engine.disconnect();
});

test("parked spacecraft transform is preserved", async () => {
  const e = await connected();

  e.channels[0].receive(
    e.payload({
      parkedShip: {
        position: [12, 2, 18],
        yaw: 1.2,
      },
    })
  );

  const ship =
    e.engine.getRemoteBuilders()[0]
      .transform.parkedShip;

  assert.equal(ship.position[0], 12);
  assert.equal(ship.position[1], 2);
  assert.equal(ship.position[2], 18);
  assert.equal(ship.yaw, 1.2);

  await e.engine.disconnect();
});

test("invalid spacecraft coordinates are rejected", async () => {
  const e = await connected();

  e.channels[0].receive(
    e.payload({
      parkedShip: {
        position: [Infinity, 0, 0],
        yaw: 0,
      },
    })
  );

  assert.equal(
    e.engine.getRemoteBuilders()[0]
      .transform.parkedShip,
    null
  );

  await e.engine.disconnect();
});

test("remote player expires exactly at 4000ms", async () => {
  const e = await connected();

  e.channels[0].receive(e.payload());

  e.advance(3999);

  e.engine.pruneStaleBuilders(4000);

  assert.equal(
    e.engine.getRemoteBuilders().length,
    1
  );

  e.advance(1);

  e.engine.pruneStaleBuilders(4000);

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  await e.engine.disconnect();
});

test("disconnect removes channel and remote players", async () => {
  const e = await connected();

  e.channels[0].receive(e.payload());

  await e.engine.disconnect();

  assert.equal(e.removed.length, 1);
  assert.equal(e.engine.getRemoteBuilders().length, 0);

  await e.engine.updateTransform(transform(), true);

  assert.equal(e.sent.length, 0);
});

// TARGETED REGRESSION PROBES

test("old channel cannot restore players after disconnect", async () => {
  const e = await connected();
  const old = e.channels[0];

  await e.engine.disconnect();

  old.receive(e.payload());

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );
});

test("old channel cannot inject players into new connection", async () => {
  const e = await connected();
  const old = e.channels[0];

  await e.engine.disconnect();
  await e.engine.connect(LOCAL);

  old.receive(e.payload());

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  await e.engine.disconnect();
});

test("older remote packet cannot overwrite newer transform", async () => {
  const e = await connected();

  e.channels[0].receive(
    e.payload({ x: 50, updatedAt: 100000 })
  );

  e.advance(125);

  e.channels[0].receive(
    e.payload({ x: 10, updatedAt: 99900 })
  );

  const actual =
    e.engine.getRemoteBuilders()[0].transform.x;

  await e.engine.disconnect();

  assert.equal(actual, 50);
});

test("duplicate packet does not refresh remote freshness", async () => {
  const e = await connected();

  const packet = e.payload();

  e.channels[0].receive(packet);

  e.advance(3000);

  e.channels[0].receive(packet);

  e.advance(1000);

  e.engine.pruneStaleBuilders(4000);

  const count =
    e.engine.getRemoteBuilders().length;

  await e.engine.disconnect();

  assert.equal(count, 0);
});

test("failed broadcast is eligible for retry", async () => {
  const e = await connected();

  e.setResponse("error");

  await e.engine.updateTransform(
    transform({ x: 10 }),
    true
  );

  e.setResponse("ok");
  e.advance(125);

  await e.engine.updateTransform(
    transform({ x: 10 })
  );

  const count = e.sent.length;

  await e.engine.disconnect();

  assert.equal(count, 2);
});

test("heartbeat cannot overlap an in-flight movement send", async () => {
  const e = await connected();

  const gate = deferred();

  e.setSendGate(gate);

  const movement = e.engine.updateTransform(
    transform({ x: 1 })
  );

  await flush();

  e.advance(1000);

  const heartbeat = e.engine.updateTransform(
    transform({ x: 2 }),
    true
  );

  await flush();

  const overlapping = e.sent.length;

  gate.resolve();

  await Promise.allSettled([
    movement,
    heartbeat,
  ]);

  await e.engine.disconnect();

  assert.equal(overlapping, 1);
});

test("closed channel cannot publish new transforms", async () => {
  const e = await connected();

  e.channels[0].status("CLOSED");

  await e.engine.updateTransform(transform(), true);

  const count = e.sent.length;

  await e.engine.disconnect();

  assert.equal(count, 0);
});

test("channel error clears connected remote state", async () => {
  const e = await connected();

  e.channels[0].receive(e.payload());

  e.channels[0].status("CHANNEL_ERROR");

  await flush();

  const count =
    e.engine.getRemoteBuilders().length;

  await e.engine.disconnect();

  assert.equal(count, 0);
});

test("late acknowledgement cannot change new connection send state", async () => {
  const e = await connected();

  const gate = deferred();

  e.setSendGate(gate);

  const oldSend = e.engine.updateTransform(
    transform({ x: 99 }),
    true
  );

  await flush();

  await e.engine.disconnect();
  await e.engine.connect(LOCAL);

  gate.resolve();
  await oldSend;

  e.setSendGate(null);
  e.advance(125);

  await e.engine.updateTransform(
    transform({ x: 99 })
  );

  const count = e.sent.length;

  await e.engine.disconnect();

  assert.equal(count, 2);
});

test("late subscribed event cannot authorize obsolete channel", async () => {
  const e = environment({
    manualSubscribe: true,
  });

  const oldConnection = e.engine.connect(LOCAL)
    .catch(() => undefined);

  await flush();

  const old = e.channels[0];

  await e.engine.disconnect();

  const newConnection = e.engine.connect(OTHER)
    .catch(() => undefined);

  await flush();

  const current = e.channels[1];

  old.status("SUBSCRIBED");

  await e.engine.updateTransform(transform(), true);

  const premature = e.sent.length;

  current.status("SUBSCRIBED");

  await Promise.allSettled([
    oldConnection,
    newConnection,
  ]);

  await e.engine.disconnect();

  assert.equal(premature, 0);
});

test("connection timeout removes failed channel", async () => {
  const e = environment({
    manualSubscribe: true,
  });

  const joining = e.engine.connect(LOCAL);

  const rejected = assert.rejects(joining);

  e.fireTimeout();

  await rejected;

  const removed = e.removed.length;

  await e.engine.disconnect();

  assert.equal(removed, 1);
});

// V27.5-E RECONNECTION REGRESSIONS

test("transient channel error blocks traffic until resubscribed", async () => {
  const e = await connected();

  const channel = e.channels[0];

  channel.receive(e.payload());

  channel.status("CHANNEL_ERROR");

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  channel.receive(e.payload());

  await e.engine.updateTransform(
    transform({ x: 10 }),
    true
  );

  assert.equal(e.sent.length, 0);

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  channel.status("SUBSCRIBED");

  e.advance(125);

  await e.engine.updateTransform(
    transform({ x: 10 }),
    true
  );

  assert.equal(e.sent.length, 1);
  assert.equal(e.channels.length, 1);

  channel.receive(e.payload());

  assert.equal(
    e.engine.getRemoteBuilders().length,
    1
  );

  await e.engine.disconnect();
});

test("pre-reconnect acknowledgement cannot suppress fresh transform", async () => {
  const e = await connected();

  const gate = deferred();

  e.setSendGate(gate);

  const oldSend = e.engine.updateTransform(
    transform({ x: 99 }),
    true
  );

  await flush();

  e.channels[0].status("CHANNEL_ERROR");
  e.channels[0].status("SUBSCRIBED");

  gate.resolve();

  await oldSend;

  e.setSendGate(null);
  e.advance(125);

  await e.engine.updateTransform(
    transform({ x: 99 })
  );

  const count = e.sent.length;

  await e.engine.disconnect();

  assert.equal(
    count,
    2,
    "Fresh connection must publish independently of obsolete acknowledgement"
  );
});

test("concurrent reconnect requests retain only newest lifecycle", async () => {
  const e = await connected();

  const first = e.engine.connect(OTHER)
    .then(() => true, () => false);

  const second = e.engine.connect(LOCAL)
    .then(() => true, () => false);

  const results = await Promise.all([
    first,
    second,
  ]);

  assert.equal(results[0], false);
  assert.equal(results[1], true);

  assert.equal(e.channels.length, 2);
  assert.equal(e.removed.length, 1);

  await e.engine.updateTransform(
    transform({ x: 50 }),
    true
  );

  assert.equal(e.sent.length, 1);

  assert.equal(
    e.sent[0].payload.builderId,
    LOCAL
  );

  await e.engine.disconnect();

  assert.equal(e.removed.length, 2);
});

test("disconnect during pending subscription cancels timers", async () => {
  const e = environment({
    manualSubscribe: true,
  });

  const joining = e.engine.connect(LOCAL);

  const rejected = assert.rejects(joining);

  await flush();

  assert.equal(e.timers.size, 1);

  await e.engine.disconnect();

  await rejected;

  assert.equal(e.timers.size, 0);
  assert.equal(e.removed.length, 1);

  e.channels[0].status("SUBSCRIBED");

  await e.engine.updateTransform(
    transform(),
    true
  );

  assert.equal(e.sent.length, 0);
});

test("repeated disconnect removes each channel only once", async () => {
  const e = await connected();

  await Promise.all([
    e.engine.disconnect(),
    e.engine.disconnect(),
    e.engine.disconnect(),
  ]);

  assert.equal(e.removed.length, 1);

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  assert.equal(e.timers.size, 0);
});

test("remote clock rollback recovers after presence expiry", async () => {
  const e = await connected();

  const channel = e.channels[0];

  channel.receive(
    e.payload({
      updatedAt: 900000,
      x: 10,
    })
  );

  e.advance(125);

  channel.receive(
    e.payload({
      updatedAt: 100000,
      x: 50,
    })
  );

  assert.equal(
    e.engine.getRemoteBuilders()[0].transform.x,
    10
  );

  e.advance(3875);

  e.engine.pruneStaleBuilders(4000);

  assert.equal(
    e.engine.getRemoteBuilders().length,
    0
  );

  channel.receive(
    e.payload({
      updatedAt: 104000,
      x: 50,
    })
  );

  assert.equal(
    e.engine.getRemoteBuilders()[0].transform.x,
    50
  );

  await e.engine.disconnect();
});

test("sender clock rollback does not indefinitely block local movement", async () => {
  const e = await connected();

  await e.engine.updateTransform(
    transform({ x: 10 }),
    true
  );

  e.advance(-10000);

  await e.engine.updateTransform(
    transform({ x: 20 })
  );

  const count = e.sent.length;

  await e.engine.disconnect();

  assert.equal(
    count,
    2,
    "Local clock rollback must not indefinitely suppress movement"
  );
});
