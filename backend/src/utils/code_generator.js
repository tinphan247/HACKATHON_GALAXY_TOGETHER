/**
 * Invite Code & QR Payload Utility
 */

import crypto from 'crypto';

const SECRET_KEY = process.env.INVITE_SECRET || "galaxy_together_secret_key_2026";

/**
 * Generates a clean, 6-character alphanumeric code like GTH-471 or GLX-892
 */
export function generateInviteCode(prefix = "GTH") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude ambiguous chars like 0, O, 1, I
  let randomPart = "";
  for (let i = 0; i < 3; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    randomPart += chars[randomIndex];
  }
  const digits = crypto.randomInt(100, 999);
  return `${prefix}-${digits}`;
}

/**
 * Generates a signed payload string for QR codes
 */
export function generateQRPayload(sessionId, code, expiresAt) {
  const data = JSON.stringify({
    sid: sessionId,
    c: code,
    exp: expiresAt.getTime ? expiresAt.getTime() : new Date(expiresAt).getTime()
  });

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex")
    .substring(0, 16);

  return JSON.stringify({
    data: Buffer.from(data).toString("base64"),
    sig: signature
  });
}

/**
 * Verifies a signed QR payload
 */
export function verifyQRPayload(rawPayload) {
  try {
    const { data, sig } = JSON.parse(rawPayload);
    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(Buffer.from(data, "base64").toString("utf-8"))
      .digest("hex")
      .substring(0, 16);

    if (sig !== expectedSig) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
    if (Date.now() > payload.exp) {
      return null; // expired
    }
    return payload;
  } catch {
    return null;
  }
}
