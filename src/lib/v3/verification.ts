import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { database } from "../prisma";

const endpoint = "https://api.sumsub.com";
const level = () => process.env.SUMSUB_SANDBOX_LEVEL;
export const verificationEnabled = () => Boolean(
  process.env.SUMSUB_SANDBOX_APP_TOKEN &&
  process.env.SUMSUB_SANDBOX_SECRET_KEY &&
  process.env.SUMSUB_SANDBOX_WEBHOOK_SECRET && level(),
);

async function sumsub(path: string, method: "POST" | "GET", body?: object) {
  if (!verificationEnabled()) throw new Error("Falta habilitar la verificación en Sandbox.");
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const payload = body && JSON.stringify(body);
  const signature = createHmac("sha256", process.env.SUMSUB_SANDBOX_SECRET_KEY!)
    .update(timestamp + method + path + (payload ?? "")).digest("hex");
  const response = await fetch(endpoint + path, {
    method,
    body: payload,
    headers: {
      "content-type": "application/json",
      "x-app-token": process.env.SUMSUB_SANDBOX_APP_TOKEN!,
      "x-app-access-ts": timestamp,
      "x-app-access-sig": signature,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("El servicio de verificación de prueba no está disponible.");
  return response.json();
}

export async function sandboxLink(wallet: string) {
  const applicant = await database().sandboxVerification.upsert({
    where: { wallet },
    update: {},
    create: { wallet, subject: randomUUID() },
  });
  const reply = await sumsub("/resources/sdkIntegrations/levels/-/websdkLink?lang=es", "POST", {
    userId: applicant.subject,
    levelName: level(),
    ttlInSecs: 600,
  });
  if (typeof reply.url !== "string") throw new Error("No se recibió un enlace de verificación.");
  const url = new URL(reply.url);
  if (!["api.sumsub.com", "in.sumsub.com"].includes(url.hostname) || url.protocol !== "https:" ||
    url.port || url.username || url.password) {
    throw new Error("El servicio entregó un enlace de verificación desconocido.");
  }
  return url.toString();
}

export async function verificationStatus(wallet: string) {
  return (await database().sandboxVerification.findUnique({ where: { wallet } }))?.status ?? "PENDING";
}

export async function verifiedWallet(wallet: string) {
  const review = await database().sandboxVerification.findUnique({ where: { wallet } });
  if (!review?.applicant || review.status !== "APPROVED" || !review.reviewedAt) {
    throw new Error("La identidad de prueba de este ganador sigue pendiente.");
  }
  const response = await sumsub("/resources/applicants/" + encodeURIComponent(review.applicant) + "/status", "GET");
  if (response.reviewStatus !== "completed" || response.reviewResult?.reviewAnswer !== "GREEN" ||
    (response.levelName !== undefined && response.levelName !== level())) {
    throw new Error("La aprobación del proveedor cambió. Comprueba el estado de nuevo.");
  }
  const evidence = createHash("sha256").update(
    ["sumsub:sandbox", wallet, review.subject, review.reviewedAt.toISOString()].join(":"),
  ).digest("hex");
  return { evidence, expires: Math.floor(Date.now() / 1000) + 23 * 3600 };
}

function validSignature(body: Buffer, algo: string | null, digest: string | null) {
  const secret = process.env.SUMSUB_SANDBOX_WEBHOOK_SECRET;
  if (!secret || algo !== "HMAC_SHA256_HEX" || !digest || !/^[a-f0-9]{64}$/i.test(digest)) return false;
  return timingSafeEqual(Buffer.from(digest, "hex"), createHmac("sha256", secret).update(body).digest());
}

function reviewDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(value)) return null;
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now() + 90_000 ? date : null;
}

export async function readSandboxWebhook(body: Buffer, headers: Headers) {
  if (!validSignature(body, headers.get("x-payload-digest-alg"), headers.get("x-payload-digest"))) return 403;
  const event = JSON.parse(body.toString("utf8"));
  if (event.sandboxMode !== true || event.testMode || event.levelName !== level() ||
    event.applicantType !== "individual" || typeof event.externalUserId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(event.externalUserId) ||
    typeof event.applicantId !== "string" || !/^[a-f0-9]{24}$/.test(event.applicantId)) return 204;

  const date = reviewDate(event.createdAtMs);
  if (!date) return 400;
  const review = event.reviewResult?.reviewAnswer;
  let status = "PENDING";
  if (event.type === "applicantReviewed" && event.reviewStatus === "completed") {
    if (review === "GREEN") status = "APPROVED";
    if (review === "RED") status = "REJECTED";
  } else if (!["applicantPending", "applicantReset", "applicantOnHold"].includes(event.type)) {
    return 204;
  }
  await database().sandboxVerification.updateMany({
    where: {
      subject: event.externalUserId,
      AND: [
        { OR: [{ applicant: null }, { applicant: event.applicantId }] },
        { OR: [{ reviewedAt: null }, { reviewedAt: { lt: date } }] },
      ],
    },
    data: { applicant: event.applicantId, status, reviewedAt: date },
  });
  return 204;
}
