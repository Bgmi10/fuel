// Run with:  npx tsx --test src/lib/tv/date-key.test.ts
import assert from "node:assert/strict";
import { it } from "node:test";
import { isValidDateKey, toDateKey, monthRange } from "./date-key";
it("validates", () => {
  assert.ok(isValidDateKey("2026-10-12"));
  assert.ok(isValidDateKey("2028-02-29"));
  assert.ok(!isValidDateKey("2026-02-29"));
  assert.ok(!isValidDateKey("2026-13-01"));
  assert.ok(!isValidDateKey("2026-1-1"));
});
it("IST day boundary", () => {
  // 18:30 UTC on the 11th is midnight IST on the 12th
  assert.equal(toDateKey(new Date("2026-10-11T18:29:59Z")), "2026-10-11");
  assert.equal(toDateKey(new Date("2026-10-11T18:30:00Z")), "2026-10-12");
});
it("month range", () => {
  assert.deepEqual(monthRange(2028, 2), { from: "2028-02-01", to: "2028-02-29" });
  assert.deepEqual(monthRange(2026, 12), { from: "2026-12-01", to: "2026-12-31" });
});
