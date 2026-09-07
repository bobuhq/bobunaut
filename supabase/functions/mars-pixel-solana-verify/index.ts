import { createClient } from "@supabase/supabase-js";

const DEVNET_RPC = "https://api.devnet.solana.com";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type VerifyBody = {
  paymentOrderId?: string;
  transactionSignature?: string;
  colorKey?: string | null;
};

function normalizeColorKey(value: unknown): string | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "AUTO"
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^RAINBOW_(0[1-9]|1[0-9]|20)$/.test(value)
  ) {
    return value;
  }

  throw new Error("INVALID_COLOR_KEY");
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value.trim())
  );
}

function isSignature(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{32,128}$/.test(value.trim())
  );
}

function asOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(
      { error: "Server configuration error." },
      500,
    );
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(
      { error: "Authentication required." },
      401,
    );
  }

  const accessToken =
    authorization.slice("Bearer ".length).trim();

  const userClient = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(accessToken);

  if (authError || !user) {
    return jsonResponse(
      { error: "Invalid or expired session." },
      401,
    );
  }

  let body: VerifyBody;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  if (!isUuid(body.paymentOrderId)) {
    return jsonResponse(
      { error: "Invalid payment order ID." },
      400,
    );
  }

  if (!isSignature(body.transactionSignature)) {
    return jsonResponse(
      { error: "Invalid transaction signature." },
      400,
    );
  }

  let colorKey: string | null;

  try {
    colorKey = normalizeColorKey(body.colorKey);
  } catch {
    return jsonResponse(
      { error: "Invalid territory color." },
      400,
    );
  }

  const paymentOrderId = body.paymentOrderId.trim();
  const transactionSignature =
    body.transactionSignature.trim();

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  /*
   * Load ALL expected blockchain facts from the trusted DB.
   * Nothing about wallet, treasury, amount, memo or network
   * is accepted from the browser.
   */
  const {
    data: contextData,
    error: contextError,
  } = await adminClient.rpc(
    "get_mars_pixel_solana_verification_context_v1",
    {
      p_payment_order_id: paymentOrderId,
      p_builder_id: user.id,
    },
  );

  if (contextError) {
    console.error(
      "Mars SOL verification context failed:",
      contextError.message,
    );

    return jsonResponse(
      { error: contextError.message },
      404,
    );
  }

  const order = asOne(contextData);

  if (
    !order ||
    typeof order.buyer_wallet !== "string" ||
    typeof order.treasury_address !== "string" ||
    typeof order.payment_reference !== "string"
  ) {
    return jsonResponse(
      { error: "Invalid payment verification context." },
      500,
    );
  }

  if (order.network !== "devnet") {
    return jsonResponse(
      { error: "MARS_PIXEL_SOLANA_NETWORK_NOT_SUPPORTED" },
      409,
    );
  }

  const expectedLamports = Number(order.amount_lamports);

  if (
    !Number.isSafeInteger(expectedLamports) ||
    expectedLamports <= 0
  ) {
    return jsonResponse(
      { error: "Invalid authoritative payment amount." },
      500,
    );
  }

  /*
   * Query a trusted network chosen by the SERVER.
   * The client cannot supply an RPC endpoint.
   */
  let rpcResponse: Response;

  try {
    rpcResponse = await fetch(DEVNET_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          transactionSignature,
          {
            encoding: "jsonParsed",
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Solana RPC request failed:", error);

    return jsonResponse(
      { error: "SOLANA_RPC_UNAVAILABLE" },
      503,
    );
  }

  if (!rpcResponse.ok) {
    console.error(
      "Solana RPC HTTP error:",
      rpcResponse.status,
    );

    return jsonResponse(
      { error: "SOLANA_RPC_UNAVAILABLE" },
      503,
    );
  }

  let rpcPayload: any;

  try {
    rpcPayload = await rpcResponse.json();
  } catch {
    return jsonResponse(
      { error: "SOLANA_RPC_INVALID_RESPONSE" },
      502,
    );
  }

  if (rpcPayload?.error) {
    console.error(
      "Solana RPC error:",
      JSON.stringify(rpcPayload.error),
    );

    return jsonResponse(
      { error: "SOLANA_RPC_ERROR" },
      502,
    );
  }

  const tx = rpcPayload?.result;

  /*
   * With commitment=finalized, null means the transaction is
   * not yet available at the required finality (or does not exist).
   */
  if (!tx) {
    return jsonResponse(
      {
        error: "SOLANA_TRANSACTION_NOT_FINALIZED",
        retryable: true,
      },
      409,
    );
  }

  if (tx?.meta?.err !== null) {
    return jsonResponse(
      { error: "SOLANA_TRANSACTION_FAILED" },
      409,
    );
  }

  const signatures = tx?.transaction?.signatures;

  if (
    !Array.isArray(signatures) ||
    signatures.length < 1 ||
    signatures[0] !== transactionSignature
  ) {
    return jsonResponse(
      { error: "SOLANA_TRANSACTION_SIGNATURE_MISMATCH" },
      409,
    );
  }

  const accountKeys =
    tx?.transaction?.message?.accountKeys;

  if (!Array.isArray(accountKeys) || accountKeys.length < 1) {
    return jsonResponse(
      { error: "SOLANA_TRANSACTION_ACCOUNT_KEYS_INVALID" },
      409,
    );
  }

  /*
   * Solana accountKeys[0] is the transaction fee payer.
   * For BOBU checkout the buyer must both sign and pay the fee.
   */
  const feePayer = accountKeys[0];

  if (
    feePayer?.pubkey !== order.buyer_wallet ||
    feePayer?.signer !== true
  ) {
    return jsonResponse(
      { error: "SOLANA_BUYER_FEE_PAYER_MISMATCH" },
      409,
    );
  }

  const buyerSigner = accountKeys.some(
    (key: any) =>
      key?.pubkey === order.buyer_wallet &&
      key?.signer === true,
  );

  if (!buyerSigner) {
    return jsonResponse(
      { error: "SOLANA_BUYER_SIGNATURE_REQUIRED" },
      409,
    );
  }

  const instructions =
    tx?.transaction?.message?.instructions;

  if (!Array.isArray(instructions)) {
    return jsonResponse(
      { error: "SOLANA_TRANSACTION_INSTRUCTIONS_INVALID" },
      409,
    );
  }

  /*
   * Require exactly ONE matching System Program transfer.
   * This prevents an ambiguous transaction from being accepted.
   */
  const matchingTransfers = instructions.filter(
    (instruction: any) =>
      instruction?.program === "system" &&
      instruction?.programId === SYSTEM_PROGRAM &&
      instruction?.parsed?.type === "transfer" &&
      instruction?.parsed?.info?.source ===
        order.buyer_wallet &&
      instruction?.parsed?.info?.destination ===
        order.treasury_address &&
      instruction?.parsed?.info?.lamports ===
        expectedLamports,
  );

  if (matchingTransfers.length !== 1) {
    return jsonResponse(
      { error: "SOLANA_PAYMENT_TRANSFER_MISMATCH" },
      409,
    );
  }

  /*
   * Reject additional direct System Program transfers from the
   * buyer to the BOBU treasury. The payment must be unambiguous.
   */
  const buyerToTreasuryTransfers = instructions.filter(
    (instruction: any) =>
      instruction?.program === "system" &&
      instruction?.programId === SYSTEM_PROGRAM &&
      instruction?.parsed?.type === "transfer" &&
      instruction?.parsed?.info?.source ===
        order.buyer_wallet &&
      instruction?.parsed?.info?.destination ===
        order.treasury_address,
  );

  if (buyerToTreasuryTransfers.length !== 1) {
    return jsonResponse(
      { error: "SOLANA_PAYMENT_TRANSFER_AMBIGUOUS" },
      409,
    );
  }

  /*
   * V26 payment_reference is a UUID stored verbatim in an
   * SPL Memo instruction. It is NOT a Solana Pay reference key.
   */
  const matchingMemos = instructions.filter(
    (instruction: any) =>
      instruction?.program === "spl-memo" &&
      instruction?.programId === MEMO_PROGRAM &&
      instruction?.parsed === order.payment_reference,
  );

  if (matchingMemos.length !== 1) {
    return jsonResponse(
      { error: "SOLANA_PAYMENT_MEMO_MISMATCH" },
      409,
    );
  }

  const allMemoInstructions = instructions.filter(
    (instruction: any) =>
      instruction?.program === "spl-memo" ||
      instruction?.programId === MEMO_PROGRAM,
  );

  if (allMemoInstructions.length !== 1) {
    return jsonResponse(
      { error: "SOLANA_PAYMENT_MEMO_AMBIGUOUS" },
      409,
    );
  }

  const slot = tx?.slot;
  const blockTimeSeconds = tx?.blockTime;

  if (
    !Number.isSafeInteger(slot) ||
    slot <= 0 ||
    !Number.isSafeInteger(blockTimeSeconds) ||
    blockTimeSeconds <= 0
  ) {
    return jsonResponse(
      { error: "SOLANA_TRANSACTION_TIME_INVALID" },
      409,
    );
  }

  const blockTime =
    new Date(blockTimeSeconds * 1000).toISOString();

  /*
   * Advertiser identity is resolved by the trusted
   * SECURITY DEFINER verification-context RPC.
   *
   * Do not query mars_advertisers directly here:
   * service_role intentionally has no SELECT privilege.
   *
   * advertiser_id may legitimately be null so V28 can still
   * classify late/reacquired payments as refund_required before
   * normal advertiser validation.
   */
  const advertiserId =
    typeof order.advertiser_id === "string"
      ? order.advertiser_id
      : null;

  /*
   * ONLY after independent blockchain verification do we hand
   * immutable chain facts to the trusted SQL settlement RPC.
   */
  const {
    data: commitData,
    error: commitError,
  } = await adminClient.rpc(
    "commit_mars_pixel_solana_payment_v2",
    {
      p_payment_order_id: paymentOrderId,
      p_transaction_signature: transactionSignature,
      p_transaction_slot: slot,
      p_transaction_block_time: blockTime,
      p_advertiser_id: advertiserId,
      p_requested_color_key: colorKey,
    },
  );

  if (commitError) {
    console.error(
      "Mars SOL commit failed:",
      commitError.message,
    );

    return jsonResponse(
      { error: commitError.message },
      409,
    );
  }

  const committed = asOne(commitData);

  if (!committed?.payment_order_id) {
    return jsonResponse(
      { error: "SOLANA_PAYMENT_COMMIT_RETURNED_NO_RESULT" },
      500,
    );
  }

  return jsonResponse({
    success: true,
    paymentOrderId: committed.payment_order_id,
    paymentStatus: committed.payment_status,
    reservationId: committed.reservation_id,
    allocationId: committed.allocation_id,
    transactionSignature:
      committed.transaction_signature,
    transactionSlot:
      committed.transaction_slot,
    transactionBlockTime:
      committed.transaction_block_time,
    verifiedAt: committed.verified_at,
  });
});
