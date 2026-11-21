import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sutika · Premios de esports", template: "%s · Sutika" },
  description:
    "Torneos bolivianos de Clash Royale y Mobile Legends con premios en Stellar Testnet.",
  icons: { icon: "/branding/isologo-transparente-sutika.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="wrap">{children}</main>
        <footer>
          <div className="wrap foot">
            <strong>SUTIKA</strong>
            <span>Bolivia · Stellar Testnet</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
