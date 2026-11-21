"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Crown, Pencil, Ticket } from "lucide-react";
import { StrKey } from "@stellar/stellar-sdk";
import WalletAccess from "./WalletAccess";
import type { CompetitionWallet } from "@/lib/walletRequests";
import { display, gameOf, games, UNIT, type Game } from "@/lib/rules";
import { decimalAmount, distribute, FEES, MIN_ENTRY, modeLabels, PROTOCOL_FEE, quote, sponsorQuote, weights, type FundingMode } from "@/lib/v3/rules";
import { confirmV3, executeV3 } from "@/lib/v3/client";

const descriptions = {
  sponsored: "El patrocinador aporta el premio. Participar es gratis.",
  entry: "Las cuotas por jugador o equipo forman el premio.",
  mixed: "El aporte del patrocinador y las inscripciones se suman.",
};

type Draft = {
  name: string;
  game: Game;
  mode: FundingMode;
  min: number;
  max: number;
  deadline: number;
  deadlineLabel: string;
  net: string;
  entry: string;
  places: number[];
  sponsor: string;
  referee: string;
};

function Summary({ draft }: { draft: Draft }) {
  const slots = draft.mode === "entry" ? [] : sponsorQuote(decimalAmount(draft.net, UNIT / 100n), draft.mode, draft.places);
  const sample = draft.mode === "sponsored" ? [] :
    distribute(BigInt(draft.min) * decimalAmount(draft.entry, MIN_ENTRY), draft.places).map((gross) => quote(gross, draft.mode));
  const total = (items: ReturnType<typeof sponsorQuote>, key: "gross" | "net" | "platform" | "protocol") =>
    items.reduce((sum, item) => sum + item[key], 0n);
  return (
    <div className="v3-summary">
      <dl>
        <div><dt>Juego</dt><dd>{games[draft.game].name} · {games[draft.game].format}</dd></div>
        <div><dt>Fondeo</dt><dd>{modeLabels[draft.mode]}</dd></div>
        <div><dt>Cupos</dt><dd>{draft.min} a {draft.max} {draft.game === "CLASH_ROYALE" ? "jugadores" : "equipos"}</dd></div>
        <div><dt>Cierre en Bolivia</dt><dd>{draft.deadlineLabel.replace("T", " ")}</dd></div>
        <div><dt>Premios</dt><dd>{draft.places.map((place) => place / 100 + " %").join(" / ")}</dd></div>
      </dl>
      <div className="v3-money">
        <div><span>Tarifa de SUTIKA</span><strong>{Number(FEES[draft.mode]) / 100} %</strong></div>
        <div><span>Tarifa de protocolo</span><strong>{Number(PROTOCOL_FEE) / 100} %</strong></div>
        {slots.length > 0 && <>
          <div><span>Depósito del patrocinador</span><strong>{display(total(slots, "gross"))} USDC</strong></div>
          <div><span>Aporte neto al podio</span><strong>{display(total(slots, "net"))} USDC</strong></div>
        </>}
        {sample.length > 0 && <>
          <div><span>Cuota por {games[draft.game].size === 1 ? "jugador" : "equipo"}</span><strong>{draft.entry} USDC</strong></div>
          <div><span>Premio neto por cuotas si se cubre el mínimo</span><strong>{display(total(sample, "net"))} USDC</strong></div>
        </>}
      </div>
      <p className="field-note">Todos los importes son de Stellar Testnet. Crear un torneo en SUTIKA es gratis. Stellar aplica sus propias comisiones de red de prueba.</p>
    </div>
  );
}

