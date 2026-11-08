"use client";

import { useEffect, useMemo, useState } from "react";
import { pesaj, pesajLines, type PesajOption } from "@/data/pesaj";

const money = (n: number) => `$${n.toFixed(2)}`;
const STORE = "fl-pesaj-pedido";

type Cart = Record<string, number>;
type Form = { name: string; address: string; week: string; notes: string };

function Stepper({ qty, onChange, label }: { qty: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center rounded-full border border-[#3A3226]/25 bg-[#FBF8F1]">
      <button
        type="button"
        aria-label={`Quitar ${label}`}
        disabled={qty === 0}
        onClick={() => onChange(qty - 1)}
        className="grid h-9 w-9 place-items-center rounded-full text-lg disabled:opacity-30"
      >
        −
      </button>
      <span className="w-6 text-center text-[0.95rem] tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label={`Agregar ${label}`}
        onClick={() => onChange(qty + 1)}
        className="grid h-9 w-9 place-items-center rounded-full bg-[#3A3226] text-lg text-[#F7F2E8]"
      >
        +
      </button>
    </div>
  );
}

export function PesajOrder() {
  const [cart, setCart] = useState<Cart>({});
  const [form, setForm] = useState<Form>({ name: "", address: "", week: "", notes: "" });
  const [tried, setTried] = useState(false);

  // restore an unfinished order on this device
  useEffect(() => {
    let saved: { cart?: Cart; form?: Partial<Form> } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    } catch {}
    if (!saved) return;
    queueMicrotask(() => {
      if (saved.cart) setCart(Object.fromEntries(Object.entries(saved.cart).filter(([id, n]) => pesajLines.has(id) && n > 0)));
      if (saved.form) setForm((f) => ({ ...f, ...saved.form }));
    });
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ cart, form }));
    } catch {}
  }, [cart, form]);

  const set = (id: string, n: number) => setCart((c) => ({ ...c, [id]: Math.max(0, n) }));

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => {
          const l = pesajLines.get(id)!;
          return { id, n, name: l.label ? `${l.name} (${l.label})` : l.name, total: l.price * n };
        }),
    [cart],
  );
  const count = lines.reduce((s, l) => s + l.n, 0);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const total = subtotal + (count ? pesaj.delivery : 0);

  const missing = [
    !count && "agrega al menos un producto",
    !form.name.trim() && "tu nombre",
    !form.address.trim() && "la dirección de entrega",
    !form.week && "la semana de entrega",
  ].filter(Boolean) as string[];

  const message = [
    "Hola Esther, quiero hacer un pedido de Pesaj de Fresh Lovers:",
    "",
    ...lines.map((l) => `• ${l.n} × ${l.name} — ${money(l.total)}`),
    "",
    `Subtotal: ${money(subtotal)}`,
    `Delivery: ${money(pesaj.delivery)}`,
    `Total: ${money(total)}`,
    "",
    `Nombre: ${form.name.trim()}`,
    `Dirección: ${form.address.trim()}`,
    `Entrega: ${form.week}`,
    ...(form.notes.trim() ? [`Notas: ${form.notes.trim()}`] : []),
    "",
    "¡Gracias!",
  ].join("\n");
  const waHref = `https://wa.me/${pesaj.whatsapp}?text=${encodeURIComponent(message)}`;

  const field = "w-full rounded-2xl border border-[#3A3226]/20 bg-[#FBF8F1] px-4 py-3 text-[1rem] outline-none focus:border-[#3A3226]";

  return (
    <div className="gutter grid gap-12 pb-32 lg:grid-cols-12 lg:gap-10">
      {/* menu */}
      <div className="grid gap-10 md:grid-cols-2 md:gap-x-10 lg:col-span-8">
        {pesaj.sections.map((s) => (
          <section key={s.title} aria-labelledby={`s-${s.title}`} className="min-w-0">
            <h2 id={`s-${s.title}`} className="kicker rounded-md bg-[#CFC6B1] px-4 py-2.5 text-center text-[0.8rem] text-[#3A3226]">
              {s.title}
            </h2>
            <ul className="mt-2 divide-y divide-[#3A3226]/12">
              {s.items.map((it) => (
                <li key={it.name} className="py-4">
                  <p className="text-[1.02rem] font-medium leading-snug">{it.name}</p>
                  <div className="mt-2.5 grid gap-2">
                    {it.options.map((o: PesajOption) => (
                      <div key={o.id} className="flex items-center justify-between gap-3">
                        <span className="text-[0.92rem] text-[#3A3226]/80">
                          {o.label && <span className={o.id.endsWith("-ji") ? "font-medium text-[#8A6A1F]" : ""}>{o.label} · </span>}
                          <span className="tabular-nums">{money(o.price)}</span>
                        </span>
                        <Stepper qty={cart[o.id] ?? 0} onChange={(n) => set(o.id, n)} label={o.label ? `${it.name} ${o.label}` : it.name} />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            {s.note && <p className="mt-1 text-[0.82rem] italic text-[#3A3226]/70">* {s.note}</p>}
          </section>
        ))}
      </div>

      {/* order */}
      <aside id="pedido" aria-labelledby="pedido-title" className="scroll-mt-24 lg:col-span-4">
        <div className="rounded-[1.75rem] bg-[#FBF8F1] p-6 shadow-[0_30px_60px_-40px_rgba(58,50,38,0.6)] lg:sticky lg:top-24 md:p-7">
          <h2 id="pedido-title" className="font-display text-[2.2rem] leading-none">
            Tu <em>pedido</em>
          </h2>

          {lines.length === 0 ? (
            <p className="mt-4 text-[0.95rem] text-[#3A3226]/70">Todavía no has agregado productos. Usa los botones + del menú.</p>
          ) : (
            <ul className="mt-5 grid gap-2.5 text-[0.95rem]">
              {lines.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="tabular-nums">{l.n} ×</span> {l.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    {money(l.total)}
                    <button type="button" onClick={() => set(l.id, 0)} aria-label={`Quitar ${l.name}`} className="text-[#3A3226]/50 hover:text-[#3A3226]">
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-5 grid gap-1 border-t border-[#3A3226]/15 pt-4 text-[0.95rem] tabular-nums">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{money(pesaj.delivery)}</dd>
            </div>
            <div className="mt-1 flex justify-between text-[1.15rem] font-semibold">
              <dt>Total</dt>
              <dd>{money(count ? total : 0)}</dd>
            </div>
          </dl>

          <form
            className="mt-6 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setTried(true);
            }}
          >
            <label className="grid gap-1.5 text-[0.85rem]">
              Nombre
              <input id="pesaj-nombre" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
            </label>
            <label className="grid gap-1.5 text-[0.85rem]">
              Dirección de entrega
              <textarea id="pesaj-direccion" rows={2} className={field} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" />
            </label>
            <fieldset className="grid gap-2 text-[0.85rem]">
              <legend className="mb-1.5">Semana de entrega</legend>
              {pesaj.weeks.map((w) => (
                <label key={w} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-[0.95rem] ${form.week === w ? "border-[#3A3226] bg-[#3A3226] text-[#F7F2E8]" : "border-[#3A3226]/20"}`}>
                  <input type="radio" name="pesaj-semana" value={w} checked={form.week === w} onChange={() => setForm({ ...form, week: w })} className="sr-only" />
                  {w}
                </label>
              ))}
            </fieldset>
            <label className="grid gap-1.5 text-[0.85rem]">
              Notas (opcional)
              <textarea id="pesaj-notas" rows={2} className={field} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>

            {missing.length === 0 ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex h-14 items-center justify-center rounded-full bg-[#1F7A4D] text-[1.02rem] font-medium text-white"
              >
                Enviar pedido por WhatsApp
              </a>
            ) : (
              <button type="submit" className="mt-2 h-14 rounded-full bg-[#3A3226]/25 text-[1.02rem] font-medium text-[#3A3226]/70">
                Enviar pedido por WhatsApp
              </button>
            )}
            {tried && missing.length > 0 && (
              <p role="alert" className="text-[0.88rem] text-[#9B2C1F]">
                Falta: {missing.join(", ")}.
              </p>
            )}
            <p className="text-[0.82rem] leading-relaxed text-[#3A3226]/70">
              Se abre WhatsApp con tu pedido ya escrito para {pesaj.contact} ({pesaj.phoneDisplay}). Solo tienes que enviarlo.
            </p>
          </form>
        </div>
      </aside>

      {/* phone: jump to the order */}
      {count > 0 && (
        <a
          href="#pedido"
          className="fixed inset-x-3 bottom-3 z-30 flex h-14 items-center justify-between rounded-full bg-[#3A3226] px-6 text-[#F7F2E8] shadow-[0_10px_40px_-10px_rgba(0,0,0,.5)] lg:hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <span>
            Ver pedido · <span className="tabular-nums">{count}</span>
          </span>
          <span className="font-semibold tabular-nums">{money(total)}</span>
        </a>
      )}
    </div>
  );
}
