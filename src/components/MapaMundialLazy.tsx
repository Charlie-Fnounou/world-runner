"use client";

import dynamic from "next/dynamic";

// Leaflet necesita `window`, así que el mapa solo se carga en el navegador.
export const MapaMundialLazy = dynamic(
  () => import("./MapaMundial").then((m) => m.MapaMundial),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-2xl flex items-center justify-center wr-panel"
        style={{ height: 460, color: "var(--wr-mut)" }}
      >
        Cargando mapa…
      </div>
    ),
  },
);
