// Siembra la base de datos real con las carreras verificadas del prototipo.
// Se ejecuta con: npx prisma db seed
import { PrismaClient, Continente, EstadoInscripcion, TipoDistancia, TipoTerreno } from "@prisma/client";
import raw from "../src/data/races-seed.json";

const prisma = new PrismaClient();

interface CarreraSemilla {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  continent: string;
  lat: number;
  lng: number;
  date: string;
  km: number;
  dist: string;
  type: string;
  status: string;
  price: number;
  cur: string;
  runners: number;
  elev: number;
  temp: number;
  limit: string;
  diff: number;
  rating: number;
  nrev: number;
  major: boolean;
  web: string;
  airport: string;
  hotel: string;
  g: [string, string];
  desc: string;
  recM: string;
  recF: string;
  profile: number[];
  history: { y: number; r: number; p: number }[];
}

function quitarAcentos(texto: string): string {
  let resultado = "";
  for (const ch of texto.normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) resultado += ch;
  }
  return resultado;
}

function slugify(id: string, name: string): string {
  const base = quitarAcentos(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${id}`;
}

const CONTINENTE_MAP: Record<string, Continente> = {
  Europa: Continente.EUROPA,
  "América del Norte": Continente.AMERICA_DEL_NORTE,
  "América Central": Continente.AMERICA_CENTRAL,
  "América del Sur": Continente.AMERICA_DEL_SUR,
  Asia: Continente.ASIA,
  África: Continente.AFRICA,
  Oceanía: Continente.OCEANIA,
};

const ESTADO_MAP: Record<string, EstadoInscripcion> = {
  abierta: EstadoInscripcion.ABIERTA,
  ultimos: EstadoInscripcion.ULTIMOS_CUPOS,
  sorteo: EstadoInscripcion.SORTEO,
  proximamente: EstadoInscripcion.PROXIMAMENTE,
  cerrada: EstadoInscripcion.CERRADA,
};

const DISTANCIA_MAP: Record<string, TipoDistancia> = {
  Maratón: TipoDistancia.MARATON,
  "Media maratón": TipoDistancia.MEDIA_MARATON,
  "10K": TipoDistancia.KM_10,
  "20K": TipoDistancia.KM_20,
  "Ultra maratón": TipoDistancia.ULTRA,
  Trail: TipoDistancia.OTRA,
};

const TERRENO_MAP: Record<string, TipoTerreno> = {
  Asfalto: TipoTerreno.ASFALTO,
  Trail: TipoTerreno.TRAIL,
  Mixto: TipoTerreno.MIXTO,
};

async function main() {
  const carreras = raw as CarreraSemilla[];
  console.log(`Sembrando ${carreras.length} carreras...`);

  for (const r of carreras) {
    const slug = slugify(r.id, r.name);
    const anioActual = Number(r.date.slice(0, 4));

    const evento = await prisma.evento.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        slug,
        nombre: r.name,
        ciudad: r.city,
        pais: r.country,
        continente: CONTINENTE_MAP[r.continent] ?? Continente.EUROPA,
        lat: r.lat,
        lng: r.lng,
        sitioWeb: r.web,
        aeropuerto: r.airport,
        zonaHoteles: r.hotel,
        bandera: r.flag,
        colorPrimario: r.g[0],
        colorSecundario: r.g[1],
        esWorldMarathonMajor: r.major,
        descripcion: r.desc,
        climaTempPromedioC: r.temp,
      },
      update: {
        slug,
        nombre: r.name,
        ciudad: r.city,
        pais: r.country,
        continente: CONTINENTE_MAP[r.continent] ?? Continente.EUROPA,
        lat: r.lat,
        lng: r.lng,
        sitioWeb: r.web,
        aeropuerto: r.airport,
        zonaHoteles: r.hotel,
        bandera: r.flag,
        colorPrimario: r.g[0],
        colorSecundario: r.g[1],
        esWorldMarathonMajor: r.major,
        descripcion: r.desc,
        climaTempPromedioC: r.temp,
      },
    });

    const edicionActual = await prisma.edicion.upsert({
      where: { eventoId_anio: { eventoId: evento.id, anio: anioActual } },
      create: {
        eventoId: evento.id,
        anio: anioActual,
        fecha: new Date(r.date + "T07:00:00Z"),
        estado: ESTADO_MAP[r.status] ?? EstadoInscripcion.PROXIMAMENTE,
        precioDesde: r.price,
        moneda: r.cur,
        numCorredores: r.runners,
        desnivelPositivoM: r.elev,
        perfilElevacion: r.profile,
        tiempoLimite: r.limit,
        dificultad: r.diff,
        ratingPromedio: r.rating,
        numResenas: r.nrev,
        urlInscripcionOficial: r.web,
        recordMasculino: r.recM,
        recordFemenino: r.recF,
      },
      update: {
        fecha: new Date(r.date + "T07:00:00Z"),
        estado: ESTADO_MAP[r.status] ?? EstadoInscripcion.PROXIMAMENTE,
        precioDesde: r.price,
        moneda: r.cur,
        numCorredores: r.runners,
        desnivelPositivoM: r.elev,
        perfilElevacion: r.profile,
        tiempoLimite: r.limit,
        dificultad: r.diff,
        ratingPromedio: r.rating,
        numResenas: r.nrev,
        urlInscripcionOficial: r.web,
        recordMasculino: r.recM,
        recordFemenino: r.recF,
      },
    });

    await prisma.distancia.deleteMany({ where: { edicionId: edicionActual.id } });
    await prisma.distancia.create({
      data: {
        eventoId: evento.id,
        edicionId: edicionActual.id,
        tipo: DISTANCIA_MAP[r.dist] ?? TipoDistancia.OTRA,
        km: r.km,
        terreno: TERRENO_MAP[r.type] ?? TipoTerreno.ASFALTO,
        precio: r.price,
      },
    });

    for (const h of r.history) {
      await prisma.edicion.upsert({
        where: { eventoId_anio: { eventoId: evento.id, anio: h.y } },
        create: {
          eventoId: evento.id,
          anio: h.y,
          fecha: new Date(`${h.y}-06-01T07:00:00Z`),
          estado: EstadoInscripcion.CERRADA,
          precioDesde: h.p,
          moneda: r.cur,
          numCorredores: h.r,
        },
        update: {
          precioDesde: h.p,
          numCorredores: h.r,
        },
      });
    }
  }

  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
