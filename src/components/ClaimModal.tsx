"use client";

import { useState } from "react";
import { X, ShieldCheck, CheckCircle2, Loader2, ExternalLink, QrCode } from "lucide-react";
import { processClaimAction } from "@/lib/tournamentsService";
import { getExplorerTxUrl } from "@/lib/stellar";

interface ClaimModalProps {
  tournamentId: string;
  prize: {
    id: string;
    targetStanding: number;
    amountUsdc?: number;
    voucherDescription?: string;
    prizeType: "USDC_TOKEN" | "MERCHANT_QR_VOUCHER";
    winningTeamName?: string;
    claimedByUserName?: string;
    requiredKycLevel: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimModal({
  tournamentId,
  prize,
  onClose,
  onSuccess,
}: ClaimModalProps) {
  const [captainName, setCaptainName] = useState(prize.claimedByUserName || "Carlos Mendoza");
  const [documentNumber, setDocumentNumber] = useState("8923412-LP");
  const [documentType, setDocumentType] = useState("CI");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    txHash?: string;
    identityHash?: string;
    error?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await processClaimAction({
        tournamentId,
        prizeId: prize.id,
        standing: prize.targetStanding,
        captainName,
        documentNumber,
        kycLevel: prize.requiredKycLevel,
      });

      if (res.success) {
        setResult({
          txHash: res.txHash,
          identityHash: res.identityHashHex,
        });
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        setResult({ error: res.error || "Error al procesar el reclamo" });
      }
    } catch (err: any) {
      setResult({ error: err.message || "Error de conexión" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-sutika-card border border-sutika-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sutika-muted hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sutika-gold/15 text-sutika-gold border border-sutika-gold/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Reclamo de Premio en Soroban
            </h3>
            <p className="text-xs text-sutika-muted">
              Validación de Identidad Diferida (Claim-Gated KYC)
            </p>
          </div>
        </div>

        {/* Prize Overview Box */}
        <div className="p-3.5 rounded-xl bg-sutika-bg border border-sutika-border/70 mb-5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-sutika-muted">Equipo Ganador:</span>
            <span className="font-semibold text-white">{prize.winningTeamName}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-sutika-muted">Premio:</span>
            <span className="font-bold text-sutika-gold">
              {prize.prizeType === "USDC_TOKEN"
                ? `$${prize.amountUsdc} USDC`
                : prize.voucherDescription}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1 text-sutika-muted">
            <span>Nivel de KYC Requerido:</span>
            <span className="text-white font-mono">{prize.requiredKycLevel}</span>
          </div>
        </div>

        {result?.txHash ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">¡Premio Reclamado con Éxito!</h4>
              <p className="text-xs text-sutika-muted mt-1">
                La transacción ha sido registrada y confirmada en Stellar Soroban Testnet.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-sutika-bg border border-sutika-border text-left font-mono text-xs space-y-2">
              <div>
                <span className="text-sutika-muted block text-[10px]">Proof of Delivery (Tx Hash):</span>
                <a
                  href={getExplorerTxUrl(result.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sutika-purple hover:underline flex items-center gap-1 break-all"
                >
                  {result.txHash}
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              </div>
              {result.identityHash && (
                <div>
                  <span className="text-sutika-muted block text-[10px]">IdentityCommitmentHash (SHA-256):</span>
                  <span className="text-slate-300 break-all text-[11px]">{result.identityHash}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-sutika-gold font-medium">
              🔔 Notificación de transparencia enviada a todos los miembros del equipo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre Completo del Capitán / Delegado
              </label>
              <input
                type="text"
                required
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
              />
              <span className="text-[11px] text-sutika-muted mt-1 block">
                Debe coincidir con la lista de buena fe congelada al inicio del torneo.
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo Doc.
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
                >
                  <option value="CI">CI (Bolivia)</option>
                  <option value="DNI">DNI</option>
                  <option value="PASSPORT">Pasaporte</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  N° de Documento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 8923412-LP"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sutika-purple/10 border border-sutika-purple/20 text-xs text-sutika-muted flex gap-2.5 items-start">
              <ShieldCheck className="w-4 h-4 text-sutika-purple flex-shrink-0 mt-0.5" />
              <span>
                <strong>Privacidad de Datos (PII Vault):</strong> Tu documento nunca se escribe en la blockchain. Soroban solo almacena el hash criptográfico SHA-256 para auditoría de entrega.
              </span>
            </div>

            {result?.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {result.error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-sutika-muted hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-sutika-gold hover:bg-sutika-gold-hover text-sutika-bg font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Firmando en Soroban...</span>
                  </>
                ) : (
                  <span>Firmar y Cobrar Premio</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
