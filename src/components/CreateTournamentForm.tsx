"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StrKey } from "@stellar/stellar-sdk";
import { ArrowRight, Check, Crown, Pencil } from "lucide-react";
import {
  display,
  games,
  WINNER_FUNDING,
  WINNER_USDC,
  type Game,
} from "@/lib/rules";
import { signedAction, type CompetitionWallet } from "@/lib/walletRequests";
import WalletAccess from "./WalletAccess";

type Draft = { name: string; game: Game };

function PublishTournament({
  draft,
  wallet,
}: {
  draft: Draft;
  wallet: CompetitionWallet;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const sponsor = String(
      new FormData(event.currentTarget).get("sponsor") ?? "",
    ).trim();
    if (!StrKey.isValidEd25519PublicKey(sponsor)) {
      setNotice(
        "Revisa la dirección pública del patrocinador. Empieza con G y tiene 56 caracteres.",
      );
      return;
    }
    if (wallet.address === sponsor) {
      setNotice(
        "Usa una cuenta distinta para el organizador y para el patrocinador.",
      );
      return;
    }

    setBusy(true);
    setNotice("Confirma la creación del torneo en tu billetera.");
    try {
      const result = await signedAction(wallet, {
        kind: "create",
        ...draft,
        sponsor,
        winnerAmount: WINNER_USDC,
      });
      if (!result.slug) throw new Error("La creación no fue confirmada.");
      router.push("/tournaments/" + result.slug + "#participar");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "No se pudo crear el torneo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="review-signature" onSubmit={publish}>
      <label htmlFor="draft-sponsor">
        Dirección pública del patrocinador
        <input
          id="draft-sponsor"
          name="sponsor"
          placeholder="G…"
          required
          maxLength={56}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="sponsor-help"
        />
      </label>
      <small className="field-note" id="sponsor-help">
        Pídele la dirección de su billetera de Testnet. Desde esa cuenta se
        depositaría el premio.
      </small>
      <button className="btn btn-gold" type="submit" disabled={busy}>
        <Check /> {busy ? "Esperando firma…" : "Firmar y crear torneo"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}

export default function CreateTournamentForm() {
  const [draft, setDraft] = useState<Draft>({ name: "", game: "CLASH_ROYALE" });
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const game = games[draft.game];

  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);

  function examine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Escribe un nombre para el torneo.");
      nameInput.current?.focus();
      return;
    }
    setDraft({ ...draft, name: draft.name.trim() });
    setError("");
    setReview(true);
  }

  return (
    <div className="tournament-editor">
      <div className="tournament-draft">
        {review ? (
          <section className="review-draft" aria-labelledby="draft-review">
            <p className="eyebrow">Revisión</p>
            <h3 id="draft-review" ref={reviewHeading} tabIndex={-1}>
              {draft.name}
            </h3>
            <p>
              {game.name} · {game.format}
            </p>
            <p>
              Para publicar la ficha necesitas tu cuenta de prueba y la
              dirección pública del patrocinador.
            </p>
            <button
              className="text-action edit-review"
              type="button"
              onClick={() => setReview(false)}
            >
              <Pencil size={14} /> Editar datos
            </button>
          </section>
        ) : (
          <form onSubmit={examine}>
            <label htmlFor="draft-name">
              Nombre del torneo
              <input
                id="draft-name"
                name="name"
                ref={nameInput}
                placeholder="Ej. Copa de la Corona"
                maxLength={80}
                required
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <div className="form-field">
              <label htmlFor="draft-game">Juego</label>
              <select
                id="draft-game"
                name="game"
                value={draft.game}
                onChange={(event) =>
                  setDraft({ ...draft, game: event.target.value as Game })
                }
              >
                {Object.entries(games).map(([id, option]) => (
                  <option key={id} value={id}>
                    {option.name} · {option.format}
                  </option>
                ))}
              </select>
            </div>
            {error && <p role="alert">{error}</p>}
            <button className="btn btn-gold" type="submit">
              Revisar torneo <ArrowRight className="motion-arrow" />
            </button>
          </form>
        )}
      </div>
      <aside className="prize-review" aria-label="Resumen del premio">
        <p className="eyebrow">
          <Crown /> Primer puesto
        </p>
        <h3>5 USDC</h3>
        <p aria-live="polite">
          {game.size === 5
            ? "1 USDC por cada uno de los cinco titulares ganadores."
            : "5 USDC para el ganador individual."}
        </p>
        <dl>
          <div>
            <dt>Inscripción</dt>
            <dd>Gratis</dd>
          </div>
          <div>
            <dt>Plataforma</dt>
            <dd>{display(WINNER_FUNDING.platform)} USDC</dd>
          </div>
          <div>
            <dt>Protocolo</dt>
            <dd>{display(WINNER_FUNDING.protocol)} USDC</dd>
          </div>
          <div className="review-total">
            <dt>Aporte del patrocinador</dt>
            <dd>{display(WINNER_FUNDING.gross)} USDC</dd>
          </div>
        </dl>
        <small>Stellar Testnet · Activos de prueba</small>
      </aside>
      {review && (
        <div className="tournament-signing">
          <WalletAccess>
            {(wallet) => <PublishTournament draft={draft} wallet={wallet} />}
          </WalletAccess>
        </div>
      )}
    </div>
  );
}
