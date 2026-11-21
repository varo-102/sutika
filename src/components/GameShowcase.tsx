"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Pause,
  Play,
  Swords,
} from "lucide-react";
import { games, type Game } from "@/lib/rules";
import { gameArt } from "@/lib/gameArt";

const titles: Game[] = ["CLASH_ROYALE", "MOBILE_LEGENDS"];
export default function GameShowcase() {
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reduced || !running || hover || focused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((n) => (n + 1) % titles.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [reduced, running, hover, focused]);
  function choose(n: number) {
    setIndex((n + titles.length) % titles.length);
    setRunning(false);
  }
  function keys(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      choose(index + (e.key === "ArrowRight" ? 1 : -1));
    }
  }
  const current = titles[index],
    game = games[current],
    art = gameArt[current];
  return (
    <section
      className="showcase"
      aria-label="Juegos de la hackatón"
      aria-roledescription="carrusel"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHover(true);
      }}
      onPointerLeave={() => setHover(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={keys}
    >
      <div className="showcase-frame">
        {titles.map((id, i) => (
          <div
            key={id}
            className={"showcase-slide" + (i === index ? " selected" : "")}
            aria-hidden={i !== index}
          >
            <Image
              src={gameArt[id].hero}
              alt={gameArt[id].heroAlt}
              fill
              quality={90}
              preload={i === 0}
              sizes="(max-width: 760px) 94vw, (max-width: 1160px) 48vw, 570px"
              style={{ objectPosition: gameArt[id].position }}
            />
          </div>
        ))}
        <div className="slide-top">
          <span className="image-format">
            {current === "CLASH_ROYALE" ? (
              <Crown size={14} />
            ) : (
              <Swords size={14} />
            )}{" "}
            {art.detail}
          </span>
          {!reduced && (
            <button
              type="button"
              className="playback"
              onClick={() => setRunning(!running)}
              aria-label={
                running
                  ? "Pausar cambio automático de juego"
                  : "Reanudar cambio automático de juego"
              }
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
            </button>
          )}
        </div>
        <div className="slide-caption">
          <div aria-live={running ? "off" : "polite"}>
            <span>{game.format} · Torneo de prueba</span>
            <h2>{game.name}</h2>
          </div>
          <Link
            className="caption-link"
            href={"/tournaments/" + art.slug}
            aria-label={"Ver torneo de " + game.name}
          >
            <ArrowUpRight />
          </Link>
        </div>
      </div>
      <div className="showcase-controls">
        <div className="game-choices" aria-label="Elegir juego">
          {titles.map((id, i) => (
            <button
              type="button"
              key={id}
              aria-pressed={index === i}
              onClick={() => choose(i)}
            >
              {id === "CLASH_ROYALE" ? "Clash Royale" : "Mobile Legends"}
            </button>
          ))}
        </div>
        <div className="slide-arrows">
          <button
            type="button"
            aria-label="Juego anterior"
            onClick={() => choose(index - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            aria-label="Juego siguiente"
            onClick={() => choose(index + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
