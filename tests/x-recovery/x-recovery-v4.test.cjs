const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const hook = fs.readFileSync(
  "src/features/identity/hooks/useXVerification.ts",
  "utf8"
);

test("only linked server-verified X can clear recovery", () => {
  assert.match(
    hook,
    /if \(recovery && linked && status\.verified\) \{\s*await finishXRecovery\(id\);/
  );
});

test("unverified or missing identity remains pending", () => {
  assert.match(
    hook,
    /recovery && !\(linked && status\.verified\)/
  );
});

test("final UI completion requires server proof", () => {
  assert.match(
    hook,
    /verified: linked && !recoveryPending && status\.verified/
  );
});

test("reward claim still requires server verification", () => {
  assert.match(
    hook,
    /if \(!status\?\.serverVerified\)/
  );

  assert.match(
    hook,
    /if \(!confirmed\?\.verified\)/
  );
});
