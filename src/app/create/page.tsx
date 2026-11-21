import Link from "next/link";
import { ArrowLeft, CirclePlus, Crown } from "lucide-react";
import V3Create from "@/components/V3Create";
import { activeCore } from "@/lib/v3/chain";
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
          Elige el juego y cómo se forma el premio. Revisa el monto, las tarifas y los cupos antes de
          conectar tu cuenta de prueba.
        </p>
      </header>
      <section className="panel">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Crown />
          </span>
          <h2>Configurar la competencia</h2>
        </div>
        {activeCore() ? <V3Create /> : <p>La creación en Stellar Testnet todavía no está disponible en este entorno.</p>}
      </section>
    </div>
  );
}
