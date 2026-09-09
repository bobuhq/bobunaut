import { Buffer } from "buffer";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import type {
  MarsPixelSolanaCheckoutResult,
} from "../MarsPixelNetworkService";

const MARS_SOLANA_DEVNET_RPC =
  "https://api.devnet.solana.com";

const MARS_SOLANA_MEMO_PROGRAM_ID =
  new PublicKey(
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  );

export type MarsSolanaPreparedPayment = {
  transaction: Transaction;
  latestBlockhash: string;
  lastValidBlockHeight: number;
};

function assertDevnetCheckout(
  checkout: MarsPixelSolanaCheckoutResult,
): void {
  if (checkout.network !== "devnet") {
    throw new Error(
      `Unsupported Mars Pixel Solana network: ${checkout.network}`,
    );
  }

  if (
    !Number.isSafeInteger(checkout.amountLamports) ||
    checkout.amountLamports <= 0
  ) {
    throw new Error(
      "Mars Pixel checkout returned an invalid lamport amount.",
    );
  }

  if (
    typeof checkout.paymentReference !== "string" ||
    checkout.paymentReference.length < 30
  ) {
    throw new Error(
      "Mars Pixel checkout returned an invalid payment reference.",
    );
  }
}

export function createMarsSolanaDevnetConnection(): Connection {
  return new Connection(
    MARS_SOLANA_DEVNET_RPC,
    "confirmed",
  );
}

export async function prepareMarsPixelSolanaPaymentTransaction(
  checkout: MarsPixelSolanaCheckoutResult,
): Promise<MarsSolanaPreparedPayment> {
  assertDevnetCheckout(checkout);

  const connection =
    createMarsSolanaDevnetConnection();

  const buyer = new PublicKey(
    checkout.buyerWallet,
  );

  const treasury = new PublicKey(
    checkout.treasuryAddress,
  );

  const {
    blockhash,
    lastValidBlockHeight,
  } = await connection.getLatestBlockhash(
    "confirmed",
  );

  const transaction = new Transaction({
    feePayer: buyer,
    recentBlockhash: blockhash,
  });

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: buyer,
      toPubkey: treasury,
      lamports: checkout.amountLamports,
    }),
  );

  transaction.add(
    new TransactionInstruction({
      keys: [],
      programId: MARS_SOLANA_MEMO_PROGRAM_ID,
      data: Buffer.from(
        checkout.paymentReference,
        "utf8",
      ),
    }),
  );

  return {
    transaction,
    latestBlockhash: blockhash,
    lastValidBlockHeight,
  };
}
