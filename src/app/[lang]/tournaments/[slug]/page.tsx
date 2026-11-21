import { createHash } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicRegistration from "@/components/PublicRegistration";
import { boliviaTime, localized, translate } from "@/lib/locale";
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
const labelsFor = (t: ReturnType<typeof translate>): Record<string, string> => ({
  anchor: t("Registro del torneo", "Tournament registration"),
  escrow: t("Creación del escrow", "Escrow creation"),
  bind: t("Vínculo de la custodia", "Escrow linked to tournament"),
  fund: t("Depósito de USDC", "USDC deposit"),
  freeze: t("Plantillas congeladas", "Rosters locked"),
  declare: t("Declaración del ganador", "Winner published"),
  mark: t("Resultado en el escrow", "Result recorded in escrow"),
  approve_tw: t("Hito aprobado", "Milestone approved"),
  approve: t("Ganador confirmado", "Winner approved"),
  dispute: t("Impugnación", "Dispute"),
  resolve: t("Resolución", "Resolution"),
  release: t("Pago al primer puesto", "First-place payment"),
});

export default async function TournamentPage({ params }: PageProps<"/[lang]/tournaments/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang === "en" ? "en" : "es";
  const tr = translate(locale);
  const labels = labelsFor(tr);
  let t: Awaited<ReturnType<typeof getTournament>>;
  try {
    t = await getTournament(slug);
  } catch {
    return <PublicRegistration slug={slug} locale={locale} />;
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
        <Link className="inline-link" href={localized(locale, "/#torneos")}>
          <ArrowLeft />
          {tr("Volver a torneos", "Back to tournaments")}
        </Link>
        <p className="eyebrow">{tr("Archivo del prototipo", "Prototype archive")}</p>
        <h1>{t.name}</h1>
        <p>{tr("Registro histórico de una versión anterior de Sutika.", "Historical record from an earlier version of SUTIKA.")}</p>
        {confirmed.length > 0 && (
          <section className="panel">
            <h2>{tr("Comprobantes históricos", "Historical receipts")}</h2>
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
    { kind: "anchor", name: tr("Registro", "Registration"), icon: Flag },
    { kind: "fund", name: tr("Depósito", "Deposit"), icon: LockKeyhole },
    { kind: "approve", name: tr("Ganador confirmado", "Winner approved"), icon: BadgeCheck },
    { kind: "release", name: tr("Pago", "Payment"), icon: Trophy },
  ];
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
        <h1>{t.name}</h1>
        <p>
          {t.rosterLocked
            ? tr("Inscripciones cerradas", "Registration closed")
            : registered
              ? tr("Inscripción gratuita", "Free entry")
              : tr("Registro en Stellar pendiente", "Stellar registration pending")}{" "}
          {tr("· Red de prueba", "· Test network")}
        </p>
        <div className="buttons tournament-choices">
          <a className="btn btn-gold" href="#participar">
            {registered && !t.rosterLocked
              ? tr("Inscribirme", "Register")
              : tr("Ver opciones de mi cuenta", "View account options")}
          </a>
          <a className="btn btn-outline" href="#historial">
            {tr("Ver estado del premio", "View prize status")}
          </a>
          {registered && <ShareTournament locale={locale} />}
        </div>
      </header>
      <section className="prize-summary" aria-labelledby="premio">
        <div>
          <p className="eyebrow">
            <Crown />
            {tr("Premio al primer puesto", "First-place prize")}
          </p>
          <h2 id="premio">
            {WINNER_USDC} USDC <small>{tr("de prueba", "test funds")}</small>
          </h2>
          <p>
            {game.size === 5
              ? tr("1 USDC por cada uno de los cinco titulares ganadores.", "1 test USDC for each of the five winning players.")
              : tr("El jugador ganador recibe los 5 USDC.", "The winner receives 5 test USDC.")}
          </p>
        </div>
        <div>
          <span className={"status-mark " + (funded ? "positive" : "pending")}>
            <i />
            {paid
              ? tr("Pago confirmado", "Payment confirmed")
              : funded
                ? tr("En custodia", "In escrow")
                : tr("Depósito pendiente", "Deposit pending")}
          </span>
          <details>
            <summary>{tr("Ver aporte del patrocinador", "View sponsor contribution")}</summary>
            <p>
              {tr("Premio neto:", "Net prize")} {WINNER_USDC} USDC.
              <br />
              {tr("Plataforma:", "Platform fee")} {display(WINNER_FUNDING.platform)} USDC.
              <br />
              {tr("Protocolo:", "Protocol fee")} {display(WINNER_FUNDING.protocol)} USDC.
              <br />
              <strong>
                {tr("Total a depositar:", "Total deposit")} {display(WINNER_FUNDING.gross)} USDC.
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
            <h2>{tr("Estado del premio", "Prize status")}</h2>
            <p>{tr("Abre el comprobante de cada etapa confirmada en Stellar.", "Open the receipt for each confirmed step on Stellar.")}</p>
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
                    {tr("Ver comprobante", "View receipt")} <ExternalLink size={12} />
                  </a>
                ) : (
                  <small>
                    <Circle size={8} /> {tr("Pendiente", "Pending")}
                  </small>
                )}
              </li>
            );
          })}
        </ol>
        <details className="full-history">
          <summary>{tr("Historial completo de transacciones", "Full transaction history")}</summary>
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
                  {o.status === "SUPERSEDED" ? tr(" · ronda anterior", " · previous round") : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p>{tr("Aún no hay movimientos confirmados.", "There are no confirmed transactions yet.")}</p>
          )}
          <div className="document-links">
            <a className="inline-link" href={getExplorerContractUrl()}>
              {tr("Contrato de Sutika", "SUTIKA contract")} <ExternalLink />
            </a>
            {t.sorobanEscrowId && (
              <a
                className="inline-link"
                href={getExplorerContractUrl(t.sorobanEscrowId)}
              >
                {tr("Contrato de custodia", "Escrow contract")} <ExternalLink />
              </a>
            )}
          </div>
        </details>
        {t.ledgerOperations
          .filter((o) => ["PREPARED", "PENDING"].includes(o.status))
          .map((o) => (
            <div className="pending-receipt" key={o.id}>
              <p>{labels[o.kind]} · {tr("Pendiente", "Pending")}</p>
              <ReceiptStatus id={o.id} locale={locale} />
            </div>
          ))}
      </section>
      <div className="columns">
        <section className="panel">
          <div className="block-heading">
            <span className="accent-icon violet">
              <Users />
            </span>
            <h2>{tr("Plantillas y ganador", "Rosters and winner")}</h2>
          </div>
          {t.teams.length ? (
            <ul>
              {t.teams.map((tm) => (
                <li key={tm.id}>
                  <strong>{tm.name}</strong> · {tm.participants.length}/
                  {t.teamMaxSize}
                  {winningTeam?.id === tm.id ? tr(" · Primer puesto", " · First place") : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>{tr("Aún no hay participantes inscritos.", "No players have registered yet.")}</p>
          )}
          {claimAt !== null && !paid && (
            <p>
              <Clock3 size={15} /> {tr("Puedes pedir una revisión hasta el", "You can request a review until")}{" "}
              {boliviaTime(locale).format(claimAt)}
              {tr(", hora de Bolivia.", " · Bolivia time.")}
            </p>
          )}
        </section>
        <section className="panel" id="participar">
          <div className="block-heading">
            <span className="accent-icon">
              <Coins />
            </span>
            <div>
              <h2>{tr("Tu cuenta en este torneo", "Your account in this tournament")}</h2>
              <p>
                {tr("Conéctala para inscribirte, gestionar el torneo o cobrar si ganas.", "Connect to register, manage the tournament, or claim a prize.")}
              </p>
            </div>
          </div>
          <WalletActions
            locale={locale}
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
