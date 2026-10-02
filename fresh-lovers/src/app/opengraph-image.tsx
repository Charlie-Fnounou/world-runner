import { ImageResponse } from "next/og";

export const alt = "Fresh Lovers Panamá — calidad y sabor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4efe6", position: "relative", fontFamily: "serif" }}>
        <div style={{ position: "absolute", right: -80, top: 60, width: 620, height: 620, borderRadius: 999, background: "#C3D2E1" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: "100%", color: "#141210" }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 8, textTransform: "uppercase" }}>— calidad y sabor —</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 168, lineHeight: 0.86, letterSpacing: -4 }}>
            <span>Fresh</span>
            <span style={{ fontStyle: "italic", paddingLeft: 140 }}>lovers</span>
          </div>
          <div style={{ display: "flex", fontSize: 30 }}>Yogurt griego · Labne · Quesos · Arepas · Café — Panamá</div>
        </div>
      </div>
    ),
    size,
  );
}
