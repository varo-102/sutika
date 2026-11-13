"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, PlusCircle, ExternalLink, Award } from "lucide-react";
import { SUTIKA_CONTRACT_ID, getExplorerContractUrl } from "@/lib/stellar";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-sutika-border bg-sutika-bg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 overflow-hidden rounded-lg border border-sutika-border bg-sutika-card p-1">
            <Image
              src="/branding/isologo-transparente-sutika.png"
              alt="Sutika Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-sutika-gold transition">
              SUTIKA
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-sutika-purple/20 text-sutika-purple border border-sutika-purple/30 font-mono">
              Soroban Testnet
            </span>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-sutika-muted">
          <Link href="/" className="hover:text-white transition">
            Torneos
          </Link>
          <Link href="/evaluator" className="hover:text-sutika-gold transition flex items-center gap-1.5 font-medium text-white">
            <Award className="w-4 h-4 text-sutika-gold" />
            Modo Evaluador
          </Link>
          <a
            href={getExplorerContractUrl(SUTIKA_CONTRACT_ID)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition flex items-center gap-1"
          >
            Contrato en Explorer
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sutika-purple hover:bg-sutika-purple-hover text-white text-sm font-medium transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Torneo</span>
          </Link>

          {/* Testnet Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border border-sutika-border bg-sutika-card text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sutika-muted">Stellar Testnet</span>
          </div>
        </div>
      </div>
    </header>
  );
}
