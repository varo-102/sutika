import { Networks, StrKey } from "@stellar/stellar-sdk";
import { translate, type Locale } from "./locale";
import type { CompetitionWallet } from "./walletRequests";

export async function connectTestWallet(locale: Locale = "es"): Promise<CompetitionWallet> {
  const t = translate(locale);
  const freighter = await import("@stellar/freighter-api");
  const connection = await freighter.isConnected();
  if (!connection.isConnected) throw new Error(t("Abre la extensión Varial (Freighter) y vuelve a intentarlo.", "Open the Varial (Freighter) extension and try again."));

  async function checkNetwork() {
    const { networkPassphrase, error } = await freighter.getNetwork();
    if (error || networkPassphrase !== Networks.TESTNET)
      throw new Error(t("Selecciona Testnet en tu billetera.", "Switch your wallet to Testnet."));
  }

  const { address, error } = await freighter.requestAccess();
  if (error || !StrKey.isValidEd25519PublicKey(address))
    throw new Error(t("Abre tu billetera y confirma el acceso al sitio.", "Open your wallet and approve access to this site."));
  await checkNetwork();

  const options = { address, networkPassphrase: Networks.TESTNET };
  const sameAccount = () => t("Confirma la firma con la misma cuenta que conectaste.", "Sign with the same account you connected.");
  return {
    address,
    async signMessage(message) {
      await checkNetwork();
      const proof = await freighter.signMessage(message, options);
      if (proof.error || proof.signerAddress !== address || !proof.signedMessage) throw new Error(sameAccount());
      if (typeof proof.signedMessage === "string") return proof.signedMessage;
      return btoa(Array.from(new Uint8Array(proof.signedMessage), (byte) => String.fromCharCode(byte)).join(""));
    },
    async signTransaction(xdr) {
      await checkNetwork();
      const proof = await freighter.signTransaction(xdr, options);
      if (proof.error || proof.signerAddress !== address || !proof.signedTxXdr) throw new Error(sameAccount());
      return proof.signedTxXdr;
    },
  };
}
