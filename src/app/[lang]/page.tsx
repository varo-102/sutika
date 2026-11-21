import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CirclePlus, Coins, Gamepad2, Play, ShieldCheck } from "lucide-react";
import { gameArt } from "@/lib/gameArt";
import { games, type Game } from "@/lib/rules";
import { localized, translate } from "@/lib/locale";
import { recentCompetitionsV3 } from "@/lib/v3/view";
import { modeName } from "@/lib/v3/presentation";

export const dynamic = "force-dynamic";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const locale = (await params).lang === "en" ? "en" : "es";
  const t = translate(locale);
  const published = await recentCompetitionsV3();
  const href = (path: string) => localized(locale, path);

  return (
    <>
      <section className="arena-hero" aria-labelledby="hero-heading">
        <div className="arena-hero-main">
          <div className="hero-story">
            <p className="hero-kicker"><Gamepad2 size={16} aria-hidden="true" />{t("Esports en Bolivia", "Esports in Bolivia")}</p>
            <h1 id="hero-heading">{t("Torneos con", "Tournaments with")} <em>{t("premios verificables.", "verifiable prizes.")}</em></h1>
            <p className="hero-intro">{t(
              "El patrocinador o las inscripciones forman el premio. SUTIKA muestra cuándo se reserva y comprueba cuánto recibe cada ganador.",
              "Sponsors or entry fees fund the prize. SUTIKA shows when it is reserved and verifies how much each winner receives.",
            )}</p>
            <div className="buttons">
              <Link href={href("/evaluator")} className="btn btn-gold"><Play />{t("Ver demo", "View demo")}<ArrowRight className="motion-arrow" /></Link>
              <Link href={href("/create")} className="btn btn-outline"><CirclePlus />{t("Crear torneo de prueba", "Create a test tournament")}</Link>
            </div>
            <p className="hero-test-note"><ShieldCheck size={16} aria-hidden="true" />{t("Stellar Testnet · Sin dinero real", "Stellar Testnet · No real money")}</p>
          </div>
          <div className="hero-games" aria-label={t("Juegos de la demo", "Games in the demo")}>
            {(Object.keys(games) as Game[]).map((key) => {
              const game = games[key];
              const art = gameArt[key];
              const solo = game.size === 1;
              return (
                <Link key={key} href={href("/evaluator#" + (solo ? "clash-royale" : "mobile-legends"))}
                  className="hero-game-card" aria-label={t("Ver demo de ", "View demo for ") + game.name}>
                  <Image src={art.hero} alt="" fill quality={90} sizes="(max-width: 760px) 92vw, 700px"
                    style={{ objectPosition: art.position }} />
                  <span className="hero-game-format">{game.format}</span>
                  <div>
                    <h2>{solo ? game.name : "Mobile Legends"}</h2>
                    <p>{solo ? t("Premio individual", "Individual prize") : t("Premio para cinco titulares", "Prize split across five players")}</p>
                  </div>
                  <ArrowRight className="hero-game-arrow" size={19} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <nav className="home-roles" aria-label={t("Qué quieres hacer", "Choose what to do")}>
        <Link href={href("/guia#jugar")}>
          <Gamepad2 size={20} aria-hidden="true" /><span><strong>{t("Quiero jugar", "I want to play")}</strong><small>{t("Cómo usar una invitación", "How to use an invitation")}</small></span>
        </Link>
        <Link href={href("/guia#organizar")}>
          <CirclePlus size={20} aria-hidden="true" /><span><strong>{t("Quiero organizar", "I want to organize")}</strong><small>{t("Cómo publicar una copa", "How to publish a tournament")}</small></span>
        </Link>
        <Link href={href("/guia#patrocinar")}>
          <Coins size={20} aria-hidden="true" /><span><strong>{t("Quiero patrocinar", "I want to sponsor")}</strong><small>{t("Cómo reservar el premio", "How to reserve the prize")}</small></span>
        </Link>
      </nav>

      <section className="directory" id="torneos" aria-labelledby="torneos-heading">
        <div className="section-head">
          <div><h2 id="torneos-heading">{t("Torneos en la red de prueba", "Tournaments on the test network")}</h2>
            <p>{t("Los importes y las inscripciones son de demostración.", "Amounts and entries are for demonstration.")}</p></div>
          <Link className="text-action" href={href("/create")}><CirclePlus size={17} />{t("Crear torneo", "Create tournament")}</Link>
        </div>
        {published.length ? (
          <div className="v3-published">
            {published.map((tournament) => (
              <Link className="panel" href={href("/c/" + tournament.slug)} key={tournament.slug}>
                <small>{games[tournament.game].name} · {modeName(tournament.mode, locale)}</small>
                <h3>{tournament.name}</h3>
                <span className="inline-link">{t("Ver ficha", "View tournament")} <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel home-empty">
            <p>{t("Aún no hay fichas V3 visibles aquí. Puedes revisar los comprobantes de los ensayos.", "There are no V3 tournament pages here yet. You can still inspect the test receipts.")}</p>
            <Link className="inline-link" href={href("/evaluator#v3")}>{t("Ver comprobantes", "View receipts")} <ArrowRight size={17} /></Link>
          </div>
        )}
      </section>
    </>
  );
}
