import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Flag, ShieldCheck, Trophy } from "lucide-react";
import ShareTournament from "@/components/ShareTournament";
import V3RoomActions from "@/components/V3RoomActions";
import { gameArt } from "@/lib/gameArt";
import { boliviaTime, localized, translate, type Locale } from "@/lib/locale";
import { games } from "@/lib/rules";
import { getExplorerContractUrl, getExplorerTxUrl } from "@/lib/stellar";
import { modeName, usdcAmount } from "@/lib/v3/presentation";
import { distribute, quote } from "@/lib/v3/rules";
import { publicCompetition, receiptLabels, type PublicReceipt, type RoomView } from "@/lib/v3/view";

export const dynamic = "force-dynamic";

function Receipts({ receipts, locale }: { receipts: PublicReceipt[]; locale: Locale }) {
  const t = translate(locale);
  const format = boliviaTime(locale);
  return (
    <details className="panel v3-disclosure" id="comprobantes" open={receipts.length <= 6}>
      <summary>{t("Comprobantes en Stellar", "Stellar receipts")} <span>({receipts.length})</span></summary>
      <div className="v3-receipts">
        {receipts.length ? <ul>
          {receipts.map(({ kind, hash, date }) => <li key={hash}>
            <div><strong>{receiptLabels[kind]?.[locale] || kind}</strong>{date && <small>{format.format(new Date(date))} · Bolivia</small>}</div>
            <a className="inline-link" href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer">
              {t("Ver en Stellar", "View on Stellar")} <ExternalLink size={15} />
            </a>
          </li>)}
        </ul> : <p>{t("Aún no hay comprobantes confirmados.", "There are no confirmed receipts yet.")}</p>}
      </div>
    </details>
  );
}

