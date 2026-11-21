"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { translate, type Locale } from "@/lib/locale";

export default function CopyValue({
  value,
  label,
  locale = "es",
}: {
  value: string;
  label: string;
  locale?: Locale;
}) {
  const t = translate(locale);
  const [notice, setNotice] = useState<"copied" | "select" | "">(""),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("copied");
    } catch {
      setNotice("select");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 2300);
  }
  return (
    <div className="copy-value">
      <code>{value}</code>
      <button
        className="copy-btn"
        type="button"
        aria-label={t("Copiar ", "Copy ") + label}
        title={t("Copiar ", "Copy ") + label}
        onClick={copy}
      >
        {notice === "copied" ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <span className="copy-notice" role="status">
        {notice === "copied" ? t("Copiado", "Copied") : notice === "select" ? t("Selecciona el valor para copiarlo", "Select the value to copy it") : ""}
      </span>
    </div>
  );
}
