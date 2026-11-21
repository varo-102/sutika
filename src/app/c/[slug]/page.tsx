import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, ExternalLink, Flag, ShieldCheck, Trophy, Users } from "lucide-react";
import ShareTournament from "@/components/ShareTournament";
import V3RoomActions from "@/components/V3RoomActions";
import { gameArt } from "@/lib/gameArt";
import { display, games } from "@/lib/rules";
import { getExplorerContractUrl, getExplorerTxUrl } from "@/lib/stellar";
import { distribute, modeLabels, quote } from "@/lib/v3/rules";
import { publicCompetition, receiptLabels, type PublicReceipt, type RoomView } from "@/lib/v3/view";

export const dynamic = "force-dynamic";

const boliviaTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz",
});
const when = (seconds: number) => boliviaTime.format(seconds * 1000);

function Receipts({ receipts }: { receipts: PublicReceipt[] }) {
  return <section className="panel v3-receipts" id="comprobantes">
    <h2>Comprobantes</h2>
    <ul>
      {receipts.map((r) => <li key={r.hash}>
        <div><strong>{receiptLabels[r.kind]}</strong>{r.date && <small>{boliviaTime.format(new Date(r.date))} · Bolivia</small>}</div>
        <a className="inline-link" href={getExplorerTxUrl(r.hash)} target="_blank" rel="noopener noreferrer">Ver en Stellar <ExternalLink size={15} /></a>
      </li>)}
    </ul>
  </section>;
}

function Results({ room }: { room: RoomView }) {
  const result = room.result;
  if (!result || room.isCancelled) return null;
  const entry = distribute(BigInt(room.stakeLocked), room.rules.places);
  return <section className="panel v3-results">
    <div className="block-heading"><span className="accent-icon gold"><Trophy /></span><h2>Resultados</h2></div>
    <p>{result.disputed ? "Una impugnación mantiene el premio reservado." : result.approved ? "Resultado aprobado." : "El resultado espera aprobación."}</p>
    {result.end > room.now && <p>Se admiten impugnaciones hasta el {when(result.end)} (hora de Bolivia).</p>}
    {result.evidence && <a className="inline-link" href={result.evidence} target="_blank" rel="noopener noreferrer">Evidencia de la partida <ExternalLink size={16} /></a>}
    <ol className="v3-ranks">
      {result.ids.map((id, place) => {
        const team = room.rosters.find((r) => r.id === id);
        if (!team) return null;
        const net = quote(entry[place], room.rules.mode).net +
          quote(BigInt(room.rules.sponsorParts[place] ?? 0), room.rules.mode).net;
        const paid = room.paid.includes(place);
        const shares = distribute(net, team.weights);
        return <li key={id}>
          <div><span className="v3-tag">{place + 1}.º lugar</span><h3>{team.name}</h3></div>
          <strong>{display(net)} USDC</strong>
          <span className={paid ? "v3-tag v3-success" : "v3-tag"}>{paid ? "Pagado" : "Reservado"}</span>
          {team.players.length === 5 && <ul className="v3-splits" aria-label="Reparto por titular">
            {team.players.map((player, slot) => <li key={player.address}>
              <span>Titular {slot + 1} · {team.weights[slot] / 100} %</span>
              <strong>{display(shares[slot])} USDC</strong>
            </li>)}
          </ul>}
        </li>;
      })}
    </ol>
  </section>;
}

function Entries({ room }: { room: RoomView }) {
  const ranked = room.rosters.filter((r) => r.players.length === room.rules.size);
  const teams = room.rules.size === 5;
  return <section className="panel v3-entries">
    <div className="block-heading"><span className="accent-icon violet"><Users /></span><h2>{teams ? "Equipos" : "Jugadores"}</h2></div>
    <p>{ranked.length} de {room.rules.max} {teams ? "equipos completos" : "jugadores"}. El mínimo es {room.rules.min}.</p>
    {room.closeHash && <p className="field-note">Plantillas cerradas en Stellar <code className="v3-wrap">{room.closeHash}</code></p>}
    {room.rosters.length > 0 && <ul>
      {room.rosters.map((team) => <li key={team.id}>
        <div><strong>{team.name}</strong>{teams && <small>{team.players.length} de 5 inscritos</small>}</div>
        {team.refunded ? <span className="v3-tag v3-success">Reembolsado</span> :
          teams && !room.isCancelled && !room.isExpired && !room.closeHash && team.players.length < room.rules.size ?
          <Link className="inline-link" href={"/c/" + room.slug + "?equipo=" + team.id + "#participar"}>Unirme al equipo</Link> : null}
      </li>)}
    </ul>}
  </section>;
}

