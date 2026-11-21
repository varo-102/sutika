import Link from "next/link";
import { ArrowRight, CirclePlus, Coins, Crown, Gamepad2, Send, Wallet } from "lucide-react";
import { communityLinks } from "@/lib/communityLinks";
import { localized, translate } from "@/lib/locale";
import { FEES, PROTOCOL_FEE, type FundingMode } from "@/lib/v3/rules";
import { modeName } from "@/lib/v3/presentation";

export async function generateMetadata({ params }: PageProps<"/[lang]/guia">) {
  return { title: (await params).lang === "en" ? "How it works" : "Cómo funciona" };
}

export default async function Guide({ params }: PageProps<"/[lang]/guia">) {
  const locale = (await params).lang === "en" ? "en" : "es";
  const t = translate(locale);
  const href = (path: string) => localized(locale, path);
  const rate = (bps: bigint) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(bps) / 100) + " %";
  const roles = [
    {
      id: "jugar", icon: Gamepad2, title: t("Quiero jugar", "I want to play"), path: "/#torneos", action: t("Ver torneos de prueba", "View test tournaments"),
      steps: [
        t("Abre tu invitación. Revisa la fecha y si participar es gratis o cuesta una cuota.", "Open your invitation. Check the date and whether entry is free or has a fee."),
        t("Entra con tu cuenta de prueba y firma la inscripción. En 5v5, el capitán paga la cuota del equipo si aplica y comparte el enlace con los otros cuatro titulares.", "Sign in with your test account and sign the entry. In 5v5, the captain pays any team fee and shares the team link with the other four players."),
        t("Si el torneo se cancela, quien pagó puede solicitar la devolución completa de su cuota.", "If the tournament is canceled, the payer can claim a full entry fee refund."),
      ],
    },
    {
      id: "organizar", icon: CirclePlus, title: t("Quiero organizar", "I want to organize"), path: "/create", action: t("Crear torneo de prueba", "Create a test tournament"),
      steps: [
        t("Elige Clash Royale 1v1 o Mobile Legends 5v5. Indica los cupos, el cierre y la cuenta de un árbitro independiente.", "Choose Clash Royale 1v1 or Mobile Legends 5v5. Set the entry limits and deadline and enter an independent referee’s account."),
        t("Configura quién aporta al premio y cuántos puestos reciben una parte. Revisa los importes, firma y comparte el enlace.", "Choose who funds the prize and how many places receive a share. Review the amounts, sign, and share the link."),
        t("Cierra las inscripciones y publica el resultado con un enlace a la evidencia. La aprobación del resultado y el pago tienen comprobantes separados.", "Close registration and publish the result with a link to the evidence. Result approval and payment have separate receipts."),
      ],
    },
    {
      id: "patrocinar", icon: Coins, title: t("Quiero patrocinar", "I want to sponsor"), path: "/evaluator#v3", action: t("Ver un depósito confirmado", "See a confirmed deposit"),
      steps: [
        t("Pide al organizador que indique tu dirección pública como patrocinador al crear la copa. Abre su enlace con esa cuenta.", "Ask the organizer to use your public address as sponsor when creating the tournament. Open the link with that account."),
        t("Revisa el depósito total, las comisiones y el premio neto. Abre la reserva y firma el depósito en USDC de prueba. La ficha registra el aporte cuando Stellar lo confirma.", "Review the total deposit, fees, and net prize. Open the escrow and sign the test USDC deposit. The page records your contribution once Stellar confirms it."),
        t("Aprueba el resultado publicado. El premio sigue reservado mientras corra la ventana de 24 horas o haya una impugnación.", "Approve the published result. The prize stays reserved during the 24-hour review window or while a dispute is open."),
      ],
    },
    {
      id: "premio", icon: Crown, title: t("Gané el torneo", "I won a prize"), path: "/evaluator#mobile-legends", action: t("Ver el reparto 5v5", "See the 5v5 split"),
      steps: [
        t("Abre la ficha con la cuenta que usaste al inscribirte. Allí puedes ver el importe y cuándo termina el plazo para impugnar.", "Open the tournament with the account you used to enter. The page shows the amount and when the review window ends."),
        t("Cuando el resultado esté aprobado y el plazo haya vencido, completa la verificación de prueba. El árbitro registra la aprobación y tú confirmas el cobro.", "Once the result is approved and the review window has passed, complete test verification. The referee records approval, and you confirm your claim."),
        t("En Mobile Legends, cada titular confirma su parte. El contrato reparte el premio cuando los cinco están listos y Stellar confirma la transacción.", "In Mobile Legends, each player confirms their share. The contract splits the prize once all five are ready and Stellar confirms the transaction."),
      ],
    },
  ];

  return (
    <div className="eval-shell user-guide">
      <header className="eval-banner">
        <h1>{t("Cómo funciona SUTIKA", "How SUTIKA works")}</h1>
        <p>{t("Elige qué quieres hacer. Puedes consultar la demo sin cuenta y todos sus fondos son de prueba.", "Choose what you want to do. You can view the demo without an account, and all funds are for testing.")}</p>
        <div className="buttons">
          {roles.map((role) => <a key={role.id} className="btn btn-outline" href={"#" + role.id}>{role.title}</a>)}
        </div>
      </header>
      <div className="guide-roles">
        {roles.map(({ id, icon: Icon, title, steps, path, action }) => (
          <section className="guide-role" id={id} key={id}>
            <h2><Icon size={23} aria-hidden="true" />{title}</h2>
            <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <Link className="inline-link" href={href(path)}>{action} <ArrowRight size={17} /></Link>
          </section>
        ))}
      </div>
      <section className="panel guide-fees" id="comisiones">
        <h2>{t("Quién paga y cuánto", "Who pays and how much")}</h2>
        <p>{t("Crear en SUTIKA es gratis. Estas son las comisiones propuestas sobre el premio. La red cobra su propia tarifa en XLM de prueba.", "Creating a tournament on SUTIKA is free. These are the proposed prize fees. The network charges its own fee in test XLM.")}</p>
        <dl className="v3-money">
          {(Object.keys(FEES) as FundingMode[]).map((mode) => (
            <div key={mode}><dt>{modeName(mode, locale)}</dt><dd><strong>{rate(FEES[mode] + PROTOCOL_FEE)}</strong> <small>{rate(FEES[mode])} SUTIKA + {rate(PROTOCOL_FEE)} {t("protocolo", "protocol")}</small></dd></div>
          ))}
        </dl>
      </section>
      <section className="panel guide-role" id="cuenta">
        <h2><Wallet size={23} aria-hidden="true" />{t("Preparar mi cuenta de prueba", "Set up my test account")}</h2>
        <p>{t("Usa Entrar con correo si el entorno tiene Pollar habilitado. Introduce el código que te llega y activa tu cuenta cuando se te pida. Revisa cualquier operación antes de confirmarla.", "Use email sign-in when Pollar is enabled. Enter the code you receive and activate your account if asked. Review each action before confirming it.")}</p>
        <p>{t("Si ya tienes la extensión Varial (Freighter), selecciónala como billetera externa y cambia a Testnet. Friendbot entrega XLM de prueba para las tarifas. Si vas a aportar al premio, habilita el USDC de Circle para Stellar Testnet y solicita saldo de prueba.", "If you have the Varial (Freighter) extension, choose it as your external wallet and switch to Testnet. Friendbot supplies test XLM for fees. If you will contribute to a prize, enable Circle USDC for Stellar Testnet and request a test balance.")}</p>
        <div className="buttons">
          <a className="btn btn-outline" href="https://developers.stellar.org/docs/build/guides/transactions/create-account" target="_blank" rel="noreferrer">{t("Preparar una cuenta Stellar", "Set up a Stellar account")}</a>
          <a className="btn btn-outline" href="https://faucet.circle.com/" target="_blank" rel="noreferrer">{t("Obtener USDC de prueba", "Get test USDC")}</a>
          <a className="inline-link" href={communityLinks.telegram} target="_blank" rel="noopener noreferrer"><Send size={16} />{t("Soporte en Telegram", "Support on Telegram")}</a>
        </div>
      </section>
    </div>
  );
}
