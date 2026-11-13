"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Shield, Trophy, Loader2 } from "lucide-react";
import { createTournamentAction } from "@/lib/tournamentsService";

export default function CreateTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "FOOTBALL" as any,
    teamMaxSize: 10,
    organizerName: "",
    organizerPhone: "",
    mode: "ON_CHAIN_ESCROW" as any,
    prize1Amount: 200,
    prize1Sponsor: "Fuerza Total Gym & Sponsors",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createTournamentAction(formData);
      router.push(`/tournaments/${res.publicSlug}`);
    } catch (err: any) {
      alert(err.message || "Error al crear el torneo");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-sutika-muted hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Torneos</span>
      </Link>

      <div className="rounded-2xl border border-sutika-border bg-sutika-card p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 pb-6 border-b border-sutika-border/60">
          <div className="w-10 h-10 rounded-xl bg-sutika-purple/15 text-sutika-purple border border-sutika-purple/30 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Crear Nuevo Torneo</h1>
            <p className="text-xs text-sutika-muted">
              Define los parámetros deportivos y la modalidad de custodia de premios
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Tournament Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre del Torneo / Competencia *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Copa Relámpago de Verano 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
            />
          </div>

          {/* Category & Max Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Disciplina / Vertical
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  let defSize = 10;
                  if (cat === "CHESS") defSize = 1;
                  else if (cat === "ESPORTS_DOTA" || cat === "HACKATHON") defSize = 5;
                  else if (cat === "FOOTBALL") defSize = 12;
                  setFormData({ ...formData, category: cat as any, teamMaxSize: defSize });
                }}
                className="w-full px-3.5 py-2.5 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
              >
                <option value="FOOTBALL">Fútbol (Cancha abierta / 7 / 11)</option>
                <option value="FUTSAL">Fútbol Sala (Futsal)</option>
                <option value="VOLLEYBALL">Voleibol</option>
                <option value="BASKETBALL">Básquetbol</option>
                <option value="ESPORTS_DOTA">Esports (Dota 2 u otros)</option>
                <option value="CHESS">Ajedrez (1 vs 1)</option>
                <option value="HACKATHON">Hackatón de Software</option>
                <option value="SCHOOL_EVENT">Actividad o Kermesse Escolar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Límite por Equipo (team_max_size)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={formData.teamMaxSize}
                onChange={(e) => setFormData({ ...formData, teamMaxSize: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
              />
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Modalidad de Arquitectura
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition ${
                  formData.mode === "ON_CHAIN_ESCROW"
                    ? "bg-sutika-gold/10 border-sutika-gold text-white"
                    : "bg-sutika-bg border-sutika-border text-sutika-muted hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-sutika-gold">
                    <Sparkles className="w-4 h-4" />
                    ON_CHAIN_ESCROW
                  </span>
                  <input
                    type="radio"
                    name="mode"
                    checked={formData.mode === "ON_CHAIN_ESCROW"}
                    onChange={() => setFormData({ ...formData, mode: "ON_CHAIN_ESCROW" })}
                    className="accent-sutika-gold"
                  />
                </div>
                <p className="text-[11px] leading-relaxed">
                  Custodia de premios verificada en <strong>Soroban Testnet</strong>. Ideal para torneos con sponsors o hackatones.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition ${
                  formData.mode === "OFF_CHAIN"
                    ? "bg-sutika-purple/10 border-sutika-purple text-white"
                    : "bg-sutika-bg border-sutika-border text-sutika-muted hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-white">
                    <Shield className="w-4 h-4 text-sutika-muted" />
                    OFF_CHAIN (Semilla)
                  </span>
                  <input
                    type="radio"
                    name="mode"
                    checked={formData.mode === "OFF_CHAIN"}
                    onChange={() => setFormData({ ...formData, mode: "OFF_CHAIN" })}
                    className="accent-sutika-purple"
                  />
                </div>
                <p className="text-[11px] leading-relaxed">
                  Gratuito en base de datos. Para torneos pequeños que luego pueden actualizarse a On-Chain.
                </p>
              </label>
            </div>
          </div>

          {/* Organizer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del Organizador *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Marcelo Quiroga"
                value={formData.organizerName}
                onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp del Organizador *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: +591 71234567"
                value={formData.organizerPhone}
                onChange={(e) => setFormData({ ...formData, organizerPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-sutika-bg border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
              />
            </div>
          </div>

          {/* Sponsor & Initial Prize */}
          {formData.mode === "ON_CHAIN_ESCROW" && (
            <div className="p-4 rounded-xl bg-sutika-bg border border-sutika-border space-y-4">
              <h4 className="text-xs font-bold text-sutika-gold uppercase tracking-wider">
                Configuración del Pozo de Premios en Custodia
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Auspiciador
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Panadería La Espiga"
                    value={formData.prize1Sponsor}
                    onChange={(e) => setFormData({ ...formData, prize1Sponsor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-sutika-card border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Premio Campeón (1.° Lugar en USDC)
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={formData.prize1Amount}
                    onChange={(e) => setFormData({ ...formData, prize1Amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-sutika-card border border-sutika-border text-white text-sm focus:outline-none focus:border-sutika-gold"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg text-sm text-sutika-muted hover:text-white transition"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-sutika-purple hover:bg-sutika-purple-hover text-white font-bold text-sm transition flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando torneo...</span>
                </>
              ) : (
                <span>Crear Torneo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
