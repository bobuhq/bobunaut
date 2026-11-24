const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "src/features/identity/services/xOAuthCallback.ts",
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS
  }
}).outputText;

function harness({
  state = "old_identity",
  status = "pending",
  verified = false,
  alternate = true,
  replaceIdentity = false
} = {}) {
  const id = "test-builder";
  const storage = new Map();
  let calls = 0;
  let reads = 0;

  const user = {
    id,
    identities: [{
      provider: "x",
      user_id: id,
      id: "test-original-x",
      identity_id: "test-old-auth",
      created_at: "2026-11-01T00:00:00Z"
    }]
  };

  if (alternate) {
    user.identities.push({
      provider: "google",
      user_id: id,
      id: "test-google",
      identity_id: "test-google-auth"
    });
  }

  const supabase = {
    auth: {
      getUser: async () => {
        reads++;

        if (replaceIdentity && reads === 3) {
          user.identities = user.identities.map(item =>
            item.provider === "x"
              ? { ...item, identity_id: "test-fresh-auth" }
              : item
          );
        }

        return {
          data: { user: structuredClone(user) },
          error: null
        };
      },

      unlinkIdentity: async identity => {
        calls++;
        user.identities = user.identities.filter(
          item => item.identity_id !== identity.identity_id
        );
        return { error: null };
      }
    }
  };

  const exports = {};

  vm.runInNewContext(compiled, {
    exports,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    require: name => {
      if (name.endsWith("/lib/supabase")) {
        return { supabase };
      }

      if (name === "./xVerificationStatus") {
        return {
          readXVerification: async () => ({
            status,
            verified,
            pending: status === "pending" ||
              status === "relinked",
            recoveryState: state
          })
        };
      }

      throw new Error("Unexpected dependency: " + name);
    }
  });

  return {
    api: exports,
    id,
    calls: () => calls,
    storage
  };
}

async function blocked(options, confirmed = true) {
  const h = harness(options);

  await assert.rejects(
    h.api.prepareXReconnect(h.id, confirmed)
  );

  assert.equal(h.calls(), 0);
  assert.equal(h.storage.size, 0);
}

test("V6 security: confirmation required", async () => {
  await blocked({}, false);
});

test("V6 security: fresh identity protected", async () => {
  await blocked({ state: "fresh_identity" });
});

test("V6 security: unavailable server blocks unlink", async () => {
  await blocked({
    state: "unavailable",
    status: "unavailable"
  });
});

test("V6 security: alternative login required", async () => {
  await blocked({ alternate: false });
});

test("V6 security: different identity protected", async () => {
  await blocked({ state: "different_identity" });
});

test("V6 security: review required blocks unlink", async () => {
  await blocked({ state: "review_required" });
});

test("V6 security: rewarded identity protected", async () => {
  await blocked({
    status: "rewarded",
    verified: true
  });
});

test("V6 security: identity replacement blocks unlink", async () => {
  await blocked({ replaceIdentity: true });
});

test("V6 security: confirmed old identity unlinks once", async () => {
  const h = harness();

  await h.api.prepareXReconnect(h.id, true);

  assert.equal(h.calls(), 1);
  assert.equal(
    await h.api.requireXIdentity(h.id),
    false
  );
});

const edge = fs.readFileSync(
  "supabase/functions/x-verification-status/index.ts",
  "utf8"
);

const start = edge.indexOf(
  "// BOBU_X_RECOVERY_V6_RPC_GUARD"
);

const end = edge.indexOf(
  "const finalReset = await readReset();",
  start
);

assert.ok(start >= 0);
assert.ok(end > start);

const guard = ts.transpileModule(
  "(async () => {" +
  edge.slice(start, end) +
  "\nreturn recoveryState; })()",
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022
    }
  }
).outputText;

async function rpcGuard(state, response) {
  let calls = 0;

  const result = await vm.runInNewContext(guard, {
    recoveryState: state,
    id: "test-builder",
    reset: {
      old_provider_user_id: "test-original-x"
    },
    admin: {
      rpc: async (name, args) => {
        calls++;

        assert.equal(
          name,
          "verify_fresh_x_oauth_identity"
        );

        assert.equal(
          args.p_builder_id,
          "test-builder"
        );

        assert.equal(
          args.p_provider_user_id,
          "test-original-x"
        );

        return response;
      }
    },
    reply: (status, verified, id, code) => ({
      status, verified, code
    })
  });

  return { result, calls };
}

test("V6 RPC: valid proof accepted", async () => {
  const r = await rpcGuard("fresh_identity", {
    data: true,
    error: null
  });

  assert.equal(r.result, "fresh_identity");
  assert.equal(r.calls, 1);
});

test("V6 RPC: rejected proof blocked", async () => {
  const r = await rpcGuard("fresh_identity", {
    data: false,
    error: null
  });

  assert.equal(r.result, "review_required");
  assert.equal(r.calls, 1);
});

test("V6 RPC: null proof blocked", async () => {
  const r = await rpcGuard("fresh_identity", {
    data: null,
    error: null
  });

  assert.equal(r.result, "review_required");
});

test("V6 RPC: database error fails closed", async () => {
  const r = await rpcGuard("fresh_identity", {
    data: null,
    error: { message: "test error" }
  });

  assert.equal(r.result.status, "unavailable");
  assert.equal(r.result.verified, false);
  assert.equal(r.result.code, 503);
});

test("V6 RPC: old identity skips fresh proof", async () => {
  const r = await rpcGuard("old_identity", {
    data: true,
    error: null
  });

  assert.equal(r.result, "old_identity");
  assert.equal(r.calls, 0);
});
