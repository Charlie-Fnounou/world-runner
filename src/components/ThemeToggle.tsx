"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) return <div className="w-9 h-9" />;

  const esOscuro = theme === "dark";
  return (
    <button
      onClick={() => setTheme(esOscuro ? "light" : "dark")}
      aria-label="Cambiar tema"
      className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors"
      style={{ borderColor: "var(--wr-line)", color: "var(--wr-ink)" }}
    >
      {esOscuro ? "☀️" : "🌙"}
    </button>
  );
}
