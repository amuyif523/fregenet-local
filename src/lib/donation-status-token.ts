import crypto from "node:crypto";

function getStatusTokenSecret() {
  const secret = process.env.DONATION_STATUS_TOKEN_SECRET ?? process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("DONATION_STATUS_TOKEN_SECRET or ADMIN_SESSION_SECRET must be set with at least 32 characters.");
  }

  return secret;
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function signDonationStatusToken(txRef: string) {
  return crypto.createHmac("sha256", getStatusTokenSecret()).update(txRef).digest("hex");
}

export function verifyDonationStatusToken(txRef: string, token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const expected = signDonationStatusToken(txRef);
  return safeEqual(expected, token);
}
