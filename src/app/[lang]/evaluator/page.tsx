import Link from "next/link";
import { ArrowRight, Award, BookOpen, ExternalLink, Network, ShieldCheck } from "lucide-react";
import CopyValue from "@/components/CopyValue";
import { localized, translate } from "@/lib/locale";
import { games } from "@/lib/rules";
import { publicTournaments, publishedDemos } from "@/lib/publicTournaments";
import { deployment, getExplorerContractUrl, getExplorerTxUrl } from "@/lib/stellar";
import { testnetProtocol } from "@/lib/testnetProtocol";
import v3 from "@/lib/v3/deployment.json";
import proofs from "@/lib/v3/proofs.json";
import { recentCompetitionsV3 } from "@/lib/v3/view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/evaluator">) {
  return { title: (await params).lang === "en" ? "Evaluator guide" : "Guía del evaluador" };
}

const tournamentsV3 = [
  { key: "clash-royale", game: "CLASH_ROYALE", slug: "copa-de-la-corona-ensayo-1v1-72e254dbffd3", proof: "clash-result" },
  { key: "mobile-legends", game: "MOBILE_LEGENDS", slug: "copa-del-alba-ensayo-5v5-8f1a673c83eb", proof: "mobile-result" },
] as const;

export default async function Evaluator({ params }: PageProps<"/[lang]/evaluator">) {
  const locale = (await params).lang === "en" ? "en" : "es";
  const t = translate(locale);
  const href = (path: string) => localized(locale, path);
  const [published, protocol, { tournaments }] = await Promise.all([
    recentCompetitionsV3(), testnetProtocol(), publicTournaments(),
  ]);

  return (
    <div className="eval-shell">
      <header className="eval-banner">
        <div className="eval-title">
          <span className="icon-tile gold"><Award /></span>
          <div>
            <p className="eyebrow">{t("Hackathon Stellar & Soroban", "Stellar & Soroban Hackathon")}</p>
            <h1>{t("Guía del evaluador", "Evaluator guide")}</h1>
          </div>
        </div>
        <p>{t("Sigue el premio desde el depósito hasta el resultado aprobado. Abre los comprobantes en Stellar Testnet sin una cuenta.", "Follow the prize from deposit to the approved result. Open the Stellar Testnet receipts without an account.")}</p>
        <div className="buttons">
          <a className="btn btn-gold" href="#v3"><ShieldCheck /> {t("Ver comprobantes", "View receipts")}</a>
          <Link className="btn btn-outline" href={href("/guia")}><BookOpen /> {t("Cómo funciona", "How it works")}</Link>
        </div>
      </header>

      <section id="v3" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon gold"><ShieldCheck /></span>
          <div>
            <h2>{t("Comprobantes de SUTIKA V3", "SUTIKA V3 receipts")}</h2>
            <p>{t("Cada enlace muestra una transacción confirmada de prueba. Un resultado publicado acredita el registro del podio. El pago requiere su propio comprobante.", "Each link shows a confirmed test transaction. A published result records the standings. Payment requires a separate receipt.")}</p>
          </div>
        </div>
        <div className="eval-tournaments" id="torneos-de-prueba">
          {tournamentsV3.map((trial) => {
            const game = games[trial.game];
            const proof = proofs.find(({ id }) => id === trial.proof);
            const room = published.find(({ slug }) => slug === trial.slug);
            return (
              <article className="eval-cup" id={trial.key} key={trial.key}>
                <p className="eval-game">{game.format} · {t("Ensayo en Testnet", "Testnet trial")}</p>
                <h3>{game.name}</h3>
                <p>{game.size === 1 ? t("El premio de cada puesto va a un jugador.", "The prize for each place goes to one player.") : t("El premio de cada puesto se reparte entre cinco titulares. El reparto estándar es 20 % para cada uno.", "The prize for each place goes to five players. Each receives 20% by default.")}</p>
                <div className="buttons">
                  {room && <Link className="btn btn-outline" href={href("/c/" + room.slug)}>{t("Ver ficha", "View tournament")} <ArrowRight size={17} /></Link>}
                  {proof && <a className="inline-link" href={getExplorerTxUrl(proof.hash)} target="_blank" rel="noreferrer">
                    {t("Ver registro del resultado", "View result receipt")} <ExternalLink size={16} />
                  </a>}
                </div>
              </article>
            );
          })}
        </div>
        <ul className="eval-proof-list">
          {proofs.map((proof) => <li key={proof.hash}>
            <div><h3>{proof[locale].title}</h3><p>{proof[locale].text}</p></div>
            <a className="inline-link" href={getExplorerTxUrl(proof.hash)} target="_blank" rel="noreferrer">
              {proof[locale].action} <ExternalLink size={16} />
            </a>
          </li>)}
        </ul>
      </section>

      <section id="red" className="eval-block">
        <div className="block-heading">
          <span className="accent-icon violet"><Network /></span>
          <div><h2>{t("Red y contrato", "Network and contract")}</h2>
            <p>Stellar Testnet · {t("Protocolo", "Protocol")} {protocol ?? v3.protocol}
              {" · "}{protocol === null ? t("Al desplegar el contrato", "At contract deployment") : t("Consultado en vivo", "Live network reading")}
            </p></div>
        </div>
        <p>{t("Trustless Work reserva los aportes patrocinados. Sutika Core guarda las cuotas, verifica las reglas de cobro y distribuye el premio.", "Trustless Work holds sponsored contributions. Sutika Core holds entry fees, enforces payout rules, and distributes prizes.")}</p>
        <div className="buttons">
          <a className="btn btn-outline" href={getExplorerContractUrl(v3.contractId)} target="_blank" rel="noreferrer">{t("Contrato V3", "V3 contract")} <ExternalLink size={17} /></a>
          <a className="btn btn-dark" href={getExplorerTxUrl(v3.uploadTx)} target="_blank" rel="noreferrer">{t("Carga del WASM V3", "V3 WASM upload")} <ExternalLink size={17} /></a>
        </div>
        <CopyValue value={v3.wasmHash} label={t("el hash del WASM V3", "the V3 WASM hash")} locale={locale} />
      </section>

      <details className="panel v3-disclosure">
        <summary>{t("Registros históricos de las copas originales", "Historical records of the original tournaments")}</summary>
        <div className="v3-history">
          <p>{t("Los 5 USDC son el premio previsto de estos ejemplos de Testnet.", "The 5 USDC amount is the planned prize for these Testnet examples.")}</p>
          <div className="eval-tournaments">
            {publishedDemos.map((demo) => {
              const live = tournaments.find(({ publicSlug }) => publicSlug === demo.publicSlug) ?? demo;
              const game = games[live.category];
              return <article className="eval-cup" key={live.publicSlug}>
                <p className="eval-game">{game.name} · {game.format}</p>
                <h3>{live.name}</h3>
                <Link className="inline-link" href={href("/tournaments/" + live.publicSlug + "#historial")}>{t("Ver historial", "View history")} <ArrowRight size={17} /></Link>
              </article>;
            })}
          </div>
          <a className="inline-link" href={getExplorerContractUrl(deployment.contractId)} target="_blank" rel="noreferrer">
            {t("Contrato original", "Original contract")} <ExternalLink size={17} />
          </a>
        </div>
      </details>
    </div>
  );
}
