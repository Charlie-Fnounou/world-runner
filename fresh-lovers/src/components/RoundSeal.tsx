"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Logo } from "./Logo";

/** The round "Elaborado por…" sticker from the Fresh Lovers labels, turning with scroll. */
export function RoundSeal({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-60, 120]);
  const text =
    "Elaborado por Fresh Lovers S.A. · La Herradura, La Chorrera · Rep. de Panamá · ";
  return (
    <div ref={ref} className={`relative aspect-square ${className ?? ""}`}>
      <motion.svg style={{ rotate }} viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id="seal-circle" d="M100,100 m-84,0 a84,84 0 1,1 168,0 a84,84 0 1,1 -168,0" />
        </defs>
        <text style={{ fontFamily: "var(--font-sans)", fontSize: 9.6 }} fill="currentColor">
          <textPath href="#seal-circle" textLength="524" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </motion.svg>
      <div className="absolute inset-[24%] flex items-center justify-center">
        <Logo className="h-auto w-full" />
      </div>
    </div>
  );
}
