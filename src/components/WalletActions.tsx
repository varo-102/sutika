"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PollarProvider, usePollar } from "@pollar/react";
import { games, WINNER_USDC } from "@/lib/rules";

type Team = { id: string; name: string; count: number };
type Props = {
  slug?: string;
  teams?: Team[];
  size?: number;
  organizer?: string;
  sponsor?: string;
  resolver?: string;
  frozen?: boolean;
  podium?: string[];
};
type Reply = {
  id?: string;
  message?: string;
  slug?: string;
  error?: string;
  xdr?: string;
  hash?: string;
  status?: string;
};
const key = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;
const labels: Record<string, string> = {
  anchor: "Registrar en Stellar",
  escrow: "Crear custodia",
  bind: "Vincular custodia",
  fund: "Depositar USDC",
  freeze: "Cerrar inscripciones",
  declare: "Declarar ganador",
  mark: "Registrar resultados en la custodia",
  approve_tw: "Aprobar hitos de Trustless Work",
  approve: "Confirmar ganador",
  dispute: "Impugnar resultado",
  resolve: "Resolver impugnación",
  release: "Reclamar premio",
};
async function api(body: Record<string, unknown>): Promise<Reply> {
  const result = await fetch("/api/competition", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await result.json();
  if (!result.ok)
    throw new Error(response.error || "La operación no se completó.");
  return response;
}
function Controls(props: Props) {
  const pollar = usePollar(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [info, setInfo] = useState(""),
    [kind, setKind] = useState("join");
  const [hash, setHash] = useState(""),
    [pending, setPending] = useState("");
  const address = pollar.wallet?.address;
  const teams = props.teams ?? [];
  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !address) return;
    const form = new FormData(event.currentTarget);
    const selectedKind = selection;
    let action: Record<string, unknown>;
    if (!props.slug)
      action = {
        kind: "create",
        name: form.get("name"),
        game: form.get("game"),
        sponsor: form.get("sponsor"),
        winnerAmount: WINNER_USDC,
      };
    else if (selectedKind === "join")
      action = {
        kind: selectedKind,
        slug: props.slug,
        teamId: form.get("teamId") || "",
        team: form.get("team") || "Jugador",
      };
    else if (selectedKind === "declare")
      action = {
        kind: selectedKind,
        slug: props.slug,
        winnerTeamId: form.get("winner"),
      };
    else if (selectedKind === "resolve")
      action = {
        kind: selectedKind,
        slug: props.slug,
        uphold: form.get("uphold") === "yes",
      };
    else
      action = {
        kind: selectedKind,
        slug: props.slug,
        place: selectedKind === "release" ? 1 : undefined,
      };
    setBusy(true);
    setInfo("Confirma la solicitud en tu billetera.");
    setHash("");
    setPending("");
    try {
      const ch = await api({ step: "challenge", action, address });
      const proof = await pollar
        .getClient()
        .stellar.sep53.signMessage(ch.message!);
      if (proof.status !== "signed")
        throw new Error("La solicitud no fue firmada.");
      const result = await api({
        step: "execute",
        address,
        action,
        id: ch.id,
        signature: proof.signature,
      });
      if (result.slug) {
        router.push("/tournaments/" + result.slug);
        router.refresh();
        setInfo("Guardado.");
        return;
      }
      if (!result.id) throw new Error("No se recibió una operación.");
      if (result.status === "CONFIRMED") {
        setInfo("Operación confirmada en Stellar.");
        setHash(result.hash!);
        return;
      }
      setPending(result.id);
      if (result.xdr) {
        const signed = await pollar
          .getClient()
          .signTx(result.xdr, { skipSponsorship: true });
        if (signed.status !== "signed")
          throw new Error(
            signed.status === "cosign_pending"
              ? "La billetera espera otra firma."
              : "La firma fue cancelada.",
          );
        await api({ step: "receipt", id: result.id, xdr: signed.signedXdr });
      }
      await refresh(result.id);
    } catch (err) {
      setInfo(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function refresh(id: string) {
    const res = await api({ step: "receipt", id });
    setHash(res.hash ?? "");
    setInfo(
      res.status === "CONFIRMED"
        ? "Confirmado en Stellar."
        : res.status === "FAILED"
          ? "La operación falló en Stellar."
          : "Esperando la confirmación de Stellar.",
    );
    if (res.status === "CONFIRMED" || res.status === "FAILED") {
      setPending("");
      router.refresh();
    }
  }
  if (!pollar.isAuthenticated)
    return (
      <button className="primary" onClick={() => pollar.openLoginModal()}>
        Conectar billetera con Pollar
      </button>
    );
  if (!address)
    return (
      <button
        className="primary"
        onClick={() =>
          pollar
            .createWallet()
            .catch(() => setInfo("No se pudo crear la billetera."))
        }
      >
        Activar billetera Stellar
      </button>
    );
  const kinds = [
    "join",
    ...(address === props.organizer
      ? ["anchor", "freeze", "declare", "mark"]
      : []),
    ...(address === props.sponsor
      ? ["escrow", "bind", "fund", "approve_tw", "approve"]
      : []),
    "release",
    "dispute",
    ...(address === props.resolver ? ["resolve"] : []),
  ].filter((k) => !(k === "join" && props.frozen));
  const selection = kinds.includes(kind) ? kind : kinds[0];
  return (
    <div className="wallet">
      <p className="mono">
        Billetera · {address.slice(0, 8)}…{address.slice(-6)}
      </p>
      <form onSubmit={run}>
        {!props.slug ? (
          <>
            <label>
              Nombre del torneo
              <input name="name" maxLength={80} required />
            </label>
            <label>
              Juego
              <select name="game">
                {Object.entries(games).map(([id, g]) => (
                  <option key={id} value={id}>
                    {g.name} · {g.format}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Billetera del patrocinador
              <input name="sponsor" placeholder="G…" required maxLength={56} />
            </label>
            <div className="fixed-prize">
              <strong>Primer puesto · 5 USDC</strong>
              <p>
                El patrocinador cubre las comisiones. En Mobile Legends cada
                titular ganador recibe 1 USDC.
              </p>
            </div>
          </>
        ) : (
          <>
            <label>
              Acción
              <select
                value={selection}
                onChange={(e) => setKind(e.target.value)}
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k === "join" ? "Inscribirme" : labels[k]}
                  </option>
                ))}
              </select>
            </label>
            {selection === "join" && (
              <>
                {props.size === 5 && (
                  <label>
                    Equipo
                    <select name="teamId">
                      <option value="">Crear equipo</option>
                      {teams
                        .filter((t) => t.count < 5)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.count}/5)
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  {props.size === 1
                    ? "Nombre en el juego"
                    : "Nombre si creas equipo"}
                  <input name="team" maxLength={48} />
                </label>
              </>
            )}
            {selection === "declare" && (
              <label>
                Ganador del torneo
                <select required name="winner" defaultValue="">
                  <option value="">Selecciona al ganador</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selection === "release" && (
              <p className="fixed-prize">
                El primer puesto recibe{" "}
                {props.size === 5
                  ? "5 USDC en total, 1 por titular."
                  : "5 USDC."}
              </p>
            )}
            {selection === "resolve" && (
              <label>
                Decisión
                <select name="uphold">
                  <option value="yes">Ratificar resultado</option>
                  <option value="no">Solicitar una corrección</option>
                </select>
              </label>
            )}
          </>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? "Esperando firma…"
            : props.slug
              ? "Continuar con mi billetera"
              : "Crear torneo"}
        </button>
      </form>
      <p role="status">{info}</p>
      {pending && (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            refresh(pending).catch(() =>
              setInfo("No se pudo verificar la red."),
            )
          }
        >
          Consultar confirmación
        </button>
      )}
      {hash && (
        <p>
          <a
            href={"https://stellar.expert/explorer/testnet/tx/" + hash}
            target="_blank"
            rel="noreferrer"
          >
            Abrir transacción en Stellar ↗
          </a>
        </p>
      )}
    </div>
  );
}
export default function WalletActions(props: Props) {
  if (!key?.startsWith("pub_testnet_"))
    return (
      <p className="notice">
        La conexión de billeteras espera la configuración de Pollar Testnet. Los
        comprobantes públicos se pueden consultar sin cuenta.
      </p>
    );
  return (
    <PollarProvider client={{ apiKey: key, stellarNetwork: "testnet" }}>
      <Controls {...props} />
    </PollarProvider>
  );
}
