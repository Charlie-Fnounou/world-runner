/** MINDTRIAL wordmark: heavy grotesk "MIND" + italic serif "trial" with a pupil dot. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline leading-none ${className}`} aria-label="MINDTRIAL">
      <span className="font-display font-black tracking-[-0.04em]">MIND</span>
      <span className="font-serif italic tracking-[-0.02em]">trial</span>
      <span className="ml-[0.06em] inline-block h-[0.22em] w-[0.22em] translate-y-[-0.05em] rounded-full bg-coral" aria-hidden />
    </span>
  );
}
