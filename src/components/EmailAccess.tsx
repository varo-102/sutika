"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { PollarProvider, usePollar } from "@pollar/react";
import CopyValue from "./CopyValue";
import { localized, translate, type Locale } from "@/lib/locale";
import type { CompetitionWallet } from "@/lib/walletRequests";

type WalletContent = (wallet: CompetitionWallet) => ReactNode;
const testUsdc = { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" };

function TestAccountFunds({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const sdk = usePollar();
  const client = sdk.getClient();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const usdc = sdk.enabledAssets.step === "loaded" && sdk.enabledAssets.data.assets.find(
    (asset) => asset.code === testUsdc.code && asset.issuer === testUsdc.issuer,
  );

  async function enableUsdc() {
    setBusy(true);
    setStatus("");
    try {
      const outcome = await client.setTrustline(testUsdc);
      if (outcome.status === "cosign_pending") {
        sdk.openCosignModal();
        setStatus(t("Confirma la habilitación en Pollar.", "Confirm the setup in Pollar."));
      } else if (outcome.status === "error") {
        setStatus(t("Revisa que tu cuenta esté activa y tenga XLM de prueba para habilitar USDC.", "Check that your account is active and has test XLM to enable USDC."));
      } else {
        setStatus(t("Consulta el estado de USDC después de que Stellar confirme.", "Check the USDC status after Stellar confirms."));
      }
      await sdk.refreshAssets();
    } catch {
      setStatus(t("No se pudo comprobar USDC. Intenta de nuevo.", "USDC could not be checked. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="wallet-funds" onToggle={(event) => {
      if (event.currentTarget.open && sdk.enabledAssets.step === "idle") {
        void sdk.refreshAssets().catch(() => setStatus(t("No se pudo consultar USDC.", "USDC could not be checked.")));
      }
    }}>
      <summary>{t("Preparar USDC de prueba", "Set up test USDC")}</summary>
      <p>{t("Habilita USDC si vas a depositar, pagar una cuota o recibir un premio. Puedes pedir saldo al faucet de Circle.", "Enable USDC to deposit, pay an entry fee, or receive a prize. You can request a test balance from Circle’s faucet.")}</p>
      {sdk.wallet && <CopyValue value={sdk.wallet.address} label={t("la dirección pública", "the public address")} locale={locale} />}
      <div className="buttons">
        {usdc && !usdc.trustlineEstablished && <button type="button" className="btn btn-outline" onClick={() => void enableUsdc()} disabled={busy}>
          {busy ? t("Comprobando…", "Checking…") : t("Habilitar USDC", "Enable USDC")}
        </button>}
        {usdc && usdc.trustlineEstablished &&
          <a className="inline-link" href="https://faucet.circle.com/" target="_blank" rel="noreferrer">{t("Obtener USDC de prueba", "Get test USDC")}</a>}
        <button type="button" className="text-action" onClick={() => {
          void sdk.refreshAssets().catch(() => setStatus(t("No se pudo consultar el saldo.", "The balances could not be checked.")));
        }} disabled={busy}>{t("Comprobar USDC", "Check USDC")}</button>
      </div>
      {sdk.enabledAssets.step === "loaded" && !usdc &&
        <p>{t("USDC de Stellar Testnet aún no está habilitado para este proyecto en Pollar.", "Stellar Testnet USDC is not enabled for this project in Pollar yet.")}</p>}
      {usdc && usdc.trustlineEstablished && <small role="status">{t("USDC habilitado para esta cuenta.", "USDC enabled for this account.")}</small>}
      {status && <p role="status">{status}</p>}
    </details>
  );
}

function EmailAccount({ children, locale }: { children: WalletContent; locale: Locale }) {
  const t = translate(locale);
  const sdk = usePollar();
  const client = sdk.getClient();
  const [state, setState] = useState(() => client.getAuthState());
  const [notice, setNotice] = useState("");
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    const unsubscribe = client.onAuthStateChange(setState);
    setState(client.getAuthState());
    return unsubscribe;
  }, [client]);

  async function activateWallet() {
    setNotice("");
    setActivating(true);
    try {
      await sdk.createWallet();
    } catch {
      setNotice(t("No se pudo activar la cuenta. Vuelve a intentarlo.", "The account could not be activated. Try again."));
    } finally {
      setActivating(false);
    }
  }

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    client.login({ provider: "email", email });
  }

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    client.verifyEmailCode(code);
  }

  if (sdk.configStatus === "loading") return <p role="status">{t("Comprobando el acceso por correo…", "Checking email availability…")}</p>;

  const app = sdk.appConfig.application;
  const mode = app?.walletProvisioning;
  const address = sdk.wallet?.address;
  const stellarAccount = address?.startsWith("G") && sdk.network === "testnet" ? address : undefined;
  const appAvailable = sdk.configStatus === "ready" && app?.network === "testnet" &&
    Boolean(stellarAccount || (!sdk.wallet &&
      sdk.appConfig.styles?.emailEnabled !== false &&
      app.chains?.includes("STELLAR") && (mode === "ON_DEMAND" || mode === "AT_LOGIN")
    ));
  if (!appAvailable) return (
    <div className="email-unavailable">
      <p role="status">{t("La activación de cuentas por correo aún no está disponible en este entorno de prueba.", "Email wallet activation is not available in this test environment yet.")}</p>
      {sdk.configStatus === "error" && <button className="btn btn-outline" type="button" onClick={sdk.retryConfig}>{t("Volver a comprobar", "Check again")}</button>}
      <Link className="inline-link" href={localized(locale, "/evaluator")}>{t("Ver demo sin cuenta", "View demo without an account")}</Link>
    </div>
  );

  if (sdk.isAuthenticated) {
    if (!sdk.verified) return <p role="status">{t("Verificando tu sesión…", "Verifying your session…")}</p>;
    if (!stellarAccount) return (
      <div className="email-unavailable">
        <p>{t("Activa tu cuenta Stellar de prueba para inscribirte o recibir premios.", "Activate your Stellar test account to sign up or receive prizes.")}</p>
        <button className="btn btn-gold" type="button" disabled={activating} onClick={activateWallet}>
          {activating ? t("Activando…", "Activating…") : t("Activar cuenta de prueba", "Activate test account")}
        </button>
        {notice && <p role="status">{notice}</p>}
        <button type="button" className="text-action" onClick={sdk.logout}>{t("Cerrar sesión", "Sign out")}</button>
      </div>
    );
    return (
      <>
        {children({
          address: stellarAccount,
          async signMessage(message) {
            const proof = await client.stellar.sep53.signMessage(message);
            if (proof.status !== "signed") throw new Error(t("La solicitud no fue firmada.", "The request was not signed."));
            return proof.signature;
          },
          async signTransaction(xdr) {
            const proof = await client.signTx(xdr, { skipSponsorship: true });
            if (proof.status !== "signed") throw new Error(proof.status === "cosign_pending"
              ? t("La cuenta espera otra firma.", "The account is waiting for another signature.")
              : t("La firma fue cancelada.", "Signing was canceled."));
            return proof.signedXdr;
          },
        })}
        <TestAccountFunds locale={locale} />
        <button type="button" className="text-action" onClick={sdk.logout}>{t("Cerrar sesión", "Sign out")}</button>
      </>
    );
  }

  const enteringCode = state.step === "entering_code" || state.step === "verifying_email_code";
  if (enteringCode) return (
    <form onSubmit={verifyCode}>
      <p>{t("Escribe el código que recibiste por correo.", "Enter the code you received by email.")}</p>
      <label htmlFor="access-code">{t("Código", "Code")}</label>
      <input id="access-code" name="code" autoComplete="one-time-code" inputMode="numeric" maxLength={12} required />
      <button type="submit" className="btn btn-gold" disabled={state.step === "verifying_email_code"}>{t("Confirmar código", "Confirm code")}</button>
      <button type="button" className="text-action" onClick={() => client.cancelLogin()}>{t("Usar otro correo", "Use another email")}</button>
    </form>
  );

  const sending = state.step !== "idle" && state.step !== "error";
  return (
    <form onSubmit={requestCode}>
      <label htmlFor="access-email">{t("Correo electrónico", "Email address")}</label>
      <input id="access-email" name="email" type="email" autoComplete="email" required />
      <button className="btn btn-gold" type="submit" disabled={sending}>
        {sending ? t("Enviando código…", "Sending code…") : t("Enviar código", "Send code")}
      </button>
      {state.step === "error" && <p role="alert">{t("No se pudo validar el acceso. Solicita otro código para intentarlo de nuevo.", "Sign-in could not be verified. Request another code to try again.")}</p>}
    </form>
  );
}

export default function EmailAccess({ apiKey, children, locale }: { apiKey: string; children: WalletContent; locale: Locale }) {
  const config = useMemo(() => ({ apiKey, stellarNetwork: "testnet" as const }), [apiKey]);
  return <PollarProvider client={config}><EmailAccount locale={locale}>{children}</EmailAccount></PollarProvider>;
}
