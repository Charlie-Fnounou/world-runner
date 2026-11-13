import { test } from "node:test";
import assert from "node:assert/strict";
import { escaparHtml, jsonParaScript, monedaIso } from "../src/lib/seguridad";
import { esCambioReal, tipoDeCambio } from "../src/lib/radar";
import { preguntasDeCarrera } from "../src/lib/faq";
import { buscarCarreras } from "../src/lib/search";
import { fmtFecha } from "../src/lib/format";
import { permitir } from "../src/lib/limite";
import { carrera } from "./ayuda";

test("seguridad: el JSON-LD no se puede cerrar con </script>", () => {
  const salida = jsonParaScript({ name: "</script><script>alert(1)</script>" });
  assert.ok(!salida.includes("</script>"));
  assert.ok(!salida.includes("<"));
  assert.deepEqual(JSON.parse(salida), { name: "</script><script>alert(1)</script>" });
});

test("seguridad: escape de HTML en emails", () => {
  assert.equal(escaparHtml('<img src=x onerror="a">&'), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;");
});

test("seguridad: moneda ISO solo cuando es inequívoca", () => {
  assert.equal(monedaIso("usd"), "USD");
  assert.equal(monedaIso("€"), "EUR");
  assert.equal(monedaIso("$"), null);
  assert.equal(monedaIso(""), null);
});

test("radar: cambios de formato no cuentan como cambios", () => {
  const ahora = new Date("2026-11-13T00:00:00Z");
  assert.equal(esCambioReal({ campo: "fecha", valorAnterior: "2026-12-05T00:00:00Z", valorNuevo: "2026-12-05T10:00:00Z", creadoEn: ahora }), false);
  assert.equal(esCambioReal({ campo: "fecha", valorAnterior: "2026-12-05", valorNuevo: "2026-12-06", creadoEn: ahora }), true);
  assert.equal(esCambioReal({ campo: "precioDesde", valorAnterior: "25", valorNuevo: "25", creadoEn: ahora }), false);
});

test("radar: estados deducidos viejos (antes del arreglo) no son noticias", () => {
  const viejo = new Date("2026-09-30T00:00:00Z");
  assert.equal(esCambioReal({ campo: "estado", valorAnterior: "PROXIMAMENTE", valorNuevo: "ABIERTA", creadoEn: viejo }), false);
  assert.equal(esCambioReal({ campo: "estado", valorAnterior: "ABIERTA", valorNuevo: "CANCELADA", creadoEn: viejo }), true);
  assert.equal(tipoDeCambio("estado", "SIN_CONFIRMAR"), null);
});

test("FAQ: solo pregunta lo que tiene dato real", () => {
  const sinDatos = preguntasDeCarrera(carrera({ dist: "Distancia variable", price: 0, web: "" }), "es");
  assert.ok(!sinDatos.some((q) => q.pregunta.includes("Cuánto cuesta")));
  assert.ok(!sinDatos.some((q) => q.pregunta.includes("Qué distancia")));
  const conDatos = preguntasDeCarrera(carrera({ price: 45, cur: "USD" }), "es");
  assert.ok(conDatos.some((q) => q.respuesta.includes("USD45")));
});

test("búsqueda: tolera tildes, mayúsculas y errores de tipeo", () => {
  const lista = [
    carrera({ id: "a", name: "BMW Berlin Marathon", city: "Berlín", country: "Alemania" }),
    carrera({ id: "b", name: "TCS Sydney Marathon", city: "Sydney", country: "Australia" }),
    carrera({ id: "c", name: "Media Maratón de Bogotá", city: "Bogotá", country: "Colombia" }),
  ];
  assert.equal(buscarCarreras(lista, "berlin")[0]?.id, "a");
  assert.equal(buscarCarreras(lista, "sidney")[0]?.id, "b");
  assert.equal(buscarCarreras(lista, "BOGOTA")[0]?.id, "c");
  assert.equal(buscarCarreras(lista, "zzzzzz").length, 0);
});

test("fechas: se muestra el día correcto sin importar la zona horaria", () => {
  const original = process.env.TZ;
  for (const tz of ["America/Panama", "Pacific/Auckland", "UTC"]) {
    process.env.TZ = tz;
    assert.equal(fmtFecha("2027-01-01", "es"), "1 Ene 2027", tz);
  }
  process.env.TZ = original;
});

test("límite de uso: corta después del máximo y se libera al pasar la ventana", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(permitir("prueba", 3, 60_000, t0 + i), true);
  assert.equal(permitir("prueba", 3, 60_000, t0 + 10), false);
  assert.equal(permitir("prueba", 3, 60_000, t0 + 61_000), true);
});
