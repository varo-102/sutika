import Link from "next/link";
import { ArrowLeft, ExternalLink, Flag, Trophy } from "lucide-react";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
import { games, gameOf } from "@/lib/rules";

export default function PublicRegistration({ slug }: { slug: string }) {
  const registration = deployment.registrations.find((r) => r.slug === slug);
  if (!registration)
    return (
      <section className="narrow">
        <Link className="inline-link" href="/#torneos">
          <ArrowLeft />
          Volver a torneos
        </Link>
        <h1>Datos del torneo no disponibles</h1>
        <p>Vuelve a intentarlo cuando se restablezca la conexión.</p>
      </section>
    );
  const game = games[gameOf(registration.game)];
  return (
    <article className="detail-shell">
      <header className="heading tournament-heading">
        <Link href="/#torneos">
          <ArrowLeft size={16} />
          Volver a torneos
        </Link>
        <p className="eyebrow">
          {game.name} · {game.format}
        </p>
        <h1>{registration.name}</h1>
        <p>Registro confirmado en Stellar Testnet.</p>
      </header>
      <section className="prize-summary">
        <div>
          <p className="eyebrow">
            <Trophy />
            Premio previsto para el primer puesto
          </p>
          <h2 id="premio">
            5 USDC <small>de prueba</small>
          </h2>
          <p>
            {game.size === 5
              ? "1 USDC por titular del equipo ganador."
              : "5 USDC al jugador ganador."}
          </p>
        </div>
      </section>
      <section id="historial" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Flag />
          </span>
          <h2>Registro del torneo</h2>
        </div>
        <p className="data-notice">
          Los datos en vivo no están disponibles. Puedes verificar el registro
          público; los inscritos, el depósito y el pago todavía requieren
          consulta en vivo.
        </p>
        <div className="buttons">
          <a
            className="btn btn-gold"
            target="_blank"
            rel="noreferrer"
            href={getExplorerTxUrl(registration.tx)}
          >
            Ver registro en Stellar <ExternalLink />
          </a>
          <a
            className="btn btn-dark"
            target="_blank"
            rel="noreferrer"
            href={getExplorerContractUrl()}
          >
            Abrir contrato <ExternalLink />
          </a>
        </div>
      </section>
    </article>
  );
}