function Publish({ wallet, draft }: { wallet: CompetitionWallet; draft: Draft }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const nonce = useRef("");
  async function publish() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!nonce.current) nonce.current = crypto.randomUUID();
      if (draft.referee === wallet.address) throw new Error("El árbitro debe conectar otra billetera.");
      const result = pending ? await confirmV3(pending) :
        await executeV3(wallet, { ...draft, kind: "create", nonce: nonce.current }, setNotice);
      if (result.status === "CONFIRMED" && result.slug) {
        router.push("/c/" + result.slug);
        return;
      }
      if (result.status === "EXPIRED" || result.status === "FAILED") {
        setPending(undefined);
        setNotice("Vuelve a firmar para publicar el torneo.");
      } else {
        setPending(result.id);
        setNotice("La transacción sigue pendiente. Puedes consultar el comprobante de nuevo.");
      }
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="field-note">Publicas con <code>{wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}</code>.</p>
      <button type="button" className="btn btn-gold" onClick={publish} disabled={busy}>
        <Check /> {pending ? "Consultar publicación" : "Firmar y publicar"}
      </button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export default function V3Create() {
  const [game, setGame] = useState<Game>("CLASH_ROYALE");
  const [mode, setMode] = useState<FundingMode>("sponsored");
  const [distribution, setDistribution] = useState("single");
  const [review, setReview] = useState<Draft>();
  const [values, setValues] = useState<Draft>();
  const [error, setError] = useState("");

  function reviewDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const field = (key: string) => String(form.get(key) ?? "").trim();
    try {
      const min = Number(field("min")), max = Number(field("max"));
      if (!(max >= min)) throw new Error("El cupo máximo debe ser igual o mayor al mínimo.");
      const referee = field("referee"), sponsor = field("sponsor");
      if (!StrKey.isValidEd25519PublicKey(referee) || (sponsor && !StrKey.isValidEd25519PublicKey(sponsor))) {
        throw new Error("Revisa las direcciones públicas. Las billeteras empiezan con G.");
      }
      if (sponsor && referee === sponsor) throw new Error("El árbitro requiere una billetera independiente.");
      const deadlineLabel = field("deadline");
      const deadline = Date.parse(deadlineLabel + ":00-04:00") / 1000;
      if (!Number.isFinite(deadline) || deadline < Date.now() / 1000 + 60 ||
        deadline > Date.now() / 1000 + 29.99 * 86_400) {
        throw new Error("Elige un cierre entre un minuto y 30 días desde ahora.");
      }
      const net = field("net"), entry = field("entry");
      if (mode !== "entry") decimalAmount(net, UNIT / 100n);
      if (mode !== "sponsored") decimalAmount(entry, MIN_ENTRY);
      const places = distribution === "single" ? [10000] : distribution === "preset" ? [6000, 3000, 1000] :
        weights([1, 2, 3].map((i) => Math.round(Number(field("place" + i)) * 100)), [3]);
      const draft = { name: field("name"), game, mode, min, max, deadline, deadlineLabel, net, entry, places, sponsor, referee };
      setValues(draft);
      setReview(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los datos del torneo.");
    }
  }

  if (review) return (
    <div className="v3-form">
      <div className="v3-review-head">
        <div><p className="eyebrow">Revisar torneo</p><h2>{review.name}</h2></div>
        <button className="text-action" type="button" onClick={() => setReview(undefined)}><Pencil /> Editar</button>
      </div>
      <Summary draft={review} />
      <WalletAccess>{(wallet) => <Publish wallet={wallet} draft={review} />}</WalletAccess>
    </div>
  );

  return (
    <form className="v3-form" onSubmit={reviewDraft}>
      <div className="v3-fields">
        <label>Nombre del torneo<input name="name" required maxLength={60} placeholder="Copa de la comunidad" defaultValue={values?.name} /></label>
        <label>Juego<select value={game} onChange={(event) => setGame(gameOf(event.target.value))}>
          {Object.entries(games).map(([key, item]) => <option key={key} value={key}>{item.name} · {item.format}</option>)}
        </select></label>
      </div>
      <fieldset>
        <legend>¿Cómo se forma el premio?</legend>
        <div className="v3-options">
          {(Object.keys(modeLabels) as FundingMode[]).map((key) => (
            <label key={key} className="v3-option">
              <input name="mode" type="radio" value={key} checked={mode === key} onChange={() => setMode(key)} />
              {key === "entry" ? <Ticket size={21} /> : <Crown size={21} />}
              <strong>{modeLabels[key]}</strong><small>{descriptions[key]}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="v3-fields">
        {mode !== "entry" && <label>Premio neto del patrocinador (USDC)
          <input name="net" type="number" step="0.01" min="0.01" max="1000000" required defaultValue={values?.net || "5"} />
        </label>}
        {mode !== "sponsored" && <label>Cuota por {games[game].size === 1 ? "jugador" : "equipo"} (USDC)
          <input name="entry" type="number" step="0.01" min="0.25" max="1000000" required defaultValue={values?.entry || "0.25"} />
        </label>}
        <label>Cupo mínimo<input name="min" type="number" min="4" max="16" required defaultValue={values?.min ?? 4} /></label>
        <label>Cupo máximo<input name="max" type="number" min="4" max="16" required defaultValue={values?.max ?? 8} /></label>
        <label>Cierre de inscripciones · hora de Bolivia<input name="deadline" type="datetime-local" required defaultValue={values?.deadlineLabel} /></label>
        <label>Premios<select value={distribution} onChange={(event) => setDistribution(event.target.value)}>
          <option value="single">Solo primer lugar</option><option value="preset">Podio 60 % / 30 % / 10 %</option><option value="custom">Personalizar podio</option>
        </select></label>
      </div>
      {distribution === "custom" && <div className="v3-three">
        {[60, 30, 10].map((value, idx) => <label key={value}>{idx + 1}.º lugar (%)
          <input type="number" name={"place" + (idx + 1)} step="0.01" min="1" max="98" required defaultValue={values?.places.length === 3 ? values.places[idx] / 100 : value} />
        </label>)}
      </div>}
      <div className="v3-fields">
        <label>Billetera del árbitro<input name="referee" maxLength={56} spellCheck={false} autoComplete="off" required defaultValue={values?.referee} placeholder="Dirección pública G…" /></label>
        {mode !== "entry" && <label>Billetera del patrocinador <small>Opcional si tú depositas</small>
          <input name="sponsor" maxLength={56} spellCheck={false} autoComplete="off" defaultValue={values?.sponsor} placeholder="Dirección pública G…" />
        </label>}
      </div>
      {game === "MOBILE_LEGENDS" && <p className="field-note">Cada titular recibe 20 % por defecto. El capitán puede proponer otro reparto al inscribir su equipo.</p>}
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-gold" type="submit"><ArrowRight /> Revisar y conectar cuenta</button>
    </form>
  );
}
