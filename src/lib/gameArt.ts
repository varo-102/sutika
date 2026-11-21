import type { Game } from "./rules";

export const gameArt = {
  CLASH_ROYALE: {
    hero: "/images/arena-de-torres.webp",
    card: "/images/corona-de-arena.webp",
    heroAlt:
      "Ilustración de dos fortalezas rivales frente a un río y un puente de arena.",
    detail: "Duelo de torres",
    slug: "demo-clash-royale",
    position: "52% 52%",
  },
  MOBILE_LEGENDS: {
    hero: "/images/guardianes-del-alba.webp",
    card: "/images/nexo-del-alba.webp",
    heroAlt:
      "Ilustración de una escuadra de héroes ante el nexo de un campo de batalla.",
    detail: "Batalla por equipos",
    slug: "demo-mobile-legends",
    position: "46% 45%",
  },
} as const satisfies Record<
  Game,
  {
    hero: string;
    card: string;
    heroAlt: string;
    detail: string;
    slug: string;
    position: string;
  }
>;
