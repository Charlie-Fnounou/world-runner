import { prisma } from "@/lib/prisma";
import { crearPatrocinador, alternarPatrocinadorActivo, eliminarPatrocinador } from "@/app/actions/publicidad";

const ETIQUETA_UBICACION: Record<string, string> = {
  HOME_DESTACADO: "Inicio — arriba, junto a destacadas",
  HOME_MEDIO: "Inicio — en medio de la página",
  FICHA_CARRERA: "Ficha de cada carrera",
};

export default async function AdminPublicidadPage() {
  const patrocinadores = await prisma.patrocinador.findMany({ orderBy: { creadoEn: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl p-5 wr-panel max-w-lg">
        <h2 className="font-bold mb-4">Agregar banner de patrocinador</h2>
        <form action={crearPatrocinador} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Nombre del patrocinador
            <input name="nombre" required className="rounded-lg px-3 py-2 wr-chip" style={{ color: "var(--wr-ink)" }} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            URL de la imagen del banner
            <input
              name="imagenUrl"
              type="url"
              required
              placeholder="https://..."
              className="rounded-lg px-3 py-2 wr-chip"
              style={{ color: "var(--wr-ink)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            URL a donde lleva al hacer clic
            <input
              name="enlaceUrl"
              type="url"
              required
              placeholder="https://..."
              className="rounded-lg px-3 py-2 wr-chip"
              style={{ color: "var(--wr-ink)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Dónde se muestra
            <select name="ubicacion" defaultValue="HOME_MEDIO" className="rounded-lg px-3 py-2 wr-chip" style={{ color: "var(--wr-ink)" }}>
              {Object.entries(ETIQUETA_UBICACION).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full px-5 py-3 text-sm font-semibold self-start"
            style={{ background: "var(--wr-acc)", color: "var(--wr-acc-ink)" }}
          >
            Agregar banner
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Banners actuales ({patrocinadores.length})</h2>
        {patrocinadores.length === 0 ? (
          <div className="rounded-2xl p-8 wr-panel text-center" style={{ color: "var(--wr-mut)" }}>
            Todavía no agregaste ningún banner.
          </div>
        ) : (
          patrocinadores.map((p) => (
            <div key={p.id} className="rounded-2xl p-4 wr-panel flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imagenUrl} alt={p.nombre} className="w-32 h-16 object-cover rounded-lg wr-chip" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{p.nombre}</div>
                <div className="text-xs truncate" style={{ color: "var(--wr-mut)" }}>
                  {ETIQUETA_UBICACION[p.ubicacion]} · {p.enlaceUrl}
                </div>
              </div>
              <span
                className="text-xs font-semibold rounded-full px-3 py-1"
                style={{ background: p.activo ? "#16A34A22" : "var(--wr-chip)", color: p.activo ? "#16A34A" : "var(--wr-mut)" }}
              >
                {p.activo ? "Activo" : "Pausado"}
              </span>
              <form action={alternarPatrocinadorActivo.bind(null, p.id)}>
                <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold wr-chip">
                  {p.activo ? "Pausar" : "Activar"}
                </button>
              </form>
              <form action={eliminarPatrocinador.bind(null, p.id)}>
                <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "#EF444422", color: "#EF4444" }}>
                  Eliminar
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      <section className="rounded-2xl p-5 wr-panel max-w-lg">
        <h2 className="font-bold mb-2">Google AdSense</h2>
        <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
          Ya está preparado el código para mostrar anuncios automáticos de Google. Cuando tengas tu cuenta
          de AdSense aprobada, dame tu "Publisher ID" (empieza con <code>ca-pub-</code>) y lo activo — no
          hace falta tocar código.
        </p>
      </section>
    </div>
  );
}
