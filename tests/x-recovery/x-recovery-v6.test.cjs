const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "supabase/functions/x-verification-status/index.ts",
  "utf8"
);

const start = source.indexOf(
  "// BOBU X RECOVERY V6: read-only classification."
);

const end = source.indexOf(
  "// BOBU_X_RECOVERY_V6_RPC_GUARD",
  start
);

assert.ok(start >= 0);
assert.ok(end > start);

const code = ts.transpileModule(
  source.slice(start, end) + "\nresult = recoveryState;",
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022
    }
  }
).outputText;

const reset = {
  old_provider_user_id: "test-original-x",
  old_auth_identity_id: "test-old-auth",
  reset_at: "2026-11-01T00:00:00Z"
};

const fresh = {
  provider: "x",
  user_id: "test-builder",
  id: "test-original-x",
  identity_id: "test-new-auth",
  identity_data: { sub: "test-original-x" },
  created_at: "2026-11-02T00:00:00Z"
};

function classify(identities, overrides = {}) {
  const context = {
    user: { identities },
    id: "test-builder",
    reset: { ...reset, ...overrides },
    result: null
  };

  vm.runInNewContext(code, context, {
    timeout: 1000
  });

  return context.result;
}

test("V6: missing identity", () => {
  assert.equal(classify([]), "missing_identity");
});

test("V6: original old identity", () => {
  assert.equal(
    classify([{
      ...fresh,
      identity_id: "test-old-auth"
    }]),
    "old_identity"
  );
});

test("V6: identity created before reset", () => {
  assert.equal(
    classify([{
      ...fresh,
      created_at: "2026-10-31T00:00:00Z"
    }]),
    "old_identity"
  );
});

test("V6: valid fresh original identity", () => {
  assert.equal(classify([fresh]), "fresh_identity");
});

test("V6: different X account", () => {
  assert.equal(
    classify([{
      ...fresh,
      id: "test-different-x",
      identity_data: { sub: "test-different-x" }
    }]),
    "different_identity"
  );
});

test("V6: mismatched subject", () => {
  assert.equal(
    classify([{
      ...fresh,
      identity_data: { sub: "test-invalid" }
    }]),
    "review_required"
  );
});

test("V6: missing subject cannot be fresh", () => {
  assert.equal(
    classify([{ ...fresh, identity_data: {} }]),
    "review_required"
  );
});

test("V6: malformed timestamp", () => {
  assert.equal(
    classify([{ ...fresh, created_at: "invalid" }]),
    "review_required"
  );
});

test("V6: malformed reset timestamp", () => {
  assert.equal(
    classify([fresh], { reset_at: "invalid" }),
    "review_required"
  );
});

test("V6: multiple X identities fail closed", () => {
  assert.equal(
    classify([fresh, { ...fresh }]),
    "review_required"
  );
});

test("V6: another builder identity requires review", () => {
  assert.equal(
    classify([{
      ...fresh,
      user_id: "test-other-builder"
    }]),
    "review_required"
  );
});

test("V6: Google is not an X identity", () => {
  assert.equal(
    classify([{ ...fresh, provider: "google" }]),
    "missing_identity"
  );
});

test("V6: classification never grants verification", () => {
  assert.match(
    source,
    /return reply\(reset\.status, false, id, 200, recoveryState\)/
  );
});

test("V6: classification contains no mutation", () => {
  assert.doesNotMatch(
    source.slice(start, end),
    /\.(insert|update|delete|upsert|unlinkIdentity)\s*\(/
  );
});


test("V6: absent identity list requires review", () => {
  assert.equal(classify(undefined), "review_required");
});

test("V6: null identity list requires review", () => {
  assert.equal(classify(null), "review_required");
});

test("V6: malformed identity list requires review", () => {
  assert.equal(classify({}), "review_required");
});

test("V6: malformed reset blocks empty identity list", () => {
  assert.equal(
    classify([], { reset_at: "invalid" }),
    "review_required"
  );
});

test("V6: missing original provider blocks recovery", () => {
  assert.equal(
    classify([], { old_provider_user_id: null }),
    "review_required"
  );
});

test("V6: mixed ownership requires review", () => {
  assert.equal(
    classify([
      fresh,
      { ...fresh, user_id: "test-other-builder" }
    ]),
    "review_required"
  );
});

test("V6: malformed identity entry requires review", () => {
  assert.equal(classify([null]), "review_required");
});
