import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CirclePlus,
  Crown,
  ExternalLink,
  Gamepad2,
  Wallet,
} from "lucide-react";

export const metadata = { title: "Cómo funciona" };

const roles = [
  {
    id: "organizar",
    icon: CirclePlus,
    title: "Quiero organizar",
    steps: [
      "Ingresa el nombre del torneo y elige Clash Royale 1v1 o Mobile Legends 5v5.",
      "Revisa el premio, conecta tu cuenta de prueba y escribe la dirección pública del patrocinador.",
      "Firma la creación y registra el torneo en Stellar. Copia el enlace para invitar a los jugadores.",
    ],
    action: "Preparar un torneo",
    href: "/create",
  },
  {
    id: "jugar",
    icon: Gamepad2,
    title: "Quiero jugar",
    steps: [
      "Abre tu invitación y revisa el juego y el estado del premio. La inscripción es gratuita.",
      "En la ficha del torneo, elige Inscribirme y conecta tu cuenta de prueba.",
      "Para Clash Royale escribe tu nombre en el juego. Para Mobile Legends elige un equipo o crea el tuyo. Confirma tu inscripción.",
    ],
    action: "Ver torneos de prueba",
    href: "/#torneos",
  },
  {
    id: "premio",
    icon: Crown,
    title: "Gané el torneo",
    steps: [
      "Abre la ficha con la cuenta que usaste para inscribirte. Revisa el resultado y la confirmación del patrocinador.",
      "Espera 24 horas desde que se publica el resultado. Si hay una revisión abierta, espera la decisión del árbitro.",
      "Cuando aparezca Cobrar el premio, confirma con tu cuenta. En 5v5 basta una solicitud para repartir entre los cinco titulares.",
    ],
    action: "Ver un historial de ejemplo",
    href: "/tournaments/demo-mobile-legends#historial",
  },
];

export default function Guide() {
  return (
    <div className="eval-shell user-guide">
      <header className="eval-banner">
        <div className="eval-title">
          <span className="icon-tile gold">
            <BookOpen />
          </span>
          <h1>Cómo funciona SUTIKA</h1>
        </div>
        <p>
          Prepara tu torneo, participa gratis o consulta un premio desde su
          ficha. La demo usa Stellar Testnet y muestra movimientos de prueba.
        </p>
        <nav className="buttons" aria-label="Accesos de la guía">
          {roles.map(({ id, icon: Icon, title }) => (
            <a className="btn btn-outline" key={id} href={"#" + id}>
              <Icon /> {title}
            </a>
          ))}
        </nav>
      </header>

      <div className="guide-roles">
        {roles.map(({ id, icon: Icon, title, steps, action, href }) => (
          <section
            key={id}
            id={id}
            className="guide-role"
            aria-labelledby={id + "-title"}
          >
            <h2 id={id + "-title"}>
              <Icon aria-hidden="true" /> {title}
            </h2>
            <ol>
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link href={href} className="inline-link">
              {action} <ArrowRight />
            </Link>
          </section>
        ))}
      </div>

      <section
        className="eval-block"
        id="cuenta"
        aria-labelledby="cuenta-title"
      >
        <div className="block-heading">
          <span className="accent-icon violet">
            <Wallet />
          </span>
          <h2 id="cuenta-title">Cómo preparo mi cuenta de prueba</h2>
        </div>
        <p>
          Puedes usar Freighter en una computadora. Instala la extensión desde
          su sitio, selecciona Testnet y conecta tu cuenta desde la ficha. Para
          firmar en Stellar necesitas una cuenta de prueba activa. Para recibir
          USDC, habilita el activo de prueba en tu billetera.
        </p>
        <p>
          Si aparece «Entrar con correo», Pollar te envía un código de acceso de
          un solo uso.
        </p>
        <div className="buttons">
          <a
            className="btn btn-outline"
            href="https://www.freighter.app/"
            target="_blank"
            rel="noreferrer"
          >
            Obtener Freighter <ExternalLink />
          </a>
          <a
            className="btn btn-dark"
            href="https://developers.stellar.org/docs/networks#testnet"
            target="_blank"
            rel="noreferrer"
          >
            Stellar Testnet <ExternalLink />
          </a>
        </div>
      </section>
    </div>
  );
}
