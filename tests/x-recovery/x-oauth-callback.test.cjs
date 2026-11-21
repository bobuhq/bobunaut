const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const callbackFile =
  "src/features/identity/services/xOAuthCallback.ts";
const hookFile =
  "src/features/identity/hooks/useXVerification.ts";
const pageFile =
  "src/features/identity/BuilderIdentity.tsx";

const callbackSource = fs.readFileSync(callbackFile, "utf8");
const hookSource = fs.readFileSync(hookFile, "utf8");
const pageSource = fs.readFileSync(pageFile, "utf8");

function createHarness({
  pending = true,
  ageMs = 0,
  sessionUser = "builder-1",
  linked = true,
  identityId = "new-auth-identity",
  providerId = "original-x-user",
  recovery = false,
} = {}) {
  const storage = new Map();
  const userId = "builder-1";

  if (pending) {
    storage.set(
      "bobu:oauth:x-link:v1",
      JSON.stringify({
        userId,
        startedAt: Date.now() - ageMs,
      })
    );
  }

  if (recovery) {
    storage.set(
      `bobu:oauth:x-recovery:v1:${userId}`,
      JSON.stringify({
        userId,
        identityId: "old-auth-identity",
        providerId: "original-x-user",
        startedAt: Date.now() - 20000,
      })
    );
  }

  const xIdentity = {
    provider: "x",
    user_id: userId,
    id: providerId,
    identity_id: identityId,
    created_at: new Date().toISOString(),
  };

  const user = {
    id: userId,
    identities: linked ? [xIdentity] : [],
  };

  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: sessionUser
            ? { user: { id: sessionUser } }
            : null,
        },
        error: null,
      }),
    },
  };

  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: key => {
      storage.delete(key);
    },
  };

  const js = ts.transpileModule(callbackSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;

  const exports = {};

  const context = {
    exports,
    localStorage,
    Date,
    JSON,
    Promise,
    Number,
    Error,
    setTimeout: fn => {
      fn();
      return 0;
    },
    require: specifier => {
      if (specifier.endsWith("/lib/supabase")) {
        return { supabase };
      }
      throw new Error(
        `Unexpected dependency: ${specifier}`
      );
    },
  };

  vm.runInNewContext(js, context, {
    filename: callbackFile,
    timeout: 5000,
  });

  return {
    api: exports,
    storage,
  };
}

test("normal X OAuth callback completes", async () => {
  const { api } = createHarness();

  await assert.doesNotReject(
    api.completeXOAuthCallback()
  );
});

test("valid original X relink completes", async () => {
  const { api } = createHarness({
    recovery: true,
  });

  await assert.doesNotReject(
    api.completeXOAuthCallback()
  );
});

test("missing OAuth initiation is rejected", async () => {
  const { api } = createHarness({
    pending: false,
  });

  await assert.rejects(
    api.completeXOAuthCallback(),
    /connection expired/
  );
});

test("expired OAuth initiation is rejected", async () => {
  const { api } = createHarness({
    ageMs: 11 * 60 * 1000,
  });

  await assert.rejects(
    api.completeXOAuthCallback(),
    /connection expired/
  );
});

test("changed BOBU account is rejected", async () => {
  const { api } = createHarness({
    sessionUser: "different-builder",
  });

  await assert.rejects(
    api.completeXOAuthCallback(),
    /account changed/
  );
});

test("missing X identity cannot complete", async () => {
  const { api } = createHarness({
    linked: false,
  });

  await assert.rejects(
    api.completeXOAuthCallback(),
    /linking did not complete/
  );
});

test("different X account is rejected on relink", async () => {
  const { api } = createHarness({
    recovery: true,
    providerId: "different-x-user",
  });

  await assert.rejects(
    api.completeXOAuthCallback(),
    /account does not match/
  );
});

test("unchanged old OAuth identity is rejected", async () => {
  const { api } = createHarness({
    recovery: true,
    identityId: "old-auth-identity",
  });

  await assert.rejects(
    api.completeXOAuthCallback(),
    /fresh_x_oauth_required/
  );
});

test("server verification precedes recovery cleanup", () => {
  const start = hookSource.indexOf(
    "const status = await refresh();",
    hookSource.indexOf("const verifyAndReward")
  );

  const proof = hookSource.indexOf(
    "if (!status?.serverVerified)",
    start
  );

  const cleanup = hookSource.indexOf(
    "await finishXRecovery(userId);",
    start
  );

  const finalCheck = hookSource.indexOf(
    "const confirmed = await refresh();",
    cleanup
  );

  const finalGuard = hookSource.indexOf(
    "if (!confirmed?.verified)",
    finalCheck
  );

  assert.ok(start >= 0);
  assert.ok(proof > start);
  assert.ok(cleanup > proof);
  assert.ok(finalCheck > cleanup);
  assert.ok(finalGuard > finalCheck);
});

test("no failed status can authorize GP or identity", () => {
  assert.match(
    hookSource,
    /serverVerified: linked && status\.verified/
  );

  assert.match(
    hookSource,
    /if \(!status\?\.serverVerified\)/
  );

  assert.match(
    hookSource,
    /if \(!confirmed\?\.verified\)/
  );

  assert.match(
    hookSource,
    /status\.serverStatus === "rewarded" && !status\.verified/
  );
});

test("temporary errors have a usable retry action", () => {
  assert.match(hookSource, /const canRetry =/);
  assert.match(pageSource, /xVerification\.canRetry/);
  assert.match(pageSource, /await xVerification\.refresh\(\)/);

  assert.match(
    pageSource,
    /!xVerification\.canConnect &&\s*!xVerification\.canRetry/
  );
});
