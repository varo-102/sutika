"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { translate, type Locale } from "@/lib/locale";

export default function ShareTournament({ team, locale = "es" }: { team?: string; locale?: Locale }) {
  const t = translate(locale);
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");

  async function copy() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (team) url.searchParams.set("equipo", team);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice(t("Enlace copiado.", "Link copied."));
    } catch {
      setLink(url.href);
      setNotice(t("Selecciona el enlace y cópialo.", "Select the link and copy it."));
    }
  }

  return (
    <div className="share-tournament">
      <button className="btn btn-outline" type="button" onClick={copy}>
        <Link2 /> {team ? t("Invitar al equipo", "Invite teammates") : t("Copiar enlace", "Copy link")}
      </button>
      {notice && <small role="status">{notice}</small>}
      {link && (
        <input
          aria-label={t("Enlace de invitación", "Invitation link")}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
