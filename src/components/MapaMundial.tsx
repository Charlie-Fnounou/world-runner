"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import type { Carrera } from "@/lib/types";
import { ESTADO_INFO } from "@/lib/types";
import { Badge } from "./Badge";
import { fmtFecha } from "@/lib/format";
import { slugify } from "@/lib/races-data";

export function MapaMundial({ carreras, alto = 460 }: { carreras: Carrera[]; alto?: number }) {
  return (
    <div className="rounded-2xl overflow-hidden wr-panel" style={{ height: alto }}>
      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={2}
        style={{ height: "100%", width: "100%", background: "var(--wr-bg)" }}
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {carreras.map((r) => {
          const info = ESTADO_INFO[r.status];
          return (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={7}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: info.color, fillOpacity: 0.95 }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div className="font-semibold text-sm">
                    {r.flag} {r.name}
                  </div>
                  <div className="text-xs mt-0.5 text-gray-500">
                    {fmtFecha(r.date)} · {r.dist}
                  </div>
                  <div className="mt-1.5 mb-2">
                    <Badge estado={r.status} sm />
                  </div>
                  <Link
                    href={`/carreras/${slugify(r.id, r.name)}`}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Ver carrera →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
