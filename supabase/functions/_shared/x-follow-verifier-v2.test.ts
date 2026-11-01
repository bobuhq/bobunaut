import { verifyXFollowV2 } from "./x-follow-verifier-v2.ts";

const expected = [
  ["following", "following"],
  ["not_following", "not_following"],
  ["401", "unknown"],
  ["402", "unknown"],
  ["429", "unknown"],
  ["500", "unknown"],
  ["incomplete", "unknown"],
  ["pagination_loop", "unknown"],
  ["network_error", "unknown"],
] as const;

function mockFetch(scenario: string): typeof fetch {
  let calls = 0;

  return (async () => {
    calls++;

    if (scenario === "network_error") {
      throw new Error("Network unavailable");
    }

    if (["401", "402", "429", "500"].includes(scenario)) {
      return new Response("{}", { status: Number(scenario) });
    }

    if (scenario === "incomplete") {
      return Response.json({ meta: { next_token: "next" } });
    }

    if (scenario === "pagination_loop") {
      return Response.json({
        data: [{ id: "other" }],
        meta: { next_token: "same-token" },
      });
    }

    if (scenario === "following") {
      return Response.json({
        data: [{ id: "bobunaut-id" }],
        meta: {},
      });
    }

    return Response.json({
      data: [{ id: "other-user" }],
      meta: {},
    });
  }) as typeof fetch;
}

let passed = 0;

for (const [scenario, verdict] of expected) {
  Deno.test(`X follow: ${scenario}`, async () => {
  const result = await verifyXFollowV2(
    "builder-x-id",
    "bobunaut-id",
    "test-token",
    mockFetch(scenario),
  );

  if (result.verdict !== verdict) {
    throw new Error(
      `FAIL ${scenario}: expected ${verdict}, got ${result.verdict}`,
    );
  }

  console.log(`PASS ${scenario}: ${result.verdict}`);
  passed++;
  });
}

const malformedCases = [
  { name: "missing_data", payload: { meta: {} } },
  { name: "null_payload", payload: null },
  { name: "invalid_user", payload: { data: [{ name: "invalid" }] } },
  { name: "invalid_pagination", payload: {
    data: [], meta: { next_token: 123 },
  } },
  { name: "partial_errors", payload: {
    data: [{ id: "bobunaut-id" }],
    errors: [{ detail: "partial result" }],
  } },
];

for (const testCase of malformedCases) {
  Deno.test(`X malformed: ${testCase.name}`, async () => {
  const result = await verifyXFollowV2(
    "builder-x-id",
    "bobunaut-id",
    "test-token",
    (async () => Response.json(testCase.payload)) as typeof fetch,
  );

  if (result.verdict !== "unknown") {
    throw new Error(
      `FAIL ${testCase.name}: expected unknown, got ${result.verdict}`,
    );
  }

  console.log(`PASS ${testCase.name}: unknown`);
  });
}


Deno.test("X follow: pagination limit", async () => {
  let calls = 0;

  const mockFetch = (async () => {
    calls++;

    return Response.json({
      data: [{ id: "other-user" }],
      meta: { next_token: `page-${calls}` },
    });
  }) as typeof fetch;

  const result = await verifyXFollowV2(
    "builder-x-id",
    "bobunaut-id",
    "test-token",
    mockFetch,
  );

  if (
    result.verdict !== "unknown" ||
    result.reason !== "pagination_limit_reached" ||
    calls !== 20
  ) {
    throw new Error(
      `Expected pagination limit after 20 requests; ` +
      `got ${result.verdict}, ${result.reason}, calls=${calls}`,
    );
  }
});


Deno.test("X follow: empty list", async () => {
  const result = await verifyXFollowV2(
    "builder-x-id",
    "bobunaut-id",
    "test-token",
    (async () => Response.json({
      data: [],
      meta: {},
    })) as typeof fetch,
  );

  if (result.verdict !== "not_following") {
    throw new Error(`Unexpected verdict: ${result.verdict}`);
  }
});

Deno.test("X follow: found on second page", async () => {
  let calls = 0;

  const result = await verifyXFollowV2(
    "builder-x-id",
    "bobunaut-id",
    "test-token",
    (async () => {
      calls++;

      return Response.json(
        calls === 1
          ? {
              data: [{ id: "other-user" }],
              meta: { next_token: "page-2" },
            }
          : {
              data: [{ id: "bobunaut-id" }],
              meta: {},
            },
      );
    }) as typeof fetch,
  );

  if (result.verdict !== "following" || calls !== 2) {
    throw new Error(`Unexpected result: ${result.verdict}, calls=${calls}`);
  }
});

Deno.test("X follow: second page API error", async () => {
  let calls = 0;

  const result = await verifyXFollowV2(
    "builder-x-id",
    "bobunaut-id",
    "test-token",
    (async () => {
      calls++;

      if (calls === 2) {
        return new Response("{}", { status: 429 });
      }

      return Response.json({
        data: [{ id: "other-user" }],
        meta: { next_token: "page-2" },
      });
    }) as typeof fetch,
  );

  if (
    result.verdict !== "unknown" ||
    result.reason !== "x_api_429" ||
    calls !== 2
  ) {
    throw new Error(`Unexpected result: ${result.verdict}, ${result.reason}`);
  }
});
