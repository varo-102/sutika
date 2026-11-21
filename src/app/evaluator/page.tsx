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
import { publicTournaments, publishedDemos } from "@/lib/publicTournaments";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
import { games, gameOf } from "@/lib/rules";
import { testnetProtocol } from "@/lib/testnetProtocol";
import v3 from "@/lib/v3/deployment.json";
import proofs from "@/lib/v3/proofs.json";
export const dynamic = "force-dynamic";
export const metadata = { title: "Guía del evaluador" };

export default async function Evaluator() {
  const [{ tournaments }, protocol] = await Promise.all([
    publicTournaments(),
    testnetProtocol(),
  ]);
  const demos = publishedDemos.map(
    (demo) =>
      tournaments.find(
        (tournament) => tournament.publicSlug === demo.publicSlug,
      ) ?? demo,
  );
  const live = demos.every((demo) => demo.status !== "unknown");
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
          Abre los registros de las dos copas en Stellar Testnet. Cada una
          muestra el estado de su premio de{" "}
          <strong>5 USDC de prueba para el primer puesto</strong>.
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
            Ver contrato histórico <ExternalLink size={16} />
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
        {!live && (
          <p className="data-notice">
            Los registros de las copas se verifican en Stellar. El saldo y el
            pago requieren datos en vivo.
          </p>
        )}
        <div className="eval-tournaments">
          {demos.map((t) => {
            const g = games[gameOf(t.category)];
            const paid = t.status === "paid",
              funded = t.status === "funded";
            return (
              <article key={t.publicSlug} className="eval-cup">
                <header>
                  <span className="eval-game">
                    {g.name} · {g.format}
                  </span>
                  <span
                    className={
                      "status-mark " + (paid || funded ? "positive" : "pending")
                    }
                  >
                    <i />
                    {paid
                      ? "Pagado"
                      : funded
                        ? "En custodia"
                        : t.status === "unknown"
                          ? "Registro público"
                          : "Depósito pendiente"}
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
      </section>
      <section className="eval-block" id="v3">
        <div className="block-heading">
          <span className="accent-icon gold"><Coins /></span>
          <div><h2>Operaciones confirmadas de la V3</h2><p>Fondeo, reembolsos y resultados comprobables en Stellar Testnet. El pago a los ganadores sigue pendiente.</p></div>
        </div>
        <div className="spec-grid">
          {proofs.map((proof) => <article key={proof.hash}>
            <h3>{proof.title}</h3>
            <p>{proof.text}</p>
            <a className="inline-link" href={getExplorerTxUrl(proof.hash)} target="_blank" rel="noreferrer">
              {proof.action} <ExternalLink size={17} />
            </a>
          </article>)}
        </div>
        <div className="buttons">
          <a className="btn btn-outline" href={getExplorerContractUrl(v3.contractId)} target="_blank" rel="noreferrer">Contrato V3 <ExternalLink size={16} /></a>
          <a className="btn btn-dark" href={getExplorerTxUrl(v3.uploadTx)} target="_blank" rel="noreferrer">Carga del WASM V3 <ExternalLink size={16} /></a>
        </div>
        <CopyValue value={v3.wasmHash} label="el hash del WASM V3" />
      </section>
      <aside className="guide-preview">
        <BookOpen aria-hidden="true" />
        <div>
          <h2>Recorrido de la demo</h2>
          <p>
            Prepara una ficha, revisa el premio y abre el comprobante del
            registro.
          </p>
        </div>
        <Link href="/guia" className="btn btn-outline">
          Abrir guía <ArrowRight />
        </Link>
      </aside>
      <section id="red" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon violet">
            <Cpu />
          </span>
          <div>
            <h2>Contrato de las copas originales</h2>
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
              Stellar Testnet Protocol {protocol ?? deployment.protocol}
            </strong>
            <p>
              {protocol === null
                ? "Protocolo al desplegar el contrato."
                : "Red consultada en vivo."}
            </p>
            <details className="network-history">
              <summary>Stellar Testnet Protocol 22 · prototipo</summary>
              <p>
                La primera web de Álvaro mostraba esa versión. El despliegue de
                esta versión usa el protocolo {deployment.protocol}.
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
                El premio queda en Trustless Work cuando Stellar confirma el
                depósito. El historial muestra ese comprobante por separado.
              </p>
            </div>
          </div>
          <div>
            <Users />
            <div>
              <h3>Firma de billetera</h3>
              <p>
                La firma con Freighter o Pollar acredita que el participante
                controla la cuenta que reclama.
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
          href="https://github.com/varo-102/sutika"
          target="_blank"
          rel="noreferrer"
        >
          Revisar código y pruebas <ExternalLink />
        </a>
      </section>
    </div>
  );
}
