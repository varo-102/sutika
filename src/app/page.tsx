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
  QrCode,
  Flame,
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

  const getCategoryThumbnail = (category: string) => {
    switch (category) {
      case "ESPORTS_DOTA":
      case "HACKATHON":
      case "CHESS":
        return "/images/hero-esports.jpeg";
      default:
        return "/images/hero-sports.jpeg";
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-sutika-border bg-gradient-to-b from-sutika-card via-sutika-card to-sutika-bg shadow-2xl">
        {/* Ambient Lights */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-sutika-purple/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-28 w-[450px] h-[450px] bg-sutika-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 sm:p-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sutika-gold/15 border border-sutika-gold/30 text-sutika-gold text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Arquitectura Híbrida en Soroban: Off-Chain por Defecto / On-Chain Bajo Demanda</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Tu Esfuerzo en la Cancha. <br />
              <span className="text-sutika-gold">Premios Reales</span> y Garantizados.
            </h1>

            <p className="text-base sm:text-lg text-sutika-muted leading-relaxed max-w-2xl">
              Sutika es la capa de confianza que elimina la intermediación opaca en torneos de fútbol amateur, ligas barriales, esports (Dota 2) y hackatones. Los sponsors bloquean los premios en contratos inteligentes de <strong>Stellar Soroban</strong> y se entregan directamente a los campeones legítimos.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/evaluator"
                className="px-6 py-3.5 rounded-xl bg-sutika-gold hover:bg-sutika-gold-hover text-sutika-bg font-extrabold text-sm transition flex items-center gap-2 shadow-lg shadow-sutika-gold/25"
              >
                <Zap className="w-4 h-4" />
                <span>Modo Evaluador (Hackathon)</span>
              </Link>

              <Link
                href="/create"
                className="px-6 py-3.5 rounded-xl bg-sutika-card hover:bg-sutika-cardHover border border-sutika-border text-white text-sm font-semibold transition flex items-center gap-2"
              >
                <span>Crear Torneo</span>
                <ArrowRight className="w-4 h-4 text-sutika-muted" />
              </Link>
            </div>
          </div>

          {/* Hero Featured Image Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-sutika-border/80 shadow-2xl group">
              <Image
                src="/images/hero-sports.jpeg"
                alt="Campeones de fútbol celebrando con Sutika"
                width={800}
                height={500}
                priority
                className="w-full h-[320px] sm:h-[380px] object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sutika-bg via-transparent to-transparent opacity-80" />
              
              <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-sutika-card/90 backdrop-blur-md border border-sutika-border/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sutika-gold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Copa Nocturna La Paz</span>
                  </div>
                  <div className="text-[11px] text-sutika-muted mt-0.5">
                    $250 USDC + Indumentaria entregados al capitán
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Proof of Delivery OK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="relative z-10 border-t border-sutika-border/70 bg-sutika-bg/50 px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ${totalUsdcInEscrow.toLocaleString()} USDC
            </div>
            <div className="text-xs text-sutika-muted mt-0.5">En Custodia Escrow Activa</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-sutika-gold tracking-tight">
              4 Verticales
            </div>
            <div className="text-xs text-sutika-muted mt-0.5">Fútbol/Futsal, Esports, Colegios y Hackatones</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-1.5">
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
              className="text-xs font-mono text-sutika-purple hover:underline flex items-center gap-1 mt-1 font-semibold"
            >
              <span className="truncate max-w-[140px]">{SUTIKA_CONTRACT_ID}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            <div className="text-xs text-sutika-muted mt-0.5">Contrato Inteligente Verificado</div>
          </div>
        </div>
      </section>

      {/* 3 User Experiences Showcase Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Diseñado para los que Dejan Todo en la Cancha y en la Pantalla
          </h2>
          <p className="text-sm text-sutika-muted">
            Eliminamos la desconfianza: ningún organizador informal puede retener o desviar los premios prometidos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sports */}
          <div className="rounded-2xl border border-sutika-border bg-sutika-card overflow-hidden shadow-lg group hover:border-sutika-gold/50 transition">
            <div className="relative h-48 overflow-hidden">
              <Image
                src="/images/hero-sports.jpeg"
                alt="Fútbol amateur con premios auditables"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sutika-card via-transparent to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-sutika-bg/80 backdrop-blur-md text-amber-400 text-xs font-bold border border-amber-400/30 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Deportes de Cancha
              </span>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-bold text-white group-hover:text-sutika-gold transition">
                Fútbol 7, Futsal y Ligas Barriales
              </h3>
              <p className="text-xs text-sutika-muted leading-relaxed">
                Inscripción de equipos en segundos vía WhatsApp. Listas de buena fe congeladas antes de la final para evitar jugadores suplantados. El premio se libera al capitán con notificación al plantel.
              </p>
            </div>
          </div>

          {/* Card 2: Esports & Hackathons */}
          <div className="rounded-2xl border border-sutika-border bg-sutika-card overflow-hidden shadow-lg group hover:border-sutika-purple/50 transition">
            <div className="relative h-48 overflow-hidden">
              <Image
                src="/images/hero-esports.jpeg"
                alt="Esports y Gaming con custodia USDC en Soroban"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sutika-card via-transparent to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-sutika-bg/80 backdrop-blur-md text-purple-400 text-xs font-bold border border-purple-400/30 flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                Esports &amp; Hackatones
              </span>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-bold text-white group-hover:text-sutika-purple transition">
                Dota 2 y Competencias Web3
              </h3>
              <p className="text-xs text-sutika-muted leading-relaxed">
                Liquidación transfronteriza instantánea en USDC sobre Stellar. Cero comisiones bancarias internacionales y cobro transparente respaldado por KYC digital ligero y recibo contable.
              </p>
            </div>
          </div>

          {/* Card 3: Merchant Vouchers */}
          <div className="rounded-2xl border border-sutika-border bg-sutika-card overflow-hidden shadow-lg group hover:border-emerald-500/50 transition">
            <div className="relative h-48 overflow-hidden">
              <Image
                src="/images/voucher-redeem.jpeg"
                alt="Canje de Voucher QR en tienda local"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sutika-card via-transparent to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-sutika-bg/80 backdrop-blur-md text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                <QrCode className="w-3 h-3" />
                Comercio Local
              </span>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                Vouchers QR en Negocios de la Zona
              </h3>
              <p className="text-xs text-sutika-muted leading-relaxed">
                Los comercios auspiciadores entregan comidas grupales o indumentaria. El capitán presenta su QR nominal y el comerciante lo valida en mostrador registrando la prueba de entrega en Stellar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tournaments Grid Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Torneos Activos en la Plataforma</h2>
            <p className="text-sm text-sutika-muted">
              Explora los torneos en vivo, audita la custodia en Stellar y prueba el flujo de cobro del podio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((tournament) => {
            const prizeUsdcTotal = tournament.prizes.reduce(
              (sum, p) => sum + (p.amountUsdc || 0),
              0
            );
            const thumbImg = getCategoryThumbnail(tournament.category);

            return (
              <div
                key={tournament.id}
                className="group rounded-2xl border border-sutika-border bg-sutika-card hover:border-sutika-purple/50 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden"
              >
                {/* Tournament Image Banner */}
                <div className="relative h-36 w-full overflow-hidden">
                  <Image
                    src={thumbImg}
                    alt={tournament.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sutika-card via-sutika-card/60 to-transparent" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sutika-bg/90 backdrop-blur-md border border-sutika-border">
                      {getCategoryIcon(tournament.category)}
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider bg-sutika-bg/80 backdrop-blur-md px-2 py-0.5 rounded border border-sutika-border">
                      {tournament.category.replace("_", " ")}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <VerificationBadge
                      mode={tournament.mode}
                      contractId={tournament.sorobanContractId}
                      txHash={tournament.sorobanTxHash}
                    />
                  </div>
                </div>

                <div className="p-6 pt-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title */}
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
                        <div className="text-xs text-sutika-muted">Pozo en Custodia</div>
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
