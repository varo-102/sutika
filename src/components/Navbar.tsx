"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Award, BookOpen, CirclePlus, Menu, X } from "lucide-react";

export default function Navbar() {
  const path = usePathname(),
    [open, setOpen] = useState(false);
  const dismiss = () => setOpen(false);
  return (
    <header
      className="nav"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          dismiss();
          document.getElementById("mobile-menu-button")?.focus();
        }
      }}
    >
      <div className="wrap navbar">
        <Link
          href="/"
          className="brand"
          aria-label="SUTIKA, inicio"
          onClick={dismiss}
        >
          <span className="brand-icon">
            <Image
              width={35}
              height={35}
              src="/branding/isologo-transparente-sutika.png"
              alt=""
            />
          </span>
          <span className="brand-name">SUTIKA</span>
          <span className="brand-network">Soroban Testnet</span>
        </Link>
        <nav
          className={"main-nav" + (open ? " nav-open" : "")}
          aria-label="Principal"
          id="main-menu"
        >
          <Link href="/#torneos" onClick={dismiss}>
            Torneos
          </Link>
          <Link
            className="evaluator-link"
            href="/evaluator"
            aria-current={path === "/evaluator" ? "page" : undefined}
            onClick={dismiss}
          >
            <Award size={16} />
            Modo evaluador
          </Link>
          <Link
            href="/guia"
            aria-current={path === "/guia" ? "page" : undefined}
            onClick={dismiss}
          >
            <BookOpen size={16} /> Cómo funciona
          </Link>
        </nav>
        <div className="nav-actions">
          <Link
            className="btn btn-purple nav-create"
            href="/create"
            onClick={dismiss}
          >
            <CirclePlus size={16} />
            Nuevo torneo
          </Link>
          <span className="nav-testnet">
            <i aria-hidden="true" />
            Stellar Testnet
          </span>
          <button
            id="mobile-menu-button"
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="main-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}
