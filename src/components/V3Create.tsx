"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StrKey } from "@stellar/stellar-sdk";
import { ArrowLeft, ArrowRight, Check, Coins, Crown, Ticket } from "lucide-react";
import WalletAccess from "./WalletAccess";
import { boliviaTime, localized, translate, type Locale } from "@/lib/locale";
import { games, gameOf, UNIT, type Game } from "@/lib/rules";
import { confirmV3, executeV3 } from "@/lib/v3/client";
import { modeName, usdcAmount } from "@/lib/v3/presentation";
import { decimalAmount, distribute, FEES, MIN_ENTRY, MODE, PROTOCOL_FEE, quote, sponsorQuote, weights, type FundingMode } from "@/lib/v3/rules";
import type { CompetitionWallet } from "@/lib/walletRequests";

type Tournament = {
  name: string;
  game: Game;
  min: number;
  max: number;
  deadline: number;
  deadlineLabel: string;
};

type Prize = {
  mode: FundingMode;
  net: string;
  entry: string;
  distribution: "single" | "preset" | "custom";
  places: number[];
  sponsor: string;
  referee: string;
};

type Draft = Tournament & Prize;

function Summary({ draft, locale }: { draft: Draft; locale: Locale }) {
  const t = translate(locale);
  const slots = draft.mode === "entry" ? [] : sponsorQuote(decimalAmount(draft.net, UNIT / 100n), draft.mode, draft.places);
  const entries = draft.mode === "sponsored" ? [] :
    distribute(BigInt(draft.min) * decimalAmount(draft.entry, MIN_ENTRY), draft.places).map((gross) => quote(gross, draft.mode));
  const sum = (items: typeof slots, key: "gross" | "net" | "platform" | "protocol") =>
    items.reduce((total, item) => total + item[key], 0n);
  const rate = (bps: bigint) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(bps) / 100) + " %";
  const money = (value: bigint) => usdcAmount(value, locale);
  const players = draft.game === "CLASH_ROYALE";
  const hasSponsor = draft.mode !== "entry";
  const hasEntry = draft.mode !== "sponsored";
  const net = sum(slots, "net") + sum(entries, "net");

  return (
    <div className="v3-summary">
      <div className="v3-review-head"><h2>{draft.name}</h2><span className="v3-tag">Stellar Testnet</span></div>
      <dl>
        <div><dt>{t("Juego", "Game")}</dt><dd>{games[draft.game].name} · {games[draft.game].format}</dd></div>
        <div><dt>{t("Cómo se forma el premio", "Prize funding")}</dt><dd>{modeName(draft.mode, locale)}</dd></div>
        <div><dt>{t("Cupos", "Entry limits")}</dt><dd>{draft.min}–{draft.max} {players ? t("jugadores", "players") : t("equipos", "teams")}</dd></div>
        <div><dt>{t("Cierre en Bolivia", "Deadline in Bolivia")}</dt><dd>{boliviaTime(locale).format(draft.deadline * 1000)}</dd></div>
        <div><dt>{t("Reparto por puesto", "Split by place")}</dt><dd>{draft.places.map((place) => place / 100 + " %").join(" / ")}</dd></div>
        <div><dt>{t("Árbitro", "Referee")}</dt><dd><code className="v3-wrap">{draft.referee}</code></dd></div>
        {hasSponsor && <div><dt>{t("Patrocinador", "Sponsor")}</dt><dd>{draft.sponsor ? <code className="v3-wrap">{draft.sponsor}</code> : t("Cuenta que publica", "Publishing account")}</dd></div>}
      </dl>
      <div className="v3-money">
        <div><span>{t("Tarifa total", "Total prize fee")}</span><strong>{rate(FEES[draft.mode] + PROTOCOL_FEE)}</strong></div>
        <div><span>SUTIKA · {rate(FEES[draft.mode])}</span><strong>{money(sum(slots, "platform") + sum(entries, "platform"))}</strong></div>
        <div><span>{t("Protocolo", "Protocol")} · {rate(PROTOCOL_FEE)}</span><strong>{money(sum(slots, "protocol") + sum(entries, "protocol"))}</strong></div>
        {hasSponsor && <div><span>{t("Depósito del patrocinador", "Sponsor deposits")}</span><strong>{money(sum(slots, "gross"))}</strong></div>}
        {hasEntry && <div><span>{players ? t("Cuota por jugador", "Fee per player") : t("Cuota por equipo", "Fee per team")}</span><strong>{money(decimalAmount(draft.entry, MIN_ENTRY))}</strong></div>}
        {!hasEntry && <div><span>{t("Inscripción", "Entry")}</span><strong>{t("Gratuita", "Free")}</strong></div>}
        <div className="v3-total"><span>{hasEntry ? t("Premio neto si se cubre el mínimo", "Net prize if the minimum is met") : t("Premio neto para los ganadores", "Net prize for winners")}</span><strong>{money(net)}</strong></div>
      </div>
      {hasEntry && <p className="field-note">{t("Los importes de las comisiones y del premio incluyen una estimación basada en el cupo mínimo.", "Fee and prize amounts include an estimate based on the minimum number of entries.")}</p>}
      {!players && <p className="field-note">{t("En 5v5, cada titular recibe 20 % de la parte de su equipo por defecto.", "In 5v5, each player receives 20% of their team's prize by default.")}</p>}
      <p className="field-note">{t("Crear en SUTIKA es gratis. La cuenta firmante cubre la tarifa de red en XLM de prueba.", "Creating on SUTIKA is free. The signing account covers the network fee in test XLM.")}</p>
    </div>
  );
}