export default async function V3Tournament({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ equipo?: string }>;
}) {
  const [{ slug }, { equipo }] = await Promise.all([params, searchParams]);
  let competition;
  try {
    competition = await publicCompetition(slug);
  } catch {
    return <section className="narrow panel"><h1>Torneo temporalmente indisponible</h1><p>Recarga la página dentro de un momento.</p></section>;
  }
  if (!competition) notFound();
  const room = competition.view;
  const game = games[competition.game];
  const art = gameArt[competition.game];
  const sponsorNet = room?.rules.sponsorParts.reduce((a, p) => a + quote(BigInt(p), room.rules.mode).net, 0n) ?? 0n;
  const invite = room?.rosters.find((team) => team.id === equipo && team.players.length < room.rules.size);
  const active = room && !room.isCancelled && !room.isExpired && !room.closeHash;
  const phase = room?.isCancelled ? "Cancelado" : room?.result ? "Resultados" : room?.closeHash ? "En juego" :
    room?.isExpired ? "Inscripciones cerradas" : !room ? "Estado sin conexión" :
    room.rules.mode !== "entry" && !room.escrow ? "A la espera del patrocinador" : "Inscripciones abiertas";
  return <div className="v3-room">
    <Link className="inline-link" href="/#torneos"><ArrowLeft /> Volver a torneos</Link>
    <header className="v3-hero">
      <Image src={art.hero} alt={art.heroAlt} fill sizes="(max-width: 700px) 100vw, 1100px" style={{ objectPosition: art.position }} loading="eager" fetchPriority="high" />
      <div className="v3-hero-content">
        <p className="eyebrow">{game.name} · {game.format}</p>
        <h1>{competition.name}</h1>
        <div className="v3-tags"><span className="v3-tag">{phase}</span><span className="v3-tag">Stellar Testnet</span></div>
      </div>
    </header>
    {room ? <>
      <section className="v3-room-top">
        <div className="panel v3-money">
          <div><span>Modalidad</span><strong>{modeLabels[room.rules.mode]}</strong></div>
          {sponsorNet > 0n && <div><span>{room.escrow ? room.isCancelled ? "Aporte neto original" : "Aporte neto reservado" : "Premio anunciado por el patrocinador"}</span><strong>{display(sponsorNet)} USDC</strong></div>}
          {room.rules.mode !== "sponsored" && <>
            <div><span>Cuota por {room.rules.size === 1 ? "jugador" : "equipo"}</span><strong>{display(BigInt(room.rules.entry))} USDC</strong></div>
            <div><span>{room.closeHash ? "Inscripciones que forman el premio" : "Total recaudado en inscripciones"}</span><strong>{display(BigInt(room.closeHash ? room.stakeLocked : room.stake))} USDC</strong></div>
          </>}
          <div><span><Clock3 size={16} /> Cierre en Bolivia</span><strong>{when(room.rules.deadline)}</strong></div>
        </div>
        <div id="participar" className="panel v3-participate">
          <h2>{active ? (invite ? "Tu invitación" : "Participar en el torneo") : "Acciones del torneo"}</h2>
          {invite ? <p>Te invitaron a {invite.name}. Conecta tu cuenta para confirmar tu lugar.</p> :
            <p>Conecta tu cuenta de prueba para ver los pasos disponibles según tu rol.</p>}
          <V3RoomActions room={room} invite={invite} />
          {active && <ShareTournament />}
        </div>
      </section>
      <Results room={room} />
      <Entries room={room} />
    </> : <div className="panel"><p>Stellar no devolvió el estado actual. Puedes consultar los comprobantes confirmados.</p></div>}
    <Receipts receipts={competition.receipts} />
    <div className="v3-foot-links">
      <Link className="inline-link" href="/guia"><Flag size={17} /> Guía para jugar y organizar</Link>
      <a className="inline-link" href={getExplorerContractUrl(competition.core)} target="_blank" rel="noopener noreferrer"><ShieldCheck size={17} /> Contrato del torneo <ExternalLink size={15} /></a>
    </div>
  </div>;
}
