"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Mail, Wallet } from "lucide-react";
import type { CompetitionWallet } from "@/lib/walletRequests";

const EmailAccess = dynamic(() => import("./EmailAccess"), {
  ssr: false,
  loading: () => <p role="status">Abriendo el acceso por correo…</p>,
});
const pollarKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

export default function WalletAccess({
  children,
}: {
  children: (wallet: CompetitionWallet) => ReactNode;
}) {
  const [useEmail, setUseEmail] = useState(false);
  const [wallet, setWallet] = useState<CompetitionWallet>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const { connectTestWallet } = await import("@/lib/externalWallet");
      setWallet(await connectTestWallet());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo abrir la billetera.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (wallet)
    return (
      <div className="wallet-access">
        {children(wallet)}
        <button
          type="button"
          className="text-action"
          onClick={() => setWallet(undefined)}
        >
          Cambiar cuenta
        </button>
      </div>
    );

  if (useEmail && pollarKey)
    return (
      <div className="wallet-access">
        <EmailAccess apiKey={pollarKey}>{children}</EmailAccess>
        <button
          type="button"
          className="text-action"
          onClick={() => setUseEmail(false)}
        >
          <ArrowLeft /> Volver a opciones de acceso
        </button>
      </div>
    );

  const emailAvailable = pollarKey?.startsWith("pub_testnet_");
  return (
    <div className="wallet-access">
      <div className="buttons">
        {emailAvailable && (
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => setUseEmail(true)}
          >
            <Mail /> Entrar con correo
          </button>
        )}
        <button
          type="button"
          className={emailAvailable ? "btn btn-outline" : "btn btn-gold"}
          onClick={connect}
          disabled={busy}
        >
          <Wallet /> {busy ? "Abriendo billetera…" : "Conectar billetera"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="field-note">
        Usa Freighter en Testnet.{" "}
        <Link className="inline-link" href="/guia#cuenta">
          Cómo preparar mi cuenta
        </Link>
      </p>
    </div>
  );
}