function Publish({ wallet, draft, nonce, locale }: { wallet: CompetitionWallet; draft: Draft; nonce: string; locale: Locale }) {
  const t = translate(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function publish() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (draft.referee === wallet.address) throw new Error(t("El árbitro debe usar otra cuenta.", "The referee must use a different account."));
      const result = pending ? await confirmV3(pending, locale) :
        await executeV3(
          wallet,
          { kind: "create", nonce, name: draft.name, game: draft.game, min: draft.min, max: draft.max, deadline: draft.deadline,
            mode: draft.mode, net: draft.net, entry: draft.entry, places: draft.places, sponsor: draft.sponsor, referee: draft.referee },
          setNotice,
          locale,
        );
      if (result.status === "CONFIRMED" && result.slug) {
        router.push(localized(locale, "/c/" + result.slug));
        return;
      }
      if (result.status === "EXPIRED" || result.status === "FAILED") {
        setPending(undefined);
        setNotice(t("Vuelve a firmar para publicar el torneo.", "Sign again to publish the tournament."));
      } else {
        setPending(result.id);
        setNotice(t("La publicación sigue pendiente. Puedes consultar su estado.", "Publication is pending. You can check its status again."));
      }
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : t("No se pudo publicar.", "The tournament could not be published."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="field-note">{t("Cuenta que publica", "Publishing account")} <code>{wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}</code></p>
      <button type="button" className="btn btn-gold" onClick={publish} disabled={busy}>
        <Check /> {pending ? t("Consultar publicación", "Check publication") : t("Firmar y publicar", "Sign and publish")}
      </button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}

const input = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const decimals = (value: string) => value.replace(",", ".");

export default function V3Create({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const [step, setStep] = useState(0);
  const [tournament, setTournament] = useState<Tournament>();
  const [prize, setPrize] = useState<Prize>();
  const [mode, setMode] = useState<FundingMode>("sponsored");
  const [distribution, setDistribution] = useState<Prize["distribution"]>("single");
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const [publication, setPublication] = useState<{ intent: string; nonce: string }>();

  const modeDescription = {
    sponsored: t("El patrocinador aporta. La inscripción es gratis.", "A sponsor funds the prize. Entry is free."),
    entry: t("Cada jugador o equipo aporta su cuota.", "Each player or team pays an entry fee."),
    mixed: t("Las cuotas se suman al aporte del patrocinador.", "Entry fees are added to a sponsor's contribution."),
  };
  const headings = [t("Torneo", "Tournament"), t("Premio", "Prize"), t("Revisar y publicar", "Review and publish")];
  const stepLabels = [headings[0], headings[1], t("Revisión", "Review")];

  function goTo(value: number) {
    setError("");
    setStep(value);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function saveTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const name = input(form, "name");
    const game = gameOf(input(form, "game"));
    const min = Number(input(form, "min"));
    const max = Number(input(form, "max"));
    const deadlineLabel = input(form, "deadline");
    const now = Date.now() / 1000;
    const deadline = Date.parse(deadlineLabel + ":00-04:00") / 1000;
    if (!name) {
      setError(t("Escribe el nombre del torneo.", "Enter the tournament name."));
    } else if (max < min) {
      setError(t("El cupo máximo debe ser igual o mayor al mínimo.", "Maximum entries must be at least the minimum."));
    } else if (!Number.isFinite(deadline) || deadline < now + 60 || deadline > now + 30 * 86400 - 300) {
      setError(t("Elige un cierre entre un minuto y 30 días desde ahora.", "Choose a deadline between one minute and 30 days from now."));
    } else {
      setTournament({ name, game, min, max, deadlineLabel, deadline });
      goTo(1);
    }
  }

  function savePrize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const referee = input(form, "referee");
    const sponsor = input(form, "sponsor");
    if (!StrKey.isValidEd25519PublicKey(referee) || (sponsor && !StrKey.isValidEd25519PublicKey(sponsor))) {
      setError(t("Revisa las direcciones públicas. Las cuentas de Stellar comienzan con G.", "Check the public addresses. Stellar accounts start with G."));
      return;
    }
    if (sponsor === referee) {
      setError(t("El árbitro debe usar una cuenta distinta del patrocinador.", "The referee must use a different account from the sponsor."));
      return;
    }
    const net = decimals(input(form, "net"));
    const entry = decimals(input(form, "entry"));
    try {
      if (mode !== "entry") decimalAmount(net, UNIT / 100n);
      if (mode !== "sponsored") decimalAmount(entry, MIN_ENTRY);
    } catch {
      setError(t("Ingresa un importe válido de hasta dos decimales dentro del rango indicado.", "Enter an amount within the listed range and use at most two decimal places."));
      return;
    }
    try {
      const places = distribution === "single" ? [10000] : distribution === "preset" ? [6000, 3000, 1000] :
        weights([1, 2, 3].map((place) => Math.round(Number(input(form, "place" + place)) * 100)), [3]);
      const nextPrize = { net, entry, referee, sponsor, mode, distribution, places };
      const intent = JSON.stringify({ ...tournament, ...nextPrize });
      setPrize(nextPrize);
      if (publication?.intent !== intent) setPublication({ intent, nonce: crypto.randomUUID() });
      goTo(2);
    } catch {
      setError(t("El reparto debe sumar 100 % y cada puesto recibe al menos 1 %.", "The split must add up to 100%, with at least 1% per place."));
    }
  }

  return (
    <div className="v3-form">
      <ol className="v3-steps" aria-label={t("Pasos para crear un torneo", "Steps to create a tournament")}>
        {stepLabels.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}>
          <span aria-hidden="true">{step > index ? <Check size={14} /> : index + 1}</span>{label}
        </li>)}
      </ol>
      <h2 ref={heading} tabIndex={-1} className="v3-step-heading">{headings[step]}</h2>
      {step === 0 && <form className="v3-form" onSubmit={saveTournament}>
        <div className="v3-fields">
          <label>{t("Nombre del torneo", "Tournament name")}<input name="name" required maxLength={60} placeholder={t("Copa de la comunidad", "Community cup")} defaultValue={tournament?.name} /></label>
          <label>{t("Juego", "Game")}<select name="game" defaultValue={tournament?.game ?? "CLASH_ROYALE"}>
            {Object.entries(games).map(([key, game]) => <option key={key} value={key}>{game.name} · {game.format}</option>)}
          </select></label>
          <label>{t("Cierre de inscripciones · hora de Bolivia", "Registration deadline · Bolivia time")}<input type="datetime-local" name="deadline" required defaultValue={tournament?.deadlineLabel} /></label>
        </div>
        <fieldset>
          <legend>{t("Cupos de jugadores o equipos", "Player or team limits")}</legend>
          <div className="v3-fields v3-capacity">
            <label>{t("Mínimo", "Minimum")}<input name="min" type="number" min="4" max="16" required defaultValue={tournament?.min ?? 4} /></label>
            <label>{t("Máximo", "Maximum")}<input name="max" type="number" min="4" max="16" required defaultValue={tournament?.max ?? 8} /></label>
          </div>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="btn btn-gold">{t("Continuar al premio", "Continue to prize")} <ArrowRight /></button>
      </form>}
      {step === 1 && tournament && <form className="v3-form" onSubmit={savePrize}>
        <fieldset>
          <legend>{t("¿Cómo se forma el premio?", "How is the prize funded?")}</legend>
          <div className="v3-options">
            {(Object.keys(MODE) as FundingMode[]).map((key) => {
              const Icon = key === "entry" ? Ticket : key === "mixed" ? Coins : Crown;
              return <label key={key} className="v3-option">
                <input name="mode" type="radio" value={key} checked={mode === key} onChange={() => setMode(key)} />
                <Icon size={20} aria-hidden="true" /><strong>{modeName(key, locale)}</strong><small>{modeDescription[key]}</small>
              </label>;
            })}
          </div>
        </fieldset>
        <div className="v3-fields">
          {mode !== "entry" && <label>{t("Premio neto del patrocinador", "Net prize from sponsor")} (USDC)
            <input type="text" inputMode="decimal" name="net" required maxLength={10} defaultValue={prize?.net} />
            <small>{t("De 0,01 a 1 000 000 USDC de prueba.", "From 0.01 to 1,000,000 test USDC.")}</small>
          </label>}
          {mode !== "sponsored" && <label>{tournament.game === "CLASH_ROYALE" ? t("Cuota por jugador", "Entry fee per player") : t("Cuota por equipo", "Entry fee per team")} (USDC)
            <input type="text" inputMode="decimal" name="entry" required maxLength={10} defaultValue={prize?.entry} />
            <small>{t("De 0,25 a 1 000 000 USDC de prueba.", "From 0.25 to 1,000,000 test USDC.")}</small>
          </label>}
          <label>{t("Puestos premiados", "Prize places")}<select name="distribution" value={distribution}
            onChange={(event) => setDistribution(event.target.value as Prize["distribution"])}>
            <option value="single">{t("Solo primer lugar", "First place only")}</option>
            <option value="preset">{t("Podio de tres · 60 % / 30 % / 10 %", "Top three · 60% / 30% / 10%")}</option>
            <option value="custom">{t("Personalizar el podio", "Customize the split")}</option>
          </select></label>
        </div>
        {distribution === "custom" && <div className="v3-three">
          {[60, 30, 10].map((value, index) => <label key={index}>{t("Puesto ", "Place ")}{index + 1} (%)
            <input type="number" name={"place" + (index + 1)} step="0.01" min="1" max="98" required
              defaultValue={prize?.places.length === 3 ? prize.places[index] / 100 : value} />
          </label>)}
        </div>}
        <div className="v3-fields">
          <label>{t("Cuenta del árbitro", "Referee account")}
            <input name="referee" required maxLength={56} spellCheck={false} autoComplete="off" defaultValue={prize?.referee} placeholder="G…" />
            <small>{t("Pide la dirección pública a la persona que revisará las impugnaciones.", "Ask the person who will review disputes for their public address.")}</small>
          </label>
          {mode !== "entry" && <label>{t("Cuenta del patrocinador", "Sponsor account")}
            <input name="sponsor" maxLength={56} spellCheck={false} autoComplete="off" defaultValue={prize?.sponsor} placeholder="G…" />
            <small>{t("Déjala vacía si tú aportarás el premio.", "Leave blank if you are funding the prize.")}</small>
          </label>}
        </div>
        {tournament.game === "MOBILE_LEGENDS" && <p className="field-note">{t("En cada equipo, los cinco titulares reciben partes iguales por defecto.", "By default, each team's five players receive equal shares.")}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="buttons">
          <button type="button" className="btn btn-outline" onClick={() => goTo(0)}><ArrowLeft />{t("Volver", "Back")}</button>
          <button type="submit" className="btn btn-gold">{t("Revisar importes", "Review amounts")}<ArrowRight /></button>
        </div>
      </form>}
      {step === 2 && tournament && prize && publication && <>
        <Summary draft={{ ...tournament, ...prize }} locale={locale} />
        <WalletAccess locale={locale}>{(wallet) => <Publish key={wallet.address} draft={{ ...tournament, ...prize }} wallet={wallet} nonce={publication.nonce} locale={locale} />}</WalletAccess>
        <div className="buttons">
          <button type="button" className="btn btn-outline" onClick={() => goTo(1)}><ArrowLeft />{t("Editar premio", "Edit prize")}</button>
          <Link className="inline-link" href={localized(locale, "/guia#patrocinar")}>{t("Cómo depositar el premio", "How to deposit the prize")}</Link>
        </div>
      </>}
    </div>
  );
}
