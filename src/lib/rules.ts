export const games = {
  CLASH_ROYALE: { name: "Clash Royale", format: "1v1", size: 1 },
  MOBILE_LEGENDS: { name: "Mobile Legends: Bang Bang", format: "5v5", size: 5 },
} as const;
export type Game = keyof typeof games;
export function gameOf(value: string): Game {
  if (value !== "CLASH_ROYALE" && value !== "MOBILE_LEGENDS")
    throw new Error("Juego inválido.");
  return value;
}
export const UNIT = 10_000_000n;
export const PLATFORM_BPS = 200n;
export const PROTOCOL_BPS = 30n;
export function units(value: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value))
    throw new Error("Usa un monto positivo con hasta dos decimales.");
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * UNIT + BigInt(fraction.padEnd(7, "0"));
  if (amount <= 0n) throw new Error("El importe debe ser mayor que cero.");
  return amount;
}
export function display(amount: bigint) {
  const tail = (amount % UNIT).toString().padStart(7, "0").replace(/0+$/, "");
  return (amount / UNIT).toString() + (tail ? "." + tail : "");
}
export function prizeAmounts(gross: bigint) {
  const platform = (gross * PLATFORM_BPS) / 10_000n;
  const protocol = (gross * PROTOCOL_BPS) / 10_000n;
  return { gross, platform, protocol, net: gross - platform - protocol };
}
// The sponsor covers both fees so the advertised amount arrives in the winners' wallets.
export const WINNER_USDC = 5;
export const WINNER_UNITS = BigInt(WINNER_USDC) * UNIT;
export const WINNER_FUNDING = prizeAmounts(
  (WINNER_UNITS * 10_000n) / (10_000n - PLATFORM_BPS - PROTOCOL_BPS),
);

export function split(total: bigint, count: number) {
  if (count !== 1 && count !== 5) throw new Error("Plantilla inválida.");
  const n = BigInt(count);
  return Array.from(
    { length: count },
    (_, i) => total / n + (BigInt(i) < total % n ? 1n : 0n),
  );
}
