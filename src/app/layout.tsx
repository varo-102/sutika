import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { deployment } from "@/lib/stellar";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SUTIKA · Torneos y premios verificables",
    template: "%s · SUTIKA",
  },
  description:
    "Torneos de Clash Royale y Mobile Legends con un premio de 5 USDC de prueba para el primer puesto en Stellar Testnet.",
  icons: { icon: "/branding/isologo-transparente-sutika.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#contenido">
          Ir al contenido
        </a>
        <Navbar />
        <main className="wrap" id="contenido">
          {children}
        </main>
        <footer>
          <div className="wrap foot">
            <div className="foot-brand">
              <Link href="/" className="footer-logo">
                SUTIKA
              </Link>
              <span>Verdad y Claridad a Plena Luz (Sut&apos;i)</span>
            </div>
            <div className="foot-project">
              <span>Construido para el Hackathon Stellar &amp; Soroban</span>
              <Link href="/evaluator#red" className="foot-network">
                <i />
                Stellar Testnet Protocol {deployment.protocol}
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
