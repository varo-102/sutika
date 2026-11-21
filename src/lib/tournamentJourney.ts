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

export function tournamentJourney(journey: Journey) {
  const { roles, joined, winner, canFreeze, confirmed, claimAt, now } = journey;
  const has = (step: string) => confirmed.includes(step);
  const actions: CompetitionAction[] = [];

  if (has("release"))
    return {
      actions,
      message:
        "El premio ya fue pagado. Puedes abrir el comprobante en el historial.",
    };
  if (has("dispute")) {
    if (roles.includes("resolver")) actions.push("resolve");
    return {
      actions,
      message: "Hay una revisión abierta. El cobro está en pausa.",
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
        "Hacen falta dos plantillas completas para cerrar las inscripciones.",
    };
  if (
    next &&
    (has("freeze") || roles.includes("sponsor") || roles.includes("organizer"))
  )
    return {
      actions,
      message:
        next[1] === "sponsor"
          ? "El siguiente paso corresponde al patrocinador."
          : "El siguiente paso corresponde al organizador.",
    };
  if (!has("anchor"))
    return {
      actions,
      message: "La inscripción abre cuando se registre el torneo.",
    };
  if (winner && claimAt !== null && now < claimAt)
    return {
      actions,
      message:
        "El cobro se habilita cuando terminen las 24 horas para pedir una revisión.",
    };
  if (joined)
    return {
      actions,
      message:
        "Ya tienes un lugar en el torneo. Aquí podrás consultar el resultado.",
    };
  return {
    actions,
    message: "Puedes consultar el estado del torneo en el historial.",
  };
}
