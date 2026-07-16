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
  AU: { nombre: "Australia", continente: "OCEANIA" },
  NZ: { nombre: "Nueva Zelanda", continente: "OCEANIA" },
  JP: { nombre: "Japón", continente: "ASIA" },
  CN: { nombre: "China", continente: "ASIA" },
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

export function paisDesdeCodigoIso(codigo: string | undefined | null): { pais: string; continente: Continente } {
  if (!codigo) return { pais: "Estados Unidos", continente: "AMERICA_DEL_NORTE" };
  const info = PAISES[codigo.toUpperCase()];
  if (info) return { pais: info.nombre, continente: info.continente };
  // Código que no tenemos mapeado todavía: se guarda el código tal
  // cual en vez de adivinar mal el país (mejor un dato incompleto que
  // uno directamente incorrecto).
  return { pais: codigo.toUpperCase(), continente: "AMERICA_DEL_NORTE" };
}
