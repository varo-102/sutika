import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import V3Create from "@/components/V3Create";
import { localized, translate } from "@/lib/locale";
import { activeCore } from "@/lib/v3/chain";

export async function generateMetadata({ params }: PageProps<"/[lang]/create">) {
  return { title: (await params).lang === "en" ? "Create a test tournament" : "Crear torneo de prueba" };
}

export default async function Create({ params }: PageProps<"/[lang]/create">) {
  const locale = (await params).lang === "en" ? "en" : "es";
  const t = translate(locale);
  return (
    <div className="narrow">
      <Link className="inline-link" href={localized(locale, "/#torneos")}><ArrowLeft />{t("Volver a torneos", "Back to tournaments")}</Link>
      <header className="eval-banner v3-create-header">
        <h1>{t("Crear torneo de prueba", "Create a test tournament")}</h1>
        <p>{t("Define el premio y revisa los importes antes de firmar. Solo se usa USDC de prueba.", "Set up the prize and review the amounts before signing. Only test USDC is used.")}</p>
      </header>
      <section className="panel">
        {activeCore() ? <V3Create locale={locale} /> : <p>{t("La creación en Stellar Testnet todavía no está disponible en este entorno.", "Tournament creation on Stellar Testnet is currently unavailable in this environment.")}</p>}
      </section>
    </div>
  );
}
