import { scValToNative, StrKey, xdr } from "@stellar/stellar-sdk";
export type ReceiptContext = {
  from?: string;
  to?: string[];
  amounts?: string[];
  core?: string;
  ledgerId?: string;
};
export function verifiedTransfers(
  kind: string,
  c: ReceiptContext,
  slot: number,
  usdc: string,
  events: xdr.ContractEvent[],
) {
  if (!c.to || !c.amounts || !c.from) return false;
  const sums = new Map<string, bigint>();
  let payout = false;
  for (const e of events) {
    const cid = e.contractId;
    if (!cid) continue;
    const contract = StrKey.encodeContract(cid.toBytes()),
      body = e.body.v0;
    const topics = body.topics.map(scValToNative);
    if (
      contract === c.core &&
      topics[0] === "payout" &&
      topics[1] instanceof Uint8Array &&
      Buffer.from(topics[1]).toString("hex") === c.ledgerId &&
      Number(topics[2]) === slot
    )
      payout = true;
    if (contract !== usdc || topics[0] !== "transfer" || topics[1] !== c.from)
      continue;
    const data = scValToNative(body.data),
      amount = typeof data === "bigint" ? data : data?.amount;
    if (typeof amount !== "bigint" || amount <= 0n) return false;
    const to = String(topics[2]);
    sums.set(to, (sums.get(to) ?? 0n) + amount);
  }
  return (
    (kind !== "release" || payout) &&
    sums.size === c.to.length &&
    c.to.every((to, i) => sums.get(to) === BigInt(c.amounts![i]))
  );
}
