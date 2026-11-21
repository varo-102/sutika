"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleCheck, Coins, Flag, ShieldCheck, Ticket, UserRoundPlus } from "lucide-react";
import WalletAccess from "./WalletAccess";
import ShareTournament from "./ShareTournament";
import { boliviaTime, localized, translate, type Locale } from "@/lib/locale";
import type { CompetitionWallet } from "@/lib/walletRequests";
import type { RoomView, RosterView } from "@/lib/v3/view";
import { confirmV3, executeV3 } from "@/lib/v3/client";
import { usdcAmount } from "@/lib/v3/presentation";
import { distribute, quote, weights } from "@/lib/v3/rules";

type Run = (kind: string, details?: Record<string, unknown>) => Promise<void>;

function Join({ room, invite, run, busy, locale }: { room: RoomView; invite?: RosterView; run: Run; busy: boolean; locale: Locale }) {
  const t = translate(locale);
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState("");
  const size = room.rules.size;
  const slot = invite?.players.length ?? 0;
  const fee = BigInt(room.rules.entry);
  const cost = invite || fee === 0n ? t("Inscripción gratuita", "Free entry") :
    t("Pagas ", "You pay ") + usdcAmount(fee, locale) + t(" de prueba", " in test funds");

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const shares = invite?.weights ?? (size === 1 ? [10_000] : custom ?
        weights(Array.from({ length: 5 }, (_, index) => Math.round(Number(fields.get("player-" + index)) * 100)), [5]) :
        [2000, 2000, 2000, 2000, 2000]);
      void run("join", { team: invite?.id ?? "", teamName: fields.get("name") || "", slot, shares });
    } catch {
      setError(t("El reparto debe sumar 100 % y cada titular recibe al menos 1 %.", "The split must add up to 100%, with at least 1% per player."));
    }
  }
  return (
    <form className="v3-action-form" onSubmit={register}>
      <div>
        <h3>{invite ? t("Unirme a ", "Join ") + invite.name : size === 1 ? t("Inscribirme", "Register") : t("Inscribir a mi equipo", "Register my team")}</h3>
        <p>{cost}{!invite && fee > 0n && size === 5 ? t(" por todo el equipo.", " for the whole team.") : ""}</p>
      </div>
      {!invite && <label>{size === 1 ? t("Nombre en el juego", "In-game name") : t("Nombre del equipo", "Team name")}
        <input name="name" maxLength={48} required />
      </label>}
      {invite && <p>{t("Si tu equipo gana, te corresponde el", "If your team wins, you receive")} {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(invite.weights[slot] / 100)} % {t("de su premio.", "of its prize.")}</p>}
      {!invite && size === 5 && <>
        <p className="field-note">{t("Cada titular recibe 20 % por defecto. Comparte el enlace de tu equipo después de inscribirlo.", "Each player receives 20% by default. Share the team invite after registering.")}</p>
        <label className="v3-check"><input type="checkbox" checked={custom} onChange={(event) => setCustom(event.target.checked)} />{t("Personalizar reparto", "Customize split")}</label>
        {custom && <div className="v3-three">
          {Array.from({ length: 5 }, (_, index) => <label key={index}>{index === 0 ? t("Capitán", "Captain") : t("Titular ", "Player ") + (index + 1)} (%)
            <input required name={"player-" + index} type="number" defaultValue="20" min="1" max="96" step="0.01" />
          </label>)}
        </div>}
      </>}
      <p className="field-note">{t("La cuenta firmante cubre la tarifa de red en XLM de prueba.", "The signing account covers the network fee in test XLM.")}</p>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="btn btn-gold" disabled={busy}><UserRoundPlus />{t("Firmar inscripción", "Sign entry")}</button>
    </form>
  );
}

function PublishResult({ room, run, busy, locale, correction = false }:
  { room: RoomView; run: Run; busy: boolean; locale: Locale; correction?: boolean }) {
  const t = translate(locale);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void run(correction ? "resolve" : "declare", {
      places: room.rules.places.map((_, index) => fields.get("place-" + index)),
      evidence: fields.get("evidence"),
    });
  }
  return (
    <form className="v3-action-form" onSubmit={submit}>
      <h3>{correction ? t("Corregir el resultado", "Correct the result") : t("Publicar el resultado", "Publish the result")}</h3>
      {room.rules.places.map((_, index) => <label key={index}>{t("Puesto ", "Place ")}{index + 1}
        <select name={"place-" + index} defaultValue="" required>
          <option value="" disabled>{t("Selecciona el ganador", "Select the winner")}</option>
          {room.rosters.filter((roster) => roster.locked).map((roster) => <option key={roster.id} value={roster.id}>{roster.name}</option>)}
        </select>
      </label>)}
      <label>{t("Enlace HTTPS a resultados o capturas", "HTTPS link to results or screenshots")}<input name="evidence" type="url" required maxLength={500} placeholder="https://…" /></label>
      <button className="btn btn-gold" type="submit" disabled={busy}><Flag />{correction ? t("Firmar corrección", "Sign correction") : t("Firmar resultado", "Sign result")}</button>
    </form>
  );
}

