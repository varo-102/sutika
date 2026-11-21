import { readSandboxWebhook } from "@/lib/v3/verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length > 50_000) return new Response(null, { status: 413 });
  try {
    const status = await readSandboxWebhook(body, request.headers);
    return new Response(null, { status });
  } catch (error) {
    return new Response(null, { status: error instanceof SyntaxError ? 400 : 503 });
  }
}
