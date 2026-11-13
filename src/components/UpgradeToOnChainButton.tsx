"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { upgradeToOnChainAction } from "@/lib/tournamentsService";
import { useRouter } from "next/navigation";

export default function UpgradeToOnChainButton({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await upgradeToOnChainAction(tournamentId);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        alert(res.error || "Error al actualizar a on-chain");
      }
    } catch (err: any) {
      alert(err.message || "Error al conectar con la red");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 py-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>¡Torneo Anclado a Soroban Testnet!</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="w-full py-2 px-3 rounded-lg bg-sutika-purple hover:bg-sutika-purple-hover text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Anclando en Soroban...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5 text-sutika-gold" />
          <span>Activar Escrow On-Chain</span>
        </>
      )}
    </button>
  );
}
