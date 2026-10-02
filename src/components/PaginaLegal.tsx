import { Eyebrow } from "./Radar";

export function PaginaLegal({
  eyebrow,
  titulo,
  actualizado,
  secciones,
}: {
  eyebrow: string;
  titulo: string;
  actualizado: string;
  secciones: { titulo: string; parrafos: string[] }[];
}) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 w-full flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display font-extrabold text-4xl uppercase">{titulo}</h1>
        <p className="text-sm" style={{ color: "var(--wr-mut)" }}>
          {actualizado}
        </p>
      </header>
      {secciones.map((s) => (
        <section key={s.titulo} className="flex flex-col gap-2">
          <h2 className="font-bold text-lg">{s.titulo}</h2>
          {s.parrafos.map((p) => (
            <p key={p} className="text-sm leading-relaxed" style={{ color: "var(--wr-mut)" }}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
