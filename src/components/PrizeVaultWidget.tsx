"use client";

import { useState } from "react";
import { Trophy, Gift, CheckCircle2, Lock, ExternalLink, ArrowRight } from "lucide-react";
import { getExplorerTxUrl, SUTIKA_CONTRACT_ID, getExplorerContractUrl } from "@/lib/stellar";
import ClaimModal from "./ClaimModal";

interface PrizeItem {
  id: string;
  targetStanding: number;
  sponsorName: string;
  prizeType: "USDC_TOKEN" | "MERCHANT_QR_VOUCHER";
  amountUsdc?: number;
  voucherDescription?: string;
  requiredKycLevel: "NONE" | "LEVEL_1_COUNTER" | "LEVEL_2_LIGHT" | "LEVEL_3_FULL";
  claimStatus: "PENDING_TOURNAMENT_END" | "AWAITING_CAPTAIN_KYC" | "READY_TO_CLAIM" | "CLAIMED_VERIFIED";
  winningTeamName?: string;
  claimedByUserName?: string;
  sorobanTxHash?: string;
}

interface PrizeVaultWidgetProps {
  tournamentId: string;
  tournamentName: string;
  mode: "OFF_CHAIN" | "ON_CHAIN_ESCROW";
  prizes: PrizeItem[];
  onClaimSuccess?: () => void;
}

export default function PrizeVaultWidget({
  tournamentId,
  tournamentName,
  mode,
  prizes,
  onClaimSuccess,
}: PrizeVaultWidgetProps) {
  const [activeModalPrize, setActiveModalPrize] = useState<PrizeItem | null>(null);

  const totalUsdc = prizes.reduce((acc, p) => acc + (p.amountUsdc || 0), 0);

  return (
    <div className="rounded-xl border border-sutika-border bg-sutika-card p-6 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sutika-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-sutika-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">Bóveda de Premios al Podio</h3>
            {mode === "ON_CHAIN_ESCROW" && (
              <span className="text-xs px-2 py-0.5 rounded bg-sutika-gold/15 text-sutika-gold border border-sutika-gold/30 font-semibold">
                Custodia Escrow Activa
              </span>
            )}
          </div>
          <p className="text-sm text-sutika-muted mt-0.5">
            Premios asignados por mérito para 1.°, 2.° y 3.° lugar (Capitán Cobrador + Equipo Auditado)
          </p>
        </div>

        {totalUsdc > 0 && (
          <div className="text-right">
            <div className="text-2xl font-black text-sutika-gold tracking-tight">
              ${totalUsdc.toLocaleString()} USDC
            </div>
            <div className="text-xs text-sutika-muted">Pozo total garantizado</div>
          </div>
        )}
      </div>

      {/* Prizes List */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((standing) => {
          const prize = prizes.find((p) => p.targetStanding === standing);
          const standingLabel = standing === 1 ? "1.° Lugar (Campeón)" : standing === 2 ? "2.° Lugar (Subcampeón)" : "3.° Lugar (Tercer Puesto)";
          const medalColor = standing === 1 ? "text-amber-400 bg-amber-400/10 border-amber-400/30" : standing === 2 ? "text-slate-300 bg-slate-300/10 border-slate-300/30" : "text-amber-600 bg-amber-600/10 border-amber-600/30";

          if (!prize) {
            return (
              <div
                key={standing}
                className="rounded-lg border border-dashed border-sutika-border/60 p-4 bg-sutika-bg/40 text-center flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm mb-2 ${medalColor}`}>
                  {standing}
                </div>
                <div className="text-xs text-sutika-muted font-medium">{standingLabel}</div>
                <div className="text-xs text-sutika-muted/60 mt-1">Sin premio configurado</div>
              </div>
            );
          }

          return (
            <div
              key={standing}
              className="rounded-lg border border-sutika-border bg-sutika-bg/60 p-4 flex flex-col justify-between hover:border-sutika-purple/50 transition relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${medalColor}`}>
                    <Trophy className="w-3 h-3" />
                    {standingLabel}
                  </span>

                  {prize.prizeType === "USDC_TOKEN" ? (
                    <span className="text-xs font-mono font-bold text-sutika-gold">
                      ${prize.amountUsdc} USDC
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Voucher QR
                    </span>
                  )}
                </div>

                <div className="text-sm font-semibold text-white line-clamp-2">
                  {prize.prizeType === "USDC_TOKEN"
                    ? `$${prize.amountUsdc} USDC en Custodia Soroban`
                    : prize.voucherDescription}
                </div>

                <div className="text-xs text-sutika-muted mt-2">
                  <span className="text-sutika-muted/70">Auspiciador: </span>
                  <span className="text-slate-200 font-medium">{prize.sponsorName}</span>
                </div>

                {prize.winningTeamName && (
                  <div className="text-xs mt-2 p-2 rounded bg-sutika-card border border-sutika-border/60">
                    <span className="text-sutika-muted">Equipo Asignado: </span>
                    <span className="text-white font-medium">{prize.winningTeamName}</span>
                  </div>
                )}
              </div>

              {/* Status / Claim CTA */}
              <div className="mt-4 pt-3 border-t border-sutika-border/50">
                {prize.claimStatus === "CLAIMED_VERIFIED" ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Cobrado & Verificado (Proof of Delivery)</span>
                    </div>
                    {prize.sorobanTxHash && (
                      <a
                        href={getExplorerTxUrl(prize.sorobanTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-sutika-purple hover:underline flex items-center gap-1"
                      >
                        Tx: {prize.sorobanTxHash.slice(0, 10)}...{prize.sorobanTxHash.slice(-6)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : prize.claimStatus === "READY_TO_CLAIM" ? (
                  <button
                    onClick={() => setActiveModalPrize(prize)}
                    className="w-full py-2 px-3 rounded-lg bg-sutika-gold hover:bg-sutika-gold-hover text-sutika-bg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Cobrar Premio (Capitán)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-sutika-muted">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloqueado hasta fin de torneo</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contract Verification Link Footer */}
      {mode === "ON_CHAIN_ESCROW" && (
        <div className="mt-5 pt-4 border-t border-sutika-border/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-sutika-muted gap-2">
          <div className="flex items-center gap-1.5 font-mono">
            <span>Contrato Soroban:</span>
            <span className="text-white">{SUTIKA_CONTRACT_ID.slice(0, 8)}...{SUTIKA_CONTRACT_ID.slice(-8)}</span>
          </div>
          <a
            href={getExplorerContractUrl(SUTIKA_CONTRACT_ID)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sutika-purple hover:text-sutika-purple-hover flex items-center gap-1 font-medium"
          >
            Verificar balance y eventos en Stellar Expert
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Claim Modal */}
      {activeModalPrize && (
        <ClaimModal
          tournamentId={tournamentId}
          prize={activeModalPrize}
          onClose={() => setActiveModalPrize(null)}
          onSuccess={() => {
            setActiveModalPrize(null);
            if (onClaimSuccess) onClaimSuccess();
          }}
        />
      )}
    </div>
  );
}
