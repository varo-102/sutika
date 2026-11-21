import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicRegistration from "@/components/PublicRegistration";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Circle,
  Clock3,
  Coins,
  Crown,
  ExternalLink,
  Flag,
  Layers3,
  LockKeyhole,
  Trophy,
  Users,
} from "lucide-react";
import WalletActions from "@/components/WalletActions";
import ShareTournament from "@/components/ShareTournament";
import ReceiptStatus from "@/components/ReceiptStatus";
import { getTournament } from "@/lib/tournamentsService";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
import {
  games,
  gameOf,
  display,
  WINNER_FUNDING,
  WINNER_USDC,
} from "@/lib/rules";
export const dynamic = "force-dynamic";
const labels: Record<string, string> = {
  anchor: "Registro del torneo",
  escrow: "Creación del escrow",
  bind: "Vínculo de la custodia",
  fund: "Depósito de USDC",
  freeze: "Plantillas congeladas",
  declare: "Declaración del ganador",
  mark: "Resultado en el escrow",
  approve_tw: "Hito aprobado",
  approve: "Ganador confirmado",
  dispute: "Impugnación",
  resolve: "Resolución",
  release: "Pago al primer puesto",
};

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let t: Awaited<ReturnType<typeof getTournament>>;
  try {
    t = await getTournament(slug);
  } catch {
    return <PublicRegistration slug={slug} />;
  }
  if (!t) {
    if (deployment.registrations.some((r) => r.slug === slug))
      return <PublicRegistration slug={slug} />;
    notFound();
  }
  const confirmed = t.ledgerOperations.filter((o) =>
    ["CONFIRMED", "SUPERSEDED"].includes(o.status),
  );
  if (!t.ledgerId || t.sorobanContractId !== deployment.contractId)
    return (
      <section className="narrow">
        <Link className="inline-link" href="/#torneos">
          <ArrowLeft />
          Volver a torneos
        </Link>
        <p className="eyebrow">Archivo del prototipo</p>
        <h1>{t.name}</h1>
        <p>Registro histórico de una versión anterior de Sutika.</p>
        {confirmed.length > 0 && (
          <section className="panel">
            <h2>Comprobantes históricos</h2>
            <ul>
              {confirmed.map((o) => (
                <li key={o.id}>
                  <a href={getExplorerTxUrl(o.hash)}>
                    {labels[o.kind] ?? o.kind} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    );
  const game = games[gameOf(t.category)],
    prize = t.prizes[0];
  const observed = (kind: string) =>
    confirmed.find((o) => o.kind === kind && o.status === "CONFIRMED");
  const funded = !!observed("fund"),
    paid = prize?.claimStatus === "CLAIMED_VERIFIED" && !!observed("release");
  const winningTeam = t.teams.find((tm) => tm.id === t.podium[0]);
  const published = observed("declare")?.confirmedAt;
  const claimAt = published ? published.getTime() + 86_400_000 : null;
  const registered = !!observed("anchor");
  const tagsFor = (team: (typeof t.teams)[number]) =>
    team.participants.flatMap(({ user }) =>
      user.stellarSmartWalletAddress
        ? [
            createHash("sha256")
              .update(slug + "\n" + user.stellarSmartWalletAddress)
              .digest("hex"),
          ]
        : [],
    );
  const milestones = [
    { kind: "anchor", name: "Registro", icon: Flag },
    { kind: "fund", name: "Depósito", icon: LockKeyhole },
    { kind: "approve", name: "Ganador confirmado", icon: BadgeCheck },
    { kind: "release", name: "Pago", icon: Trophy },
  ];
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
        <h1>{t.name}</h1>
        <p>
          {t.rosterLocked
            ? "Inscripciones cerradas"
            : registered
              ? "Inscripción gratuita"
              : "Registro en Stellar pendiente"}{" "}
          · Red de prueba
        </p>
        <div className="buttons tournament-choices">
          <a className="btn btn-gold" href="#participar">
            {registered && !t.rosterLocked
              ? "Inscribirme"
              : "Ver opciones de mi cuenta"}
          </a>
          <a className="btn btn-outline" href="#historial">
            Ver estado del premio
          </a>
          {registered && <ShareTournament />}
        </div>
      </header>
      <section className="prize-summary" aria-labelledby="premio">
        <div>
          <p className="eyebrow">
            <Crown />
            Premio al primer puesto
          </p>
          <h2 id="premio">
            {WINNER_USDC} USDC <small>de prueba</small>
          </h2>
          <p>
            {game.size === 5
              ? "1 USDC por cada uno de los cinco titulares ganadores."
              : "El jugador ganador recibe los 5 USDC."}
          </p>
        </div>
        <div>
          <span className={"status-mark " + (funded ? "positive" : "pending")}>
            <i />
            {paid
              ? "Pago confirmado"
              : funded
                ? "En custodia"
                : "Depósito pendiente"}
          </span>
          <details>
            <summary>Ver aporte del patrocinador</summary>
            <p>
              Premio neto: {WINNER_USDC} USDC.
              <br />
              Plataforma: {display(WINNER_FUNDING.platform)} USDC.
              <br />
              Protocolo: {display(WINNER_FUNDING.protocol)} USDC.
              <br />
              <strong>
                Total a depositar: {display(WINNER_FUNDING.gross)} USDC.
              </strong>
            </p>
          </details>
        </div>
      </section>
      <section className="eval-block" id="historial">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Layers3 />
          </span>
          <div>
            <h2>Estado del premio</h2>
            <p>Abre el comprobante de cada etapa confirmada en Stellar.</p>
          </div>
        </div>
        <ol className="payout-progress">
          {milestones.map(({ kind, name, icon: Icon }) => {
            const record = observed(kind);
            return (
              <li key={kind} className={record ? "done" : ""}>
                <span className="progress-icon">
                  <Icon size={18} />
                </span>
                <h3>{name}</h3>
                {record ? (
                  <a
                    className="inline-link"
                    href={getExplorerTxUrl(record.hash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Check size={13} />
                    Ver comprobante <ExternalLink size={12} />
                  </a>
                ) : (
                  <small>
                    <Circle size={8} /> Pendiente
                  </small>
                )}
              </li>
            );
          })}
        </ol>
        <details className="full-history">
          <summary>Historial completo de transacciones</summary>
          {confirmed.length ? (
            <ol>
              {confirmed.map((o) => (
                <li key={o.id}>
                  <a
                    className="inline-link"
                    href={getExplorerTxUrl(o.hash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {labels[o.kind] ?? o.kind} <ExternalLink />
                  </a>
                  {o.status === "SUPERSEDED" ? " · ronda anterior" : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p>Aún no hay movimientos confirmados.</p>
          )}
          <div className="document-links">
            <a className="inline-link" href={getExplorerContractUrl()}>
              Contrato de Sutika <ExternalLink />
            </a>
            {t.sorobanEscrowId && (
              <a
                className="inline-link"
                href={getExplorerContractUrl(t.sorobanEscrowId)}
              >
                Contrato de custodia <ExternalLink />
              </a>
            )}
          </div>
        </details>
        {t.ledgerOperations
          .filter((o) => ["PREPARED", "PENDING"].includes(o.status))
          .map((o) => (
            <div className="pending-receipt" key={o.id}>
              <p>{labels[o.kind]} · Pendiente</p>
              <ReceiptStatus id={o.id} />
            </div>
          ))}
      </section>
      <div className="columns">
        <section className="panel">
          <div className="block-heading">
            <span className="accent-icon violet">
              <Users />
            </span>
            <h2>Plantillas y ganador</h2>
          </div>
          {t.teams.length ? (
            <ul>
              {t.teams.map((tm) => (
                <li key={tm.id}>
                  <strong>{tm.name}</strong> · {tm.participants.length}/
                  {t.teamMaxSize}
                  {winningTeam?.id === tm.id ? " · Primer puesto" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aún no hay participantes inscritos.</p>
          )}
          {claimAt !== null && !paid && (
            <p>
              <Clock3 size={15} /> Puedes pedir una revisión hasta el{" "}
              {new Date(claimAt).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              })}
              , hora de Bolivia.
            </p>
          )}
        </section>
        <section className="panel" id="participar">
          <div className="block-heading">
            <span className="accent-icon">
              <Coins />
            </span>
            <div>
              <h2>Tu cuenta en este torneo</h2>
              <p>
                Conéctala para inscribirte, gestionar el torneo o cobrar si
                ganas.
              </p>
            </div>
          </div>
          <WalletActions
            slug={slug}
            teams={t.teams.map((tm) => ({
              id: tm.id,
              name: tm.name,
              count: tm.participants.length,
            }))}
            size={t.teamMaxSize}
            organizer={t.organizer.stellarSmartWalletAddress ?? ""}
            sponsor={t.sponsorWallet ?? ""}
            resolver={t.resolverWallet ?? ""}
            confirmed={confirmed
              .filter((operation) => operation.status === "CONFIRMED")
              .map((operation) => operation.kind)}
            memberTags={t.teams.flatMap(tagsFor)}
            winnerTags={winningTeam ? tagsFor(winningTeam) : []}
            claimAt={claimAt}
            escrowEnabled={!!process.env.TRUSTLESS_WORK_API_KEY}
          />
        </section>
      </div>
    </article>
  );
}
