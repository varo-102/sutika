import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock3,
  CirclePlus,
  Coins,
  Crown,
  Gamepad2,
  ShieldCheck,
  Swords,
  Zap,
} from "lucide-react";
import GameShowcase from "@/components/GameShowcase";
import { publicTournaments } from "@/lib/publicTournaments";
import { gameArt } from "@/lib/gameArt";
import { games, gameOf, WINNER_USDC } from "@/lib/rules";
import { deployment } from "@/lib/stellar";
export const dynamic = "force-dynamic";

export default async function Home() {
  const { tournaments, live } = await publicTournaments();
  return (
    <>
      <section className="arena-hero" aria-labelledby="hero-heading">
        <div className="arena-hero-main">
          <div className="hero-story">
            <p className="hero-kicker">
              <Zap size={15} aria-hidden="true" />
              Esports en Bolivia <span aria-hidden="true">/</span> Stellar
              Testnet
            </p>
            <h1 id="hero-heading">
              Tu esfuerzo en la arena.
              <br />
              <em>Premios verificables.</em>
            </h1>
            <p className="hero-intro">
              Compite en <strong>Clash Royale</strong> o{" "}
              <strong>Mobile Legends</strong>. El primer puesto gana{" "}
              <strong>5 USDC de prueba</strong>. Desde el depósito del
              patrocinador hasta la última transferencia, el premio se puede
              seguir en Stellar.
            </p>
            <div className="buttons">
              <Link href="/evaluator" className="btn btn-gold">
                <Award />
                Modo evaluador
                <ArrowRight className="motion-arrow" />
              </Link>
              <a href="#torneos" className="btn btn-dark">
                Explorar torneos
                <ArrowRight className="motion-arrow" />
              </a>
            </div>
          </div>
          <GameShowcase />
        </div>
        <dl className="hero-stats">
          <div>
            <dt>
              <Coins />
              Premio por torneo
            </dt>
            <dd>{WINNER_USDC} USDC</dd>
          </div>
          <div>
            <dt>
              <Swords />
              Formatos de juego
            </dt>
            <dd>
              1v1 <span>/</span> 5v5
            </dd>
          </div>
          <div>
            <dt>
              <Clock3 />
              Para impugnar
            </dt>
            <dd>24 horas</dd>
          </div>
          <div>
            <dt>
              <ShieldCheck />
              Red de prueba
            </dt>
            <dd>
              <Link href="/evaluator#red">
                Protocol {deployment.protocol} <CheckCircle2 size={16} />
              </Link>
            </dd>
          </div>
        </dl>
      </section>
      <section
        className="directory"
        id="torneos"
        aria-labelledby="torneos-heading"
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">
              <Gamepad2 />
              Competiciones
            </p>
            <h2 id="torneos-heading">Torneos de la comunidad</h2>
          </div>
          <Link className="text-action" href="/create">
            <CirclePlus size={17} />
            Crear torneo
          </Link>
        </div>
        {!live && (
          <p className="data-notice">
            Mostramos los registros confirmados en Stellar. Los datos en vivo no
            están disponibles.
          </p>
        )}
        <div className="tournament-list">
          {tournaments.map((t) => {
            const key = gameOf(t.category),
              game = games[key],
              art = gameArt[key];
            const paid = t.status === "paid",
              funded = t.status === "funded";
            return (
              <Link
                className="competition-card"
                href={"/tournaments/" + t.publicSlug}
                key={t.publicSlug}
              >
                <div className="competition-art">
                  <Image
                    src={art.card}
                    alt=""
                    fill
                    sizes="(max-width: 740px) 94vw, (max-width: 1180px) 48vw, 600px"
                    quality={90}
                  />
                  <span className="format-tag">
                    <Swords size={14} />
                    {game.format}
                  </span>
                </div>
                <div className="competition-info">
                  <p className="game-label">{game.name}</p>
                  <h3>{t.name}</h3>
                  <p className="entry-count">
                    {t.participants === null
                      ? "Registro verificable"
                      : t.participants + " participantes"}{" "}
                    <span>·</span> Torneo de prueba
                  </p>
                  <div className="competition-bottom">
                    <div>
                      <span className="reward">
                        <Crown size={17} />
                        {t.amount} USDC
                      </span>
                      <small>
                        Primer puesto ·{" "}
                        {paid
                          ? "Pago confirmado"
                          : funded
                            ? "En custodia"
                            : t.status === "unknown"
                              ? "Consultar estado"
                              : "Depósito pendiente"}
                      </small>
                    </div>
                    <span className="card-cta">
                      Ver torneo <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="sponsor-band">
        <div className="sponsor-symbol">
          <ShieldCheck size={30} />
        </div>
        <div>
          <p className="eyebrow">Para organizadores</p>
          <h2>Un premio con respaldo.</h2>
          <p>
            Organizar es gratis. El patrocinador cubre el premio y las
            comisiones. El ganador puede verificar su pago sin entregar sus
            datos personales al público.
          </p>
        </div>
        <Link href="/create" className="btn btn-purple">
          Crear torneo <ArrowRight className="motion-arrow" />
        </Link>
      </section>
    </>
  );
}
