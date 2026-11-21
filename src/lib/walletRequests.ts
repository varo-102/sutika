export type CompetitionWallet = {
  address: string;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (xdr: string) => Promise<string>;
};

type Reply = {
  id?: string;
  message?: string;
  slug?: string;
  error?: string;
  xdr?: string;
  hash?: string;
  status?: string;
};

export async function api(body: Record<string, unknown>): Promise<Reply> {
  const result = await fetch("/api/competition", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await result.json();
  if (!result.ok)
    throw new Error(response.error || "La operación no se completó.");
  return response;
}

export async function signedAction(
  wallet: CompetitionWallet,
  action: Record<string, unknown>,
) {
  const { address } = wallet;
  const challenge = await api({ step: "challenge", address, action });
  if (!challenge.message || !challenge.id)
    throw new Error("No se recibió una solicitud de firma.");
  const signature = await wallet.signMessage(challenge.message);
  return api({
    step: "execute",
    address,
    action,
    id: challenge.id,
    signature,
  });
}
