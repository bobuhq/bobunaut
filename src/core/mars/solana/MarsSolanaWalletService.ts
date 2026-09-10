import type {
  PublicKey,
  Transaction,
} from "@solana/web3.js";

type SolanaProviderConnectResult = {
  publicKey: PublicKey;
};

type SolanaInjectedProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey | null;
  isConnected?: boolean;

  connect: (options?: {
    onlyIfTrusted?: boolean;
  }) => Promise<SolanaProviderConnectResult>;

  disconnect?: () => Promise<void>;

  signTransaction: (
    transaction: Transaction,
  ) => Promise<Transaction>;
};

type SolanaWindow = Window & {
  phantom?: {
    solana?: SolanaInjectedProvider;
  };
  solana?: SolanaInjectedProvider;
};

export type MarsSolanaWalletSnapshot = {
  providerName: "phantom" | "injected";
  publicKey: string;
  connected: boolean;
};

function getBrowserWindow(): SolanaWindow | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window as SolanaWindow;
}

export function getMarsSolanaProvider():
  | SolanaInjectedProvider
  | null {
  const browser = getBrowserWindow();

  if (!browser) {
    return null;
  }

  if (browser.phantom?.solana) {
    return browser.phantom.solana;
  }

  if (browser.solana) {
    return browser.solana;
  }

  return null;
}

export function isMarsSolanaWalletAvailable(): boolean {
  return getMarsSolanaProvider() !== null;
}

export function isMarsMobileBrowser(): boolean {
  const browser = getBrowserWindow();

  if (!browser) {
    return false;
  }

  const mobileUserAgent =
    /Android|iPhone|iPad|iPod/i.test(
      browser.navigator.userAgent,
    );

  const touchViewport =
    browser.navigator.maxTouchPoints > 0 &&
    Math.min(
      browser.screen.width,
      browser.screen.height,
    ) <= 1024;

  return mobileUserAgent || touchViewport;
}

export function openMarsInPhantomBrowser(): boolean {
  const browser = getBrowserWindow();

  if (!browser || !isMarsMobileBrowser()) {
    return false;
  }

  const currentUrl = browser.location.href;
  const phantomUrl =
    `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}` +
    `?ref=${encodeURIComponent(browser.location.origin)}`;

  browser.location.assign(phantomUrl);
  return true;
}

export function getMarsSolanaWalletSnapshot():
  | MarsSolanaWalletSnapshot
  | null {
  const browser = getBrowserWindow();
  const provider = getMarsSolanaProvider();

  if (!browser || !provider?.publicKey) {
    return null;
  }

  return {
    providerName:
      browser.phantom?.solana === provider
        ? "phantom"
        : "injected",
    publicKey: provider.publicKey.toBase58(),
    connected: provider.isConnected === true,
  };
}

export async function connectMarsSolanaWallet(): Promise<MarsSolanaWalletSnapshot> {
  const browser = getBrowserWindow();
  const provider = getMarsSolanaProvider();

  if (!browser || !provider) {
    throw new Error(
      "No compatible Solana wallet was found. Install or open Phantom.",
    );
  }

  const result = await provider.connect();

  const publicKey =
    result?.publicKey ??
    provider.publicKey ??
    null;

  if (!publicKey) {
    throw new Error(
      "Solana wallet connection completed without a public key.",
    );
  }

  return {
    providerName:
      browser.phantom?.solana === provider
        ? "phantom"
        : "injected",
    publicKey: publicKey.toBase58(),
    connected: true,
  };
}

export async function disconnectMarsSolanaWallet(): Promise<void> {
  const provider = getMarsSolanaProvider();

  if (!provider?.disconnect) {
    return;
  }

  await provider.disconnect();
}

export async function signMarsSolanaTransaction(
  transaction: Transaction,
): Promise<Transaction> {
  const provider = getMarsSolanaProvider();

  if (!provider) {
    throw new Error(
      "No compatible Solana wallet is available.",
    );
  }

  /*
   * Re-establish the Phantom connection at signing time if the
   * extension is open but the site/provider connection is stale.
   *
   * CRITICAL SAFETY:
   * The transaction fee payer must still match the connected
   * Phantom account before any signature is requested.
   */
  let publicKey = provider.publicKey ?? null;

  if (!publicKey || provider.isConnected !== true) {
    const result = await provider.connect();
    publicKey =
      result?.publicKey ??
      provider.publicKey ??
      null;
  }

  if (!publicKey) {
    throw new Error(
      "Phantom connection completed without a public key.",
    );
  }

  if (
    !transaction.feePayer ||
    !transaction.feePayer.equals(publicKey)
  ) {
    throw new Error(
      "The active Phantom account does not match the buyer wallet used to prepare this checkout. Reconnect the intended buyer wallet and prepare checkout again.",
    );
  }

  return provider.signTransaction(transaction);
}
