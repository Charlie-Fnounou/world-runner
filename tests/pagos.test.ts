import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularPlan, estadoDesdePayPal, pagoPaseValido, vigenciaAlActivar } from "../src/lib/planes";

const AHORA = Date.UTC(2026, 10, 13);
const DIA = 864e5;

test("plan: sin suscripción = gratis", () => {
  assert.deepEqual(calcularPlan(null, AHORA).plan, "GRATIS");
  assert.equal(calcularPlan(null, AHORA).esPro, false);
});

test("plan: Pro activo dentro del período", () => {
  const p = calcularPlan({ plan: "PRO", periodo: "mensual", estado: "activa", vigenteHasta: new Date(AHORA + 10 * DIA) }, AHORA);
  assert.equal(p.esPro, true);
  assert.equal(p.plan, "PRO");
});

test("plan: Pro activo con cobro demorado tiene 3 días de margen, después no", () => {
  const vencidoAyer = { plan: "PRO" as const, periodo: "mensual", estado: "activa", vigenteHasta: new Date(AHORA - DIA) };
  assert.equal(calcularPlan(vencidoAyer, AHORA).esPro, true);
  const vencidoHace5 = { ...vencidoAyer, vigenteHasta: new Date(AHORA - 5 * DIA) };
  assert.equal(calcularPlan(vencidoHace5, AHORA).esPro, false);
});

test("plan: cancelado sigue siendo Pro hasta el fin del período pagado, sin margen", () => {
  const s = { plan: "PRO" as const, periodo: "anual", estado: "cancelada", vigenteHasta: new Date(AHORA + 2 * DIA) };
  assert.equal(calcularPlan(s, AHORA).esPro, true);
  assert.equal(calcularPlan({ ...s, vigenteHasta: new Date(AHORA - DIA) }, AHORA).esPro, false);
});

test("plan: suspendida (pago fallido) o vencida no es Pro aunque tenga fecha futura", () => {
  const base = { plan: "PRO" as const, periodo: "mensual", vigenteHasta: new Date(AHORA + 20 * DIA) };
  assert.equal(calcularPlan({ ...base, estado: "suspendida" }, AHORA).esPro, false);
  assert.equal(calcularPlan({ ...base, estado: "vencida" }, AHORA).esPro, false);
});

test("plan: el pase vence exacto, sin margen", () => {
  const s = { plan: "PASE" as const, periodo: "pase60", estado: "activa", vigenteHasta: new Date(AHORA - 1000) };
  assert.equal(calcularPlan(s, AHORA).esPro, false);
});

test("PayPal: solo ACTIVE activa; APPROVED y otros no", () => {
  assert.equal(estadoDesdePayPal("ACTIVE"), "activa");
  assert.equal(estadoDesdePayPal("APPROVED"), null);
  assert.equal(estadoDesdePayPal("APPROVAL_PENDING"), null);
  assert.equal(estadoDesdePayPal("CANCELLED"), "cancelada");
  assert.equal(estadoDesdePayPal("SUSPENDED"), "suspendida");
  assert.equal(estadoDesdePayPal("EXPIRED"), "vencida");
});

test("cambio de plan: pasar de pase a Pro no pierde días ya pagados", () => {
  const prueba = new Date(AHORA + 7 * DIA);
  const pase = new Date(AHORA + 40 * DIA);
  assert.equal(vigenciaAlActivar(prueba, pase, AHORA).getTime(), pase.getTime());
  assert.equal(vigenciaAlActivar(prueba, new Date(AHORA - DIA), AHORA).getTime(), prueba.getTime());
  assert.equal(vigenciaAlActivar(prueba, null, AHORA).getTime(), prueba.getTime());
});

function orden(p: { status?: string; captura?: string; custom?: string; valor?: string; moneda?: string } = {}) {
  return {
    status: p.status ?? "COMPLETED",
    purchase_units: [
      { payments: { captures: [{ status: p.captura ?? "COMPLETED", custom_id: p.custom ?? "u1", amount: { value: p.valor ?? "9.99", currency_code: p.moneda ?? "USD" } }] } },
    ],
  };
}

test("pase: el pago solo vale completo, del mismo usuario y por el monto exacto", () => {
  assert.equal(pagoPaseValido(orden(), "u1", 9.99), true);
  assert.equal(pagoPaseValido(orden({ custom: "otro" }), "u1", 9.99), false);
  assert.equal(pagoPaseValido(orden({ valor: "0.01" }), "u1", 9.99), false);
  assert.equal(pagoPaseValido(orden({ moneda: "EUR" }), "u1", 9.99), false);
  assert.equal(pagoPaseValido(orden({ captura: "PENDING" }), "u1", 9.99), false);
  assert.equal(pagoPaseValido(orden({ status: "APPROVED" }), "u1", 9.99), false);
  assert.equal(pagoPaseValido({ status: "COMPLETED", purchase_units: [] }, "u1", 9.99), false);
});
