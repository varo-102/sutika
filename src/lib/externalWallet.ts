import { Networks, StrKey } from "@stellar/stellar-sdk";
import type { CompetitionWallet } from "./walletRequests";

export async function connectTestWallet(): Promise<CompetitionWallet> {
  const freighter = await import("@stellar/freighter-api");
  const connection = await freighter.isConnected();
  if (!connection.isConnected)
    throw new Error(
      "Instala o habilita la extensión de Freighter y vuelve a intentarlo.",
    );

  async function checkNetwork() {
    const { networkPassphrase, error } = await freighter.getNetwork();
    if (error || networkPassphrase !== Networks.TESTNET)
      throw new Error(
        "Selecciona Testnet en tu billetera y vuelve a intentarlo.",
      );
  }

  // Ask for site permission before checking the extension's network.
  const { address, error } = await freighter.requestAccess();
  if (error || !StrKey.isValidEd25519PublicKey(address))
    throw new Error("Abre tu billetera y confirma el acceso al sitio.");
  await checkNetwork();

  const options = { address, networkPassphrase: Networks.TESTNET };
  return {
    address,
    async signMessage(message) {
      await checkNetwork();
      const proof = await freighter.signMessage(message, options);
      if (
        proof.error ||
        proof.signerAddress !== address ||
        !proof.signedMessage
      )
        throw new Error(
          "Confirma la firma con la misma cuenta que conectaste.",
        );
      if (typeof proof.signedMessage === "string") return proof.signedMessage;
      return btoa(
        Array.from(proof.signedMessage, (byte) =>
          String.fromCharCode(byte),
        ).join(""),
      );
    },
    async signTransaction(xdr) {
      await checkNetwork();
      const proof = await freighter.signTransaction(xdr, options);
      if (proof.error || proof.signerAddress !== address || !proof.signedTxXdr)
        throw new Error(
          "Confirma la transacción con la misma cuenta que conectaste.",
        );
      return proof.signedTxXdr;
    },
  };
}
