import Image from "next/image";
import type { Product } from "@/data/catalog";
import { photos, type PhotoKey } from "@/data/photos";

/** Photo for a product/variant: variant photo → product photo → real label art (Griego only, no photo yet). */
export function photoFor(p: Product, variant = 0) {
  const v = p.variants[Math.min(variant, p.variants.length - 1)];
  const key = v?.photo ?? p.image;
  if (key) return { ...photos[key], kind: "photo" as const };
  if (v?.label) return { src: v.label, w: 316, h: 632, kind: "label" as const };
  return null;
}

type Props = {
  product: Product;
  variant?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** fill the parent box (parent must be positioned) */
  fill?: boolean;
  /** show this photo instead of the variant/product default */
  photo?: PhotoKey;
};

/** Every distinct photo for a variant: its own shot first, then the product's studio shot. */
export function shotsFor(p: Product, variant = 0): PhotoKey[] {
  const v = p.variants[Math.min(variant, p.variants.length - 1)];
  return [...new Set([v?.photo, p.image].filter((k): k is PhotoKey => !!k))];
}

export function ProductPhoto({ product: p, variant = 0, className = "", sizes = "(min-width: 768px) 33vw, 80vw", priority, fill, photo }: Props) {
  const ph = photo ? { ...photos[photo], kind: "photo" as const } : photoFor(p, variant);
  if (!ph) return null;
  const v = p.variants[Math.min(variant, p.variants.length - 1)];
  const alt = `${p.name}${p.variants.length > 1 ? ` ${v.name}` : ""} — Fresh Lovers`;
  // label art (Yogurt Griego) is shown whole on its colour; photos fill the frame
  const fit = ph.kind === "label" ? "object-contain p-[8%]" : "object-cover";
  return fill ? (
    <Image src={ph.src} alt={alt} fill sizes={sizes} priority={priority} className={`${fit} ${className}`} />
  ) : (
    <Image src={ph.src} alt={alt} width={ph.w} height={ph.h} sizes={sizes} priority={priority} className={`${fit} ${className}`} />
  );
}
