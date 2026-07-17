import type { Continente } from "@prisma/client";

// Mapea código ISO 3166-1 alpha-2 -> nombre en español + continente.
// No es exhaustivo, pero cubre los países donde de verdad aparecen
// carreras en las fuentes que usamos (RunSignup, curación manual).
// Si aparece un código nuevo que no está acá, se guarda igual (con el
// código como nombre) en vez de asumir "Estados Unidos" por defecto.
const PAISES: Record<string, { nombre: string; continente: Continente }> = {
  US: { nombre: "Estados Unidos", continente: "AMERICA_DEL_NORTE" },
  CA: { nombre: "Canadá", continente: "AMERICA_DEL_NORTE" },
  MX: { nombre: "México", continente: "AMERICA_DEL_NORTE" },
  PR: { nombre: "Puerto Rico", continente: "AMERICA_DEL_NORTE" },
  PA: { nombre: "Panamá", continente: "AMERICA_CENTRAL" },
  CR: { nombre: "Costa Rica", continente: "AMERICA_CENTRAL" },
  GT: { nombre: "Guatemala", continente: "AMERICA_CENTRAL" },
  HN: { nombre: "Honduras", continente: "AMERICA_CENTRAL" },
  NI: { nombre: "Nicaragua", continente: "AMERICA_CENTRAL" },
  SV: { nombre: "El Salvador", continente: "AMERICA_CENTRAL" },
  BZ: { nombre: "Belice", continente: "AMERICA_CENTRAL" },
  DO: { nombre: "República Dominicana", continente: "AMERICA_CENTRAL" },
  JM: { nombre: "Jamaica", continente: "AMERICA_CENTRAL" },
  TT: { nombre: "Trinidad y Tobago", continente: "AMERICA_CENTRAL" },
  BS: { nombre: "Bahamas", continente: "AMERICA_CENTRAL" },
  CO: { nombre: "Colombia", continente: "AMERICA_DEL_SUR" },
  AR: { nombre: "Argentina", continente: "AMERICA_DEL_SUR" },
  CL: { nombre: "Chile", continente: "AMERICA_DEL_SUR" },
  PE: { nombre: "Perú", continente: "AMERICA_DEL_SUR" },
  EC: { nombre: "Ecuador", continente: "AMERICA_DEL_SUR" },
  BO: { nombre: "Bolivia", continente: "AMERICA_DEL_SUR" },
  PY: { nombre: "Paraguay", continente: "AMERICA_DEL_SUR" },
  UY: { nombre: "Uruguay", continente: "AMERICA_DEL_SUR" },
  VE: { nombre: "Venezuela", continente: "AMERICA_DEL_SUR" },
  BR: { nombre: "Brasil", continente: "AMERICA_DEL_SUR" },
  GB: { nombre: "Reino Unido", continente: "EUROPA" },
  IE: { nombre: "Irlanda", continente: "EUROPA" },
  DE: { nombre: "Alemania", continente: "EUROPA" },
  FR: { nombre: "Francia", continente: "EUROPA" },
  ES: { nombre: "España", continente: "EUROPA" },
  IT: { nombre: "Italia", continente: "EUROPA" },
  PT: { nombre: "Portugal", continente: "EUROPA" },
  NL: { nombre: "Países Bajos", continente: "EUROPA" },
  BE: { nombre: "Bélgica", continente: "EUROPA" },
  CH: { nombre: "Suiza", continente: "EUROPA" },
  AT: { nombre: "Austria", continente: "EUROPA" },
  SE: { nombre: "Suecia", continente: "EUROPA" },
  NO: { nombre: "Noruega", continente: "EUROPA" },
  DK: { nombre: "Dinamarca", continente: "EUROPA" },
  FI: { nombre: "Finlandia", continente: "EUROPA" },
  PL: { nombre: "Polonia", continente: "EUROPA" },
  GR: { nombre: "Grecia", continente: "EUROPA" },
  CZ: { nombre: "Chequia", continente: "EUROPA" },
  IS: { nombre: "Islandia", continente: "EUROPA" },
  TR: { nombre: "Turquía", continente: "EUROPA" },
  RU: { nombre: "Rusia", continente: "EUROPA" },
  UA: { nombre: "Ucrania", continente: "EUROPA" },
  HR: { nombre: "Croacia", continente: "EUROPA" },
  RS: { nombre: "Serbia", continente: "EUROPA" },
  SI: { nombre: "Eslovenia", continente: "EUROPA" },
  LV: { nombre: "Letonia", continente: "EUROPA" },
  EE: { nombre: "Estonia", continente: "EUROPA" },
  BG: { nombre: "Bulgaria", continente: "EUROPA" },
  AU: { nombre: "Australia", continente: "OCEANIA" },
  NZ: { nombre: "Nueva Zelanda", continente: "OCEANIA" },
  JP: { nombre: "Japón", continente: "ASIA" },
  CN: { nombre: "China", continente: "ASIA" },
  MN: { nombre: "Mongolia", continente: "ASIA" },
  HK: { nombre: "Hong Kong", continente: "ASIA" },
  SG: { nombre: "Singapur", continente: "ASIA" },
  PH: { nombre: "Filipinas", continente: "ASIA" },
  ID: { nombre: "Indonesia", continente: "ASIA" },
  TH: { nombre: "Tailandia", continente: "ASIA" },
  VN: { nombre: "Vietnam", continente: "ASIA" },
  AE: { nombre: "Emiratos Árabes", continente: "ASIA" },
  IN: { nombre: "India", continente: "ASIA" },
  KR: { nombre: "Corea del Sur", continente: "ASIA" },
  ZA: { nombre: "Sudáfrica", continente: "AFRICA" },
  MA: { nombre: "Marruecos", continente: "AFRICA" },
  TZ: { nombre: "Tanzania", continente: "AFRICA" },
  KE: { nombre: "Kenia", continente: "AFRICA" },
  EG: { nombre: "Egipto", continente: "AFRICA" },
  NG: { nombre: "Nigeria", continente: "AFRICA" },
  ET: { nombre: "Etiopía", continente: "AFRICA" },
  GH: { nombre: "Ghana", continente: "AFRICA" },
  UG: { nombre: "Uganda", continente: "AFRICA" },
  TN: { nombre: "Túnez", continente: "AFRICA" },
  DZ: { nombre: "Argelia", continente: "AFRICA" },
  RW: { nombre: "Ruanda", continente: "AFRICA" },
};

