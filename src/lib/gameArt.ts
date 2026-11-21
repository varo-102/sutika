import type { Game } from "./rules";

export const gameArt = {
  CLASH_ROYALE: {
    hero: "/images/arena-de-torres.webp",
    position: "52% 52%",
  },
  MOBILE_LEGENDS: {
    hero: "/images/guardianes-del-alba.webp",
    position: "46% 45%",
  },
} as const satisfies Record<Game, { hero: string; position: string }>;
