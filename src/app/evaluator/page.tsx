import Link from "next/link";
import {
  Award,
  ShieldCheck,
  ExternalLink,
  Code2,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";
import {
  SUTIKA_CONTRACT_ID,
  DEPLOYER_SECRET,
  getExplorerContractUrl,
  getExplorerTxUrl,
  SOROBAN_RPC_URL,
  STELLAR_NETWORK,
} from "@/lib/stellar";

export default function EvaluatorPage() {
  const deployerAddress = "GDTKODWTQGQUJ2RKUB4PIWA54VCEBJTNC3XFYRJMWEQKF7YXL2JYSLDR";
  const sampleTxHash = "e0c575cb16c2c4b9e3d5722f21a66ef475dc16497fd11152598162413c5f5103";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl border border-sutika-gold/40 bg-gradient-to-r from-sutika-card via-sutika-card to-sutika-gold/10 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-sutika-gold/20 text-sutika-gold border border-sutika-gold/40 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Guía del Evaluador — Hackathon Stellar &amp; Soroban
            </h1>
            <p className="text-xs text-sutika-gold font-semibold uppercase tracking-wider">
              Sutika: Capa de Custodia Programable (Promotional Escrow) y Entrega Verificable
            </p>
          </div>
        </div>

        <p className="text-sm text-sutika-muted mt-3 leading-relaxed">
          Esta página está diseñada específicamente para los jurados y evaluadores técnicos. Aquí encontrarás todos los enlaces de auditoría en <strong>Stellar Testnet</strong>, el desglose de arquitectura y las instrucciones para comprobar el ciclo de vida completo en menos de 2 minutos.
        </p>
      </div>

      {/* Contract & Testnet Audit Card */}
      <div className="rounded-2xl border border-sutika-border bg-sutika-card p-6 shadow-xl space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-sutika-purple" />
          <span>Información de Despliegue en Stellar Testnet</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-sutika-bg border border-sutika-border space-y-1">
            <span className="text-sutika-muted block text-[11px]">Soroban Contract ID:</span>
            <span className="text-white font-bold break-all">{SUTIKA_CONTRACT_ID}</span>
            <div className="pt-2">
              <a
                href={getExplorerContractUrl(SUTIKA_CONTRACT_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sutika-gold hover:underline inline-flex items-center gap-1 font-sans text-xs"
              >
                Auditar Contrato en Stellar Expert
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sutika-bg border border-sutika-border space-y-1">
            <span className="text-sutika-muted block text-[11px]">Deployer / Escrow Funder Address:</span>
            <span className="text-white font-bold break-all">{deployerAddress}</span>
            <div className="pt-2">
              <a
                href={`https://stellar.expert/explorer/testnet/account/${deployerAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sutika-purple hover:underline inline-flex items-center gap-1 font-sans text-xs"
              >
                Auditar Cuenta en Stellar Expert
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sutika-bg border border-sutika-border space-y-1">
            <span className="text-sutika-muted block text-[11px]">Red Stellar:</span>
            <span className="text-white font-bold">{STELLAR_NETWORK} (Protocol 22)</span>
            <div className="text-sutika-muted font-sans text-[11px]">RPC: {SOROBAN_RPC_URL}</div>
          </div>

          <div className="p-4 rounded-xl bg-sutika-bg border border-sutika-border space-y-1">
            <span className="text-sutika-muted block text-[11px]">Transacción de Despliegue (Proof of Code):</span>
            <span className="text-white font-bold break-all">{sampleTxHash.slice(0, 24)}...</span>
            <div className="pt-2">
              <a
                href={getExplorerTxUrl(sampleTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-sans text-xs"
              >
                Ver Transacción en Stellar Expert
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Steps Evaluation Walkthrough */}
      <div className="rounded-2xl border border-sutika-border bg-sutika-card p-6 shadow-xl space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-sutika-gold" />
          <span>Cómo Evaluar el Flujo Completo (Paso a Paso)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-sutika-bg border border-sutika-border flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-full bg-sutika-purple/20 text-sutika-purple font-bold text-xs flex items-center justify-center mb-3">
                1
              </div>
              <h3 className="font-bold text-white text-sm">Auditar Premios en Custodia</h3>
              <p className="text-xs text-sutika-muted mt-2 leading-relaxed">
                Ingresa al torneo de <strong>Dota 2 Andes Championship</strong>. Verás los premios al 1.°, 2.° y 3.° lugar custodiados en Soroban.
              </p>
            </div>
            <Link
              href="/tournaments/dota-andes-2026"
              className="mt-4 text-xs font-bold text-sutika-gold hover:underline flex items-center gap-1"
            >
              <span>Abrir Torneo Dota 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 rounded-xl bg-sutika-bg border border-sutika-border flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-full bg-sutika-gold/20 text-sutika-gold font-bold text-xs flex items-center justify-center mb-3">
                2
              </div>
              <h3 className="font-bold text-white text-sm">Cobrar Premio con KYC Diferido</h3>
              <p className="text-xs text-sutika-muted mt-2 leading-relaxed">
                Haz clic en el botón <strong>&quot;Cobrar Premio (Capitán)&quot;</strong> del 1.° lugar. El sistema computa el <code className="text-white">IdentityHash</code> criptográfico y ejecuta la transacción en Soroban Testnet.
              </p>
            </div>
            <Link
              href="/tournaments/dota-andes-2026"
              className="mt-4 text-xs font-bold text-sutika-gold hover:underline flex items-center gap-1"
            >
              <span>Probar Reclamo en Vivo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 rounded-xl bg-sutika-bg border border-sutika-border flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-3">
                3
              </div>
              <h3 className="font-bold text-white text-sm">Transición Lazy On-Chain</h3>
              <p className="text-xs text-sutika-muted mt-2 leading-relaxed">
                Abre el torneo escolar <strong>Kermesse San Calixto</strong> en modo <code className="text-white">OFF_CHAIN</code> y haz clic en <strong>&quot;Activar Escrow On-Chain&quot;</strong> para ver el anclaje en tiempo real.
              </p>
            </div>
            <Link
              href="/tournaments/san-calixto-sub17"
              className="mt-4 text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Probar Lazy Upgrade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Technical Innovations Summary */}
      <div className="rounded-2xl border border-sutika-border bg-sutika-card p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Code2 className="w-5 h-5 text-sutika-purple" />
          <span>Innovaciones de Arquitectura Implementadas</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-sutika-muted">
          <div className="p-3.5 rounded-xl bg-sutika-bg border border-sutika-border">
            <span className="font-bold text-white block mb-1">1. Arquitectura Híbrida de Costos</span>
            Torneos pequeños operan en PostgreSQL con costo $0 en red; se anclan a Soroban bajo demanda al conseguir sponsor o fondear premios.
          </div>

          <div className="p-3.5 rounded-xl bg-sutika-bg border border-sutika-border">
            <span className="font-bold text-white block mb-1">2. Modelo Capitán Cobrador + Plantel Auditado</span>
            Evita fricción masiva de KYC a cientos de jugadores amateurs. Solo los 3 capitanes ganadores validan identidad, con notificación automática a sus compañeros.
          </div>

          <div className="p-3.5 rounded-xl bg-sutika-bg border border-sutika-border">
            <span className="font-bold text-white block mb-1">3. Privacidad Criptográfica (PII Vault)</span>
            Ningún documento personal se almacena en texto plano en la blockchain. Soroban guarda únicamente el compromiso SHA-256 (IdentityHash).
          </div>

          <div className="p-3.5 rounded-xl bg-sutika-bg border border-sutika-border">
            <span className="font-bold text-white block mb-1">4. Reembolso Automático al Auspiciador</span>
            Si el torneo se suspende o los premios no se reclaman antes del <code className="text-sutika-gold">deadline_ledger</code>, el sponsor recupera sus fondos sin intermediación.
          </div>
        </div>
      </div>
    </div>
  );
}
