// Run with:  TV_SOCKET_SECRET=0123456789abcdef npx tsx --test src/lib/tv/security.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generateDeviceToken,
  generatePairingCode,
  hashDeviceToken,
  signAdminSocketToken,
  verifyAdminSocketToken,
} from "./security";

process.env.TV_SOCKET_SECRET ??= "0123456789abcdef-test-secret";

describe("device tokens", () => {
  it("hashes deterministically and never returns the raw token", () => {
    const token = generateDeviceToken();
    assert.equal(token.length, 64);
    assert.equal(hashDeviceToken(token), hashDeviceToken(token));
    assert.notEqual(hashDeviceToken(token), token);
    assert.notEqual(hashDeviceToken(token), hashDeviceToken(generateDeviceToken()));
  });

  it("creates readable 6 character pairing codes", () => {
    for (let index = 0; index < 200; index++) {
      assert.match(generatePairingCode(), /^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});

describe("admin socket token", () => {
  it("accepts a fresh token", () => {
    assert.equal(verifyAdminSocketToken(signAdminSocketToken(1_000, 60_000), 2_000), true);
  });

  it("rejects an expired token", () => {
    assert.equal(verifyAdminSocketToken(signAdminSocketToken(1_000, 60_000), 61_001), false);
  });

  it("rejects a tampered payload or signature", () => {
    const token = signAdminSocketToken(1_000, 60_000);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ exp: 9_999_999_999_999 })).toString("base64url");

    assert.equal(verifyAdminSocketToken(`${forged}.${signature}`, 2_000), false);
    assert.equal(verifyAdminSocketToken(`${payload}.x${signature.slice(1)}`, 2_000), false);
  });

  it("rejects junk", () => {
    for (const junk of [undefined, null, 42, "", "abc", "a.b", "a.b.c"]) {
      assert.equal(verifyAdminSocketToken(junk), false);
    }
  });
});
