import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  ShieldCheck,
  Zap,
  Gamepad2,
  Users,
  Code2,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { getTournaments } from "@/lib/tournamentsService";
import VerificationBadge from "@/components/VerificationBadge";
import { SUTIKA_CONTRACT_ID, getExplorerContractUrl, getExplorerTxUrl } from "@/lib/stellar";

export const revalidate = 0;

export default async function HomePage() {
  const tournaments = await getTournaments();

  const totalUsdcInEscrow = tournaments.reduce((acc, t) => {
    if (t.mode === "ON_CHAIN_ESCROW") {
      const prizeSum = t.prizes.reduce((sum, p) => sum + (p.amountUsdc || 0), 0);
      return acc + prizeSum;
    }
    return acc;
  }, 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ESPORTS_DOTA":
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case "HACKATHON":
        return <Code2 className="w-4 h-4 text-emerald-400" />;
      case "SCHOOL_EVENT":
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      default:
        return <Trophy className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-sutika-border bg-gradient-to-b from-sutika-card via-sutika-card to-sutika-bg p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-sutika-purple/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-sutika-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sutika-gold/15 border border-sutika-gold/30 text-sutika-gold text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arquitectura Híbrida Soroban: Off-Chain por Defecto / On-Chain Bajo Demanda</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Patrocinios y Premios <span className="text-sutika-gold">Verificables</span> en Torneos Reales
          </h1>

          <p className="mt-4 text-base sm:text-lg text-sutika-muted leading-relaxed">
            Sutika es la capa de confianza y custodia programable (<em>Promotional Escrow</em>) para torneos de fútbol amateur, esports, ajedrez, colegios y hackatones. Garantizamos que el pozo auspiciado llegue directamente a los ganadores mediante contratos inteligentes en <strong>Stellar Soroban</strong>.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/evaluator"
              className="px-6 py-3 rounded-xl bg-sutika-gold hover:bg-sutika-gold-hover text-sutika-bg font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-sutika-gold/20"
            >
              <Zap className="w-4 h-4" />
              <span>Modo Evaluador (Hackathon)</span>
            </Link>

            <Link
              href="/create"
              className="px-6 py-3 rounded-xl bg-sutika-card hover:bg-sutika-cardHover border border-sutika-border text-white text-sm font-semibold transition flex items-center gap-2"
            >
              <span>Crear Nuevo Torneo</span>
              <ArrowRight className="w-4 h-4 text-sutika-muted" />
            </Link>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="relative z-10 mt-10 pt-8 border-t border-sutika-border/70 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              ${totalUsdcInEscrow.toLocaleString()} USDC
            </div>
            <div className="text-xs text-sutika-muted mt-0.5">En Custodia Escrow Activa</div>
          </div>
          <div>
            <div className="text-2xl font-black text-sutika-gold tracking-tight">
              4 Verticales
            </div>
            <div className="text-xs text-sutika-muted mt-0.5">Deportes, Esports, Hackatones y Colegios</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Protocol 22</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs text-sutika-muted mt-0.5">Stellar Soroban Testnet</div>
          </div>
          <div>
            <a
              href={getExplorerContractUrl(SUTIKA_CONTRACT_ID)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-sutika-purple hover:underline flex items-center gap-1 mt-1"
            >
              <span className="truncate max-w-[140px]">{SUTIKA_CONTRACT_ID}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            <div className="text-xs text-sutika-muted mt-0.5">Contrato Verificado</div>
          </div>
        </div>
      </section>

      {/* Tournaments Grid Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Torneos en la Plataforma</h2>
            <p className="text-sm text-sutika-muted">
              Explora torneos en vivo, audita la custodia en Stellar y prueba el flujo de cobro del podio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((tournament) => {
            const prizeUsdcTotal = tournament.prizes.reduce(
              (sum, p) => sum + (p.amountUsdc || 0),
              0
            );

            return (
              <div
                key={tournament.id}
                className="group rounded-2xl border border-sutika-border bg-sutika-card p-6 hover:border-sutika-purple/50 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-sutika-bg border border-sutika-border">
                        {getCategoryIcon(tournament.category)}
                      </span>
                      <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                        {tournament.category.replace("_", " ")}
                      </span>
                    </div>

                    <VerificationBadge
                      mode={tournament.mode}
                      contractId={tournament.sorobanContractId}
                      txHash={tournament.sorobanTxHash}
                    />
                  </div>

                  {/* Title & Slug */}
                  <h3 className="text-lg font-bold text-white group-hover:text-sutika-gold transition leading-snug">
                    <Link href={`/tournaments/${tournament.publicSlug}`}>
                      {tournament.name}
                    </Link>
                  </h3>

                  <p className="text-xs text-sutika-muted mt-1">
                    Organizado por: <span className="text-slate-300 font-medium">{tournament.organizer.fullName}</span>
                  </p>

                  {/* Prizes Pill */}
                  <div className="mt-4 p-3 rounded-xl bg-sutika-bg border border-sutika-border/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-sutika-muted">Pozo Auspiciado</div>
                      <div className="text-sm font-bold text-sutika-gold">
                        {prizeUsdcTotal > 0 ? `$${prizeUsdcTotal} USDC` : "Vouchers de Consumo"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-sutika-muted">Equipos</div>
                      <div className="text-sm font-semibold text-white">
                        {tournament.teams.length} inscritos
                      </div>
                    </div>
                  </div>

                  {/* Prizes Highlights */}
                  <div className="mt-3 space-y-1.5">
                    {tournament.prizes.slice(0, 2).map((prize) => (
                      <div
                        key={prize.id}
                        className="text-xs flex items-center justify-between text-slate-300"
                      >
                        <span className="text-sutika-muted">
                          {prize.targetStanding === 1 ? "1.° Lugar:" : prize.targetStanding === 2 ? "2.° Lugar:" : "3.° Lugar:"}
                        </span>
                        <span className="font-medium truncate max-w-[200px]">
                          {prize.amountUsdc ? `$${prize.amountUsdc} USDC` : prize.voucherDescription}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-6 pt-4 border-t border-sutika-border/60 flex items-center justify-between gap-3">
                  <Link
                    href={`/tournaments/${tournament.publicSlug}`}
                    className="text-xs font-semibold text-white hover:text-sutika-gold transition flex items-center gap-1"
                  >
                    <span>Ver Detalles y Podio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {tournament.sorobanTxHash && (
                    <a
                      href={getExplorerTxUrl(tournament.sorobanTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-sutika-purple hover:underline flex items-center gap-1"
                    >
                      <span>Auditar en Stellar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
