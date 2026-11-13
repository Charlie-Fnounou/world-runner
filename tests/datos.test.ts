import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoAGuardar, problemaDeCarrera, urlSegura } from "../src/lib/collectors/validacion";
import { claveNombre, ciudadesCompatibles, detectarDuplicados, type CandidatoDuplicado } from "../src/lib/duplicados";
import { estadoParaMostrar } from "../src/lib/races-data";
import { aCarreraExterna, fechaDesdeMMDDYYYY } from "../src/lib/collectors/runsignup";
import type { CarreraExterna } from "../src/lib/collectors/types";

const AHORA = Date.UTC(2026, 10, 13);
const FUTURA = new Date(Date.UTC(2027, 2, 14));
const PASADA = new Date(Date.UTC(2026, 0, 10));

test("estado: una fecha futura sin dato de la fuente queda SIN_CONFIRMAR (no 'abierta')", () => {
  const cerca = new Date(AHORA + 10 * 864e5);
  assert.equal(estadoAGuardar(cerca, undefined, null, AHORA), "SIN_CONFIRMAR");
  assert.equal(estadoAGuardar(FUTURA, undefined, null, AHORA), "SIN_CONFIRMAR");
});

test("estado: lo que informa la fuente manda", () => {
  assert.equal(estadoAGuardar(FUTURA, "ABIERTA", "SIN_CONFIRMAR", AHORA), "ABIERTA");
  assert.equal(estadoAGuardar(FUTURA, "CANCELADA", "ABIERTA", AHORA), "CANCELADA");
});

test("estado: una carrera ya pasada queda cerrada, salvo que esté cancelada", () => {
  assert.equal(estadoAGuardar(PASADA, undefined, "ABIERTA", AHORA), "CERRADA");
  assert.equal(estadoAGuardar(PASADA, undefined, "CANCELADA", AHORA), "CANCELADA");
});

test("estado: una fuente que no informa no pisa un estado cargado a mano", () => {
  assert.equal(estadoAGuardar(FUTURA, undefined, "SORTEO", AHORA), "SORTEO");
  assert.equal(estadoAGuardar(FUTURA, undefined, "CERRADA", AHORA), "SIN_CONFIRMAR");
});

test("estado mostrado: pasada = cerrada, cancelada se muestra cancelada, desconocido = sin confirmar", () => {
  const ahora = new Date(AHORA);
  assert.equal(estadoParaMostrar({ fecha: PASADA, estado: "ABIERTA" }, ahora), "cerrada");
  assert.equal(estadoParaMostrar({ fecha: FUTURA, estado: "CANCELADA" }, ahora), "cancelada");
  assert.equal(estadoParaMostrar({ fecha: FUTURA, estado: "SIN_CONFIRMAR" }, ahora), "sinconfirmar");
  assert.equal(estadoParaMostrar({ fecha: FUTURA, estado: "XYZ" }, ahora), "sinconfirmar");
  assert.equal(estadoParaMostrar({ fecha: FUTURA, estado: "ABIERTA" }, ahora), "abierta");
});

test("urls: solo http(s)", () => {
  assert.equal(urlSegura("javascript:alert(1)"), undefined);
  assert.equal(urlSegura("data:text/html,hola"), undefined);
  assert.equal(urlSegura("/relativa"), undefined);
  assert.equal(urlSegura("  https://carrera.com/inscripcion  "), "https://carrera.com/inscripcion");
  assert.equal(urlSegura(""), undefined);
});

function externa(p: Partial<CarreraExterna> = {}): CarreraExterna {
  return {
    fuenteTipo: "test",
    fuenteNombre: "Test",
    externalId: "1",
    nombre: "10K de la Ciudad",
    ciudad: "Lima",
    pais: "Perú",
    continente: "AMERICA_DEL_SUR",
    lat: -12,
    lng: -77,
    anio: 2027,
    fecha: FUTURA,
    distancias: [],
    ...p,
  };
}

test("validación: rechaza datos malformados de las fuentes", () => {
  assert.equal(problemaDeCarrera(externa(), AHORA), null);
  assert.match(problemaDeCarrera(externa({ nombre: "." }), AHORA) ?? "", /nombre/);
  assert.match(problemaDeCarrera(externa({ fecha: new Date("nada") }), AHORA) ?? "", /fecha/);
  assert.match(problemaDeCarrera(externa({ fecha: new Date(Date.UTC(2045, 0, 1)), anio: 2045 }), AHORA) ?? "", /rango/);
  assert.match(problemaDeCarrera(externa({ lat: 120 }), AHORA) ?? "", /coordenadas/);
  assert.match(problemaDeCarrera(externa({ precioDesde: -5 }), AHORA) ?? "", /precio/);
  assert.match(problemaDeCarrera(externa({ externalId: "  " }), AHORA) ?? "", /externalId/);
});

test("validación: acepta nombres en alfabetos no latinos", () => {
  assert.equal(problemaDeCarrera(externa({ nombre: "第9屆沖繩100K超級馬拉松" }), AHORA), null);
  assert.equal(problemaDeCarrera(externa({ nombre: "Московский марафон" }), AHORA), null);
});

