import "server-only";
import { PublicError } from "./errors.ts";
import { createHash, randomUUID } from "node:crypto";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { database } from "./prisma";

export function wallet(value: unknown) {
  if (typeof value !== "string" || !StrKey.isValidEd25519PublicKey(value))
    throw new PublicError("Se necesita una billetera Stellar válida.", "A valid Stellar account is required.");
  return value;
}
export function shortText(input: unknown, max: number) {
  if (typeof input !== "string" || !input.trim() || input.trim().length > max)
    throw new PublicError("Revisa los campos del formulario.", "Check the form fields.");
  return input.trim();
}
export type ActionInput = Record<string, unknown>;
function digest(action: ActionInput) {
  // The exact JSON payload is signed and sent back unchanged.
  return createHash("sha256").update(JSON.stringify(action)).digest("hex");
}
function message(
  id: string,
  address: string,
  intent: string,
  expires: Date,
  action: ActionInput,
) {
  return [
    "Sutika · Stellar Testnet",
    "Acción: " + shortText(action.kind, 30),
    "Billetera: " + address,
    "Datos: " + JSON.stringify(action),
    "Huella: " + intent,
    "Solicitud: " + id,
    "Vence: " + expires.toISOString(),
  ].join("\n");
}
export async function challenge(address: string, action: ActionInput) {
  const db = database();
  const now = new Date();
  await db.walletChallenge.deleteMany({ where: { expiresAt: { lt: now } } });

  const id = randomUUID(),
    intent = digest(action),
    expires = new Date(Date.now() + 300_000);
  const text = message(id, address, intent, expires, action);
  await db.walletChallenge.create({
    data: { id, address, digest: intent, expiresAt: expires },
  });
  return { id, message: text };
}
export async function authorize(
  address: string,
  action: ActionInput,
  id: unknown,
  signature: unknown,
) {
  const db = database();
  const key = shortText(id, 64),
    sig = shortText(signature, 128);
  const row = await db.walletChallenge.findUnique({ where: { id: key } });
  const intent = digest(action);
  if (
    !row ||
    row.address !== address ||
    row.expiresAt <= new Date() ||
    row.digest !== intent
  )
    throw new PublicError("La solicitud de firma venció o cambió.", "The signature request expired or changed.");
  const bytes = createHash("sha256")
    .update(
      "Stellar Signed Message:\n" +
        message(key, address, intent, row.expiresAt, action),
    )
    .digest();
  if (!Keypair.fromPublicKey(address).verify(bytes, Buffer.from(sig, "base64")))
    throw new PublicError("La firma de la billetera es inválida.", "The wallet signature is invalid.");
  const used = await db.walletChallenge.deleteMany({
    where: { id: key, expiresAt: { gt: new Date() } },
  });
  if (used.count !== 1)
    throw new PublicError("Esta solicitud de firma ya fue utilizada.", "This signature request has already been used.");
}
