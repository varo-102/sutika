import { NextResponse } from "next/server";
import {
  authorize,
  challenge,
  shortText,
  wallet,
  type ActionInput,
} from "@/lib/auth";
import { createTournament, join } from "@/lib/tournamentsService";
import { prepare, settle } from "@/lib/ledger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const originHeader = request.headers.get("origin");
    if (originHeader) {
      const origin = new URL(originHeader);
      const host = request.headers.get("host") || new URL(request.url).host;
      if (
        origin.host !== host ||
        !["https:", "http:"].includes(origin.protocol) ||
        (process.env.VERCEL && origin.protocol !== "https:")
      ) {
        return NextResponse.json(
          { error: "Origen inválido." },
          { status: 403 },
        );
      }
    }
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
    const raw = await request.text();
    if (raw.length > 100_000)
      return NextResponse.json(
        { error: "Solicitud demasiado grande." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    if (body.step === "receipt") {
      const xdr =
        body.xdr === undefined ? undefined : shortText(body.xdr, 85_000);
      return NextResponse.json(await settle(shortText(body.id, 64), xdr));
    }
    const address = wallet(body.address),
      action: ActionInput = body.action;
    if (
      !action ||
      typeof action !== "object" ||
      Array.isArray(action) ||
      JSON.stringify(action).length > 4000
    )
      throw new Error("Solicitud inválida.");
    if (body.step === "challenge")
      return NextResponse.json(await challenge(address, action));
    if (body.step !== "execute") throw new Error("Paso inválido.");
    await authorize(address, action, body.id, body.signature);
    if (action.kind === "create")
      return NextResponse.json(await createTournament(address, action));
    if (action.kind === "join")
      return NextResponse.json(await join(address, action));
    return NextResponse.json(await prepare(address, action));
  } catch (error) {
    // Provider and ORM exceptions may carry connection data. Only publish our own short Spanish validation messages.
    const msg = error instanceof Error ? error.message : "";
    const safe =
      /^(?:Esta |Este |Las |Los |El |La |Se |Solo |Revisa |Juego |Acción |Torneo |Equipo |Falta |Primero |Stellar |Trustless Work |Completa |Organizador|Selecciona |Elige |Ya |Otra |Puesto |Usa |Hay |Solicitud |Paso |Plantilla )/.test(
        msg,
      ) &&
      msg.length < 190 &&
      !/https?:|postgres|npg_|stack|Prisma/i.test(msg);
    return NextResponse.json(
      {
        error: safe
          ? msg
          : "No se pudo completar la operación. Tus fondos y comprobantes se verifican en Stellar.",
      },
      { status: 400 },
    );
  }
}
