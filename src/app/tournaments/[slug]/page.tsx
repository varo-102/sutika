import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Lock,
} from "lucide-react";
import { getTournamentBySlug } from "@/lib/tournamentsService";
import VerificationBadge from "@/components/VerificationBadge";
import PrizeVaultWidget from "@/components/PrizeVaultWidget";
import UpgradeToOnChainButton from "@/components/UpgradeToOnChainButton";
import { getExplorerContractUrl, getExplorerTxUrl } from "@/lib/stellar";

export const revalidate = 0;

interface PageProps {
  params: { slug: string };
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const tournament = await getTournamentBySlug(params.slug);

  if (!tournament) {
    notFound();
  }

  const isEsportsOrTech =
    tournament.category === "ESPORTS_DOTA" ||
    tournament.category === "HACKATHON" ||
    tournament.category === "CHESS";

  const bannerImg = isEsportsOrTech
    ? "/images/hero-esports.jpeg"
    : "/images/hero-sports.jpeg";

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-sutika-muted hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Torneos</span>
      </Link>

      {/* Header Banner with Rich Visual Background */}
      <div className="rounded-3xl border border-sutika-border bg-sutika-card p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Background Photo with Gradient Fade */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <Image
            src={bannerImg}
            alt={tournament.name}
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sutika-card via-sutika-card/90 to-sutika-card/60" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs px-3 py-1 rounded-md bg-sutika-bg/90 backdrop-blur-md border border-sutika-border font-bold text-white uppercase tracking-wider">
                {tournament.category.replace("_", " ")}
              </span>

              <VerificationBadge
                mode={tournament.mode}
                contractId={tournament.sorobanContractId}
                txHash={tournament.sorobanTxHash}
              />

              {tournament.rosterLocked && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-sutika-bg/80 backdrop-blur-md border border-sutika-border text-sutika-muted flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Listas Congeladas
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {tournament.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-sutika-muted">
              <div>
                Organizador: <span className="text-white font-medium">{tournament.organizer.fullName}</span>
              </div>
              <span>•</span>
              <div>
                Cupo por Equipo: <span className="text-white font-medium">{tournament.teamMaxSize} jugadores</span>
              </div>
              <span>•</span>
              <div>
                Estado: <span className="text-sutika-gold font-semibold">{tournament.status}</span>
              </div>
            </div>
          </div>

          {/* Upgrade Banner Button if OFF_CHAIN */}
          {tournament.mode === "OFF_CHAIN" && (
            <div className="p-4 rounded-2xl bg-sutika-bg/90 backdrop-blur-md border border-sutika-gold/40 max-w-sm shadow-xl relative z-10">
              <div className="flex items-center gap-2 text-xs font-bold text-sutika-gold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>¿Conseguiste un Patrocinador?</span>
              </div>
              <p className="text-xs text-sutika-muted mb-3 leading-relaxed">
                Ancla este torneo barrial a <strong>Soroban Testnet</strong> en un clic y custodia los premios con respaldo criptográfico.
              </p>
              <UpgradeToOnChainButton tournamentId={tournament.id} />
            </div>
          )}
        </div>
      </div>

      {/* Prize Escrow Vault Widget */}
      <PrizeVaultWidget
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        mode={tournament.mode}
        prizes={tournament.prizes}
      />

      {/* Teams & Roster Section */}
      <div className="rounded-2xl border border-sutika-border bg-sutika-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-sutika-border/60">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sutika-purple" />
              <span>Equipos Participantes ({tournament.teams.length})</span>
            </h3>
            <p className="text-xs text-sutika-muted mt-0.5">
              Afiliación directa por link de WhatsApp • Lista de buena fe auditada por los mismos jugadores
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournament.teams.map((team) => (
            <div
              key={team.id}
              className="p-4 rounded-xl bg-sutika-bg border border-sutika-border/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-sm">{team.name}</h4>
                  {team.finalStanding && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sutika-gold/15 text-sutika-gold font-bold border border-sutika-gold/30">
                      {team.finalStanding === 1 ? "🏆 Campeón" : team.finalStanding === 2 ? "🥈 2.° Puesto" : "🥉 3.° Puesto"}
                    </span>
                  )}
                </div>

                <div className="text-xs text-sutika-muted space-y-1">
                  <div>
                    Capitán: <span className="text-slate-200 font-medium">{team.captainName}</span>
                  </div>
                  <div>
                    Teléfono: <span className="text-slate-300 font-mono">{team.captainPhone}</span>
                  </div>
                  <div>
                    Plantilla: <span className="text-white font-medium">{team.membersCount} / {tournament.teamMaxSize} jugadores</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sutika-border/50 flex items-center justify-between text-xs">
                <span className="text-sutika-muted font-mono text-[11px]">Token: #{team.whatsappInviteToken}</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp OK
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
