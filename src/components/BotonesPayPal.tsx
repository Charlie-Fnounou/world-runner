"use client";

import { useEffect, useRef } from "react";

// Mínimo que usamos del SDK de PayPal (se carga desde paypal.com, no hay
// paquete npm oficial liviano para esto).
interface PayPalSdk {
  Buttons: (opciones: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void>; close?: () => void };
}

const cargas = new Map<string, Promise<PayPalSdk>>();

// Suscripción y pago único necesitan el SDK con parámetros distintos, así
// que se cargan dos copias con distinto "namespace" en window.
function cargarSdk(clientId: string, parametros: string, namespace: string): Promise<PayPalSdk> {
  const clave = namespace;
  const existente = cargas.get(clave);
  if (existente) return existente;
  const promesa = new Promise<PayPalSdk>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&${parametros}`;
    s.setAttribute("data-namespace", namespace);
    s.onload = () => resolve((window as unknown as Record<string, PayPalSdk>)[namespace]);
    s.onerror = () => {
      cargas.delete(clave);
      reject(new Error("No se pudo cargar PayPal"));
    };
    document.head.appendChild(s);
  });
  cargas.set(clave, promesa);
  return promesa;
}

const ESTILO = { layout: "vertical", shape: "pill", label: "paypal", height: 44 };

export function BotonSuscripcionPayPal({
  clientId,
  planId,
  usuarioId,
  onAprobado,
  onError,
}: {
  clientId: string;
  planId: string;
  usuarioId: string;
  onAprobado: (subscriptionId: string) => void;
  onError: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onAprobado, onError });
  useEffect(() => {
    callbacks.current = { onAprobado, onError };
  });

  useEffect(() => {
    let cancelado = false;
    let botones: ReturnType<PayPalSdk["Buttons"]> | null = null;
    cargarSdk(clientId, "vault=true&intent=subscription", "paypalSuscripcion")
      .then((sdk) => {
        if (cancelado || !ref.current) return;
        botones = sdk.Buttons({
          style: ESTILO,
          createSubscription: (_: unknown, actions: { subscription: { create: (d: unknown) => Promise<string> } }) =>
            actions.subscription.create({ plan_id: planId, custom_id: usuarioId }),
          onApprove: (data: { subscriptionID: string }) => callbacks.current.onAprobado(data.subscriptionID),
          onError: () => callbacks.current.onError(),
        });
        ref.current.innerHTML = "";
        return botones.render(ref.current);
      })
      .catch(() => callbacks.current.onError());
    return () => {
      cancelado = true;
      botones?.close?.();
    };
  }, [clientId, planId, usuarioId]);

  return <div ref={ref} className="min-h-[52px]" />;
}

export function BotonPagoPayPal({
  clientId,
  crearOrden,
  onAprobado,
  onError,
}: {
  clientId: string;
  crearOrden: () => Promise<string>;
  onAprobado: (orderId: string) => void;
  onError: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ crearOrden, onAprobado, onError });
  useEffect(() => {
    callbacks.current = { crearOrden, onAprobado, onError };
  });

  useEffect(() => {
    let cancelado = false;
    let botones: ReturnType<PayPalSdk["Buttons"]> | null = null;
    cargarSdk(clientId, "intent=capture", "paypalPago")
      .then((sdk) => {
        if (cancelado || !ref.current) return;
        botones = sdk.Buttons({
          style: ESTILO,
          createOrder: () => callbacks.current.crearOrden(),
          onApprove: (data: { orderID: string }) => callbacks.current.onAprobado(data.orderID),
          onError: () => callbacks.current.onError(),
        });
        ref.current.innerHTML = "";
        return botones.render(ref.current);
      })
      .catch(() => callbacks.current.onError());
    return () => {
      cancelado = true;
      botones?.close?.();
    };
  }, [clientId]);

  return <div ref={ref} className="min-h-[52px]" />;
}
