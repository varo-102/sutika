"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CirclePlus, Menu, X } from "lucide-react";
import { localized, translate, unlocalized, type Locale } from "@/lib/locale";

function LanguageLink({ locale }: { locale: Locale }) {
  const path = unlocalized(usePathname());
  const search = useSearchParams().toString();
  const other = locale === "es" ? "en" : "es";
  const label = other === "en" ? "English" : "Español";

  return (
    <a className="nav-language" href={localized(other, path) + (search ? "?" + search : "")}
      lang={other} hrefLang={other} aria-label={label} title={label}
      onClick={(event) => { event.currentTarget.hash = window.location.hash; }}>
      {other.toUpperCase()}
    </a>
  );
}

export default function Navbar({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const path = unlocalized(usePathname());
  const home = localized(locale, "/");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        close();
        document.getElementById("mobile-menu-button")?.focus();
      }
    }}>
      <div className="wrap navbar">
        <Link href={home} className="brand" aria-label={t("SUTIKA, inicio", "SUTIKA, home")} onClick={close}>
          <span className="brand-icon"><Image width={35} height={35} src="/branding/isologo-transparente-sutika.png" alt="" /></span>
          <span className="brand-name">SUTIKA</span>
        </Link>
        <nav className={"main-nav" + (open ? " nav-open" : "")} aria-label={t("Principal", "Main")} id="main-menu">
          <Link href={home + "#torneos"} onClick={close}>{t("Torneos", "Tournaments")}</Link>
          <Link href={localized(locale, "/guia")} aria-current={path === "/guia" ? "page" : undefined} onClick={close}>
            {t("Cómo funciona", "How it works")}
          </Link>
          <Link href={localized(locale, "/evaluator")} aria-current={path === "/evaluator" ? "page" : undefined} onClick={close}>
            {t("Modo evaluador", "Evaluator guide")}
          </Link>
        </nav>
        <div className="nav-actions">
          <Suspense fallback={<span className="nav-language" aria-hidden="true">{locale === "es" ? "EN" : "ES"}</span>}>
            <LanguageLink locale={locale} />
          </Suspense>
          <Link className="btn btn-purple nav-create" href={localized(locale, "/create")} onClick={close}>
            <CirclePlus size={16} /> {t("Crear torneo", "Create tournament")}
          </Link>
          <button id="mobile-menu-button" type="button" className="menu-toggle" aria-expanded={open} aria-controls="main-menu"
            aria-label={open ? t("Cerrar menú", "Close menu") : t("Abrir menú", "Open menu")}
            onClick={() => setOpen(!open)}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}
