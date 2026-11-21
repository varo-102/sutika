import { display, UNIT, units } from "../rules.ts";

export const MODE = { sponsored: 0, entry: 1, mixed: 2 } as const;
export type FundingMode = keyof typeof MODE;
export const modeLabels: Record<FundingMode, string> = {
  sponsored: "Patrocinado",
  entry: "Por inscripción",
  mixed: "Mixto",
};

export const BPS = 10_000n;
export const PROTOCOL_FEE = 30n;
export const FEES = { sponsored: 250n, entry: 470n, mixed: 320n };
export const MIN_ENTRY = UNIT / 4n;
export const MAX_AMOUNT = 1_000_000n * UNIT;
export const WINDOW = 86_400;
export const MAX_TEAMS = 16;
export const MIN_TEAMS = 4;

export function fundingMode(value: unknown): FundingMode {
  if (value === "sponsored" || value === "entry" || value === "mixed") return value;
  throw new Error("Elige cómo se financia el premio.");
}

export function decimalAmount(value: string, minimum: bigint) {
  const amount = units(value);
  if (amount < minimum || amount > MAX_AMOUNT) {
    throw new Error("El importe debe estar entre " + display(minimum) + " y 1 000 000 USDC.");
  }
  return amount;
}

export function weights(value: unknown, sizes: number[]) {
  if (
    !Array.isArray(value) ||
    !sizes.includes(value.length) ||
    value.some((x) => typeof x !== "number" || !Number.isInteger(x) || x < 1 || x > 10_000) ||
    value.reduce((sum: number, x: number) => sum + x, 0) !== 10_000
  ) {
    throw new Error("El reparto debe sumar 100 %, con una parte positiva para cada puesto o titular.");
  }
  return value as number[];
}

// Cumulative boundaries allocate every stroop deterministically to a slot.
export function distribute(total: bigint, shares: number[]) {
  let points = 0n;
  return shares.map((weight) => {
    const start = total * points / BPS;
    points += BigInt(weight);
    return total * points / BPS - start;
  });
}

export function quote(gross: bigint, mode: FundingMode) {
  const platform = gross * FEES[mode] / BPS;
  const protocol = gross * PROTOCOL_FEE / BPS;
  return { gross, platform, protocol, net: gross - platform - protocol };
}

export function sponsorQuote(net: bigint, mode: FundingMode, podium: number[]) {
  return distribute(net, podium).map((target) => {
    let gross = target * BPS / (BPS - FEES[mode] - PROTOCOL_FEE);
    while (quote(gross, mode).net > target) gross -= 1n;
    while (quote(gross, mode).net < target) gross += 1n;
    return quote(gross, mode);
  });
}