function SponsorDeposit({ room, run, busy, locale }: { room: RoomView; run: Run; busy: boolean; locale: Locale }) {
  const t = translate(locale);
  const amounts = room.rules.sponsorParts.map((gross) => quote(BigInt(gross), room.rules.mode));
  const sum = (key: keyof ReturnType<typeof quote>) => amounts.reduce((total, amount) => total + amount[key], 0n);
  const money = (key: keyof ReturnType<typeof quote>) => usdcAmount(sum(key), locale);
  return (
    <div className="v3-action-form">
      <h3>{t("Reserva el premio", "Reserve the prize")}</h3>
      <div className="v3-money">
        <div><span>{t("Tu depósito", "Your deposit")}</span><strong>{money("gross")}</strong></div>
        <div><span>{t("Comisión de SUTIKA", "SUTIKA fee")}</span><strong>{money("platform")}</strong></div>
        <div><span>{t("Comisión de protocolo", "Protocol fee")}</span><strong>{money("protocol")}</strong></div>
        <div><span>{t("Aporte neto a los ganadores", "Net contribution to winners")}</span><strong>{money("net")}</strong></div>
      </div>
      <p className="field-note">{t("Solo fondos de prueba. La red cobra una tarifa aparte en XLM de prueba.", "Test funds only. The network charges a separate fee in test XLM.")}</p>
      <button className="btn btn-gold" type="button" disabled={busy} onClick={() => void run(room.escrowDraft ? "fund" : "escrow")}>
        <Coins /> {room.escrowDraft ? t("Firmar depósito", "Sign deposit") : t("Preparar la reserva", "Prepare escrow")}
      </button>
      <p className="field-note">{room.escrowDraft ? t("Las inscripciones se abren al confirmarse el depósito.", "Registration opens after the deposit is confirmed.") : t("Primero se prepara la reserva. El depósito se firma en el siguiente paso.", "The escrow is prepared first. You sign the deposit in the next step.")}</p>
    </div>
  );
}

