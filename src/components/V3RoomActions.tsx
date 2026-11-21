"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Coins, Flag, ShieldCheck, Ticket, UserRoundPlus } from "lucide-react";
import WalletAccess from "./WalletAccess";
import ShareTournament from "./ShareTournament";
import type { CompetitionWallet } from "@/lib/walletRequests";
import type { RoomView, RosterView } from "@/lib/v3/view";
import { display } from "@/lib/rules";
import { confirmV3, executeV3 } from "@/lib/v3/client";
import { weights } from "@/lib/v3/rules";

type Run = (kind: string, details?: Record<string, unknown>) => Promise<void>;

function Join({ room, invite, run, busy }: { room: RoomView; invite?: RosterView; run: Run; busy: boolean }) {
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState("");
  const size = room.rules.size;
  const slot = invite?.players.length ?? 0;
  const due = invite ? "Sin costo adicional" :
    BigInt(room.rules.entry) > 0 ? "Cuota de " + display(BigInt(room.rules.entry)) + " USDC de prueba" : "Inscripción gratuita";

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const shares = invite?.weights ?? (size === 1 ? [10_000] : custom ?
        weights(Array.from({ length: 5 }, (_, idx) => Math.round(Number(fields.get("player-" + idx)) * 100)), [5]) :
        [2000, 2000, 2000, 2000, 2000]);
      void run("join", { team: invite?.id ?? "", teamName: fields.get("name") || "", slot, shares });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Revisa los porcentajes.");
    }
  }
  return (
    <form className="v3-action-form" onSubmit={register}>
      <div><h3>{invite ? "Unirme a " + invite.name : size === 1 ? "Inscribirme" : "Inscribir a mi equipo"}</h3><p>{due}</p></div>
      {!invite && <label>{size === 1 ? "Nombre en el juego" : "Nombre del equipo"}
        <input name="name" maxLength={48} required />
      </label>}
      {invite && <p>Tu puesto en la plantilla es el {slot + 1}. Te corresponde {invite.weights[slot] / 100} % del premio de tu equipo.</p>}
      {!invite && size === 5 && <>
        <label className="v3-check"><input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} /> Personalizar el reparto de los cinco titulares</label>
        {custom && <div className="v3-three">
          {Array.from({ length: 5 }, (_, idx) => <label key={idx}>{idx === 0 ? "Capitán" : "Titular " + (idx + 1)} (%)
            <input required name={"player-" + idx} type="number" defaultValue="20" min="1" max="96" step="0.01" />
          </label>)}
        </div>}
      </>}
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="btn btn-gold" disabled={busy}><UserRoundPlus /> Firmar inscripción</button>
    </form>
  );
}

