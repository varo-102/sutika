import { translate, type Locale } from "../locale";
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

async function request(body: Record<string, unknown>, locale: Locale): Promise<Reply> {
  const t = translate(locale);
  let response: Response;
  try {
    response = await fetch("/api/competition/v3", {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": locale },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(t("No se pudo conectar. Revisa tu conexión y vuelve a intentarlo.", "Could not connect. Check your connection and try again."));
  }
  const value = await response.json().catch(() => null) as Reply | null;
  if (!response.ok || !value) throw new Error(value?.error || t("La operación no se completó.", "The operation could not be completed."));
  return value;
}

export async function executeV3(
  wallet: CompetitionWallet, action: Record<string, unknown>, message: (value: string) => void, locale: Locale = "es",
) {
  const t = translate(locale);
  const { address } = wallet;
  message(t("Autoriza el paso en tu billetera.", "Approve the request in your wallet."));
  const proof = await request({ step: "challenge", address, action }, locale);
  if (!proof.message || !proof.id) throw new Error(t("Falta la solicitud de firma.", "The signature request is missing."));
  const signature = await wallet.signMessage(proof.message);
  let receipt = await request({ step: "execute", address, action, id: proof.id, signature }, locale);
  if (!receipt.xdr || receipt.status === "CONFIRMED") return receipt;
  const id = receipt.id;
  message(t("Firma la operación de Stellar Testnet.", "Sign the Stellar Testnet transaction."));
  const xdr = await wallet.signTransaction(receipt.xdr);
  receipt = await request({ step: "receipt", id, xdr }, locale);
  message(t("Esperando confirmación de Stellar…", "Waiting for Stellar confirmation…"));
  for (let i = 0; i < 9 && receipt.status === "PREPARED"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    receipt = await request({ step: "receipt", id }, locale);
  }
  if (receipt.status === "FAILED") throw new Error(t("Stellar rechazó la transacción.", "Stellar rejected the transaction."));
  if (receipt.status === "EXPIRED") throw new Error(t("La transacción venció. Vuelve a firmar.", "The transaction expired. Sign again."));
  return receipt;
}

export const confirmV3 = (id: string, locale: Locale = "es") => request({ step: "receipt", id }, locale);
