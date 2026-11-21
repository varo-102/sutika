import Link from "next/link";
import { lang } from "next/root-params";
import { localized, translate } from "@/lib/locale";

export default async function NotFound() {
  const locale = (await lang()) === "en" ? "en" : "es";
  const t = translate(locale);
  return (
    <section className="narrow panel">
      <h1>{t("Página no encontrada", "Page not found")}</h1>
      <p>{t("Revisa el enlace o vuelve a la portada de SUTIKA.", "Check the link or return to the SUTIKA homepage.")}</p>
      <Link className="inline-link" href={localized(locale, "/")}>{t("Ir a inicio", "Back to home")}</Link>
    </section>
  );
}
