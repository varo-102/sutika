import type { CompetitionWallet } from "../walletRequests";

type Reply = {
  id?: string;
  message?: string;
  slug?: string;
  error?: string;
  xdr?: string;
  hash?: string;
  status?: string;
  url?: string;
  verification?: string;
};

async function request(body: Record<string, unknown>): Promise<Reply> {
  const response = await fetch("/api/competition/v3", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "La operación no se completó.");
  return value;
}

export async function executeV3(
  wallet: CompetitionWallet, action: Record<string, unknown>, message: (value: string) => void,
) {
  const { address } = wallet;
  message("Autoriza el paso en tu billetera.");
  const proof = await request({ step: "challenge", address, action });
  if (!proof.message || !proof.id) throw new Error("Falta la solicitud de firma.");
  const signature = await wallet.signMessage(proof.message);
  let receipt = await request({ step: "execute", address, action, id: proof.id, signature });
  if (!receipt.xdr || receipt.status === "CONFIRMED") return receipt;
  const id = receipt.id;
  message("Firma la operación de Stellar Testnet.");
  const xdr = await wallet.signTransaction(receipt.xdr);
  receipt = await request({ step: "receipt", id, xdr });
  message("Esperando confirmación de Stellar…");
  for (let i = 0; i < 9 && receipt.status === "PREPARED"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    receipt = await request({ step: "receipt", id });
  }
  if (receipt.status === "FAILED") throw new Error("Stellar rechazó la transacción. No se confirmó ningún cambio.");
  if (receipt.status === "EXPIRED") throw new Error("La transacción venció. Vuelve a firmar.");
  return receipt;
}

export const confirmV3 = (id: string) => request({ step: "receipt", id });
