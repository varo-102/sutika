import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Music2, Send } from "lucide-react";
import { communityLinks } from "@/lib/communityLinks";
import Navbar from "@/components/Navbar";
import { localized, translate } from "@/lib/locale";
import "../globals.css";

export function generateStaticParams() {
  return [{ lang: "es" }, { lang: "en" }];
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const t = translate(lang === "en" ? "en" : "es");
  return {
    title: {
      default: t("SUTIKA · Torneos y premios verificables", "SUTIKA · Tournaments with verifiable prizes"),
      template: "%s · SUTIKA",
    },
    description: t(
      "Crea torneos de Clash Royale y Mobile Legends con premios verificables en USDC de prueba.",
      "Create Clash Royale and Mobile Legends tournaments with verifiable test USDC prizes.",
    ),
    icons: { icon: "/branding/isologo-transparente-sutika.png" },
  };
}

export default async function Layout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (lang !== "en" && lang !== "es") notFound();
  const t = translate(lang);
  return (
    <html lang={lang}>
      <body>
        <a className="skip-link" href="#contenido">{t("Ir al contenido", "Skip to content")}</a>
        <Navbar locale={lang} />
        <main className="wrap" id="contenido">{children}</main>
        <footer>
          <div className="wrap foot">
            <div className="foot-brand">
              <Link href={localized(lang, "/")} className="footer-logo">SUTIKA</Link>
              <span>{t("Verdad y Claridad a Plena Luz (Sut’i)", "Truth and clarity in full light (Sut’i)")}</span>
            </div>
            <nav className="foot-community" aria-label={t("Soporte y redes de SUTIKA", "SUTIKA support and social media")}>
              <a href={communityLinks.telegram} target="_blank" rel="noopener noreferrer">
                <Send size={16} aria-hidden="true" /> {t("Soporte en Telegram", "Support on Telegram")}
              </a>
              <a href={communityLinks.tiktok} target="_blank" rel="noopener noreferrer">
                <Music2 size={16} aria-hidden="true" /> {t("@sutikatorneos en TikTok", "@sutikatorneos on TikTok")}
              </a>
            </nav>
            <div className="foot-project">
              <span>{t("Construido para el Hackathon Stellar & Soroban", "Built for the Stellar & Soroban Hackathon")}</span>
              <Link href={localized(lang, "/evaluator#red")} className="foot-network">
                <i /> {t("Stellar Testnet · Red de prueba", "Stellar Testnet · Test network")}
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