function cand(p: Partial<CandidatoDuplicado>): CandidatoDuplicado {
  return { id: "x", nombre: "Jingle Jog 5K", ciudad: "Austin", pais: "Estados Unidos", fecha: "2026-12-12", conFuente: true, datos: 0, creadoEn: 0, ...p };
}

test("duplicados: misma carrera con dos IDs de la misma fuente", () => {
  const r = detectarDuplicados([
    cand({ id: "kosu_taf-70", nombre: "8. Fethiye Ultra 10K", ciudad: "Fethiye", pais: "Turquía", fecha: "2026-10-31", creadoEn: 1 }),
    cand({ id: "kosu_taf-31-ekim", nombre: "8. FETHIYE ULTRA 10K", ciudad: "Fethiye", pais: "Turquía", fecha: "2026-10-31", creadoEn: 2 }),
  ]);
  assert.equal(r.get("kosu_taf-31-ekim"), "kosu_taf-70");
  assert.equal(r.size, 1);
});

test("duplicados: mismo nombre en ciudades distintas NO es duplicado", () => {
  const r = detectarDuplicados([cand({ id: "a", ciudad: "Austin" }), cand({ id: "b", ciudad: "Boston" }), cand({ id: "c", ciudad: "Denver" })]);
  assert.equal(r.size, 0);
});

test("duplicados: distancias distintas del mismo evento NO son duplicados", () => {
  const r = detectarDuplicados([
    cand({ id: "a", nombre: "Ankara Zaman Koşusu 1 Saat", ciudad: "Ankara" }),
    cand({ id: "b", nombre: "Ankara Zaman Koşusu 2 Saat", ciudad: "Ankara" }),
  ]);
  assert.equal(r.size, 0);
});

test("duplicados: queda la que tiene fuente que la actualiza, aunque sea más nueva", () => {
  const r = detectarDuplicados([
    cand({ id: "semilla", nombre: "Maratón Valencia", ciudad: "Valencia", pais: "España", conFuente: false, datos: 4, creadoEn: 1 }),
    cand({ id: "rfea", nombre: "Maratón Valencia", ciudad: "", pais: "España", conFuente: true, datos: 1, creadoEn: 9 }),
  ]);
  assert.equal(r.get("semilla"), "rfea");
});

test("duplicados: normalización de nombres y ciudades", () => {
  assert.equal(claveNombre("  Maratón  de Bogotá! "), "maraton de bogota");
  assert.equal(claveNombre("2.Uluslararası Ordu Yarı Maratonu"), claveNombre("2.ULUSLARARASI ORDU YARI MARATONU"));
  assert.ok(ciudadesCompatibles("Klosterneuburg", "Aupark Klosterneuburg"));
  assert.ok(ciudadesCompatibles("Berlín", "Berlin"));
  assert.ok(!ciudadesCompatibles("Austin", "Boston"));
});

test("fechas: RunSignup MM/DD/YYYY conserva el día del calendario", () => {
  const f = fechaDesdeMMDDYYYY("12/31/2026");
  assert.ok(f);
  assert.equal(f.toISOString().slice(0, 10), "2026-12-31");
  assert.equal(fechaDesdeMMDDYYYY(""), null);
  assert.equal(fechaDesdeMMDDYYYY("2026-12-31"), null);
});

test("RunSignup: usa is_registration_open y descarta borradores/privadas", () => {
  const base = { race_id: 1, name: "Turkey Trot", next_date: "11/26/2026", url: "https://runsignup.com/Race/X/1", address: { city: "Austin", country_code: "US" } };
  assert.equal(aCarreraExterna({ ...base, is_registration_open: "T" })?.estado, "ABIERTA");
  assert.equal(aCarreraExterna({ ...base, is_registration_open: "F" })?.estado, undefined);
  assert.equal(aCarreraExterna({ ...base, is_draft_race: "T" }), null);
  assert.equal(aCarreraExterna({ ...base, is_private_race: "T" }), null);
});

import { fechaDesdeTexto as fechaMinhas, parsearTarjetas } from "../src/lib/collectors/minhasinscricoes";

test("Minhas Inscrições: fechas en portugués y tarjetas del sitio nuevo", () => {
  assert.equal(fechaMinhas("Sáb, 14 nov 2026")?.toISOString().slice(0, 10), "2026-11-14");
  assert.equal(fechaMinhas("Dom, 1 fev 2027")?.toISOString().slice(0, 10), "2027-02-01");
  assert.equal(fechaMinhas("sin fecha"), null);
  const html =
    '<h3 class="x"><a href="https://gominhasinscricoes.com.br/evento/a" target="_blank" data-card-link="" data-mi-click="event" data-mi-id="uuid-1" class="y">Corrida &amp; Caminhada</a></h3><div><div><svg/><span>Sáb, 14 nov 2026</span></div><div><svg/><span class="line-clamp-1">São Carlos - SP</span></div></div>';
  const [f] = parsearTarjetas(html);
  assert.deepEqual(f, { href: "https://gominhasinscricoes.com.br/evento/a", id: "uuid-1", nombre: "Corrida & Caminhada", fecha: "Sáb, 14 nov 2026", lugar: "São Carlos - SP" });
});
