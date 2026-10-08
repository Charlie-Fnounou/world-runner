"use client";

import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { GAMES } from "@/lib/catalog";

export function SurpriseButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={`btn bg-coral text-ink ${className}`}
      onClick={() => router.push(`/play/${GAMES[Math.floor(Math.random() * GAMES.length)].slug}`)}
    >
      <Shuffle size={18} /> Surprise me
    </button>
  );
}
