import { decode } from "cbor-x";
import {
  X509Certificate,
  X509ChainBuilder,
} from "@peculiar/x509";
import {
  APPLE_APP_ATTEST_ROOT_CA_PEM,
} from "./apple-app-attest-root.ts";

const APPLE_NONCE_EXTENSION_OID =
  "1.2.840.113635.100.8.2";

const APPLE_APP_ID =
  "5AC85QG8MK.com.bobuhq.bobu";

const PROD_AAGUID = new Uint8Array([
  0x61, 0x70, 0x70, 0x61,
  0x74, 0x74, 0x65, 0x73,
  0x74, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
]);

const DEV_AAGUID =
  new TextEncoder().encode("appattestdevelop");

type AppleAttestationObject = {
  fmt?: string;
  attStmt?: {
    x5c?: Uint8Array[];
    receipt?: Uint8Array;
  };
  authData?: Uint8Array;
};

export type VerifiedAppleAttestation = {
  publicKeyPem: string;
  receiptBase64: string | null;
  environment: "development" | "production";
};

function toArrayBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const copy =
    new Uint8Array(bytes.byteLength);

  copy.set(bytes);

  return copy.buffer;
}

function bytesEqual(
  a: Uint8Array,
  b: Uint8Array,
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

function concatBytes(
  ...parts: Uint8Array[]
): Uint8Array {
  const totalLength = parts.reduce(
    (sum, part) => sum + part.length,
    0,
  );

  const result = new Uint8Array(totalLength);

  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

async function sha256(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
      "SHA-256",
      toArrayBuffer(bytes),
    );

  return new Uint8Array(digest);
}

function base64ToBytes(
  value: string,
): Uint8Array {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat(
      (4 - (normalized.length % 4)) % 4,
    );

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0),
  );
}

function bytesToBase64(
  bytes: Uint8Array,
): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function loadAppleRootCertificate():
  Promise<X509Certificate> {
  return new X509Certificate(
    APPLE_APP_ATTEST_ROOT_CA_PEM,
  );
}

function certificateDerEquals(
  left: X509Certificate,
  right: X509Certificate,
): boolean {
  return bytesEqual(
    new Uint8Array(left.rawData),
    new Uint8Array(right.rawData),
  );
}

async function verifyAppleCertificateChain(
  x5c: Uint8Array[],
): Promise<X509Certificate> {
  if (x5c.length < 2) {
    throw new Error(
      "Apple App Attest certificate chain is incomplete.",
    );
  }

  const leaf =
    new X509Certificate(
      toArrayBuffer(x5c[0]),
    );

  const intermediates =
    x5c.slice(1).map(
      (raw) =>
        new X509Certificate(
          toArrayBuffer(raw),
        ),
    );

  const root =
    await loadAppleRootCertificate();

  const now = new Date();

  const allPresentedCertificates = [
    leaf,
    ...intermediates,
  ];

  for (const certificate of allPresentedCertificates) {
    if (
      certificate.notBefore > now ||
      certificate.notAfter < now
    ) {
      throw new Error(
        "Apple App Attest certificate is outside its validity period.",
      );
    }
  }

  if (
    root.notBefore > now ||
    root.notAfter < now
  ) {
    throw new Error(
      "Pinned Apple App Attestation Root CA is outside its validity period.",
    );
  }

  const builder =
    new X509ChainBuilder({
      certificates: [
        ...intermediates,
        root,
      ],
    });

  const chain =
    await builder.build(leaf);

  if (
    !Array.isArray(chain) ||
    chain.length < 2
  ) {
    throw new Error(
      "Apple App Attest certificate chain could not be built.",
    );
  }

  const chainLeaf = chain[0];
  const chainRoot =
    chain[chain.length - 1];

  if (
    !certificateDerEquals(
      chainLeaf,
      leaf,
    )
  ) {
    throw new Error(
      "Apple App Attest chain leaf mismatch.",
    );
  }

  if (
    !certificateDerEquals(
      chainRoot,
      root,
    )
  ) {
    throw new Error(
      "Apple App Attest chain does not terminate at the pinned Apple root.",
    );
  }

  /*
   * Verify every certificate signature explicitly.
   * This avoids treating path construction alone as trust.
   */
  for (
    let index = 0;
    index < chain.length - 1;
    index += 1
  ) {
    const certificate =
      chain[index];

    const issuer =
      chain[index + 1];

    const valid =
      await certificate.verify({
        publicKey:
          await issuer.publicKey.export(),
      });

    if (!valid) {
      throw new Error(
        "Apple App Attest certificate signature validation failed.",
      );
    }
  }

  return leaf;
}

