import assert from "node:assert/strict";
import test from "node:test";
import { display, UNIT } from "../src/lib/rules.ts";
import { decimalAmount, distribute, fundingMode, MIN_ENTRY, quote, sponsorQuote, weights } from "../src/lib/v3/rules.ts";

test("V3 charges the expected fees in all funding modes", () => {
  const totals = [
    quote(200n * UNIT, "sponsored"),
    quote(160n * UNIT, "entry"),
    quote(200n * UNIT, "mixed"),
  ];
  assert.deepEqual(totals.map((q) => [q.platform, q.protocol, q.net].map(display)), [
    ["5", "0.6", "194.4"],
    ["7.52", "0.48", "152"],
    ["6.4", "0.6", "193"],
  ]);
});

test("sponsor covers fees and a three-place podium preserves the advertised net", () => {
  const slots = sponsorQuote(5n * UNIT, "sponsored", [6000, 3000, 1000]);
  assert.deepEqual(slots.map((q) => display(q.net)), ["3", "1.5", "0.5"]);
  assert.deepEqual(sponsorQuote(5n * UNIT, "sponsored", [10000]).map((q) => display(q.net)), ["5"]);
});

test("splits allocate all stroops with no rounding loss", () => {
  const shares = distribute(503n, [2000, 2000, 2000, 2000, 2000]);
  assert.deepEqual(shares, [100n, 101n, 100n, 101n, 101n]);
  assert.equal(shares.reduce((a, b) => a + b), 503n);
  assert.throws(() => weights([50, 50], [1, 3]));
  assert.throws(() => weights([10000, 0, 0], [1, 3]));
});

test("quarter USDC is the minimum per paid entry, and unsupported modes are rejected", () => {
  assert.equal(decimalAmount("0.25", MIN_ENTRY), MIN_ENTRY);
  assert.throws(() => decimalAmount("0.24", MIN_ENTRY));
  assert.throws(() => fundingMode("off-chain"));
});
