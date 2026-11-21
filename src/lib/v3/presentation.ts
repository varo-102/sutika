import { translate, type Locale } from "../locale.ts";
import { display } from "../rules.ts";
import { type FundingMode } from "./rules.ts";

export function modeName(mode: FundingMode, locale: Locale) {
  const t = translate(locale);
  return {
    sponsored: t("Patrocinado", "Sponsored"),
    entry: t("Por inscripción", "Entry fees"),
    mixed: t("Mixto", "Combined"),
  }[mode];
}

export function usdcAmount(value: bigint, locale: Locale) {
  const amount = display(value);
  return (locale === "es" ? amount.replace(".", ",") : amount) + "\u00a0USDC";
}