function bytesToPem(
  der: Uint8Array,
  label: string,
): string {
  const base64 = bytesToBase64(der);

  const lines =
    base64.match(/.{1,64}/g) ?? [];

  return [
    `-----BEGIN ${label}-----`,
    ...lines,
    `-----END ${label}-----`,
  ].join("\n");
}

function readUint16BE(
  data: Uint8Array,
  offset: number,
): number {
  return (
    (data[offset] << 8) |
    data[offset + 1]
  );
}

function readUint32BE(
  data: Uint8Array,
  offset: number,
): number {
  return (
    (
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]
    ) >>> 0
  );
}

function parseDerLength(
  data: Uint8Array,
  offset: number,
): {
  length: number;
  nextOffset: number;
} {
  const first = data[offset];

  if ((first & 0x80) === 0) {
    return {
      length: first,
      nextOffset: offset + 1,
    };
  }

  const byteCount =
    first & 0x7f;

  if (
    byteCount <= 0 ||
    byteCount > 4
  ) {
    throw new Error(
      "Unsupported DER length encoding.",
    );
  }

  let length = 0;

  for (
    let index = 0;
    index < byteCount;
    index += 1
  ) {
    length =
      (length << 8) |
      data[offset + 1 + index];
  }

  return {
    length,
    nextOffset:
      offset + 1 + byteCount,
  };
}

