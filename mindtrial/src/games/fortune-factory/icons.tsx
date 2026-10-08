import type { VentureId } from "./sim";

/** Small original pictograms for each venture (24×24 viewBox). */
export function VentureIcon({ id, color, size = 26 }: { id: VentureId; color: string; size?: number }) {
  const s = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {id === "bonds" && (
        <g {...s}>
          <path d="M3 9 L12 4 L21 9 Z" fill={color} fillOpacity="0.25" />
          <path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16" />
          <path d="M3 21c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0" opacity="0.7" />
        </g>
      )}
      {id === "bubble" && (
        <g {...s}>
          {[6, 12, 18].flatMap((x) => [7, 13, 19].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={(x + y) % 4 === 1 ? color : "none"} />))}
        </g>
      )}
      {id === "bakery" && (
        <g {...s}>
          <rect x="5" y="3" width="14" height="9" rx="3" />
          <circle cx="9.5" cy="7.5" r="1.2" fill={color} />
          <circle cx="14.5" cy="7.5" r="1.2" fill={color} />
          <path d="M12 3V1" />
          <path d="M3 19c2-5 5-6 9-6s7 1 9 6c-3 1-6 2-9 2s-6-1-9-2z" fill={color} fillOpacity="0.3" />
          <path d="M8 15.5l1.5 4M12 14.5v5.5M16 15.5l-1.5 4" />
        </g>
      )}
      {id === "haunted" && (
        <g {...s}>
          <path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z" fill={color} fillOpacity="0.25" />
          <circle cx="9.5" cy="11" r="1.3" fill={color} />
          <circle cx="14.5" cy="11" r="1.3" fill={color} />
          <path d="M10.5 15.5q1.5 1 3 0" />
        </g>
      )}
      {id === "cloud" && (
        <g {...s}>
          <path d="M6.5 17.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6-1.2 4.6 4.6 0 0 1 .8 9.2z" fill={color} fillOpacity="0.25" />
          <path d="M10 17.5v-4h4v4M12 11.5v2" />
        </g>
      )}
      {id === "cats" && (
        <g {...s}>
          <path d="M5 20v-9l-1-7 5 4h6l5-4-1 7v9z" fill={color} fillOpacity="0.25" />
          <path d="M9 13.5h.01M15 13.5h.01" strokeWidth="2.6" />
          <path d="M12 15.5v1.2M10.5 17.5q1.5 1 3 0M2 15h5M2 18l5-1.5M22 15h-5M22 18l-5-1.5" />
        </g>
      )}
      {id === "moon" && (
        <g {...s}>
          <path d="M15 3a9 9 0 1 0 6 13.5A7.5 7.5 0 0 1 15 3z" fill={color} fillOpacity="0.3" />
          <path d="M7 12h4v5H7z" />
          <path d="M6 12l3-2.5 3 2.5" />
          <circle cx="18" cy="7" r="0.8" fill={color} />
        </g>
      )}
      {id === "fusion" && (
        <g {...s}>
          <ellipse cx="12" cy="13" rx="8" ry="6.5" fill={color} fillOpacity="0.25" transform="rotate(-25 12 13)" />
          <circle cx="12" cy="13" r="2.2" fill={color} />
          <ellipse cx="12" cy="13" rx="6" ry="2" transform="rotate(35 12 13)" />
          <ellipse cx="12" cy="13" rx="6" ry="2" transform="rotate(-55 12 13)" />
          <path d="M16 4.5l2-2.5" />
        </g>
      )}
    </svg>
  );
}
