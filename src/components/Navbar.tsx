import Link from "next/link";
import Image from "next/image";
export default function Navbar() {
  return (
    <header className="nav">
      <div className="wrap navbar">
        <Link href="/" className="brand">
          <Image
            width={38}
            height={38}
            src="/branding/isologo-transparente-sutika.png"
            alt=""
          />
          SUTIKA
        </Link>
        <nav aria-label="Principal">
          <Link href="/#torneos">Torneos</Link>
          <Link href="/evaluator">Evaluador</Link>
          <Link className="nav-action" href="/create">
            Crear torneo
          </Link>
        </nav>
      </div>
    </header>
  );
}
