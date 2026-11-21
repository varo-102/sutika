"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  actionLabels,
  tournamentJourney,
  type CompetitionAction,
} from "@/lib/tournamentJourney";
import { getExplorerTxUrl } from "@/lib/stellar";
import {
  api,
  signedAction,
  type CompetitionWallet,
} from "@/lib/walletRequests";
import WalletAccess from "./WalletAccess";

type Team = { id: string; name: string; count: number };
type Props = {
  slug: string;
  teams: Team[];
  size: number;
  organizer: string;
  sponsor: string;
  resolver: string;
  confirmed: string[];
  memberTags: string[];
  winnerTags: string[];
  claimAt: number | null;
  escrowEnabled: boolean;
};

const escrowActions = new Set(["escrow", "fund", "mark", "approve_tw"]);

function Controls({
  props,
  wallet,
}: {
  props: Props;
  wallet: CompetitionWallet;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [selected, setSelected] = useState<CompetitionAction>();
  const [chosenTeam, setChosenTeam] = useState("");
  const [hash, setHash] = useState("");
  const [pending, setPending] = useState("");
  const [memberTag, setMemberTag] = useState("");
  const [now, setNow] = useState(Date.now);
  const { address } = wallet;
  const { slug, size, teams, claimAt } = props;

  useEffect(() => {
    let active = true;
    const input = new TextEncoder().encode(slug + "\n" + address);
    crypto.subtle
      .digest("SHA-256", input)
      .then((digest) => {
        if (active)
          setMemberTag(
            Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, "0"),
            ).join(""),
          );
      })
      .catch(() => {
        if (active)
          setInfo("Abre el sitio por HTTPS para confirmar tu cuenta.");
      });
    return () => {
      active = false;
    };
  }, [address, slug]);

  useEffect(() => {
    if (claimAt === null || claimAt <= now) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(60_000, claimAt - now),
    );
    return () => window.clearTimeout(timer);
  }, [claimAt, now]);

  const { actions, message } = tournamentJourney({
    roles: [
      ...(address === props.organizer ? ["organizer" as const] : []),
      ...(address === props.sponsor ? ["sponsor" as const] : []),
      ...(address === props.resolver ? ["resolver" as const] : []),
    ],
    joined: props.memberTags.includes(memberTag),
    winner: props.winnerTags.includes(memberTag),
    canFreeze: teams.length >= 2 && teams.every((team) => team.count === size),
    confirmed: props.confirmed,
    claimAt,
    now,
  });
  const selection =
    selected && actions.includes(selected) ? selected : actions[0];
  const escrowUnavailable =
    selection && escrowActions.has(selection) && !props.escrowEnabled;

  async function refresh(id: string, signedXdr?: string) {
    const result = await api({
      step: "receipt",
      id,
      ...(signedXdr ? { xdr: signedXdr } : {}),
    });
    const { status } = result;
    setHash(status === "CONFIRMED" ? (result.hash ?? "") : "");
    if (status === "CONFIRMED" || status === "FAILED" || status === "EXPIRED") {
      setPending("");
      setInfo(
        status === "CONFIRMED"
          ? "Operación confirmada. Revisa el comprobante."
          : status === "EXPIRED"
            ? "La solicitud venció. Puedes volver a intentarlo."
            : "Stellar rechazó la operación. Puedes volver a intentarlo.",
      );
      router.refresh();
      return;
    }
    setInfo(
      status === "PREPARED"
        ? "Todavía hace falta tu firma. Vuelve a usar el botón de la acción."
        : "Esperando la confirmación de Stellar.",
    );
  }

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !selection || escrowUnavailable) return;
    const form = new FormData(event.currentTarget);
    const action: Record<string, unknown> = { kind: selection, slug };
    if (selection === "join") {
      action.teamId = chosenTeam;
      action.team = chosenTeam ? "Jugador" : form.get("team");
    } else if (selection === "declare") {
      action.winnerTeamId = form.get("winner");
    } else if (selection === "resolve") {
      action.uphold = form.get("uphold") === "yes";
    } else if (selection === "release") {
      action.place = 1;
    }

    setBusy(true);
    setInfo("Confirma la solicitud en tu billetera.");
    setHash("");
    setPending("");
    try {
      const result = await signedAction(wallet, action);
      if (result.slug) {
        setInfo("Inscripción confirmada.");
        router.refresh();
        return;
      }
      if (!result.id) throw new Error("No se recibió una operación.");
      if (result.status === "CONFIRMED") {
        setInfo("Operación confirmada. Revisa el comprobante.");
        setHash(result.hash ?? "");
        router.refresh();
        return;
      }
      setPending(result.id);
      const signedXdr = result.xdr
        ? await wallet.signTransaction(result.xdr)
        : undefined;
      await refresh(result.id, signedXdr);
    } catch (error) {
      setInfo(
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet">
      <p className="mono">
        Cuenta de prueba {address.slice(0, 8)}…{address.slice(-6)}
      </p>
      {memberTag ? (
        <>
          {message && <p>{message}</p>}
          {selection && (
            <form onSubmit={run}>
              {actions.length > 1 && (
                <div className="form-field">
                  <label htmlFor="tournament-action">Elige una acción</label>
                  <select
                    id="tournament-action"
                    value={selection}
                    onChange={(event) => {
                      setSelected(event.target.value as CompetitionAction);
                      setInfo("");
                      setHash("");
                    }}
                    disabled={busy}
                  >
                    {actions.map((action) => (
                      <option key={action} value={action}>
                        {actionLabels[action]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selection === "join" && (
                <>
                  {size === 5 && (
                    <div className="form-field">
                      <label htmlFor="tournament-team">Equipo</label>
                      <select
                        id="tournament-team"
                        value={chosenTeam}
                        onChange={(event) => setChosenTeam(event.target.value)}
                        disabled={busy}
                      >
                        <option value="">Crear mi equipo</option>
                        {teams
                          .filter((team) => team.count < size)
                          .map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({team.count}/{size})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {!chosenTeam && (
                    <label>
                      {size === 1
                        ? "Nombre en el juego"
                        : "Nombre de tu equipo"}
                      <input
                        name="team"
                        maxLength={48}
                        required
                        disabled={busy}
                      />
                    </label>
                  )}
                </>
              )}
              {selection === "declare" && (
                <div className="form-field">
                  <label htmlFor="tournament-winner">Primer puesto</label>
                  <select
                    id="tournament-winner"
                    required
                    name="winner"
                    defaultValue=""
                    disabled={busy}
                  >
                    <option value="">Selecciona al ganador</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selection === "release" && (
                <p className="fixed-prize">
                  {size === 5
                    ? "Una solicitud reparte 1 USDC de prueba a cada uno de los cinco titulares."
                    : "El primer puesto recibe 5 USDC de prueba."}
                </p>
              )}
              {selection === "resolve" && (
                <div className="form-field">
                  <label htmlFor="review-decision">Decisión</label>
                  <select id="review-decision" name="uphold" disabled={busy}>
                    <option value="yes">Ratificar resultado</option>
                    <option value="no">Solicitar una corrección</option>
                  </select>
                </div>
              )}
              {escrowUnavailable ? (
                <p className="data-notice">
                  El depósito se habilitará cuando esté configurada la custodia
                  de Testnet.
                </p>
              ) : (
                <button className="btn btn-gold" disabled={busy} type="submit">
                  {busy ? "Esperando confirmación…" : actionLabels[selection]}
                </button>
              )}
            </form>
          )}
        </>
      ) : (
        <p role="status">Comprobando tu acceso al torneo…</p>
      )}
      {info && <p role="status">{info}</p>}
      {pending && (
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            refresh(pending)
              .catch(() => setInfo("No se pudo consultar la red."))
              .finally(() => setBusy(false));
          }}
        >
          Consultar confirmación
        </button>
      )}
      {hash && (
        <p>
          <a
            className="inline-link"
            href={getExplorerTxUrl(hash)}
            target="_blank"
            rel="noreferrer"
          >
            Abrir comprobante en Stellar ↗
          </a>
        </p>
      )}
    </div>
  );
}

export default function WalletActions(props: Props) {
  return (
    <WalletAccess>
      {(wallet) => (
        <Controls key={wallet.address} props={props} wallet={wallet} />
      )}
    </WalletAccess>
  );
}
