import { ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

interface VerificationBadgeProps {
  mode: "OFF_CHAIN" | "ON_CHAIN_ESCROW";
  contractId?: string;
  txHash?: string;
  className?: string;
}

export default function VerificationBadge({
  mode,
  contractId,
  txHash,
  className = "",
}: VerificationBadgeProps) {
  if (mode === "ON_CHAIN_ESCROW") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sutika-gold/15 text-sutika-gold border border-sutika-gold/40 shadow-[0_0_12px_rgba(255,199,0,0.15)] ${className}`}
        title="Torneo Verificado: Premios custodiados en Smart Contract de Soroban (Stellar)"
      >
        <Sparkles className="w-3.5 h-3.5 text-sutika-gold" />
        <span>Sello Sut&apos;i Verificado</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sutika-border/40 text-sutika-muted border border-sutika-border ${className}`}
      title="Torneo en base de datos tradicional sin costo de red"
    >
      <ShieldAlert className="w-3.5 h-3.5 text-sutika-muted" />
      <span>Modo Semilla (Off-Chain)</span>
    </div>
  );
}
