"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ReceiptStatus({ id }: { id: string }) {
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
        !r.ok
          ? data.error
          : ((
              {
                CONFIRMED: "Confirmada",
                EXPIRED: "Vencida",
                FAILED: "Fallida",
                PREPARED: "Esperando firma",
                PENDING: "Pendiente de confirmación",
              } as Record<string, string>
            )[data.status] ?? "Pendiente"),
      );
      router.refresh();
    } catch {
      setMessage("No se pudo consultar Stellar.");
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
        Consultar en Stellar
      </button>{" "}
      <span role="status">{message}</span>
    </>
  );
}
