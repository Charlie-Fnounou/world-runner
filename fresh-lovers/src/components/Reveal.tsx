"use client";

import { motion } from "motion/react";

/** Fade-and-rise on first view. Purely presentational; content is in the DOM from the start. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 28,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: "div" | "li" | "p" | "span";
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </M>
  );
}

/** Line mask reveal for display type. */
export function MaskLine({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <span className={`block overflow-hidden pb-[0.08em] ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        whileInView={{ y: "0%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
