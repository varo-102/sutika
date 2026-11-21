import Link from "next/link";
import { localized, translate, type Locale } from "@/lib/locale";
import { ArrowLeft, ExternalLink, Flag, Trophy } from "lucide-react";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
import { games, gameOf } from "@/lib/rules";

export default function PublicRegistration({ slug, locale = "es" }: { slug: string; locale?: Locale }) {
  const tr = translate(locale);
  const registration = deployment.registrations.find((r) => r.slug === slug);
  if (!registration)
    return (
      <section className="narrow">
        <Link className="inline-link" href={localized(locale, "/#torneos")}>
          <ArrowLeft />
          {tr("Volver a torneos", "Back to tournaments")}
        </Link>
        <h1>{tr("Datos del torneo no disponibles", "Tournament data unavailable")}</h1>
        <p>{tr("Vuelve a intentarlo cuando se restablezca la conexión.", "Try again when the connection is restored.")}</p>
      </section>
    );
  const game = games[gameOf(registration.game)];
  return (
    <article className="detail-shell">
      <header className="heading tournament-heading">
        <Link href="/#torneos">
          <ArrowLeft size={16} />
          {tr("Volver a torneos", "Back to tournaments")}
        </Link>
        <p className="eyebrow">
          {game.name} · {game.format}
        </p>
        <h1>{registration.name}</h1>
        <p>{tr("Registro confirmado en Stellar Testnet.", "Registration confirmed on Stellar Testnet.")}</p>
      </header>
      <section className="prize-summary">
        <div>
          <p className="eyebrow">
            <Trophy />
            {tr("Premio previsto para el primer puesto", "Planned first-place prize")}
          </p>
          <h2 id="premio">
            5 USDC <small>{tr("de prueba", "test funds")}</small>
          </h2>
          <p>
            {game.size === 5
              ? tr("1 USDC por titular del equipo ganador.", "1 test USDC for each winning player.")
              : tr("5 USDC al jugador ganador.", "5 test USDC for the winner.")}
          </p>
        </div>
      </section>
      <section id="historial" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Flag />
          </span>
          <h2>{tr("Registro del torneo", "Tournament registration")}</h2>
        </div>
        <p className="data-notice">
          {tr("Los datos en vivo no están disponibles. Puedes verificar el registro público.", "Live details are unavailable. You can verify the public registration.")}
        </p>
        <div className="buttons">
          <a
            className="btn btn-gold"
            target="_blank"
            rel="noreferrer"
            href={getExplorerTxUrl(registration.tx)}
          >
            {tr("Ver registro en Stellar", "View registration on Stellar")} <ExternalLink />
          </a>
          <a
            className="btn btn-dark"
            target="_blank"
            rel="noreferrer"
            href={getExplorerContractUrl()}
          >
            {tr("Abrir contrato", "Open contract")} <ExternalLink />
          </a>
        </div>
      </section>
    </article>
  );
}
