export function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ArrowIcon({ className = "h-4 w-4", dir = "right" }: { className?: string; dir?: "right" | "down" | "left" | "up-right" }) {
  const rot = { right: 0, down: 90, left: 180, "up-right": -45 }[dir];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
