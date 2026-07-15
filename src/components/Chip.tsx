"use client";

export function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors"
      style={{
        background: active ? "var(--wr-acc)" : "var(--wr-chip)",
        color: active ? "var(--wr-acc-ink)" : "var(--wr-mut)",
        border: `1px solid ${active ? "var(--wr-acc)" : "var(--wr-line)"}`,
      }}
    >
      {label}
    </button>
  );
}
