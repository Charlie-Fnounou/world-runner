import Link from "next/link";

export default function NotFound() {
  return (
    <div className="gutter flex min-h-[80svh] flex-col items-start justify-center pt-24">
      <p className="kicker text-ink/55">404</p>
      <h1 className="font-display mt-4 text-[18vw] leading-[0.85] md:text-[10vw]">
        No está <em>en el estante.</em>
      </h1>
      <Link href="/productos" className="mt-10 rounded-full bg-ink px-7 py-4 text-paper">
        Ver productos
      </Link>
    </div>
  );
}
