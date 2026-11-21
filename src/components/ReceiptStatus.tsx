"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { translate, type Locale } from "@/lib/locale";

export default function ReceiptStatus({ id, locale = "es" }: { id: string; locale?: Locale }) {
  const t = translate(locale);
  const labels: Record<string, string> = {
    CONFIRMED: t("Confirmada", "Confirmed"),
    EXPIRED: t("Vencida", "Expired"),
    FAILED: t("Fallida", "Failed"),
    PREPARED: t("Esperando firma", "Awaiting signature"),
    PENDING: t("Pendiente de confirmación", "Awaiting confirmation"),
  };
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function check() {
    setBusy(true);
    try {
      const r = await fetch("/api/competition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "receipt", id }),
      });
      const data = await r.json();
      setMessage(
        r.ok
          ? labels[data.status] ?? t("Pendiente", "Pending")
          : t("No se pudo consultar Stellar.", "Stellar could not be reached."),
      );
      router.refresh();
    } catch {
      setMessage(t("No se pudo consultar Stellar.", "Stellar could not be reached."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={check}
      >
        {t("Consultar en Stellar", "Check on Stellar")}
      </button>{" "}
      <span role="status">{message}</span>
    </>
  );
}
