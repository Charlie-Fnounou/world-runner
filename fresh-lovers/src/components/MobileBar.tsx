"use client";

import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

/** Thumb-zone actions for phones (most traffic arrives from Instagram). */
export function MobileBar() {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setShow(y > 280));

  return (
    <motion.div
      initial={false}
      animate={{ y: show ? 0 : 120, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-3 bottom-3 z-30 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex gap-2 rounded-full bg-ink/95 p-1.5 text-paper shadow-[0_10px_40px_-10px_rgba(0,0,0,.5)] backdrop-blur">
        <Link href="/productos" className="flex h-12 flex-1 items-center justify-center rounded-full text-[0.95rem]">
          Productos
        </Link>
        <Link
          href="/#donde-comprar"
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-paper text-[0.95rem] text-ink"
        >
          Dónde comprar
        </Link>
      </div>
    </motion.div>
  );
}
