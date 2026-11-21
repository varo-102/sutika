import Link from "next/link";
import { listTournaments } from "@/lib/tournamentsService";
import {
  deployment,
  getExplorerContractUrl,
  getExplorerTxUrl,
} from "@/lib/stellar";
export const dynamic = "force-dynamic";
export const metadata = { title: "Modo evaluador" };
export default async function Evaluator() {
  const torneos = await listTournaments().catch(() => null);
  return (
    <>
      <section className="heading">
        <p className="eyebrow">Modo evaluador · Stellar Testnet</p>
        <h1>Verifica una entrega.</h1>
        <p>
          Abre el contrato, identifica el depósito del patrocinador y consulta
          los pagos a las billeteras del podio. Cada movimiento tiene su propio
          comprobante.
        </p>
      </section>
      <div className="columns">
        <section className="panel">
          <h2>Contrato desplegado</h2>
          <dl>
            <dt>ID de Sutika Core</dt>
            <dd className="mono">
              <a href={getExplorerContractUrl(deployment.contractId)}>
                {deployment.contractId}
              </a>
            </dd>
            <dt>SHA-256 del WASM</dt>
            <dd className="mono">{deployment.wasmHash}</dd>
            <dt>Red</dt>
            <dd>Testnet · protocolo {deployment.protocol} al desplegar</dd>
          </dl>
          <p>
            <a href={getExplorerTxUrl(deployment.uploadTx)}>
              Ver carga del WASM ↗
            </a>{" "}
            ·{" "}
            <a href={getExplorerTxUrl(deployment.deployTx)}>Ver despliegue ↗</a>
          </p>
        </section>
        <section className="panel">
          <h2>Torneos de prueba</h2>
          {torneos?.length ? (
            <ul>
              {torneos.map((t) => (
                <li key={t.publicSlug}>
                  <Link href={"/tournaments/" + t.publicSlug}>{t.name} ↗</Link>
                  <small>
                    {t.ledgerOperations.length
                      ? "Depósito confirmado"
                      : "Pendiente de fondeo"}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {torneos === null
                ? "No se pudo consultar Neon."
                : "Aún no hay torneos registrados."}
            </p>
          )}
          <p>
            Para auditar un pago, abre «Historial verificable» y compara el
            activo, las billeteras y los importes. En Mobile Legends el reparto
            llega directamente a cinco titulares.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>Quién confirma el resultado</h2>
        <ol>
          <li>El patrocinador deposita USDC de Testnet en Trustless Work.</li>
          <li>
            El organizador congela las plantillas y declara los tres puestos. El
            patrocinador aprueba el podio.
          </li>
          <li>
            Los participantes disponen de 24 horas para impugnar. El árbitro
            resuelve las impugnaciones.
          </li>
          <li>
            Un ganador firma con su billetera de Pollar. Sutika libera el hito y
            distribuye el premio en la misma transacción. El servidor comprueba
            las transferencias antes de marcarlo como pagado.
          </li>
        </ol>
        <p>
          <a href="https://github.com/varo-102/sutika">
            Repositorio y pruebas ↗
          </a>
        </p>
      </section>
    </>
  );
}
