import { createHash, randomBytes } from "node:crypto";
import { Address, Contract, Networks, StrKey, Transaction, TransactionBuilder, scValToNative, xdr } from "@stellar/stellar-sdk";
import { addr, bool, bytes, i128, struct, sym, textVal, u32, vec } from "./xdr.ts";
import { display } from "../rules.ts";
import { FEES, type FundingMode } from "./rules.ts";

export type EscrowTerms = {
  id: string;
  name: string;
  core: string;
  sponsor: string;
  referee: string;
  organizer: string;
  admin: string;
  token: string;
  factory: string;
  wasm: string;
  mode: FundingMode;
  parts: bigint[];
};

export function buildEscrow(terms: EscrowTerms, salt = randomBytes(32).toString("hex")) {
  const core = addr(terms.core);
  const roles = struct({
    admin: addr(terms.admin),
    approvers: vec([core]),
    dispute_resolvers: vec([addr(terms.referee)]),
    observers: vec([]),
    platform: core,
    release_signers: vec([core]),
    service_providers: vec([core]),
  });
  const milestones = terms.parts.map((amount, index) => struct({
    amount: i128(amount),
    approvals: struct({ approval_count: u32(0), approved_by: vec([]), target: u32(1) }),
    description: textVal("Premio " + (index + 1)),
    dispute: struct({ is_disputed: bool(false), reason: textVal(""), resolved: bool(false) }),
    evidence: textVal(""),
    receiver: core,
    released: bool(false),
    status: textVal("pending"),
  }));
  const props = struct({
    description: textVal("Pozo de premios en Stellar Testnet"),
    engagement_id: textVal(terms.id),
    milestones: vec(milestones),
    platform_fee: u32(Number(FEES[terms.mode])),
    receiver_memo: u32(0),
    roles,
    title: textVal(terms.name),
    trustline: struct({ address: addr(terms.token) }),
  });
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId( new xdr.HashIdPreimageContractId({
    networkId,
    contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
      new xdr.ContractIdPreimageFromAddress({
        address: Address.fromString(terms.factory).toScAddress(),
        salt: Buffer.from(salt, "hex"),
      }),
    ),
  }));
  const escrow = StrKey.encodeContract(hash(preimage.toXDR()));
  return {
    escrow, salt,
    operation: new Contract(terms.factory).call(
      "tw_new_multi_release_escrow",
      addr(terms.sponsor), bytes(terms.wasm), bytes(salt),
      sym("initialize_escrow"), vec([props]), vec([addr(terms.sponsor), bytes(terms.wasm)]),
    ),
  };
}

const hash = (value: Uint8Array) => createHash("sha256").update(value).digest();
const networkId = hash(Buffer.from(Networks.TESTNET, "utf8"));
const endpoint = "https://beta.api.trustlesswork.com/escrow/multi-release/v2/";

export async function confirmVendorFunding(escrow: string, sponsor: string, amount: bigint) {
  const key = process.env.TRUSTLESS_WORK_API_KEY;
  if (!key) throw new Error("Falta configurar Trustless Work Testnet.");
  const response = await fetch(endpoint + "fund", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ contractId: escrow, signer: sponsor, amount: Number(display(amount)) }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Trustless Work todavía no pudo preparar el depósito de prueba (" + response.status + ").");
  const data = await response.json();
  if (typeof data.unsignedXdr !== "string") throw new Error("La respuesta de Trustless Work está incompleta.");
  const tx = TransactionBuilder.fromXDR(data.unsignedXdr, Networks.TESTNET);
  if (!(tx instanceof Transaction) || tx.source !== sponsor || tx.signatures.length || tx.operations.length !== 1) {
    throw new Error("La transacción de depósito tiene un formato inesperado.");
  }
  const op = tx.operations[0];
  if (op.type !== "invokeHostFunction" || op.func.type !== "hostFunctionTypeInvokeContract" || (op.source && op.source !== sponsor)) throw new Error("El depósito no coincide.");
  const call = op.func.invokeContract;
  if (Address.fromScAddress(call.contractAddress).toString() !== escrow ||
    call.functionName.toString() !== "fund_escrow" ||
    call.args.length !== 3 ||
    scValToNative(call.args[0]) !== sponsor ||
    scValToNative(call.args[2]) !== amount) {
    throw new Error("Trustless Work devolvió un depósito para otro importe o destinatario.");
  }
  // The app builds the signed Core invocation separately. It binds and funds in one transaction.
}