function Results({ room, locale }: { room: RoomView; locale: Locale }) {
  const { result, rules } = room;
  if (!result || room.isCancelled) return null;
  const t = translate(locale);
  const entry = distribute(BigInt(room.stakeLocked), rules.places);
  const format = boliviaTime(locale);
  const percentage = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <section className="panel v3-results" id="resultado">
      <div className="block-heading"><span className="accent-icon gold"><Trophy /></span><h2>{t("Resultados y reparto", "Results and prize split")}</h2></div>
      <p>{result.disputed ? t("Una impugnación mantiene el premio reservado.", "A dispute is keeping the prize on hold.") :
        result.approved ? t("Resultado aprobado.", "Result approved.") : t("El resultado espera aprobación.", "The result is awaiting approval.")}</p>
      {result.end > room.now && <p>{t("Se admiten impugnaciones hasta el", "The review window ends on")} <strong>{format.format(result.end * 1000)} · {t("hora de Bolivia", "Bolivia time")}</strong>.</p>}
      {result.evidence && <a className="inline-link" href={result.evidence} target="_blank" rel="noopener noreferrer">{t("Evidencia de la partida", "Match evidence")} <ExternalLink size={16} /></a>}
      <ol className="v3-ranks">
        {result.ids.map((id, place) => {
          const team = room.rosters.find((roster) => roster.id === id);
          if (!team) return null;
          const net = quote(entry[place], rules.mode).net + quote(BigInt(rules.sponsorParts[place] ?? 0), rules.mode).net;
          const paid = room.paid.includes(place);
          const shares = distribute(net, team.weights);
          return (
            <li key={id}>
              <div><span className="v3-tag">{t("Puesto ", "Place ")}{place + 1}</span><h3>{team.name}</h3></div>
              <strong className="usdc-amount">{usdcAmount(net, locale)}</strong>
              <span className={paid ? "v3-tag v3-success" : "v3-tag"}>{paid ? t("Pagado", "Paid") : t("Reservado", "Reserved")}</span>
              {team.players.length === 5 && <ul className="v3-splits" aria-label={t("Reparto por titular", "Share per player")}>
                {team.players.map((player, slot) => <li key={player.address}>
                  <span>{t("Titular ", "Player ")}{slot + 1} · {percentage.format(team.weights[slot] / 100)} %</span>
                  <strong className="usdc-amount">{usdcAmount(shares[slot], locale)}</strong>
                </li>)}
              </ul>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Entries({ room, locale }: { room: RoomView; locale: Locale }) {
  const t = translate(locale);
  const complete = room.rosters.filter((roster) => roster.players.length === room.rules.size).length;
  const teams = room.rules.size === 5;
  return (
    <details className="panel v3-disclosure" id="inscritos">
      <summary>{teams ? t("Equipos inscritos", "Registered teams") : t("Jugadores inscritos", "Registered players")} <span>({complete}/{room.rules.max})</span></summary>
      <div className="v3-entries">
        <p>{t("Cupo mínimo", "Minimum entries")} {room.rules.min}.</p>
        {room.closeHash && <p className="field-note">{t("Plantillas cerradas en Stellar", "Rosters locked on Stellar")} <code className="v3-wrap">{room.closeHash}</code></p>}
        {room.rosters.length > 0 && <ul>
          {room.rosters.map((team) => <li key={team.id}>
            <div><strong>{team.name}</strong>{teams && <small>{team.players.length}/5 {t("titulares", "players")}</small>}</div>
            {team.refunded ? <span className="v3-tag v3-success">{t("Reembolsado", "Refunded")}</span> :
              teams && !room.isCancelled && !room.isExpired && !room.closeHash && team.players.length < room.rules.size ?
                <Link className="inline-link" href={localized(locale, "/c/" + room.slug + "?equipo=" + team.id + "#participar")}>
                  {t("Unirme al equipo", "Join this team")}
                </Link> : null}
          </li>)}
        </ul>}
      </div>
    </details>
  );
}

export default async function V3Tournament({ params, searchParams }: PageProps<"/[lang]/c/[slug]">) {
  const [{ lang, slug }, { equipo }] = await Promise.all([params, searchParams]);
  const locale = lang === "en" ? "en" : "es";
  const t = translate(locale);
  const href = (path: string) => localized(locale, path);
  let competition;
  try {
    competition = await publicCompetition(slug);
  } catch {
    return <section className="narrow panel"><h1>{t("Torneo temporalmente indisponible", "Tournament temporarily unavailable")}</h1><p>{t("Recarga la página dentro de un momento.", "Reload the page in a moment.")}</p></section>;
  }
  if (!competition) notFound();
  const room = competition.view;
  const game = games[competition.game];
  const art = gameArt[competition.game];
  const invite = room?.rosters.find((team) => team.id === equipo);
  const open = room && !room.isCancelled && !room.isExpired && !room.closeHash;
  const waitingForSponsor = room && room.rules.mode !== "entry" && !room.escrow;
  const joining = open && !waitingForSponsor;
  const unavailableInvite = room && equipo !== undefined && (!invite || invite.players.length >= room.rules.size);
  const phase = !room ? t("Estado sin conexión", "Status unavailable") :
    room.isCancelled ? t("Cancelado", "Canceled") :
    room.result?.disputed ? t("En impugnación", "Under review") :
    room.result ? t("Resultados", "Results") :
    room.closeHash ? t("Plantillas cerradas", "Rosters locked") :
    room.isExpired ? t("Inscripciones cerradas", "Registration closed") :
    waitingForSponsor ? t("Aporte pendiente", "Awaiting sponsor deposit") :
    t("Inscripciones abiertas", "Registration open");
  const format = boliviaTime(locale);
  const sponsorNet = room?.rules.sponsorParts.reduce((sum, raw) => sum + quote(BigInt(raw), room.rules.mode).net, 0n) ?? 0n;
  const entries = room ? BigInt(room.closeHash ? room.stakeLocked : room.stake) : 0n;
  const entryFee = room ? BigInt(room.rules.entry) : 0n;

  return (
    <div className="v3-room">
      <Link className="inline-link" href={href("/#torneos")}><ArrowLeft /> {t("Volver a torneos", "Back to tournaments")}</Link>
      <header className="v3-hero">
        <Image src={art.hero} alt="" fill quality={90} sizes="(max-width: 700px) 100vw, 1100px" style={{ objectPosition: art.position }} loading="eager" fetchPriority="high" />
        <div className="v3-hero-content">
          <p className="eyebrow">{game.name} · {game.format}</p>
          <h1>{competition.name}</h1>
          <div className="v3-tags"><span className="v3-tag">{phase}</span><span className="v3-tag">{t("Torneo de prueba", "Test tournament")}</span></div>
        </div>
      </header>
      {room ? <>
        {room.result && <Results room={room} locale={locale} />}
        <section className="v3-room-top">
          <div className="panel v3-room-amounts">
            <h2>{t("Fondo del premio", "Prize pool")}</h2>
            <div className="v3-money">
              <div><span>{t("Modalidad", "Funding")}</span><strong>{modeName(room.rules.mode, locale)}</strong></div>
              {sponsorNet > 0n && <div>
                <span>{room.isCancelled ? t("Aporte neto original", "Original net contribution") : room.escrow ? t("Aporte neto reservado", "Net contribution reserved") : t("Aporte neto anunciado", "Announced net contribution")}</span>
                <strong className="usdc-amount">{usdcAmount(sponsorNet, locale)}</strong>
              </div>}
              {room.rules.mode !== "sponsored" && <div><span>{t("Total de cuotas aportadas", "Entry fee contributions")}</span><strong className="usdc-amount">{usdcAmount(entries, locale)}</strong></div>}
              <div><span>{game.size === 5 ? t("Cuota por equipo", "Fee per team") : t("Cuota por jugador", "Fee per player")}</span>
                <strong className="usdc-amount">{entryFee > 0n ? usdcAmount(entryFee, locale) : t("Gratis", "Free")}</strong></div>
            </div>
            {!room.closeHash && !room.isCancelled && <p className="field-note">{t("Cierre de inscripciones", "Registration deadline")} · {format.format(room.rules.deadline * 1000)} ({t("hora de Bolivia", "Bolivia time")})</p>}
            <a href="#comprobantes" className="inline-link">{t("Ver comprobantes", "View receipts")} <ArrowRight size={16} /></a>
          </div>
          <div id="participar" className="panel v3-participate">
            <h2>{equipo && joining ? t("Tu invitación", "Your invitation") : joining ? t("Participar en el torneo", "Join the tournament") : t("Tu próximo paso", "Your next step")}</h2>
            {joining && unavailableInvite ? <p>{t("El enlace de equipo ya no está disponible o el equipo está completo.", "The team invite is no longer available or the team is full.")}</p> :
              invite && joining ? <p>{t("Te invitaron a ", "You were invited to ")}<strong>{invite.name}</strong>. {t("Entra con tu cuenta para confirmar tu lugar.", "Sign in to confirm your place.")}</p> :
              waitingForSponsor && open ? <p>{t("Las inscripciones abren cuando el patrocinador deposita. Si eres el patrocinador, entra con la cuenta designada.", "Registration opens after the sponsor deposits. If you are the sponsor, sign in with the assigned account.")}</p> :
              room.result ? <p>{t("Entra con tu cuenta de prueba para revisar el cobro o confirmar el resultado según tu rol.", "Sign in with your test account to check your prize or approve the result, depending on your role.")}</p> :
              <p>{t("Entra con tu cuenta de prueba para ver las acciones disponibles.", "Sign in with your test account to see the available actions.")}</p>}
            {joining && unavailableInvite ?
              <Link className="btn btn-outline" href={href("/c/" + room.slug + "#participar")}>{t("Ver opciones del torneo", "View tournament options")}</Link> :
              <V3RoomActions room={room} invite={invite} locale={locale} />}
            {joining && <ShareTournament locale={locale} />}
          </div>
        </section>
        <Entries room={room} locale={locale} />
      </> : <div className="panel"><p>{t("Stellar no devolvió el estado actual. Los comprobantes confirmados siguen disponibles.", "Stellar did not return the current status. Confirmed receipts are still available.")}</p></div>}
      <Receipts receipts={competition.receipts} locale={locale} />
      <div className="v3-foot-links">
        <Link className="inline-link" href={href("/guia")}><Flag size={17} /> {t("Guía de SUTIKA", "SUTIKA guide")}</Link>
        <a className="inline-link" href={getExplorerContractUrl(competition.core)} target="_blank" rel="noopener noreferrer">
          <ShieldCheck size={17} /> {t("Contrato del torneo", "Tournament contract")} <ExternalLink size={15} />
        </a>
      </div>
    </div>
  );
}