function PublishResult({ room, run, busy, correction = false }: { room: RoomView; run: Run; busy: boolean; correction?: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void run(correction ? "resolve" : "declare", {
      places: room.rules.places.map((_, i) => fields.get("place-" + i)),
      evidence: fields.get("evidence"),
    });
  }
  return (
    <form className="v3-action-form" onSubmit={submit}>
      <h3>{correction ? "Corregir el resultado" : "Publicar el resultado"}</h3>
      {room.rules.places.map((_, idx) => <label key={idx}>{idx + 1}.º lugar
        <select name={"place-" + idx} defaultValue="" required>
          <option value="" disabled>Selecciona el ganador</option>
          {room.rosters.filter((r) => r.locked).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>)}
      <label>Enlace HTTPS a resultados o capturas<input name="evidence" type="url" required maxLength={500} placeholder="https://…" /></label>
      <button className="btn btn-gold" type="submit" disabled={busy}><Flag /> {correction ? "Firmar corrección" : "Firmar resultado"}</button>
    </form>
  );
}

function Connected({ room, invite, wallet }: { room: RoomView; invite?: RosterView; wallet: CompetitionWallet }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string>();
  const [verifyUrl, setVerifyUrl] = useState("");
  const address = wallet.address;
  const organizer = address === room.rules.organizer;
  const sponsor = room.rules.mode !== "entry" && address === room.rules.sponsor;
  const referee = address === room.rules.referee;
  const assigned = room.rosters.find((r) => r.players.some((p) => p.address === address));
  const isOpen = !room.isCancelled && !room.isExpired && !room.closeHash;
  const funded = room.rules.mode === "entry" || Boolean(room.escrow);
  const complete = room.rosters.filter((r) => r.players.length === room.rules.size).length;
  const canJoin = isOpen && funded && !assigned && !referee && (invite ? invite.players.length < room.rules.size : room.rosters.length < room.rules.max);
  const canFreeze = !room.isCancelled && !room.closeHash && (
    (room.isExpired && (organizer || complete < room.rules.min)) || (organizer && complete === room.rules.max)
  );
  const result = room.result;
  const reviewOver = Boolean(result && room.now >= result.end);
  const winningSlot = assigned && result ? result.ids.indexOf(assigned.id) : -1;
  const winningMember = winningSlot >= 0 ? assigned?.players.find((p) => p.address === address) : undefined;

  async function handle(kind: string, extra: Record<string, unknown> = {}) {
    if (busy || (pending && kind !== "receipt")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = kind === "receipt" && pending ? await confirmV3(pending) :
        await executeV3(wallet, { ...extra, kind, slug: room.slug,
          ...(["verify", "resolve"].includes(kind) ? { attempt: crypto.randomUUID() } : {}),
        }, setNotice);
      if (response.url) {
        setVerifyUrl(response.url);
        setNotice("Abre el enlace y usa los datos ficticios del sandbox.");
      } else if (response.verification) {
        setNotice(response.verification === "APPROVED" ? "El proveedor aprobó tu verificación de prueba. El árbitro ya puede registrarla." :
          response.verification === "REJECTED" ? "El proveedor rechazó la verificación de prueba." : "El proveedor aún está revisando.");
      } else if (response.status === "CONFIRMED") {
        setPending(undefined);
        setNotice("Confirmado en Stellar Testnet.");
        router.refresh();
      } else if (response.status === "FAILED" || response.status === "EXPIRED") {
        setPending(undefined);
        setError("La operación no se confirmó. Vuelve a intentarlo.");
      } else {
        setPending(response.id);
        setNotice("Stellar aún no confirma la operación.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo completar el paso.");
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="v3-actions">
      <p className="field-note">Cuenta conectada <code>{address.slice(0, 8)}…{address.slice(-6)}</code></p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {pending ? <button className="btn btn-gold" onClick={() => void handle("receipt")} disabled={busy}>Consultar confirmación</button> :
        <>
          {isOpen && sponsor && !funded && (
            <button className="btn btn-gold" disabled={busy} onClick={() => void handle(room.escrowDraft ? "fund" : "escrow")}>
              <Coins /> {room.escrowDraft ? "Depositar el premio" : "Abrir la custodia"}
            </button>
          )}
          {canJoin && <Join room={room} invite={invite} run={handle} busy={busy} />}
          {assigned && !room.isCancelled && (
            <div className="v3-action-form">
              <p><CircleCheck size={18} /> Ya eres parte de {assigned.name}.</p>
              {isOpen && assigned.players.length < room.rules.size && <ShareTournament team={assigned.id} />}
            </div>
          )}
          {canFreeze && <button className="btn btn-outline" disabled={busy} onClick={() => void handle("freeze")}>
            <Flag /> {complete < room.rules.min ? "Cerrar y habilitar devoluciones" : "Cerrar inscripciones"}
          </button>}
          {organizer && room.closeHash && !result && !room.isCancelled && <PublishResult room={room} run={handle} busy={busy} />}
          {result && !room.isCancelled && <>
            {!result.disputed && !result.approved && (sponsor || (referee && room.rules.mode === "entry")) &&
              <button className="btn btn-gold" onClick={() => void handle("approve", { revision: result.revision })} disabled={busy}>
                <CircleCheck /> Aprobar el resultado
              </button>}
            {!reviewOver && !result.disputed && (assigned?.locked || sponsor) &&
              <button className="btn btn-outline" onClick={() => void handle("dispute")} disabled={busy}>Impugnar resultado</button>}
            {result.disputed && referee && <>
              <button className="btn btn-outline" onClick={() => void handle("resolve", { uphold: true })} disabled={busy}>Mantener el resultado</button>
              <PublishResult room={room} run={handle} busy={busy} correction />
            </>}
            {result.approved && reviewOver && !result.disputed && <>
              {winningMember && !room.paid.includes(winningSlot) &&
                <div className="v3-action-form">
                  <h3>Recibir mi premio</h3>
                  {room.verificationEnabled ? <>
                    {!winningMember.verified && <>
                      <button className="btn btn-outline" disabled={busy} onClick={() => void handle("verification-link")}><ShieldCheck /> Verificar identidad de prueba</button>
                      {verifyUrl && <a className="inline-link" href={verifyUrl} target="_blank" rel="noopener noreferrer">Abrir la verificación ↗</a>}
                      <button className="text-action" disabled={busy} onClick={() => void handle("verification-status")}>Consultar estado de verificación</button>
                    </>}
                    {winningMember.verified && !winningMember.ready &&
                      <button className="btn btn-gold" disabled={busy} onClick={() => void handle("ready", { revision: result.revision })}><CircleCheck /> Confirmar mi cobro</button>}
                    {winningMember.ready && <p>Confirmaste tu cobro. Se enviará a la billetera conectada.</p>}
                  </> : <p>La verificación de prueba está pendiente de configurar. El fondo sigue reservado.</p>}
                </div>}
              {result.ids.map((team, place) => {
                const roster = room.rosters.find((r) => r.id === team);
                if (!roster || room.paid.includes(place)) return null;
                const allReady = roster.players.every((p) => p.ready);
                return <div className="v3-action-form" key={team}>
                  {referee && room.verificationEnabled && roster.players.filter((p) => !p.verified).map((p) => (
                    <button className="btn btn-outline" key={p.address} disabled={busy} onClick={() => void handle("verify", { member: p.address })}>
                      <ShieldCheck /> Registrar verificación de {p.address.slice(0, 8)}…
                    </button>
                  ))}
                  {allReady && <button className="btn btn-gold" disabled={busy} onClick={() => void handle("pay", { place })}><Coins /> Enviar premio del {place + 1}.º lugar</button>}
                </div>;
              })}
            </>}
          </>}
          {room.rosters.filter((r) => r.payer === address && !r.refunded && BigInt(r.contribution) > 0n &&
            (room.isCancelled || (room.closeHash && !r.locked))).map((r) => (
            <button key={r.id} className="btn btn-gold" disabled={busy} onClick={() => void handle("refund", { team: r.id })}>
              <Ticket /> Recuperar {display(BigInt(r.contribution))} USDC de prueba
            </button>
          ))}
          {room.isCancelled && room.escrow && !room.sponsorRefunded && referee &&
            <button className="btn btn-outline" disabled={busy} onClick={() => void handle("refund_sponsor")}>Devolver el aporte menos tarifas</button>}
          {!room.isCancelled && room.paid.length === 0 && (referee || (organizer && !result)) &&
            <button className="text-action" disabled={busy}
              onClick={() => { if (window.confirm("¿Cancelar el torneo y habilitar las devoluciones?")) void handle("cancel"); }}>
              Cancelar torneo
            </button>}
        </>}
    </div>
  );
}

export default function V3RoomActions({ room, invite }: { room: RoomView; invite?: RosterView }) {
  return <WalletAccess>{(wallet) => <Connected room={room} invite={invite} wallet={wallet} />}</WalletAccess>;
}