function extractNonceExtension(
  extensionValue: Uint8Array,
): Uint8Array {
  /*
   * Apple extension:
   * SEQUENCE {
   *   [1] {
   *     OCTET STRING nonce
   *   }
   * }
   *
   * We parse conservatively and search only
   * inside this extension's DER payload.
   */
  for (
    let index = 0;
    index < extensionValue.length;
    index += 1
  ) {
    if (extensionValue[index] !== 0x04) {
      continue;
    }

    try {
      const {
        length,
        nextOffset,
      } = parseDerLength(
        extensionValue,
        index + 1,
      );

      const end =
        nextOffset + length;

      if (
        length === 32 &&
        end <= extensionValue.length
      ) {
        return extensionValue.slice(
          nextOffset,
          end,
        );
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    "Apple App Attest nonce extension is invalid.",
  );
}

async function extractPublicKeyX963(
  certificate: X509Certificate,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "spki",
    certificate.publicKey.rawData,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"],
  );

  const jwk =
    await crypto.subtle.exportKey(
      "jwk",
      key,
    );

  if (!jwk.x || !jwk.y) {
    throw new Error(
      "App Attest public key coordinates are missing.",
    );
  }

  const x = base64ToBytes(jwk.x);
  const y = base64ToBytes(jwk.y);

  if (
    x.length !== 32 ||
    y.length !== 32
  ) {
    throw new Error(
      "Unexpected App Attest public key size.",
    );
  }

  return concatBytes(
    new Uint8Array([0x04]),
    x,
    y,
  );
}

export async function verifyAppleAttestation(
  proofBase64: string,
  keyId: string,
  challenge: string,
): Promise<VerifiedAppleAttestation> {
  const attestationBytes =
    base64ToBytes(proofBase64);

  const decoded =
    decode(attestationBytes) as
      AppleAttestationObject;

  if (
    decoded.fmt !== "apple-appattest"
  ) {
    throw new Error(
      "Invalid Apple App Attest format.",
    );
  }

  const x5c =
    decoded.attStmt?.x5c;

  const authData =
    decoded.authData;

  if (
    !Array.isArray(x5c) ||
    x5c.length < 2 ||
    !(authData instanceof Uint8Array)
  ) {
    throw new Error(
      "Incomplete Apple App Attest object.",
    );
  }

  /*
   * Authenticator data layout:
   * RP ID hash             32
   * flags                   1
   * counter                 4
   * AAGUID                 16
   * credentialId length     2
   * credentialId            N
   */
  if (authData.length < 55) {
    throw new Error(
      "Apple authenticator data is too short.",
    );
  }

  const rpIdHash =
    authData.slice(0, 32);

  const counter =
    readUint32BE(authData, 33);

  if (counter !== 0) {
    throw new Error(
      "Initial App Attest counter must be zero.",
    );
  }

  const aaguid =
    authData.slice(37, 53);

  let environment:
    | "development"
    | "production";

  if (
    bytesEqual(aaguid, PROD_AAGUID)
  ) {
    environment = "production";
  } else if (
    bytesEqual(aaguid, DEV_AAGUID)
  ) {
    environment = "development";
  } else {
    throw new Error(
      "Invalid Apple App Attest AAGUID.",
    );
  }

  const credentialIdLength =
    readUint16BE(authData, 53);

  const credentialIdStart = 55;
  const credentialIdEnd =
    credentialIdStart +
    credentialIdLength;

  if (
    credentialIdLength !== 32 ||
    credentialIdEnd > authData.length
  ) {
    throw new Error(
      "Invalid Apple App Attest credential ID.",
    );
  }

  const credentialId =
    authData.slice(
      credentialIdStart,
      credentialIdEnd,
    );

  const expectedKeyId =
    base64ToBytes(keyId);

  if (
    !bytesEqual(
      credentialId,
      expectedKeyId,
    )
  ) {
    throw new Error(
      "App Attest credential does not match key ID.",
    );
  }

  const expectedRpId =
    await sha256(
      new TextEncoder().encode(
        APPLE_APP_ID,
      ),
    );

  if (
    !bytesEqual(
      rpIdHash,
      expectedRpId,
    )
  ) {
    throw new Error(
      "App Attest RP ID does not match BOBU.",
    );
  }

  const leafCertificate =
    await verifyAppleCertificateChain(
      x5c,
    );

  const clientDataHash =
    await sha256(
      new TextEncoder().encode(
        challenge,
      ),
    );

  const nonce =
    await sha256(
      concatBytes(
        authData,
        clientDataHash,
      ),
    );

  const nonceExtension =
    leafCertificate.getExtension(
      APPLE_NONCE_EXTENSION_OID,
    );

  if (!nonceExtension) {
    throw new Error(
      "Apple nonce certificate extension is missing.",
    );
  }

  const extensionNonce =
    extractNonceExtension(
      new Uint8Array(
        nonceExtension.rawData,
      ),
    );

  if (
    !bytesEqual(
      nonce,
      extensionNonce,
    )
  ) {
    throw new Error(
      "Apple App Attest nonce mismatch.",
    );
  }

  const x963PublicKey =
    await extractPublicKeyX963(
      leafCertificate,
    );

  const publicKeyHash =
    await sha256(x963PublicKey);

  if (
    !bytesEqual(
      publicKeyHash,
      expectedKeyId,
    )
  ) {
    throw new Error(
      "Apple App Attest public key does not match key ID.",
    );
  }

  return {
    publicKeyPem:
      bytesToPem(
        new Uint8Array(
          leafCertificate.publicKey.rawData,
        ),
        "PUBLIC KEY",
      ),
    receiptBase64:
      decoded.attStmt?.receipt
        ? bytesToBase64(
            decoded.attStmt.receipt,
          )
        : null,
    environment,
  };
}
