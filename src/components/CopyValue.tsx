"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyValue({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [notice, setNotice] = useState(""),
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
      setNotice("Copiado");
    } catch {
      setNotice("Selecciona el valor para copiarlo");
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
        aria-label={"Copiar " + label}
        title={"Copiar " + label}
        onClick={copy}
      >
        {notice === "Copiado" ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <span className="copy-notice" role="status">
        {notice}
      </span>
    </div>
  );
}
