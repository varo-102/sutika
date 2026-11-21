import Link from "next/link";
import ReceiptStatus from "@/components/ReceiptStatus";
import { notFound } from "next/navigation";
import WalletActions from "@/components/WalletActions";
import { getTournament } from "@/lib/tournamentsService";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
import { games, gameOf, display, prizeAmounts, units } from "@/lib/rules";
export const dynamic = "force-dynamic";
const labels: Record<string, string> = {
  anchor: "Registro del torneo",
  escrow: "Despliegue del escrow",
  bind: "Vínculo de la custodia",
  fund: "Depósito de USDC",
  freeze: "Plantillas congeladas",
  declare: "Podio declarado",
  mark: "Resultado en custodia",
  approve_tw: "Hitos aprobados",
  approve: "Podio aprobado",
  dispute: "Impugnación",
  resolve: "Resolución",
  release: "Pago de premio",
};
export default async function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTournament(slug);
  if (!t) notFound();
  if (!t.ledgerId)
    return (
      <section className="narrow">
        <Link href="/">← Torneos</Link>
        <p className="eyebrow">Archivo</p>
        <h1>{t.name}</h1>
        <p>Este registro histórico pertenece a la primera versión de Sutika.</p>
      </section>
    );
  const game = games[gameOf(t.category)],
    funded = t.ledgerOperations.some(
      (o) => o.kind === "fund" && o.status === "CONFIRMED",
    );
  const receipts = t.ledgerOperations.filter((o) =>
    ["CONFIRMED", "SUPERSEDED"].includes(o.status),
  );
  const opened = receipts.find(
    (o) => o.kind === "declare" && o.status === "CONFIRMED",
  )?.confirmedAt;
  return (
    <>
      <section className="heading">
        <Link href="/">← Torneos</Link>
        <p className="eyebrow">
          {game.name} · {game.format}
        </p>
        <h1>{t.name}</h1>
        <p>
          {t.rosterLocked ? "Inscripciones cerradas" : "Inscripciones abiertas"}{" "}
          · {funded ? "Depósito confirmado" : "Depósito pendiente"} · Stellar
          Testnet
        </p>
      </section>
      <section>
        <h2>Premios al podio</h2>
        <div className="prizes">
          {t.prizes.map((p) => {
            const money = prizeAmounts(units(p.amountUsdc!.toString()));
            return (
              <article className="panel" key={p.id}>
                <p className="eyebrow">Puesto {p.targetStanding}</p>
                <h3>{display(money.net)} USDC</h3>
                <p>
                  Bruto {display(money.gross)} · Plataforma{" "}
                  {display(money.platform)} · Protocolo{" "}
                  {display(money.protocol)}
                </p>
                <strong>
                  {p.claimStatus === "CLAIMED_VERIFIED"
                    ? "Pago confirmado"
                    : funded
                      ? "En custodia"
                      : "Por fondear"}
                </strong>
                {p.sorobanTxHash && (
                  <p>
                    <a href={getExplorerTxUrl(p.sorobanTxHash)}>
                      Comprobante del pago ↗
                    </a>
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <div className="columns">
        <section className="panel">
          <h2>Plantillas y resultados</h2>
          {t.teams.length ? (
            <ul>
              {t.teams.map((tm) => (
                <li key={tm.id}>
                  <strong>{tm.name}</strong> · {tm.participants.length}/
                  {t.teamMaxSize}
                  {t.podium.includes(tm.id)
                    ? " · Puesto " + (t.podium.indexOf(tm.id) + 1)
                    : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>Inscripciones pendientes.</p>
          )}
          {opened && (
            <p>
              Impugnación de 24 horas desde la publicación del podio.
              Confirmación registrada el{" "}
              {opened.toLocaleString("es-BO", { timeZone: "America/La_Paz" })}{" "}
              (Bolivia).
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Participar y gestionar</h2>
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
            frozen={t.rosterLocked}
          />
        </section>
      </div>
      <section className="panel">
        <h2>Historial verificable</h2>
        <p>
          <a href={getExplorerContractUrl(deployment.contractId)}>
            Contrato de Sutika ↗
          </a>{" "}
          {t.sorobanEscrowId && (
            <a href={getExplorerContractUrl(t.sorobanEscrowId)}>
              {" "}
              Ver escrow ↗
            </a>
          )}
        </p>
        {receipts.length ? (
          <ol>
            {receipts.map((o) => (
              <li key={o.id}>
                <a href={getExplorerTxUrl(o.hash)}>
                  {labels[o.kind] ?? o.kind}
                  {o.slot ? " · puesto " + o.slot : ""} ↗
                </a>
                {o.status === "SUPERSEDED" ? " · ronda anterior" : ""}
              </li>
            ))}
          </ol>
        ) : (
          <p>El torneo aún no tiene transacciones confirmadas.</p>
        )}
        {t.ledgerOperations
          .filter((o) => ["PREPARED", "PENDING"].includes(o.status))
          .map((o) => (
            <div key={o.id}>
              <p>{labels[o.kind]} · pendiente</p>
              <ReceiptStatus id={o.id} />
            </div>
          ))}
      </section>
    </>
  );
}
