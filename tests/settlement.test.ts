import assert from "node:assert/strict";
import test from "node:test";
import {
  Address,
  Keypair,
  nativeToScVal,
  StrKey,
  xdr,
} from "@stellar/stellar-sdk";
import {
  display,
  prizeAmounts,
  split,
  units,
  WINNER_FUNDING,
  WINNER_UNITS,
} from "../src/lib/rules.ts";
import { verifiedTransfers } from "../src/lib/receipts.ts";
const asset = StrKey.encodeContract(Buffer.alloc(32, 4)),
  core = StrKey.encodeContract(Buffer.alloc(32, 5));
const to = Array.from({ length: 5 }, () => Keypair.random().publicKey());
const id = Buffer.alloc(32, 6),
  addr = (v: string) => Address.fromString(v).toScVal();
function event(contract: string, topics: xdr.ScVal[], data: xdr.ScVal) {
  const e = new xdr.ContractEvent({
    ext: xdr.ExtensionPoint.v0(),
    contractId: new xdr.ContractId(StrKey.decodeContract(contract)),
    type: xdr.ContractEventType.contract,
    body: xdr.ContractEventBody.v0(new xdr.ContractEventV0({ topics, data })),
  });
  return xdr.ContractEvent.fromXdr(e.toXdr());
}
const transfer = (from: string, recipient: string, n: bigint) =>
  event(
    asset,
    [
      nativeToScVal("transfer", { type: "symbol" }),
      addr(from),
      addr(recipient),
    ],
    nativeToScVal(n, { type: "i128" }),
  );
test("the smallest units and protocol fees reconcile", () => {
  const p = prizeAmounts(units("10.01"));
  assert.equal(p.platform + p.protocol + p.net, p.gross);
  assert.equal(
    split(p.net, 5).reduce((a, b) => a + b),
    p.net,
  );
  assert.equal(display(units("0.01")), "0.01");
  for (const value of ["-2", "0", "0.001", "1e4", "Infinity"])
    assert.throws(() => units(value));
});
test("funding must move the expected asset, amount and recipient", () => {
  const c = { from: to[0], to: [core], amounts: ["100"] };
  assert.equal(
    verifiedTransfers("fund", c, 0, asset, [transfer(to[0], core, 100n)]),
    true,
  );
  assert.equal(
    verifiedTransfers("fund", c, 0, asset, [transfer(to[0], core, 99n)]),
    false,
  );
  assert.equal(
    verifiedTransfers("fund", c, 0, core, [transfer(to[0], core, 100n)]),
    false,
  );
});
test("individual and five-way payouts require matching registry and token events", () => {
  for (const size of [1, 5]) {
    const members = to.slice(0, size),
      amounts = split(101n, size);
    const c = {
      core,
      ledgerId: id.toString("hex"),
      from: core,
      to: members,
      amounts: amounts.map(String),
    };
    const p = event(
      core,
      [
        nativeToScVal("payout", { type: "symbol" }),
        nativeToScVal(id),
        nativeToScVal(1, { type: "u32" }),
      ],
      xdr.ScVal.scvVoid(),
    );
    const ts = members.map((w, i) => transfer(core, w, amounts[i]));
    assert.equal(verifiedTransfers("release", c, 1, asset, [p, ...ts]), true);
    assert.equal(verifiedTransfers("release", c, 2, asset, [p, ...ts]), false);
    assert.equal(verifiedTransfers("release", c, 1, asset, ts), false);
    assert.equal(
      verifiedTransfers("release", c, 1, asset, [p, ...ts.slice(1)]),
      false,
    );
  }
});

test("the sponsor covers fees so the first-place prize is exactly five USDC", () => {
  assert.equal(WINNER_FUNDING.net, units("5"));
  assert.equal(display(WINNER_FUNDING.gross), "5.1177072");
  assert.equal(
    WINNER_FUNDING.net + WINNER_FUNDING.platform + WINNER_FUNDING.protocol,
    WINNER_FUNDING.gross,
  );
  assert.deepEqual(split(WINNER_UNITS, 1), [units("5")]);
  assert.deepEqual(split(WINNER_UNITS, 5), Array(5).fill(units("1")));
});
