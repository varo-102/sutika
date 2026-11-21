import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BookOpen,
  Braces,
  CheckCheck,
  CircleCheck,
  Clock3,
  Coins,
  Cpu,
  ExternalLink,
  FileCode2,
  Flag,
  Layers3,
  ListChecks,
  LockKeyhole,
  Network,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import CopyValue from "@/components/CopyValue";
import { listTournaments } from "@/lib/tournamentsService";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
import { games, gameOf } from "@/lib/rules";
export const dynamic = "force-dynamic";
export const metadata = { title: "Guía del evaluador" };

export default async function Evaluator() {
  const tournaments = await listTournaments().catch(() => null);
  return (
    <div className="eval-shell">
      <section className="eval-banner">
        <div className="eval-title">
          <span className="icon-tile gold">
            <Award />
          </span>
          <div>
            <p className="eyebrow">Hackathon Stellar &amp; Soroban</p>
            <h1>Guía del evaluador</h1>
          </div>
        </div>
        <p>
          Comprueba el registro del torneo, el depósito en custodia y el pago de{" "}
          <strong>5 USDC al primer puesto</strong>. Cada etapa tiene su propio
          comprobante en Stellar Testnet.
        </p>
        <div className="buttons">
          <a className="btn btn-gold" href="#torneos-de-prueba">
            <ListChecks />
            Evaluar un torneo <ArrowDown className="motion-arrow" />
          </a>
          <a
            className="btn btn-dark"
            href={getExplorerContractUrl()}
            target="_blank"
            rel="noreferrer"
          >
            Auditar contrato <ExternalLink size={16} />
          </a>
        </div>
      </section>
      <section id="torneos-de-prueba" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon">
            <Trophy />
          </span>
          <div>
            <h2>Torneos de prueba</h2>
            <p>Elige una copa para ver su historial y el estado del premio.</p>
          </div>
        </div>
        {tournaments?.length ? (
          <div className="eval-tournaments">
            {tournaments.map((t) => {
              const g = games[gameOf(t.category)];
              const paid = t.prizes[0]?.claimStatus === "CLAIMED_VERIFIED";
              const funded = t.ledgerOperations.length > 0;
              return (
                <article key={t.publicSlug} className="eval-cup">
                  <header>
                    <span className="eval-game">
                      {g.name} · {g.format}
                    </span>
                    <span
                      className={
                        "status-mark " +
                        (paid || funded ? "positive" : "pending")
                      }
                    >
                      <i />
                      {paid ? "Pagado" : funded ? "En custodia" : "Por fondear"}
                    </span>
                  </header>
                  <h3>{t.name}</h3>
                  <p>
                    {g.size === 1
                      ? "5 USDC al ganador individual."
                      : "5 USDC al equipo ganador, 1 por titular."}
                  </p>
                  <Link
                    className="btn btn-outline"
                    href={"/tournaments/" + t.publicSlug + "#historial"}
                  >
                    Ver historial <ArrowRight className="motion-arrow" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="notice">
            {tournaments === null
              ? "No se pudo consultar Neon."
              : "Aún no hay torneos publicados."}
          </p>
        )}
      </section>
      <section id="red" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Cpu />
          </span>
          <div>
            <h2>Despliegue en Stellar Testnet</h2>
            <p>
              Verifica la instancia y la huella digital del programa desplegado.
            </p>
          </div>
        </div>
        <div className="spec-grid">
          <article>
            <h3>
              <Braces />
              ID del contrato
            </h3>
            <CopyValue
              value={deployment.contractId}
              label="el ID del contrato"
            />
            <a
              className="inline-link"
              href={getExplorerContractUrl()}
              target="_blank"
              rel="noreferrer"
            >
              Abrir contrato <ExternalLink />
            </a>
          </article>
          <article>
            <h3>
              <FileCode2 />
              Hash del WASM
            </h3>
            <CopyValue value={deployment.wasmHash} label="el hash del WASM" />
            <a
              className="inline-link"
              href={getExplorerTxUrl(deployment.uploadTx)}
              target="_blank"
              rel="noreferrer"
            >
              Ver carga del programa <ExternalLink />
            </a>
          </article>
          <article>
            <h3>
              <Network />
              Red y protocolo
            </h3>
            <strong className="technical-value">
              Stellar Testnet Protocol {deployment.protocol}
            </strong>
            <details className="network-history">
              <summary>Referencia del prototipo</summary>
              <p>
                La primera web de Álvaro decía «Stellar Testnet Protocol 22». El
                despliegue de esta versión usa el protocolo{" "}
                {deployment.protocol}.
              </p>
            </details>
          </article>
          <article>
            <h3>
              <CircleCheck />
              Transacción de despliegue
            </h3>
            <CopyValue
              value={deployment.deployTx}
              label="la transacción de despliegue"
            />
            <a
              className="inline-link mint"
              href={getExplorerTxUrl(deployment.deployTx)}
              target="_blank"
              rel="noreferrer"
            >
              Ver transacción <ExternalLink />
            </a>
          </article>
        </div>
      </section>
      <section className="eval-block">
        <div className="block-heading">
          <span className="accent-icon">
            <Layers3 />
          </span>
          <h2>Cómo verificar el premio</h2>
        </div>
        <ol className="walkthrough">
          <li>
            <span className="step-icon violet">
              <Coins />
            </span>
            <h3>1. Revisar el depósito</h3>
            <p>
              Busca «Depósito de USDC» en el historial. El comprobante
              identifica el activo, la cuenta del patrocinador y el escrow.
            </p>
          </li>
          <li>
            <span className="step-icon gold">
              <Flag />
            </span>
            <h3>2. Confirmar al ganador</h3>
            <p>
              El organizador congela las plantillas y declara un ganador. El
              patrocinador lo confirma y se respeta el plazo de 24 horas para
              impugnar.
            </p>
          </li>
          <li>
            <span className="step-icon mint">
              <CheckCheck />
            </span>
            <h3>3. Auditar el pago</h3>
            <p>
              Abre «Pago de premio». En Clash Royale corresponde a una
              transferencia de 5 USDC. En Mobile Legends son cinco de 1 USDC.
            </p>
          </li>
        </ol>
      </section>
      <section className="eval-block">
        <div className="block-heading">
          <span className="accent-icon violet">
            <BookOpen />
          </span>
          <h2>Qué verifica Sutika</h2>
        </div>
        <div className="architecture-grid">
          <div>
            <LockKeyhole />
            <div>
              <h3>Custodia</h3>
              <p>
                Trustless Work mantiene el pozo hasta la liberación autorizada.
              </p>
            </div>
          </div>
          <div>
            <Users />
            <div>
              <h3>Firma de billetera</h3>
              <p>
                Pollar permite al participante acreditar que controla la cuenta
                que reclama.
              </p>
            </div>
          </div>
          <div>
            <Clock3 />
            <div>
              <h3>Impugnación</h3>
              <p>
                Un reclamo abierto bloquea el pago hasta que el árbitro
                resuelva.
              </p>
            </div>
          </div>
          <div>
            <ShieldCheck />
            <div>
              <h3>Comprobantes</h3>
              <p>
                El estado de pago cambia al comprobar las transferencias en la
                red.
              </p>
            </div>
          </div>
        </div>
        <a
          className="inline-link"
          href="https://github.com/varo-102/sutika/pull/6"
          target="_blank"
          rel="noreferrer"
        >
          Revisar código y pruebas <ExternalLink />
        </a>
      </section>
    </div>
  );
}
