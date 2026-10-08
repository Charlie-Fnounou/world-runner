/** Relative luminance check for picking readable text on a hex background. */
export function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

/** Black or white, whichever reads better on `hex`. */
export const readableOn = (hex: string) => (isLight(hex) ? "#141210" : "#ffffff");
