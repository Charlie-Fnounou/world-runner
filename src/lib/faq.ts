import type { Carrera } from "./types";
import { DICCIONARIOS, traducirDistancia, type Idioma } from "./i18n";
import { fmtFecha } from "./format";

// Preguntas frecuentes armadas solo con los datos que tenemos de la carrera
// (si falta un dato, esa pregunta no aparece). Se usan en la ficha y en el
// JSON-LD FAQPage para Google, así que nunca inventan información.
export function preguntasDeCarrera(r: Carrera, idioma: Idioma): { pregunta: string; respuesta: string }[] {
  const f = DICCIONARIOS[idioma].faq;
  const lugar = [r.city, r.country].filter(Boolean).join(", ");
  const lista = [{ pregunta: f.cuandoP(r.name), respuesta: f.cuandoR(r.name, fmtFecha(r.date, idioma), lugar) }];
  if (r.dist && r.dist !== "Distancia variable") {
    lista.push({ pregunta: f.distanciaP(r.name), respuesta: f.distanciaR(traducirDistancia(r.dist, idioma)) });
  }
  if (r.price > 0) {
    lista.push({ pregunta: f.precioP(r.name), respuesta: f.precioR(`${r.cur}${r.price}`) });
  }
  if (r.web) lista.push({ pregunta: f.inscribirP(r.name), respuesta: f.inscribirR });
  lista.push({ pregunta: f.avisosP(r.name), respuesta: f.avisosR });
  return lista;
}
