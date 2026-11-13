import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Sutika — Patrocinios y Premios Verificables en Stellar Soroban",
  description:
    "Capa de confianza, custodia de premios (Promotional Escrow) y activación comercial de sponsors para torneos deportivos, escolares, esports y hackatones sobre Stellar y Soroban.",
  icons: {
    icon: "/branding/isologo-transparente-sutika.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-sutika-bg text-sutika-text flex flex-col min-h-screen antialiased selection:bg-sutika-gold selection:text-sutika-bg">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-sutika-border/70 py-8 bg-sutika-bg text-center text-xs text-sutika-muted">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide">SUTIKA</span>
              <span>— Verdad y Claridad a Plena Luz (Sut&apos;i)</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Construido para el Hackathon Stellar &amp; Soroban</span>
              <span>•</span>
              <span className="font-mono text-sutika-purple">Stellar Testnet Protocol 22</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
