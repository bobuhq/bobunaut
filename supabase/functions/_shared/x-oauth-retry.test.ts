import { withXClockSkewRetry } from "./x-oauth-retry.ts";
function assert(value: unknown) { if (!value) throw new Error("Assertion failed"); }
Deno.test("clock skew retries are bounded and keep the original operation", async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await withXClockSkewRetry(async () => ({
    error: ++calls < 3 ? { code: "PGRST303", message: "JWT issued at future" } : null,
  }), ms => { delays.push(ms); return Promise.resolve(); });
  assert(result.error === null && calls === 3);
  assert(JSON.stringify(delays) === "[1000,2000]");
});
Deno.test("persistent skew fails closed after three attempts", async () => {
  let calls = 0;
  const result = await withXClockSkewRetry(async () => {
    calls++; return { error: { code: "PGRST303", message: "JWT issued at future" } };
  }, () => Promise.resolve());
  assert(calls === 3 && result.error !== null);
});
Deno.test("permission, expiry and other errors are never retried", async () => {
  for (const error of [{code:"42501",message:"permission denied"},
    {code:"PGRST303",message:"JWT expired"}, {code:"other",message:"JWT issued at future"}]) {
    let calls = 0;
    await withXClockSkewRetry(async () => { calls++; return {error}; }, () => { throw new Error("must not sleep"); });
    assert(calls === 1);
  }
});
