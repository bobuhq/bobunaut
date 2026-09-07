import {
  createMarsSolanaDevnetConnection,
} from "./MarsSolanaPaymentTransaction";

export type MarsSolanaFinalizedPayment = {
  transactionSignature: string;
};

export async function confirmMarsSolanaPaymentFinalized(
  input: {
    transactionSignature: string;
    latestBlockhash: string;
    lastValidBlockHeight: number;
  },
): Promise<MarsSolanaFinalizedPayment> {
  if (!input.transactionSignature) {
    throw new Error(
      "Missing Solana transaction signature.",
    );
  }

  if (!input.latestBlockhash) {
    throw new Error(
      "Missing Solana transaction blockhash.",
    );
  }

  if (
    !Number.isSafeInteger(
      input.lastValidBlockHeight,
    ) ||
    input.lastValidBlockHeight <= 0
  ) {
    throw new Error(
      "Invalid Solana last valid block height.",
    );
  }

  const connection =
    createMarsSolanaDevnetConnection();

  const confirmation =
    await connection.confirmTransaction(
      {
        signature:
          input.transactionSignature,
        blockhash:
          input.latestBlockhash,
        lastValidBlockHeight:
          input.lastValidBlockHeight,
      },
      "finalized",
    );

  if (confirmation.value.err) {
    throw new Error(
      `Solana transaction failed: ${JSON.stringify(
        confirmation.value.err,
      )}`,
    );
  }

  return {
    transactionSignature:
      input.transactionSignature,
  };
}
