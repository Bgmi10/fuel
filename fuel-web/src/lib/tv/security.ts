import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

/** The TV keeps the raw token; the database only ever stores this hash. */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

// No 0/O/1/I so codes are readable from across a gym.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

// ------------------------------------------------------------------
// Admin socket token
//
// Admin sockets cannot send commands, but they do receive live TV
// status. The browser fetches a short-lived signed token from
// GET /api/tv/admin-socket-token (protected by your normal admin
// auth) and presents it when subscribing.
// ------------------------------------------------------------------

function secret(): string {
  const value = process.env.TV_SOCKET_SECRET;

  if (!value || value.length < 16) {
    throw new Error("TV_SOCKET_SECRET must be set to at least 16 characters.");
  }

  return value;
}

export function signAdminSocketToken(
  now: number = Date.now(),
  ttlMs: number = 5 * 60_000
): string {
  const payload = Buffer.from(JSON.stringify({ exp: now + ttlMs })).toString(
    "base64url"
  );
  const signature = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyAdminSocketToken(
  token: unknown,
  now: number = Date.now()
): boolean {
  if (typeof token !== "string") {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret()).update(payload).digest();
  const given = Buffer.from(signature, "base64url");

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return false;
  }

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}