function Connected({ room, invite, wallet, locale }: { room: RoomView; invite?: RosterView; wallet: CompetitionWallet; locale: Locale }) {
  const t = translate(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string>();
  const [verifyUrl, setVerifyUrl] = useState("");
  const { address } = wallet;
  const { rules, result } = room;
  const organizer = address === rules.organizer;
  const sponsor = rules.mode !== "entry" && address === rules.sponsor;
  const referee = address === rules.referee;
  const assigned = room.rosters.find((roster) => roster.players.some((player) => player.address === address));
  const isOpen = !room.isCancelled && !room.isExpired && !room.closeHash;
  const funded = rules.mode === "entry" || Boolean(room.escrow);
  const complete = room.rosters.filter((roster) => roster.players.length === rules.size).length;
  const canJoin = isOpen && funded && !assigned && !referee && (invite ? invite.players.length < rules.size : room.rosters.length < rules.max);
  const canFreeze = !room.isCancelled && !room.closeHash && (
    (room.isExpired && (organizer || complete < rules.min)) || (organizer && complete === rules.max)
  );
  const reviewOver = Boolean(result && room.now >= result.end);
  const winningSlot = assigned && result ? result.ids.indexOf(assigned.id) : -1;
  const memberIndex = assigned?.players.findIndex((player) => player.address === address) ?? -1;
  const winningMember = winningSlot >= 0 ? assigned?.players[memberIndex] : undefined;
  const canClaim = Boolean(result?.approved && reviewOver && !result.disputed && !room.isCancelled);
  const pendingWinner = room.paid.includes(winningSlot) ? undefined : winningMember;
  const share = pendingWinner && assigned
    ? distribute(
      quote(distribute(BigInt(room.stakeLocked), rules.places)[winningSlot], rules.mode).net +
        quote(BigInt(rules.sponsorParts[winningSlot] ?? 0), rules.mode).net, assigned.weights,
    )[memberIndex]
    : null;
  const roles = [
    organizer && t("Organizador", "Organizer"), sponsor && t("Patrocinador", "Sponsor"),
    referee && t("Árbitro", "Referee"), assigned && t("Participante", "Entrant"),
  ].filter(Boolean);
  const canCancel = !room.isCancelled && room.paid.length === 0 && (referee || (organizer && !result));
  const refunds = room.rosters.filter((roster) => roster.payer === address && !roster.refunded && BigInt(roster.contribution) > 0n &&
    (room.isCancelled || (room.closeHash && !roster.locked)));

  async function handle(kind: string, extra: Record<string, unknown> = {}) {
    if (busy || (pending && kind !== "receipt")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = kind === "receipt" && pending ? await confirmV3(pending, locale) :
        await executeV3(wallet, { ...extra, kind, slug: room.slug,
          ...(["verify", "resolve"].includes(kind) ? { attempt: crypto.randomUUID() } : {}),
        }, setNotice, locale);
      if (response.url) {
        setVerifyUrl(response.url);
        setNotice(t("Abre el enlace y usa datos ficticios del Sandbox.", "Open the link and use fictional Sandbox data."));
      } else if (response.verification) {
        setNotice(response.verification === "APPROVED" ? t("Verificación de prueba aprobada. El árbitro ya puede registrarla.", "Test verification approved. The referee can now record it.") :
          response.verification === "REJECTED" ? t("La verificación de prueba fue rechazada.", "Test verification was declined.") :
          t("La verificación sigue en revisión.", "Verification is still under review."));
      } else if (response.status === "CONFIRMED") {
        setPending(undefined);
        setNotice(t("Confirmado en Stellar Testnet.", "Confirmed on Stellar Testnet."));
        router.refresh();
      } else if (response.status === "FAILED" || response.status === "EXPIRED") {
        setPending(undefined);
        setError(t("La operación no se confirmó. Vuelve a intentarlo.", "The operation was not confirmed. Try again."));
      } else {
        setPending(response.id);
        setNotice(t("Stellar aún está confirmando la operación.", "Stellar is still confirming the operation."));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t("No se pudo completar el paso.", "The step could not be completed."));
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="v3-actions">
      <p className="field-note">{roles.length ? roles.join(" · ") : t("Cuenta conectada", "Connected account")} <code>{address.slice(0, 8)}…{address.slice(-6)}</code></p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {pending ? <button className="btn btn-gold" onClick={() => void handle("receipt")} disabled={busy}>{t("Consultar confirmación", "Check confirmation")}</button> : <>
        {isOpen && sponsor && !funded && <SponsorDeposit room={room} run={handle} busy={busy} locale={locale} />}
        {canJoin && <Join room={room} invite={invite} run={handle} busy={busy} locale={locale} />}
        {assigned && !room.isCancelled && <div className="v3-action-form">
          <p><CircleCheck size={18} /> {t("Inscripción confirmada en ", "Entry confirmed for ")}{assigned.name}.</p>
          {isOpen && assigned.players.length < rules.size && <ShareTournament team={assigned.id} locale={locale} />}
        </div>}
        {canFreeze && <button className="btn btn-outline" disabled={busy} onClick={() => void handle("freeze")}>
          <Flag /> {complete < rules.min ? t("Cerrar y habilitar devoluciones", "Close and enable refunds") : t("Cerrar inscripciones", "Close registration")}
        </button>}
        {organizer && room.closeHash && !result && !room.isCancelled && <PublishResult room={room} run={handle} busy={busy} locale={locale} />}
        {result && !room.isCancelled && <>
          {!result.disputed && !result.approved && (sponsor || (referee && rules.mode === "entry")) &&
            <button className="btn btn-gold" onClick={() => void handle("approve", { revision: result.revision })} disabled={busy}>
              <CircleCheck /> {t("Aprobar el resultado", "Approve the result")}
            </button>}
          {!reviewOver && !result.disputed && (assigned?.locked || sponsor) &&
            <button className="btn btn-outline" onClick={() => void handle("dispute")} disabled={busy}>{t("Impugnar resultado", "Dispute result")}</button>}
          {result.disputed && referee && <>
            <button className="btn btn-outline" onClick={() => void handle("resolve", { uphold: true })} disabled={busy}>{t("Mantener el resultado", "Uphold the result")}</button>
            <PublishResult room={room} run={handle} busy={busy} locale={locale} correction />
          </>}
          {pendingWinner && <div className="v3-action-form">
            <h3>{t("Mi premio", "My prize")} · {usdcAmount(share ?? 0n, locale)}</h3>
            {!canClaim && <p>{result.disputed ? t("El árbitro está revisando una impugnación.", "The referee is reviewing a dispute.") :
              !result.approved ? t("El resultado espera aprobación.", "The result is awaiting approval.") :
                <>{t("Disponible para verificar cuando termine la impugnación", "Verification opens after the review window")} · {boliviaTime(locale).format(result.end * 1000)} ({t("hora de Bolivia", "Bolivia time")}).</>}</p>}
            {canClaim && (room.verificationEnabled ? <>
              {!pendingWinner.verified && <>
                <button className="btn btn-outline" disabled={busy} onClick={() => void handle("verification-link")}><ShieldCheck /> {t("Verificar identidad de prueba", "Verify test identity")}</button>
                {verifyUrl && <a className="inline-link" href={verifyUrl} target="_blank" rel="noopener noreferrer">{t("Abrir la verificación", "Open verification")} ↗</a>}
                <button className="text-action" disabled={busy} onClick={() => void handle("verification-status")}>{t("Consultar verificación", "Check verification")}</button>
              </>}
              {pendingWinner.verified && !pendingWinner.ready &&
                <button className="btn btn-gold" disabled={busy} onClick={() => void handle("ready", { revision: result.revision })}><CircleCheck /> {t("Confirmar mi cobro", "Confirm my claim")}</button>}
              {pendingWinner.ready && <p>{rules.size === 5 ? t("Cobro confirmado. Se podrá pagar cuando los cinco titulares estén listos.", "Claim confirmed. Payment can be sent once all five players are ready.") :
                t("Cobro confirmado. El pago se enviará a esta cuenta.", "Claim confirmed. Payment will be sent to this account.")}</p>}
            </> : <p>{t("La verificación de prueba aún no está disponible. El premio sigue reservado.", "Test verification is not available yet. The prize remains reserved.")}</p>)}
          </div>}
          {canClaim && result.ids.map((team, place) => {
            const roster = room.rosters.find((item) => item.id === team);
            if (!roster || room.paid.includes(place)) return null;
            const unverified = roster.players.filter((player) => !player.verified);
            const canVerify = referee && room.verificationEnabled && unverified.length > 0;
            const allReady = roster.players.every((player) => player.ready);
            if (!canVerify && !allReady) return null;
            return <div className="v3-action-form" key={team}>
              {canVerify && unverified.map((player) => <button className="btn btn-outline" key={player.address} disabled={busy} onClick={() => void handle("verify", { member: player.address })}>
                <ShieldCheck /> {t("Registrar verificación de ", "Record verification for ")}{player.address.slice(0, 8)}…
              </button>)}
              {allReady && <button className="btn btn-gold" disabled={busy} onClick={() => void handle("pay", { place })}><Coins /> {t("Pagar el puesto ", "Pay place ")}{place + 1}</button>}
            </div>;
          })}
        </>}
        {refunds.map((roster) => <button key={roster.id} className="btn btn-gold" disabled={busy} onClick={() => void handle("refund", { team: roster.id })}>
          <Ticket /> {t("Recuperar ", "Refund ")}{usdcAmount(BigInt(roster.contribution), locale)}
        </button>)}
        {room.isCancelled && room.escrow && !room.sponsorRefunded && referee &&
          <button className="btn btn-outline" disabled={busy} onClick={() => void handle("refund_sponsor")}>{t("Devolver aporte menos comisiones", "Refund contribution minus fees")}</button>}
        {canCancel && <button className="text-action" disabled={busy} onClick={() => {
          if (window.confirm(t("¿Cancelar el torneo y habilitar las devoluciones?", "Cancel the tournament and enable refunds?"))) void handle("cancel");
        }}>{t("Cancelar torneo", "Cancel tournament")}</button>}
        {!roles.length && !canJoin && refunds.length === 0 && <p className="field-note">{t("Esta cuenta puede consultar la ficha y sus comprobantes.", "This account can view the tournament and its receipts.")}</p>}
        {!funded && !sponsor && isOpen && <Link className="inline-link" href={localized(locale, "/guia#patrocinar")}>{t("Cómo se deposita el premio", "How the prize is funded")}</Link>}
      </>}
    </div>
  );
}

export default function V3RoomActions({ room, invite, locale }: { room: RoomView; invite?: RosterView; locale: Locale }) {
  return <WalletAccess locale={locale}>{(wallet) => <Connected key={wallet.address} room={room} invite={invite} wallet={wallet} locale={locale} />}</WalletAccess>;
}
