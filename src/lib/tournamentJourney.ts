import { translate, type Locale } from "./locale.ts";

const managementSteps = [
  ["anchor", "organizer"],
  ["escrow", "sponsor"],
  ["bind", "sponsor"],
  ["fund", "sponsor"],
  ["freeze", "organizer"],
  ["declare", "organizer"],
  ["mark", "organizer"],
  ["approve_tw", "sponsor"],
  ["approve", "sponsor"],
] as const;

export const actionLabels = {
  anchor: "Registrar el torneo",
  escrow: "Preparar el depósito",
  bind: "Vincular la custodia al torneo",
  fund: "Depositar el premio",
  freeze: "Cerrar las inscripciones",
  declare: "Publicar al ganador",
  mark: "Registrar el resultado en la custodia",
  approve_tw: "Aprobar el pago en la custodia",
  approve: "Confirmar al ganador",
  join: "Inscribirme",
  release: "Cobrar el premio",
  dispute: "Pedir una revisión",
  resolve: "Resolver la revisión",
} as const;

export type CompetitionAction = keyof typeof actionLabels;
const englishActionLabels: Record<CompetitionAction, string> = {
  anchor: "Register tournament",
  escrow: "Prepare deposit",
  bind: "Link escrow to the tournament",
  fund: "Deposit the prize",
  freeze: "Close registration",
  declare: "Publish the winner",
  mark: "Record the result in escrow",
  approve_tw: "Approve payment in escrow",
  approve: "Confirm the winner",
  join: "Register",
  release: "Claim the prize",
  dispute: "Request a review",
  resolve: "Resolve the review",
};

export function localizedActionLabel(action: CompetitionAction, locale: Locale) {
  return locale === "en" ? englishActionLabels[action] : actionLabels[action];
}

type Role = "organizer" | "sponsor" | "resolver" | "player";
type Journey = {
  roles: readonly Role[];
  joined: boolean;
  winner: boolean;
  canFreeze: boolean;
  confirmed: readonly string[];
  claimAt: number | null;
  now: number;
};

export function tournamentJourney(journey: Journey, locale: Locale = "es") {
  const t = translate(locale);
  const { roles, joined, winner, canFreeze, confirmed, claimAt, now } = journey;
  const has = (step: string) => confirmed.includes(step);
  const actions: CompetitionAction[] = [];

  if (has("release"))
    return {
      actions,
      message:
        t("El premio ya fue pagado. Puedes abrir el comprobante en el historial.", "The prize has been paid. Open the receipt in the history."),
    };
  if (has("dispute")) {
    if (roles.includes("resolver")) actions.push("resolve");
    return {
      actions,
      message: t("Hay una revisión abierta. El cobro está en pausa.", "A review is open. The payment is on hold."),
    };
  }

  const next = managementSteps.find(([step]) => !has(step));
  if (next && roles.includes(next[1]) && (next[0] !== "freeze" || canFreeze))
    actions.push(next[0]);

  if (!joined && has("anchor") && !has("freeze")) actions.push("join");

  const canDispute =
    joined || roles.includes("organizer") || roles.includes("sponsor");
  if (claimAt !== null && has("declare")) {
    if (!next && winner && now >= claimAt) actions.push("release");
    if (now < claimAt && canDispute) actions.push("dispute");
  }

  if (actions.length) return { actions, message: "" };
  if (next?.[0] === "freeze" && !canFreeze)
    return {
      actions,
      message:
        t("Hacen falta dos plantillas completas para cerrar las inscripciones.", "Two complete rosters are needed to close registration."),
    };
  if (
    next &&
    (has("freeze") || roles.includes("sponsor") || roles.includes("organizer"))
  )
    return {
      actions,
      message:
        next[1] === "sponsor"
          ? t("El siguiente paso corresponde al patrocinador.", "The sponsor takes the next step.")
          : t("El siguiente paso corresponde al organizador.", "The organizer takes the next step."),
    };
  if (!has("anchor"))
    return {
      actions,
      message: t("La inscripción abre cuando se registre el torneo.", "Entries open after the tournament is registered."),
    };
  if (winner && claimAt !== null && now < claimAt)
    return {
      actions,
      message:
        t("El cobro se habilita cuando terminen las 24 horas para pedir una revisión.", "The prize can be claimed after the 24-hour review window."),
    };
  if (joined)
    return {
      actions,
      message:
        t("Ya tienes un lugar en el torneo. Aquí podrás consultar el resultado.", "Your entry is confirmed. Come back here to check the result."),
    };
  return {
    actions,
    message: t("Puedes consultar el estado del torneo en el historial.", "You can check the tournament status in its history."),
  };
}
