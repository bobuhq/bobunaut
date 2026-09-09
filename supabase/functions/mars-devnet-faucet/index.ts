import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const DEVNET_RPC = "https://api.devnet.solana.com";
const FAUCET_LAMPORTS = 1_610_000_000;
const MIN_FEE_BUFFER_LAMPORTS = 10_000;
const EXPECTED_FAUCET_ADDRESS =
  "6yZvQFbWzRwZjywYyxQL6X8t2mUfLfTvfGT7KMKVudSH";

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

type FaucetBody = {
  walletAddress?: string;
};

function isSolanaAddress(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim())
  );
}

function loadFaucetKeypair(): Keypair {
  const raw = Deno.env.get("BOBU_DEVNET_FAUCET_KEYPAIR");

  if (!raw) {
    throw new Error("FAUCET_KEYPAIR_NOT_CONFIGURED");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FAUCET_KEYPAIR_INVALID_JSON");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length !== 64 ||
    !parsed.every(
      (value) =>
        Number.isInteger(value) &&
        Number(value) >= 0 &&
        Number(value) <= 255
    )
  ) {
    throw new Error("FAUCET_KEYPAIR_INVALID");
  }

  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(parsed as number[]),
  );

  if (
    keypair.publicKey.toBase58() !==
    EXPECTED_FAUCET_ADDRESS
  ) {
    throw new Error("FAUCET_KEYPAIR_ADDRESS_MISMATCH");
  }

  return keypair;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405,
    );
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

  let body: FaucetBody;

  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body." },
      400,
    );
  }

  const walletAddress =
    typeof body.walletAddress === "string"
      ? body.walletAddress.trim()
      : "";

  if (!isSolanaAddress(walletAddress)) {
    return jsonResponse(
      { error: "Invalid Solana wallet." },
      400,
    );
  }

  let destination: PublicKey;

  try {
    destination = new PublicKey(walletAddress);
  } catch {
    return jsonResponse(
      { error: "Invalid Solana wallet." },
      400,
    );
  }

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

  const {
    data: reservation,
    error: reservationError,
  } = await adminClient.rpc(
    "reserve_mars_devnet_faucet_v1",
    {
      p_builder_id: user.id,
      p_wallet_address: walletAddress,
    },
  );

  if (reservationError) {
    console.error(
      "Devnet faucet reservation failed:",
      reservationError.message,
    );

    return jsonResponse(
      { error: "FAUCET_RESERVATION_FAILED" },
      500,
    );
  }

  if (!reservation?.allowed) {
    return jsonResponse(
      {
        error: "FAUCET_RATE_LIMITED",
        reason: reservation?.reason ?? "rate_limited",
        retryAfterSeconds:
          reservation?.retry_after_seconds ?? 0,
      },
      429,
    );
  }

  const requestId =
    typeof reservation.request_id === "string"
      ? reservation.request_id
      : "";

  if (!requestId) {
    return jsonResponse(
      { error: "FAUCET_RESERVATION_INVALID" },
      500,
    );
  }

  let faucetKeypair: Keypair;

  try {
    faucetKeypair = loadFaucetKeypair();
  } catch (error) {
    console.error(
      "Devnet faucet keypair unavailable:",
      error instanceof Error ? error.message : error,
    );

    await adminClient.rpc(
      "complete_mars_devnet_faucet_v1",
      {
        p_request_id: requestId,
        p_success: false,
        p_transaction_signature: null,
        p_error_code: "keypair_unavailable",
      },
    );

    return jsonResponse(
      { error: "FAUCET_NOT_CONFIGURED" },
      503,
    );
  }

  const connection = new Connection(
    DEVNET_RPC,
    "confirmed",
  );

  try {
    const balance = await connection.getBalance(
      faucetKeypair.publicKey,
      "confirmed",
    );

    if (
      balance <
      FAUCET_LAMPORTS + MIN_FEE_BUFFER_LAMPORTS
    ) {
      await adminClient.rpc(
        "complete_mars_devnet_faucet_v1",
        {
          p_request_id: requestId,
          p_success: false,
          p_transaction_signature: null,
          p_error_code: "insufficient_devnet_balance",
        },
      );

      return jsonResponse(
        { error: "FAUCET_BALANCE_LOW" },
        503,
      );
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: faucetKeypair.publicKey,
        toPubkey: destination,
        lamports: FAUCET_LAMPORTS,
      }),
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [faucetKeypair],
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      },
    );

    const {
      data: completed,
      error: completeError,
    } = await adminClient.rpc(
      "complete_mars_devnet_faucet_v1",
      {
        p_request_id: requestId,
        p_success: true,
        p_transaction_signature: signature,
        p_error_code: null,
      },
    );

    if (completeError || completed !== true) {
      console.error(
        "Devnet faucet completion failed:",
        completeError?.message ?? "completion rejected",
      );

      return jsonResponse(
        {
          error: "FAUCET_COMPLETION_FAILED",
          transactionSignature: signature,
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      network: "devnet",
      amountLamports: FAUCET_LAMPORTS,
      amountSol: 1.61,
      walletAddress,
      faucetAddress:
        faucetKeypair.publicKey.toBase58(),
      transactionSignature: signature,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown_transfer_error";

    console.error(
      "Devnet faucet transfer failed:",
      message,
    );

    await adminClient.rpc(
      "complete_mars_devnet_faucet_v1",
      {
        p_request_id: requestId,
        p_success: false,
        p_transaction_signature: null,
        p_error_code: "transfer_failed",
      },
    );

    return jsonResponse(
      { error: "DEVNET_TRANSFER_FAILED" },
      502,
    );
  }
});