// Convierte un código ISO 3166-1 alpha-2 (ej. "IT") en el emoji de
// bandera correspondiente, combinando los dos "regional indicator
// symbols" de Unicode — no hace falta una lista de emojis a mano.
export function banderaDesdeCodigoIso(codigo: string | undefined | null): string | undefined {
  if (!codigo || codigo.length !== 2) return undefined;
  const puntos = [...codigo.toUpperCase()].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  if (puntos.some((p) => p < 0x1f1e6 || p > 0x1f1ff)) return undefined;
  return String.fromCodePoint(...puntos);
}

// Coordenadas aproximadas (capital, o centro geográfico en países muy
// grandes) para usar como respaldo cuando una fuente no trae lat/lng
// de la carrera puntual — sin esto, esas carreras quedaban todas
// amontonadas en (0,0), en medio del océano, en vez de aparecer en su
// país en el mapa. No es la ubicación exacta de la carrera, pero es
// muchísimo mejor que "Null Island".
const CENTROIDE_POR_PAIS: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 24.4539, lng: 54.3773 },
  AR: { lat: -34.6037, lng: -58.3816 },
  AT: { lat: 48.2082, lng: 16.3738 },
  AU: { lat: -25.2744, lng: 133.7751 },
  BD: { lat: 23.8103, lng: 90.4125 },
  BE: { lat: 50.8503, lng: 4.3517 },
  BG: { lat: 42.6977, lng: 23.3219 },
  BO: { lat: -16.5, lng: -68.15 },
  BR: { lat: -14.235, lng: -51.9253 },
  CA: { lat: 56.1304, lng: -106.3468 },
  CH: { lat: 46.948, lng: 7.4474 },
  CL: { lat: -33.4489, lng: -70.6693 },
  CN: { lat: 35.8617, lng: 104.1954 },
  CO: { lat: 4.711, lng: -74.0721 },
  CR: { lat: 9.9281, lng: -84.0907 },
  CZ: { lat: 50.0755, lng: 14.4378 },
  DE: { lat: 52.52, lng: 13.405 },
  DK: { lat: 55.6761, lng: 12.5683 },
  DO: { lat: 18.4861, lng: -69.9312 },
  DZ: { lat: 36.7538, lng: 3.0588 },
  EC: { lat: -0.1807, lng: -78.4678 },
  EE: { lat: 59.437, lng: 24.7536 },
  EG: { lat: 30.0444, lng: 31.2357 },
  ES: { lat: 40.4168, lng: -3.7038 },
  ET: { lat: 9.03, lng: 38.74 },
  FI: { lat: 60.1699, lng: 24.9384 },
  FR: { lat: 48.8566, lng: 2.3522 },
  GB: { lat: 51.5074, lng: -0.1278 },
  GH: { lat: 5.6037, lng: -0.187 },
  GT: { lat: 14.6349, lng: -90.5069 },
  HR: { lat: 45.815, lng: 15.9819 },
  HU: { lat: 47.4979, lng: 19.0402 },
  ID: { lat: -6.2088, lng: 106.8456 },
  IE: { lat: 53.3498, lng: -6.2603 },
  IL: { lat: 31.7683, lng: 35.2137 },
  IN: { lat: 22.3511, lng: 78.6677 },
  IS: { lat: 64.1466, lng: -21.9426 },
  IT: { lat: 41.9028, lng: 12.4964 },
  JM: { lat: 17.9712, lng: -76.7936 },
  JP: { lat: 35.6762, lng: 139.6503 },
  KE: { lat: -1.2921, lng: 36.8219 },
  KR: { lat: 37.5665, lng: 126.978 },
  LK: { lat: 6.9271, lng: 79.8612 },
  LV: { lat: 56.9496, lng: 24.1052 },
  MA: { lat: 34.0209, lng: -6.8416 },
  MN: { lat: 47.8864, lng: 106.9057 },
  MX: { lat: 19.4326, lng: -99.1332 },
  MY: { lat: 3.139, lng: 101.6869 },
  NG: { lat: 9.0765, lng: 7.3986 },
  NL: { lat: 52.3676, lng: 4.9041 },
  NO: { lat: 59.9139, lng: 10.7522 },
  NP: { lat: 27.7172, lng: 85.324 },
  NZ: { lat: -41.2865, lng: 174.7762 },
  PA: { lat: 8.9824, lng: -79.5199 },
  PE: { lat: -12.0464, lng: -77.0428 },
  PH: { lat: 14.5995, lng: 120.9842 },
  PL: { lat: 52.2297, lng: 21.0122 },
  PT: { lat: 38.7223, lng: -9.1393 },
  PY: { lat: -25.2637, lng: -57.5759 },
  RO: { lat: 44.4268, lng: 26.1025 },
  RS: { lat: 44.7866, lng: 20.4489 },
  RW: { lat: -1.9403, lng: 30.0619 },
  SE: { lat: 59.3293, lng: 18.0686 },
  SG: { lat: 1.3521, lng: 103.8198 },
  SI: { lat: 46.0569, lng: 14.5058 },
  TH: { lat: 13.7563, lng: 100.5018 },
  TN: { lat: 36.8065, lng: 10.1815 },
  TR: { lat: 39.9334, lng: 32.8597 },
  TZ: { lat: -6.7924, lng: 39.2083 },
  UA: { lat: 50.4501, lng: 30.5234 },
  UG: { lat: 0.3476, lng: 32.5825 },
  US: { lat: 39.8283, lng: -98.5795 },
  UY: { lat: -34.9011, lng: -56.1645 },
  VN: { lat: 21.0278, lng: 105.8342 },
  ZA: { lat: -26.2041, lng: 28.0473 },
};

// Devuelve unas coordenadas razonables para el país cuando la fuente
// no trajo lat/lng puntuales de la carrera (quedaron en 0,0).
export function centroideDesdeCodigoIso(codigo: string | undefined | null): { lat: number; lng: number } | undefined {
  if (!codigo) return undefined;
  return CENTROIDE_POR_PAIS[codigo.toUpperCase()];
}

export function paisDesdeCodigoIso(codigo: string | undefined | null): { pais: string; continente: Continente } {
  if (!codigo) return { pais: "Estados Unidos", continente: "AMERICA_DEL_NORTE" };
  const info = PAISES[codigo.toUpperCase()];
  if (info) return { pais: info.nombre, continente: info.continente };
  // Código que no tenemos mapeado todavía: se guarda el código tal
  // cual en vez de adivinar mal el país (mejor un dato incompleto que
  // uno directamente incorrecto).
  return { pais: codigo.toUpperCase(), continente: "AMERICA_DEL_NORTE" };
}
