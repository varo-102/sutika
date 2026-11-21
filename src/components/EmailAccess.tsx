"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { PollarProvider, usePollar } from "@pollar/react";
import type { CompetitionWallet } from "@/lib/walletRequests";

type Children = (wallet: CompetitionWallet) => ReactNode;

function EmailAccount({ children }: { children: Children }) {
  const sdk = usePollar();
  const client = sdk.getClient();
  const [state, setState] = useState(() => client.getAuthState());
  const provisioningDisabled =
    sdk.appConfig.application?.walletProvisioning === "NONE";

  useEffect(() => {
    const unsubscribe = client.onAuthStateChange(setState);
    setState(client.getAuthState());
    return unsubscribe;
  }, [client]);

  const [notice, setNotice] = useState("");
  const [activating, setActivating] = useState(false);

  async function activateWallet() {
    setNotice("");
    setActivating(true);
    try {
      await sdk.createWallet();
    } catch {
      setNotice("No se pudo activar la billetera. Vuelve a intentarlo.");
    } finally {
      setActivating(false);
    }
  }

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    client.login({ provider: "email", email });
  }

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(
      new FormData(event.currentTarget).get("code") ?? "",
    ).trim();
    client.verifyEmailCode(code);
  }

  if (sdk.isAuthenticated) {
    if (!sdk.verified) return <p role="status">Verificando tu sesión…</p>;
    const address = sdk.wallet?.address;
    if (!address && provisioningDisabled)
      return (
        <>
          <p className="data-notice">
            Por ahora, Pollar permite entrar con correo. Para participar, vuelve
            a las opciones de acceso y conecta Freighter en Testnet.
          </p>
          <button type="button" className="text-action" onClick={sdk.logout}>
            Cerrar sesión
          </button>
        </>
      );
    if (!address)
      return (
        <>
          <p>
            Activa una billetera de prueba para inscribirte o recibir premios.
          </p>
          <button
            className="btn btn-gold"
            type="button"
            disabled={activating}
            onClick={activateWallet}
          >
            {activating ? "Activando…" : "Activar mi cuenta de prueba"}
          </button>
          {notice && <p role="status">{notice}</p>}
        </>
      );
    return (
      <>
        {children({
          address,
          async signMessage(message) {
            const proof = await client.stellar.sep53.signMessage(message);
            if (proof.status !== "signed")
              throw new Error("La solicitud no fue firmada.");
            return proof.signature;
          },
          async signTransaction(xdr) {
            const proof = await client.signTx(xdr, { skipSponsorship: true });
            if (proof.status !== "signed")
              throw new Error(
                proof.status === "cosign_pending"
                  ? "La cuenta espera otra firma."
                  : "La firma fue cancelada.",
              );
            return proof.signedXdr;
          },
        })}
        <button type="button" className="text-action" onClick={sdk.logout}>
          Cerrar sesión
        </button>
      </>
    );
  }

  const enteringCode =
    state.step === "entering_code" || state.step === "verifying_email_code";
  if (enteringCode)
    return (
      <form onSubmit={verifyCode}>
        <p>Escribe el código que recibiste por correo.</p>
        <label htmlFor="access-code">Código</label>
        <input
          id="access-code"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={12}
          required
        />
        <button
          type="submit"
          className="btn btn-gold"
          disabled={state.step === "verifying_email_code"}
        >
          Confirmar código
        </button>
        <button
          type="button"
          className="text-action"
          onClick={() => client.cancelLogin()}
        >
          Usar otro correo
        </button>
      </form>
    );

  const sending = state.step !== "idle" && state.step !== "error";
  return (
    <form onSubmit={requestCode}>
      <label htmlFor="access-email">Correo electrónico</label>
      <input
        id="access-email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <button className="btn btn-gold" type="submit" disabled={sending}>
        {sending ? "Enviando código…" : "Enviar código"}
      </button>
      {state.step === "error" && (
        <p role="alert">
          No se pudo validar el acceso. Solicita otro código para intentarlo de
          nuevo.
        </p>
      )}
    </form>
  );
}

export default function EmailAccess({
  apiKey,
  children,
}: {
  apiKey: string;
  children: Children;
}) {
  const config = useMemo(
    () => ({ apiKey, stellarNetwork: "testnet" as const }),
    [apiKey],
  );
  return (
    <PollarProvider client={config}>
      <EmailAccount>{children}</EmailAccount>
    </PollarProvider>
  );
}
