"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Mail, Wallet } from "lucide-react";
import { localized, translate, type Locale } from "@/lib/locale";
import type { CompetitionWallet } from "@/lib/walletRequests";

const EmailAccess = dynamic(() => import("./EmailAccess"), { ssr: false });
const pollarKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

export default function WalletAccess({
  children,
  locale = "es",
}: {
  children: (wallet: CompetitionWallet) => ReactNode;
  locale?: Locale;
}) {
  const t = translate(locale);
  const [useEmail, setUseEmail] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [wallet, setWallet] = useState<CompetitionWallet>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailKey = pollarKey?.startsWith("pub_testnet_") ? pollarKey : undefined;

  useEffect(() => {
    let alive = true;
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !("freighter" in window)) return;
    import("@stellar/freighter-api")
      .then(({ isConnected }) => isConnected())
      .then(({ isConnected }) => { if (alive) setHasExtension(isConnected); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const { connectTestWallet } = await import("@/lib/externalWallet");
      setWallet(await connectTestWallet(locale));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t("No se pudo abrir la billetera.", "Could not open the wallet."));
    } finally {
      setBusy(false);
    }
  }

  if (wallet) return (
    <div className="wallet-access">
      {children(wallet)}
      <button type="button" className="text-action" onClick={() => setWallet(undefined)}>{t("Cambiar cuenta", "Switch account")}</button>
    </div>
  );

  if (useEmail && emailKey) return (
    <div className="wallet-access">
      <EmailAccess apiKey={emailKey} locale={locale}>{children}</EmailAccess>
      <button type="button" className="text-action" onClick={() => setUseEmail(false)}>
        <ArrowLeft /> {t("Volver a opciones de acceso", "Back to sign-in options")}
      </button>
    </div>
  );

  return (
    <div className="wallet-access">
      <div className="buttons">
        {emailKey && <button type="button" className="btn btn-gold" onClick={() => setUseEmail(true)}>
          <Mail /> {t("Entrar con correo", "Continue with email")}
        </button>}
        {hasExtension && <button type="button" className={emailKey ? "btn btn-outline" : "btn btn-gold"} onClick={connect} disabled={busy}>
          <Wallet /> {busy ? t("Abriendo billetera…", "Opening wallet…") : t("Conectar billetera", "Connect wallet")}
        </button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {emailKey && <p className="field-note">{t("Comprueba si puedes acceder y activar tu cuenta de prueba con un código por correo.", "Check whether you can sign in and activate your test account with an email code.")}</p>}
      {!emailKey && !hasExtension && <p className="field-note">{t("El acceso por correo está pendiente en este entorno. Puedes explorar la demo sin iniciar sesión.", "Email access is pending in this environment. You can explore the demo without signing in.")}</p>}
      {hasExtension && <Link className="inline-link" href={localized(locale, "/guia#cuenta")}>{t("Cómo preparar mi cuenta", "How to set up my account")}</Link>}
      {!hasExtension && <Link className="inline-link" href={localized(locale, "/evaluator")}>{t("Ver demo sin cuenta", "View demo without an account")}</Link>}
    </div>
  );
}
