import { authorize, challenge, wallet, type ActionInput } from "@/lib/auth";
import { PublicError } from "@/lib/errors";
import { translate } from "@/lib/locale";
import { locate, operationKinds, state, winner, type V3Kind } from "@/lib/v3/actions";
import { prepare, settle } from "@/lib/v3/settlement";
import { sandboxLink, verificationEnabled, verificationStatus } from "@/lib/v3/verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const locale = request.headers.get("accept-language")?.split(",")[0]?.trim().toLowerCase().split(/[-;]/)[0] === "en" ? "en" : "es";
  const t = translate(locale);
  try {
    const origin = request.headers.get("origin");
    const originUrl = origin ? new URL(origin) : null;
    if (originUrl && (originUrl.host !== (request.headers.get("host") || new URL(request.url).host) ||
      (process.env.VERCEL && originUrl.protocol !== "https:"))) {
      return Response.json({ error: t("Origen inválido.", "Invalid request origin.") }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return Response.json({ error: t("Formato inválido.", "Invalid request format.") }, { status: 415 });
    }
    if (Number(request.headers.get("content-length")) > 80_000) {
      return Response.json({ error: t("La solicitud es demasiado grande.", "The request is too large.") }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > 80_000) return Response.json({ error: t("La solicitud es demasiado grande.", "The request is too large.") }, { status: 413 });
    const body = JSON.parse(raw);
    if (body?.step === "receipt" && typeof body.id === "string") {
      return Response.json(await settle(body.id, typeof body.xdr === "string" ? body.xdr : undefined));
    }
    const actor = wallet(body?.address);
    const action: ActionInput = body?.action;
    if (!action || typeof action !== "object" || Array.isArray(action) ||
      JSON.stringify(action).length > 2_500 || typeof action.kind !== "string" ||
      !(operationKinds.includes(action.kind as V3Kind) || ["verification-link", "verification-status"].includes(action.kind))) {
      return Response.json({ error: t("Acción desconocida.", "Unknown action.") }, { status: 400 });
    }

    // Distinguish the new signed intent from the previous tournament protocol.
    const scoped = { ...action, kind: "v3-" + action.kind };
    if (body.step === "challenge") return Response.json(await challenge(actor, scoped));
    if (body.step !== "execute") return Response.json({ error: t("Paso desconocido.", "Unknown step.") }, { status: 400 });
    await authorize(actor, scoped, body.id, body.signature);

    if (action.kind === "verification-link" || action.kind === "verification-status") {
      const row = await locate(actor, action);
      await winner(row, await state(row), actor);
      if (!verificationEnabled()) throw new PublicError("La verificación de prueba aún no está disponible.", "Test verification is not available yet.");
      return Response.json(action.kind === "verification-link" ?
        { url: await sandboxLink(actor, locale) } : { verification: await verificationStatus(actor) });
    }
    return Response.json(await prepare(actor, action, action.kind as V3Kind));
  } catch (error) {
    const message = error instanceof PublicError
      ? error.inLocale(locale)
      : t("La operación no se completó. Vuelve a intentarlo.", "The operation could not be completed. Try again.");
    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}
