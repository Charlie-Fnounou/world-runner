"use client";

import { useMontado } from "@/hooks/useMontado";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const montado = useMontado();

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
