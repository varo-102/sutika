import "server-only";
import { listTournaments } from "./tournamentsService";
import deployment from "./deployment.json";
import { gameOf, WINNER_USDC, type Game } from "./rules";

type PrizeStatus = "unfunded" | "funded" | "paid" | "unknown";
export type CompetitionSummary = {
  publicSlug: string;
  name: string;
  category: Game;
  participants: number | null;
  amount: number;
  status: PrizeStatus;
};

export async function publicTournaments(): Promise<{
  live: boolean;
  tournaments: CompetitionSummary[];
}> {
  try {
    const rows = await listTournaments();
    if (rows.length)
      return {
        live: true,
        tournaments: rows.map((t) => ({
          publicSlug: t.publicSlug,
          name: t.name,
          category: gameOf(t.category),
          participants: t._count.participants,
          amount: Number(t.prizes[0]?.amountUsdc ?? WINNER_USDC),
          status:
            t.prizes[0]?.claimStatus === "CLAIMED_VERIFIED"
              ? "paid"
              : t.ledgerOperations.length
                ? "funded"
                : "unfunded",
        })),
      };
  } catch {
    // A confirmed registration is immutable. Balances, entries and later payments need live data.
  }
  return {
    live: false,
    tournaments: deployment.registrations.map((t) => ({
      publicSlug: t.slug,
      name: t.name,
      category: gameOf(t.game),
      participants: null,
      amount: WINNER_USDC,
      status: "unknown",
    })),
  };
}
