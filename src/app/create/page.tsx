import Link from "next/link";
import { ArrowLeft, CirclePlus, Crown } from "lucide-react";
import WalletActions from "@/components/WalletActions";
export const metadata = { title: "Nuevo torneo" };
export default function Create() {
  return (
    <div className="narrow">
      <Link className="inline-link" href="/#torneos">
        <ArrowLeft />
        Volver a torneos
      </Link>
      <header className="eval-banner">
        <div className="eval-title">
          <span className="icon-tile gold">
            <CirclePlus />
          </span>
          <div>
            <p className="eyebrow">Organizadores</p>
            <h1>Nuevo torneo</h1>
          </div>
        </div>
        <p>
          Elige el juego y la billetera del patrocinador. Las inscripciones son
          gratuitas y el primer puesto recibe 5 USDC de prueba.
        </p>
      </header>
      <section className="panel">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Crown />
          </span>
          <h2>Configurar la competencia</h2>
        </div>
        <WalletActions />
      </section>
    </div>
  );
}
