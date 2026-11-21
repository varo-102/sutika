import Image from "next/image";
import Link from "next/link";
import { listTournaments } from "@/lib/tournamentsService";
import { games, gameOf } from "@/lib/rules";
import { getExplorerContractUrl } from "@/lib/stellar";
export const dynamic = "force-dynamic";

export default async function Home() {
  const tournaments = await listTournaments().catch(() => null);
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-rule" aria-hidden="true" />
              Esports en Bolivia
            </p>
            <h1 id="hero-title">
              Torneos móviles.
              <br />
              <em>Premios verificables.</em>
            </h1>
            <p className="hero-description">
              Compite en Clash Royale y Mobile Legends. Sigue el depósito del
              patrocinador y el reparto de USDC de prueba a cada ganador.
            </p>
            <div className="buttons">
              <a className="primary" href="#torneos">
                Explorar torneos <span aria-hidden="true">↓</span>
              </a>
              <Link className="secondary" href="/evaluator">
                Modo evaluador <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <figure className="hero-figure">
            <div className="hero-photo">
              <Image
                src="/images/hero-esports.jpeg"
                alt="Participantes en el escenario de una competencia de esports"
                fill
                priority
                sizes="(max-width: 760px) 92vw, 480px"
                className="hero-art"
              />
            </div>
            <figcaption>
              <span>
                <i aria-hidden="true" />
                Stellar Testnet
              </span>
              <a href={getExplorerContractUrl()}>
                Ver contrato <span aria-hidden="true">↗</span>
              </a>
            </figcaption>
          </figure>
        </div>
        <div className="hero-facts">
          <div>
            <strong>
              1v1 <span>/</span> 5v5
            </strong>
            <small>Formatos de competencia</small>
          </div>
          <div>
            <strong>24 h</strong>
            <small>Para impugnar el podio</small>
          </div>
          <div>
            <strong>USDC</strong>
            <small>Activo de prueba en Stellar</small>
          </div>
        </div>
      </section>
      <section id="torneos">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-rule" aria-hidden="true" />
              Competición
            </p>
            <h2>Torneos</h2>
          </div>
          <Link href="/create">
            Crear torneo <span aria-hidden="true">↗</span>
          </Link>
        </div>
        {tournaments === null ? (
          <p className="notice">
            No pudimos consultar los torneos. Vuelve a cargar la página.
          </p>
        ) : tournaments.length === 0 ? (
          <p className="notice">Todavía no hay torneos publicados.</p>
        ) : (
          <div className="cards">
            {tournaments.map((t) => {
              const game = games[gameOf(t.category)],
                total = t.prizes.reduce(
                  (s, p) => s + Number(p.amountUsdc ?? 0),
                  0,
                ),
                clash = t.category === "CLASH_ROYALE";
              return (
                <Link
                  className="panel tournament-card"
                  href={"/tournaments/" + t.publicSlug}
                  key={t.publicSlug}
                >
                  <div className="tournament-art">
                    <Image
                      fill
                      sizes="(max-width: 760px) 94vw, 560px"
                      src={
                        clash
                          ? "/images/duelo-movil.webp"
                          : "/images/equipo-movil.webp"
                      }
                      alt=""
                    />
                    <span className="format">{game.format}</span>
                  </div>
                  <div className="card-copy">
                    <p className="eyebrow">{game.name}</p>
                    <h3>{t.name}</h3>
                    <p>{t._count.participants} participantes</p>
                    <div className="card-bottom">
                      <div>
                        <strong>{total.toLocaleString("es-BO")} USDC</strong>
                        <small>
                          {t.ledgerOperations.length
                            ? "Depósito confirmado"
                            : "Premio propuesto"}
                        </small>
                      </div>
                      <span className="card-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <section className="model">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-rule" aria-hidden="true" />
            Patrocinios
          </p>
          <h2>Organizar es gratis.</h2>
        </div>
        <p>
          El patrocinador aporta el pozo. Probamos una comisión de plataforma
          del 2 % dentro de un rango de 1–3 % por validar. Cada puesto muestra
          el monto bruto, las comisiones y el premio neto.
        </p>
      </section>
    </>
  );
}
