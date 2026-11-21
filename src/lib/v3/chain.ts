import "server-only";
import { Address, BASE_FEE, Contract, Networks, rpc, scValToNative, StrKey, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import old from "../deployment.json";
import release from "./deployment.json";
import { addr, bytes, i128, struct, sym, u32, u64, vec } from "./xdr";
import { MODE, type FundingMode } from "./rules";

export const manifest = release;
export const usdc = old.usdc;
export const testnet = Networks.TESTNET;
export const stellarV3 = () => new rpc.Server("https://soroban-testnet.stellar.org", { timeout: 10_000 });

export function activeCore() {
  const value = process.env.NEXT_PUBLIC_SUTIKA_V3_CONTRACT_ID || manifest.contractId;
  return StrKey.isValidContract(value) ? value : null;
}

export type Setup = {
  organizer: string;
  sponsor: string;
  referee: string;
  mode: FundingMode;
  size: number;
  min: number;
  max: number;
  deadline: number;
  entry: string;
  places: number[];
  sponsorParts: string[];
};

export function tournamentRules(r: Setup) {
  return struct({
    organizer: addr(r.organizer), sponsor: addr(r.sponsor), referee: addr(r.referee),
    mode: u32(MODE[r.mode]), team_size: u32(r.size),
    min_teams: u32(r.min), max_teams: u32(r.max), deadline: u64(r.deadline),
    entry_fee: i128(BigInt(r.entry)), place_weights: vec(r.places.map(u32)),
    sponsor_parts: vec(r.sponsorParts.map((x) => i128(BigInt(x)))),
  });
}

export type ChainSettings = { token: string; platform: string; protocol: string; factory: string; escrow_admin: string };
export type ChainTeam = { members: string[]; weights: number[]; payer: string; contribution: bigint; refunded: boolean };
export type ChainOutcome = {
  places: Uint8Array[];
  challenge_ends: bigint;
  evidence: Uint8Array;
  approved: boolean;
  disputed: boolean;
  revision: number;
};
export type ChainCompetition = {
  escrow: string | null;
  teams: Uint8Array[];
  locked_teams: Uint8Array[];
  roster_hash: Uint8Array | null;
  entry_gross: bigint;
  entry_locked: bigint;
  outcome: ChainOutcome[];
  cancelled: boolean;
  paid_slots: number[];
  sponsor_refunded: boolean;
};

export const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");

function storageKey(kind: string, keys: xdr.ScVal[]) {
  return vec([sym(kind), ...keys]);
}

export function ledgerKey(core: string, kind: string, keys: xdr.ScVal[]) {
  return xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
    contract: Address.fromString(core).toScAddress(),
    durability: xdr.ContractDataDurability.persistent,
    key: storageKey(kind, keys),
  }));
}

async function contractState<T>(core: string, key: string, ...args: xdr.ScVal[]) {
  const result = await stellarV3().getLedgerEntries(ledgerKey(core, key, args));
  const entry = result.entries[0]?.val;
  return entry?.type === "contractData" ? scValToNative(entry.contractData.val) as T : null;
}

export const onChain = (core: string, id: string) =>
  contractState<ChainCompetition>(core, "Tournament", bytes(id));

export const rosterOnChain = (core: string, id: string, team: string) =>
  contractState<ChainTeam>(core, "Team", bytes(id), bytes(team));

export async function rostersOnChain(core: string, id: string, teams: Uint8Array[]) {
  if (!teams.length) return [];
  const result = await stellarV3().getLedgerEntries(
    ...teams.map((team) => ledgerKey(core, "Team", [bytes(id), bytes(hex(team))])),
  );
  return result.entries.flatMap((entry) => {
    if (entry.val.type !== "contractData" || entry.key.type !== "contractData") return [];
    const [, , team] = scValToNative(entry.key.contractData.key);
    return [{ id: hex(team as Uint8Array), ...scValToNative(entry.val.contractData.val) as ChainTeam }];
  });
}

export async function settingsOnChain(core: string) {
  const settings = await contractState<ChainSettings>(core, "Settings");
  if (!settings || settings.token !== usdc || settings.factory !== manifest.trustlessFactory) {
    throw new Error("La configuración del contrato no coincide con Stellar Testnet.");
  }
  return settings;
}

export async function prepareTransaction(actor: string, operation: ReturnType<Contract["call"]>, joining: boolean) {
  const server = stellarV3();
  const account = await server.getAccount(actor).catch(() => {
    throw new Error("Activa tu cuenta de Stellar Testnet antes de firmar.");
  });
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: testnet })
    .addOperation(operation).setTimeout(120).build();
  const simulation = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error("Stellar rechazó la preparación. Revisa la billetera, el saldo de prueba y la etapa del torneo.");
  }
  if (joining) {
    // Registrations can land between simulation and execution. Leave 1 KiB for
    // the remaining team IDs, with a 0.0005 XLM Testnet resource allowance.
    const { resources, resourceFee } = simulation.transactionData.build();
    simulation.transactionData
      .setResources(resources.instructions, resources.diskReadBytes, resources.writeBytes + 1024)
      .setResourceFee(resourceFee + 5000n);
  }
  return rpc.assembleTransaction(tx, simulation).build();
}
