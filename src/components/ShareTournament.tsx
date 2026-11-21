"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

export default function ShareTournament({ team }: { team?: string }) {
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");

  async function copy() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (team) url.searchParams.set("equipo", team);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Enlace copiado.");
    } catch {
      setLink(url.href);
      setNotice("Selecciona el enlace y cópialo.");
    }
  }

  return (
    <div className="share-tournament">
      <button className="btn btn-outline" type="button" onClick={copy}>
        <Link2 /> {team ? "Invitar al equipo" : "Copiar enlace"}
      </button>
      {notice && <small role="status">{notice}</small>}
      {link && (
        <input
          aria-label="Enlace de invitación"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
