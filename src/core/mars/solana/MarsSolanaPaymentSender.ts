import type {
  Transaction,
} from "@solana/web3.js";

import {
  createMarsSolanaDevnetConnection,
} from "./MarsSolanaPaymentTransaction";

import {
  signMarsSolanaTransaction,
} from "./MarsSolanaWalletService";

export type MarsSolanaBroadcastResult = {
  transactionSignature: string;
};

export async function signAndBroadcastMarsSolanaPayment(
  transaction: Transaction,
): Promise<MarsSolanaBroadcastResult> {
  const signedTransaction =
    await signMarsSolanaTransaction(transaction);

  const connection =
    createMarsSolanaDevnetConnection();

  const transactionSignature =
    await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      },
    );

  if (!transactionSignature) {
    throw new Error(
      "Solana RPC did not return a transaction signature.",
    );
  }

  return {
    transactionSignature,
  };
}
