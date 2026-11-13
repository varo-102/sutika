import {
  rpc,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import crypto from "crypto";

export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET";
export const STELLAR_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const SUTIKA_CONTRACT_ID =
  process.env.NEXT_PUBLIC_SUTIKA_CONTRACT_ID ||
  "CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T";

// Clave del deployer/patrocinador para transacciones del backend (Fee Sponsorship)
export const DEPLOYER_SECRET =
  process.env.SOROBAN_SPONSOR_SECRET ||
  "SD5QIDFF6QTJQARP4X4R7UTJB5DMM4QZMMHV3I3WMOBIIYOURTSYKWNN";

export const getRpcServer = () => new rpc.Server(SOROBAN_RPC_URL);

export const getExplorerTxUrl = (txHash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${txHash}`;

export const getExplorerContractUrl = (contractId = SUTIKA_CONTRACT_ID) =>
  `https://stellar.expert/explorer/testnet/contract/${contractId}`;

/**
 * Computa el IdentityHash criptográfico para validación diferida de identidad (Claim-Gated KYC)
 * SHA-256(userId || documentNumber || tournamentId || salt)
 */
export function computeIdentityHash(
  userId: string,
  documentNumber: string,
  tournamentId: string,
  salt = "sutika_salt_2026"
): { hashHex: string; hashBytes: Buffer } {
  const payload = `${userId}:${documentNumber.trim().toUpperCase()}:${tournamentId}:${salt}`;
  const hash = crypto.createHash("sha256").update(payload).digest();
  return {
    hashHex: hash.toString("hex"),
    hashBytes: hash,
  };
}

/**
 * Inicializa el Escrow en Soroban para un torneo (Lazy Upgrade On-Chain)
 */
export async function initEscrowOnChain(params: {
  tournamentId: string;
  organizerAddress: string;
  sponsorSecret?: string;
  deadlineLedgerOffset?: number;
  prize1Amount: number;
  prize1IsVoucher: boolean;
  prize2Amount: number;
  prize2IsVoucher: boolean;
  prize3Amount: number;
  prize3IsVoucher: boolean;
}): Promise<{ txHash: string; contractId: string; success: boolean; error?: string }> {
  try {
    const server = getRpcServer();
    const sponsorKeypair = Keypair.fromSecret(params.sponsorSecret || DEPLOYER_SECRET);
    const account = await server.getAccount(sponsorKeypair.publicKey());

    const latestLedger = await server.getLatestLedger();
    const deadlineLedger = latestLedger.sequence + (params.deadlineLedgerOffset || 50000);

    const contract = new Contract(SUTIKA_CONTRACT_ID);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "init_tournament_escrow",
          nativeToScVal(params.tournamentId, { type: "string" }),
          nativeToScVal(params.organizerAddress || sponsorKeypair.publicKey(), { type: "address" }),
          nativeToScVal(sponsorKeypair.publicKey(), { type: "address" }),
          nativeToScVal(deadlineLedger, { type: "u32" }),
          nativeToScVal(BigInt(Math.floor(params.prize1Amount * 100)), { type: "i128" }),
          nativeToScVal(params.prize1IsVoucher, { type: "bool" }),
          nativeToScVal(BigInt(Math.floor(params.prize2Amount * 100)), { type: "i128" }),
          nativeToScVal(params.prize2IsVoucher, { type: "bool" }),
          nativeToScVal(BigInt(Math.floor(params.prize3Amount * 100)), { type: "i128" }),
          nativeToScVal(params.prize3IsVoucher, { type: "bool" })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(sponsorKeypair);

    const sendResponse = await server.sendTransaction(preparedTx);
    if (sendResponse.status === "ERROR") {
      throw new Error(`Error enviando transacción: ${JSON.stringify(sendResponse)}`);
    }

    // Esperar confirmación
    let txResult = await server.getTransaction(sendResponse.hash);
    let attempts = 0;
    while (txResult.status === "NOT_FOUND" && attempts < 10) {
      await new Promise((r) => setTimeout(r, 1500));
      txResult = await server.getTransaction(sendResponse.hash);
      attempts++;
    }

    return {
      txHash: sendResponse.hash,
      contractId: SUTIKA_CONTRACT_ID,
      success: txResult.status === "SUCCESS",
    };
  } catch (err: any) {
    console.error("Error al inicializar escrow on-chain:", err);
    return {
      txHash: "",
      contractId: SUTIKA_CONTRACT_ID,
      success: false,
      error: err.message || "Error desconocido",
    };
  }
}

/**
 * Reclama un premio en Soroban para el capitán del podio con su IdentityHash
 */
export async function claimPodiumPrizeOnChain(params: {
  tournamentId: string;
  standing: number;
  captainKeypair?: Keypair;
  identityHashBytes: Buffer;
}): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    const server = getRpcServer();
    const captain = params.captainKeypair || Keypair.fromSecret(DEPLOYER_SECRET);
    const account = await server.getAccount(captain.publicKey());

    const contract = new Contract(SUTIKA_CONTRACT_ID);

    const scValIdentityHash = xdr.ScVal.scvBytes(params.identityHashBytes);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "claim_podium_prize",
          nativeToScVal(params.tournamentId, { type: "string" }),
          nativeToScVal(params.standing, { type: "u32" }),
          nativeToScVal(captain.publicKey(), { type: "address" }),
          scValIdentityHash
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(captain);

    const sendResponse = await server.sendTransaction(preparedTx);
    if (sendResponse.status === "ERROR") {
      throw new Error(`Error enviando transacción de cobro: ${JSON.stringify(sendResponse)}`);
    }

    return {
      txHash: sendResponse.hash,
      success: true,
    };
  } catch (err: any) {
    console.error("Error al reclamar premio on-chain:", err);
    return {
      txHash: "",
      success: false,
      error: err.message || "Error al procesar el reclamo en Soroban",
    };
  }
}
