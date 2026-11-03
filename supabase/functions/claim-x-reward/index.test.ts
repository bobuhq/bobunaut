import handler from "./index.ts";
const builderId = "00000000-0000-0000-0000-000000000001";
const identity = { id: "auth-row-uuid", provider: "x", identity_data: { sub: "trusted-x-id" } };
const success = {verified:true,rewarded:true,already_rewarded:false,reward_gp:5000,total_gp:10000,ledger_id:"ledger",completed_at:null,reason:"rewarded"};
function assert(value: unknown) { if (!value) throw new Error("Assertion failed"); }
Deno.env.set("SUPABASE_URL", "https://x-release-test.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "test-anon");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service");
function request(token = true) {
 return new Request("https://local.test/claim-x-reward", {method:"POST",headers: token ? {Authorization:"Bearer test-user-token"} : {},
 body: JSON.stringify({p_builder_id:"attacker",p_provider_user_id:"attacker"})});
}
async function mocked(run: () => Promise<void>, responder: (req: Request) => Response) {
 const saved = globalThis.fetch;
 globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(responder(new Request(input,init)))) as typeof fetch;
 try { await run(); } finally { globalThis.fetch = saved; }
}
Deno.test("missing auth rejected before network", async () => {
 await mocked(async () => { assert((await handler.fetch(request(false))).status===401); }, () => {throw new Error("unexpected fetch");});
});
Deno.test("invalid session fails closed", async () => {
 await mocked(async () => { assert((await handler.fetch(request())).status===401); }, () => Response.json({message:"Invalid JWT"},{status:401}));
});
Deno.test("trusted identity and builder override attacker body", async () => {
 let rpcBody: Record<string, unknown> | undefined;
 const saved = globalThis.fetch;
 globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const req=new Request(input,init);
  if (req.url.includes("/auth/v1/user")) return Response.json({id:builderId,identities:[identity]});
  assert(req.url.endsWith("/rpc/claim_x_identity_reward"));
  assert(req.headers.get("apikey")==="test-service");
  rpcBody=await req.json(); return Response.json([success]);
 }) as typeof fetch;
 try {
  const response=await handler.fetch(request()); const result=await response.json();
  assert(response.status===200 && result.reward_gp===5000);
  assert(rpcBody?.p_builder_id===builderId && rpcBody.p_provider_user_id==="trusted-x-id");
 } finally { globalThis.fetch=saved; }
});
Deno.test("Auth UUID is never substituted for missing provider sub", async () => {
 await mocked(async () => { assert((await handler.fetch(request())).status===422); }, () => Response.json({id:builderId,identities:[{...identity,identity_data:{}}]}));
});
for (const reason of ["fresh_x_oauth_required","identity_already_linked"]) {
 Deno.test(`server rejection ${reason} cannot award`, async () => {
  await mocked(async () => {
   const response=await handler.fetch(request()); const result=await response.json();
   assert(response.status===409 && result.verified===false && result.rewarded===false);
  }, req => req.url.includes("/auth/v1/user") ? Response.json({id:builderId,identities:[identity]})
    : Response.json([{...success,verified:false,rewarded:false,reason}]));
 });
}
Deno.test("RPC failure cannot report verification success", async () => {
 await mocked(async () => {
  const response=await handler.fetch(request()); const result=await response.json();
  assert(response.status===500 && result.verified===false && result.rewarded===false);
 }, req => req.url.includes("/auth/v1/user") ? Response.json({id:builderId,identities:[identity]})
    : Response.json({code:"42501",message:"permission denied"},{status:403}));
});
Deno.test("unsupported methods rejected", async () => {
 assert((await handler.fetch(new Request("https://local.test",{method:"GET"}))).status===405);
 assert((await handler.fetch(new Request("https://local.test",{method:"OPTIONS"}))).status===200);
});
