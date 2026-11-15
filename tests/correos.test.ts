import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlAlerta } from "../src/lib/alertas";
import { plantillaResumenUbicacion } from "../src/lib/resumenesUbicacion";
import { enviarCorreo, plantillaLinkMagico } from "../src/lib/resend";
import { carrera } from "./ayuda";

test("correo de alerta: escapa nombres externos e incluye cómo darse de baja", () => {
  const html = htmlAlerta({ nombre: '<script>x</script> 10K "Ciudad"', bandera: "🇵🇦" }, ["💰 El precio cambió a USD45."], "https://theworldrunner.com/carreras/a-1");
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("El precio cambió a USD45."));
  assert.ok(html.includes("https://theworldrunner.com/perfil"));
});

test("resumen semanal: escapa y enlaza cada carrera", () => {
  const html = plantillaResumenUbicacion([{ valor: "Panamá <b>", carreras: [carrera({ id: "c9", name: "Run & <i>Fun</i>" })] }]);
  assert.ok(!html.includes("<i>Fun</i>"));
  assert.ok(html.includes("Panamá &lt;b&gt;"));
  assert.ok(html.includes("/carreras/run-i-fun-i-c9"));
});

test("link mágico: el enlace va tal cual en el botón", () => {
  const link = "https://theworldrunner.com/auth/confirm?token_hash=abc&type=magiclink&next=%2F";
  assert.ok(plantillaLinkMagico(link).includes(`href="${link}"`));
});

test("envío: arma bien el pedido a Resend sin enviar nada real", async () => {
  const original = globalThis.fetch;
  const pedidos: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  process.env.RESEND_API_KEY = "re_prueba_falsa";
  try {
    await enviarCorreo({ to: "alguien@ejemplo.org", subject: "Hola", html: "<p>x</p>" });
    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0].url, "https://api.resend.com/emails");
    const cuerpo = JSON.parse(String(pedidos[0].init.body));
    assert.deepEqual(cuerpo.to, ["alguien@ejemplo.org"]);
    assert.match(cuerpo.from, /noreply@theworldrunner\.com/);
    globalThis.fetch = (async () => new Response("cuota excedida", { status: 429 })) as typeof fetch;
    await assert.rejects(enviarCorreo({ to: "a@b.org", subject: "x", html: "x" }), /429/);
  } finally {
    globalThis.fetch = original;
  }
});
