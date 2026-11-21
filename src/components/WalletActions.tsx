"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  localizedActionLabel,
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
import { translate, type Locale } from "@/lib/locale";

type Team = { id: string; name: string; count: number };
type Props = {
  locale: Locale;
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
  const tr = translate(props.locale);
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
          setInfo(tr("Abre el sitio por HTTPS para confirmar tu cuenta.", "Open the site over HTTPS to verify your account."));
      });
    return () => {
      active = false;
    };
  }, [address, slug, props.locale]);

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
  }, props.locale);
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
          ? tr("Operación confirmada. Revisa el comprobante.", "Operation confirmed. Check the receipt.")
          : status === "EXPIRED"
            ? tr("La solicitud venció. Puedes volver a intentarlo.", "The request expired. You can try again.")
            : tr("Stellar rechazó la operación. Puedes volver a intentarlo.", "Stellar rejected the operation. You can try again."),
      );
      router.refresh();
      return;
    }
    setInfo(
      status === "PREPARED"
        ? tr("Todavía hace falta tu firma. Vuelve a usar el botón de la acción.", "Your signature is still required. Use the action button again.")
        : tr("Esperando la confirmación de Stellar.", "Waiting for Stellar confirmation."),
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
    setInfo(tr("Confirma la solicitud en tu billetera.", "Confirm the request in your wallet."));
    setHash("");
    setPending("");
    try {
      const result = await signedAction(wallet, action);
      if (result.slug) {
        setInfo(tr("Inscripción confirmada.", "Entry confirmed."));
        router.refresh();
        return;
      }
      if (!result.id) throw new Error(tr("No se recibió una operación.", "An operation was not returned."));
      if (result.status === "CONFIRMED") {
        setInfo(tr("Operación confirmada. Revisa el comprobante.", "Operation confirmed. Check the receipt."));
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
        props.locale === "es" && error instanceof Error
          ? error.message
          : tr("No se pudo completar la solicitud.", "The request could not be completed."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet">
      <p className="mono">
        {tr("Cuenta de prueba", "Test account")} {address.slice(0, 8)}…{address.slice(-6)}
      </p>
      {memberTag ? (
        <>
          {message && <p>{message}</p>}
          {selection && (
            <form onSubmit={run}>
              {actions.length > 1 && (
                <div className="form-field">
                  <label htmlFor="tournament-action">{tr("Elige una acción", "Choose an action")}</label>
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
                        {localizedActionLabel(action, props.locale)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selection === "join" && (
                <>
                  {size === 5 && (
                    <div className="form-field">
                      <label htmlFor="tournament-team">{tr("Equipo", "Team")}</label>
                      <select
                        id="tournament-team"
                        value={chosenTeam}
                        onChange={(event) => setChosenTeam(event.target.value)}
                        disabled={busy}
                      >
                        <option value="">{tr("Crear mi equipo", "Create my team")}</option>
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
                        ? tr("Nombre en el juego", "In-game name")
                        : tr("Nombre de tu equipo", "Team name")}
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
                  <label htmlFor="tournament-winner">{tr("Primer puesto", "First place")}</label>
                  <select
                    id="tournament-winner"
                    required
                    name="winner"
                    defaultValue=""
                    disabled={busy}
                  >
                    <option value="">{tr("Selecciona al ganador", "Select the winner")}</option>
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
                    ? tr("Una solicitud reparte 1 USDC de prueba a cada uno de los cinco titulares.", "One transaction sends 1 test USDC to each of the five players.")
                    : tr("El primer puesto recibe 5 USDC de prueba.", "First place receives 5 test USDC.")}
                </p>
              )}
              {selection === "resolve" && (
                <div className="form-field">
                  <label htmlFor="review-decision">{tr("Decisión", "Decision")}</label>
                  <select id="review-decision" name="uphold" disabled={busy}>
                    <option value="yes">{tr("Ratificar resultado", "Uphold result")}</option>
                    <option value="no">{tr("Solicitar una corrección", "Request a correction")}</option>
                  </select>
                </div>
              )}
              {escrowUnavailable ? (
                <p className="data-notice">
                  {tr("El depósito se habilitará cuando esté configurada la custodia de Testnet.", "Deposits become available once Testnet escrow is configured.")}
                </p>
              ) : (
                <button className="btn btn-gold" disabled={busy} type="submit">
                  {busy ? tr("Esperando confirmación…", "Waiting for confirmation…") : localizedActionLabel(selection, props.locale)}
                </button>
              )}
            </form>
          )}
        </>
      ) : (
        <p role="status">{tr("Comprobando tu acceso al torneo…", "Checking your access to the tournament…")}</p>
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
              .catch(() => setInfo(tr("No se pudo consultar la red.", "Could not reach the network.")))
              .finally(() => setBusy(false));
          }}
        >
          {tr("Consultar confirmación", "Check confirmation")}
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
            {tr("Abrir comprobante en Stellar ↗", "View receipt on Stellar ↗")}
          </a>
        </p>
      )}
    </div>
  );
}

export default function WalletActions(props: Props) {
  return (
    <WalletAccess locale={props.locale}>
      {(wallet) => (
        <Controls key={wallet.address} props={props} wallet={wallet} />
      )}
    </WalletAccess>
  );
}
