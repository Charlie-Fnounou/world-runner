import { prisma } from "@/lib/prisma";
import { getCarreras } from "@/lib/races-data";
import {
  crearPatrocinador,
  actualizarPatrocinador,
  alternarPatrocinadorActivo,
  eliminarPatrocinador,
} from "@/app/actions/publicidad";

const ETIQUETA_UBICACION: Record<string, string> = {
  HOME_DESTACADO: "Inicio — arriba, junto a destacadas",
  HOME_MEDIO: "Inicio — en medio de la página",
  FICHA_CARRERA: "Ficha de cada carrera",
};

const ETIQUETA_TAMANO: Record<string, string> = {
  PEQUENO: "Chico",
  MEDIANO: "Mediano",
  GRANDE: "Grande",
};

const ETIQUETA_AJUSTE: Record<string, string> = {
  CUBRIR: "Llenar el espacio (puede recortar los bordes de la foto)",
  CONTENER: "Ver la foto completa (puede dejar franjas vacías a los costados)",
};

function CamposBanner({
  idPrefix,
  carreras,
  valores,
}: {
  idPrefix: string;
  carreras: { id: string; name: string; city: string; country: string }[];
  valores?: {
    nombre: string;
    imagenUrl: string;
    enlaceUrl: string;
    ubicacion: string;
    tamano: string;
    ajusteImagen: string;
    eventoId: string | null;
  };
}) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Nombre del patrocinador
        <input
          name="nombre"
          required
          defaultValue={valores?.nombre}
          className="rounded-lg px-3 py-2 wr-chip"
          style={{ color: "var(--wr-ink)" }}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        URL de la imagen del banner
        <input
          name="imagenUrl"
          type="url"
          required
          defaultValue={valores?.imagenUrl}
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
          defaultValue={valores?.enlaceUrl}
          placeholder="https://..."
          className="rounded-lg px-3 py-2 wr-chip"
          style={{ color: "var(--wr-ink)" }}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dónde se muestra
        <select
          name="ubicacion"
          defaultValue={valores?.ubicacion ?? "HOME_MEDIO"}
          className="rounded-lg px-3 py-2 wr-chip"
          style={{ color: "var(--wr-ink)" }}
        >
          {Object.entries(ETIQUETA_UBICACION).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Carrera específica (opcional — solo aplica si elegiste &quot;Ficha de cada carrera&quot;)
        <select
          name="eventoId"
          defaultValue={valores?.eventoId ?? ""}
          className="rounded-lg px-3 py-2 wr-chip"
          style={{ color: "var(--wr-ink)" }}
        >
          <option value="">Todas las carreras</option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.city}, {c.country}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tamaño del banner
        <select
          name="tamano"
          defaultValue={valores?.tamano ?? "MEDIANO"}
          className="rounded-lg px-3 py-2 wr-chip"
          style={{ color: "var(--wr-ink)" }}
        >
          {Object.entries(ETIQUETA_TAMANO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Cómo acomodar la foto
        <select
          name="ajusteImagen"
          defaultValue={valores?.ajusteImagen ?? "CUBRIR"}
          className="rounded-lg px-3 py-2 wr-chip"
          style={{ color: "var(--wr-ink)" }}
        >
          {Object.entries(ETIQUETA_AJUSTE).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export default async function AdminPublicidadPage() {
  const [patrocinadores, carreras] = await Promise.all([
    prisma.patrocinador.findMany({ orderBy: { creadoEn: "desc" }, include: { evento: true } }),
    getCarreras(),
  ]);
  const carrerasOrdenadas = [...carreras].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl p-5 wr-panel max-w-lg">
        <h2 className="font-bold mb-4">Agregar banner de patrocinador</h2>
        <form action={crearPatrocinador} className="flex flex-col gap-3">
          <CamposBanner idPrefix="nuevo" carreras={carrerasOrdenadas} />
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
            <div key={p.id} className="rounded-2xl p-4 wr-panel flex flex-col gap-3">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imagenUrl}
                  alt={p.nombre}
                  className={`w-32 h-16 rounded-lg wr-chip ${p.ajusteImagen === "CONTENER" ? "object-contain" : "object-cover"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="text-xs truncate" style={{ color: "var(--wr-mut)" }}>
                    {ETIQUETA_UBICACION[p.ubicacion]} · {ETIQUETA_TAMANO[p.tamano]}
                    {p.evento ? ` · Solo en: ${p.evento.nombre}` : ""}
                  </div>
                </div>
                <span
                  className="text-xs font-semibold rounded-full px-3 py-1 shrink-0"
                  style={{ background: p.activo ? "#16A34A22" : "var(--wr-chip)", color: p.activo ? "#16A34A" : "var(--wr-mut)" }}
                >
                  {p.activo ? "Activo" : "Pausado"}
                </span>
                <form action={alternarPatrocinadorActivo.bind(null, p.id)}>
                  <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold wr-chip shrink-0">
                    {p.activo ? "Pausar" : "Activar"}
                  </button>
                </form>
                <form action={eliminarPatrocinador.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1.5 text-xs font-semibold shrink-0"
                    style={{ background: "#EF444422", color: "#EF4444" }}
                  >
                    Eliminar
                  </button>
                </form>
              </div>

              <details>
                <summary className="text-xs font-semibold cursor-pointer" style={{ color: "var(--wr-acc)" }}>
                  Editar
                </summary>
                <form action={actualizarPatrocinador.bind(null, p.id)} className="flex flex-col gap-3 mt-3 max-w-lg">
                  <CamposBanner
                    idPrefix={p.id}
                    carreras={carrerasOrdenadas}
                    valores={{
                      nombre: p.nombre,
                      imagenUrl: p.imagenUrl,
                      enlaceUrl: p.enlaceUrl,
                      ubicacion: p.ubicacion,
                      tamano: p.tamano,
                      ajusteImagen: p.ajusteImagen,
                      eventoId: p.eventoId,
                    }}
                  />
                  <button
                    type="submit"
                    className="rounded-full px-5 py-2.5 text-sm font-semibold self-start wr-chip"
                    style={{ color: "var(--wr-ink)" }}
                  >
                    Guardar cambios
                  </button>
                </form>
              </details>
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
