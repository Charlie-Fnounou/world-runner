import type { EstadoInscripcion } from "./types";

export type Idioma = "es" | "en" | "pt" | "fr";

export const IDIOMA_POR_DEFECTO: Idioma = "es";

export const IDIOMAS: { codigo: Idioma; nombre: string; bandera: string }[] = [
  { codigo: "es", nombre: "Español", bandera: "🇪🇸" },
  { codigo: "en", nombre: "English", bandera: "🇬🇧" },
  { codigo: "pt", nombre: "Português", bandera: "🇧🇷" },
  { codigo: "fr", nombre: "Français", bandera: "🇫🇷" },
];

export interface Diccionario {
  nav: {
    explorar: string;
    calendario: string;
    rankings: string;
    comparar: string;
    viaje: string;
    ia: string;
    perfil: string;
    entrar: string;
    admin: string;
    salir: string;
    abrirMenu: string;
    cerrarMenu: string;
    menu: string;
    cambiarTema: string;
    seguinosInstagram: string;
  };
  footer: {
    seguinos: string;
  };
  login: {
    titulo: string;
    subtitulo: string;
    emailPlaceholder: string;
    enviando: string;
    enviarBoton: string;
    exito: string;
    o: string;
    continuarGoogle: string;
  };
  home: {
    heroTitulo1: string;
    heroTitulo2: string;
    heroDescripcion: string;
    buscarPlaceholder: string;
    statsCarreras: (n: number, paises: number) => string;
    destacadas: string;
    proximasAperturas: string;
    mapaMundial: string;
    encontradas: (n: number) => string;
    ordenadasPorFecha: string;
    sinResultadosTitulo: string;
    sinResultadosTexto: string;
    proponerCarrera: string;
    lista: string;
    mapa: string;
    cualquierEstado: string;
  };
  raceCard: {
    distancia: string;
    fecha: string;
    desde: string;
    sinResenas: string;
    favorito: string;
  };
}

export const DICCIONARIOS: Record<Idioma, Diccionario> = {
  es: {
    nav: {
      explorar: "Explorar",
      calendario: "Calendario",
      rankings: "Rankings",
      comparar: "Comparar",
      viaje: "Viaje",
      ia: "IA ✨",
      perfil: "Perfil",
      entrar: "Entrar",
      admin: "Admin",
      salir: "Salir",
      abrirMenu: "Abrir menú",
      cerrarMenu: "Cerrar menú",
      menu: "Menú",
      cambiarTema: "Cambiar tema",
      seguinosInstagram: "Síguenos en Instagram",
    },
    footer: { seguinos: "Síguenos en Instagram" },
    login: {
      titulo: "Entrar a The World Runner",
      subtitulo: "Guarda tus favoritos, recibe alertas y sigue tus carreras completadas.",
      emailPlaceholder: "tu@correo.com",
      enviando: "Enviando…",
      enviarBoton: "Enviarme un link para entrar",
      exito: "✅ Revisa tu correo y haz clic en el link para entrar.",
      o: "o",
      continuarGoogle: "Continuar con Google",
    },
    home: {
      heroTitulo1: "Toda carrera.",
      heroTitulo2: "Todo el planeta.",
      heroDescripcion:
        "Descubre, compara y planifica maratones, medias maratones, 10K, trails y ultras en cualquier país, con links de inscripción oficiales.",
      buscarPlaceholder: "Busca una carrera, ciudad o país (ej. medellin, maraton berlim)",
      statsCarreras: (n, paises) => `${n} carreras verificadas en ${paises} países`,
      destacadas: "★ Carreras destacadas",
      proximasAperturas: "Próximas aperturas e inscripciones abiertas",
      mapaMundial: "Mapa mundial",
      encontradas: (n) => `${n} carrera${n !== 1 ? "s" : ""} encontrada${n !== 1 ? "s" : ""}`,
      ordenadasPorFecha: "ordenadas por fecha",
      sinResultadosTitulo: "No hay carreras con esos filtros",
      sinResultadosTexto: "Prueba con otra distancia, continente o estado, o limpia la búsqueda.",
      proponerCarrera: "¿No encontraste tu carrera? Proponela acá →",
      lista: "☰ Lista",
      mapa: "🗺 Mapa",
      cualquierEstado: "Cualquier estado",
    },
    raceCard: { distancia: "distancia", fecha: "fecha", desde: "desde", sinResenas: "sin reseñas", favorito: "Favorito" },
  },
  en: {
    nav: {
      explorar: "Explore",
      calendario: "Calendar",
      rankings: "Rankings",
      comparar: "Compare",
      viaje: "Trip",
      ia: "AI ✨",
      perfil: "Profile",
      entrar: "Sign in",
      admin: "Admin",
      salir: "Sign out",
      abrirMenu: "Open menu",
      cerrarMenu: "Close menu",
      menu: "Menu",
      cambiarTema: "Toggle theme",
      seguinosInstagram: "Follow us on Instagram",
    },
    footer: { seguinos: "Follow us on Instagram" },
    login: {
      titulo: "Sign in to The World Runner",
      subtitulo: "Save your favorites, get alerts, and track your completed races.",
      emailPlaceholder: "you@email.com",
      enviando: "Sending…",
      enviarBoton: "Email me a sign-in link",
      exito: "✅ Check your email and click the link to sign in.",
      o: "or",
      continuarGoogle: "Continue with Google",
    },
    home: {
      heroTitulo1: "Every race.",
      heroTitulo2: "The whole planet.",
      heroDescripcion:
        "Discover, compare and plan marathons, half marathons, 10Ks, trails and ultras in any country, with official registration links.",
      buscarPlaceholder: "Search a race, city or country (e.g. medellin, berlin marathon)",
      statsCarreras: (n, paises) => `${n} verified races in ${paises} countries`,
      destacadas: "★ Featured races",
      proximasAperturas: "Upcoming and open registrations",
      mapaMundial: "World map",
      encontradas: (n) => `${n} race${n !== 1 ? "s" : ""} found`,
      ordenadasPorFecha: "sorted by date",
      sinResultadosTitulo: "No races match those filters",
      sinResultadosTexto: "Try another distance, continent or status, or clear the search.",
      proponerCarrera: "Can't find your race? Suggest it here →",
      lista: "☰ List",
      mapa: "🗺 Map",
      cualquierEstado: "Any status",
    },
    raceCard: { distancia: "distance", fecha: "date", desde: "from", sinResenas: "no reviews yet", favorito: "Favorite" },
  },
  pt: {
    nav: {
      explorar: "Explorar",
      calendario: "Calendário",
      rankings: "Rankings",
      comparar: "Comparar",
      viaje: "Viagem",
      ia: "IA ✨",
      perfil: "Perfil",
      entrar: "Entrar",
      admin: "Admin",
      salir: "Sair",
      abrirMenu: "Abrir menu",
      cerrarMenu: "Fechar menu",
      menu: "Menu",
      cambiarTema: "Mudar tema",
      seguinosInstagram: "Siga-nos no Instagram",
    },
    footer: { seguinos: "Siga-nos no Instagram" },
    login: {
      titulo: "Entrar em The World Runner",
      subtitulo: "Salve seus favoritos, receba alertas e acompanhe suas corridas concluídas.",
      emailPlaceholder: "seu@email.com",
      enviando: "Enviando…",
      enviarBoton: "Enviar link de acesso",
      exito: "✅ Confira seu email e clique no link para entrar.",
      o: "ou",
      continuarGoogle: "Continuar com Google",
    },
    home: {
      heroTitulo1: "Toda corrida.",
      heroTitulo2: "O planeta inteiro.",
      heroDescripcion:
        "Descubra, compare e planeje maratonas, meias maratonas, 10K, trails e ultras em qualquer país, com links oficiais de inscrição.",
      buscarPlaceholder: "Busque uma corrida, cidade ou país (ex. medellin, maratona berlim)",
      statsCarreras: (n, paises) => `${n} corridas verificadas em ${paises} países`,
      destacadas: "★ Corridas em destaque",
      proximasAperturas: "Próximas aberturas e inscrições abertas",
      mapaMundial: "Mapa mundial",
      encontradas: (n) => `${n} corrida${n !== 1 ? "s" : ""} encontrada${n !== 1 ? "s" : ""}`,
      ordenadasPorFecha: "ordenadas por data",
      sinResultadosTitulo: "Nenhuma corrida com esses filtros",
      sinResultadosTexto: "Tente outra distância, continente ou status, ou limpe a busca.",
      proponerCarrera: "Não encontrou sua corrida? Sugira aqui →",
      lista: "☰ Lista",
      mapa: "🗺 Mapa",
      cualquierEstado: "Qualquer status",
    },
    raceCard: { distancia: "distância", fecha: "data", desde: "a partir de", sinResenas: "sem avaliações", favorito: "Favorito" },
  },
  fr: {
    nav: {
      explorar: "Explorer",
      calendario: "Calendrier",
      rankings: "Classements",
      comparar: "Comparer",
      viaje: "Voyage",
      ia: "IA ✨",
      perfil: "Profil",
      entrar: "Connexion",
      admin: "Admin",
      salir: "Déconnexion",
      abrirMenu: "Ouvrir le menu",
      cerrarMenu: "Fermer le menu",
      menu: "Menu",
      cambiarTema: "Changer de thème",
      seguinosInstagram: "Suivez-nous sur Instagram",
    },
    footer: { seguinos: "Suivez-nous sur Instagram" },
    login: {
      titulo: "Se connecter à The World Runner",
      subtitulo: "Enregistrez vos favoris, recevez des alertes et suivez vos courses terminées.",
      emailPlaceholder: "vous@email.com",
      enviando: "Envoi…",
      enviarBoton: "M'envoyer un lien de connexion",
      exito: "✅ Consultez votre email et cliquez sur le lien pour vous connecter.",
      o: "ou",
      continuarGoogle: "Continuer avec Google",
    },
    home: {
      heroTitulo1: "Chaque course.",
      heroTitulo2: "Toute la planète.",
      heroDescripcion:
        "Découvrez, comparez et planifiez marathons, semi-marathons, 10 km, trails et ultras dans n'importe quel pays, avec liens d'inscription officiels.",
      buscarPlaceholder: "Cherchez une course, ville ou pays (ex. medellin, marathon berlin)",
      statsCarreras: (n, paises) => `${n} courses vérifiées dans ${paises} pays`,
      destacadas: "★ Courses à la une",
      proximasAperturas: "Prochaines ouvertures et inscriptions ouvertes",
      mapaMundial: "Carte du monde",
      encontradas: (n) => `${n} course${n !== 1 ? "s" : ""} trouvée${n !== 1 ? "s" : ""}`,
      ordenadasPorFecha: "triées par date",
      sinResultadosTitulo: "Aucune course avec ces filtres",
      sinResultadosTexto: "Essayez une autre distance, un autre continent ou statut, ou effacez la recherche.",
      proponerCarrera: "Vous ne trouvez pas votre course ? Proposez-la ici →",
      lista: "☰ Liste",
      mapa: "🗺 Carte",
      cualquierEstado: "Tout statut",
    },
    raceCard: { distancia: "distance", fecha: "date", desde: "à partir de", sinResenas: "aucun avis", favorito: "Favori" },
  },
};

// Traducción de valores fijos (distancias/continentes/estados) que
// además son las claves internas usadas para filtrar — nunca se
// traduce el VALOR guardado en el estado del filtro, solo lo que se
// muestra en pantalla, para no romper ninguna comparación existente.
const ETIQUETAS_DISTANCIA: Record<Idioma, Record<string, string>> = {
  es: { Todas: "Todas", Maratón: "Maratón", "Media maratón": "Media maratón", "10K": "10K", "20K": "20K", "Ultra maratón": "Ultra maratón", Trail: "Trail" },
  en: { Todas: "All", Maratón: "Marathon", "Media maratón": "Half marathon", "10K": "10K", "20K": "20K", "Ultra maratón": "Ultra marathon", Trail: "Trail" },
  pt: { Todas: "Todas", Maratón: "Maratona", "Media maratón": "Meia maratona", "10K": "10K", "20K": "20K", "Ultra maratón": "Ultra maratona", Trail: "Trail" },
  fr: { Todas: "Toutes", Maratón: "Marathon", "Media maratón": "Semi-marathon", "10K": "10K", "20K": "20K", "Ultra maratón": "Ultra marathon", Trail: "Trail" },
};

const ETIQUETAS_CONTINENTE: Record<Idioma, Record<string, string>> = {
  es: { Todos: "Todos", Europa: "Europa", "América del Norte": "América del Norte", "América Central": "América Central", "América del Sur": "América del Sur", Asia: "Asia", África: "África", Oceanía: "Oceanía" },
  en: { Todos: "All", Europa: "Europe", "América del Norte": "North America", "América Central": "Central America", "América del Sur": "South America", Asia: "Asia", África: "Africa", Oceanía: "Oceania" },
  pt: { Todos: "Todos", Europa: "Europa", "América del Norte": "América do Norte", "América Central": "América Central", "América del Sur": "América do Sul", Asia: "Ásia", África: "África", Oceanía: "Oceania" },
  fr: { Todos: "Tous", Europa: "Europe", "América del Norte": "Amérique du Nord", "América Central": "Amérique centrale", "América del Sur": "Amérique du Sud", Asia: "Asie", África: "Afrique", Oceanía: "Océanie" },
};

const ETIQUETAS_ESTADO: Record<Idioma, Record<EstadoInscripcion, string>> = {
  es: { abierta: "Inscripción abierta", ultimos: "Últimos cupos", sorteo: "Sorteo / ballot", proximamente: "Abre pronto", cerrada: "Inscripción cerrada" },
  en: { abierta: "Registration open", ultimos: "Few spots left", sorteo: "Lottery / ballot", proximamente: "Opens soon", cerrada: "Registration closed" },
  pt: { abierta: "Inscrição aberta", ultimos: "Últimas vagas", sorteo: "Sorteio / ballot", proximamente: "Abre em breve", cerrada: "Inscrição encerrada" },
  fr: { abierta: "Inscription ouverte", ultimos: "Dernières places", sorteo: "Tirage au sort", proximamente: "Ouvre bientôt", cerrada: "Inscription fermée" },
};

export function traducirDistancia(valor: string, idioma: Idioma): string {
  return ETIQUETAS_DISTANCIA[idioma][valor] ?? valor;
}

export function traducirContinente(valor: string, idioma: Idioma): string {
  return ETIQUETAS_CONTINENTE[idioma][valor] ?? valor;
}

export function traducirEstado(valor: EstadoInscripcion, idioma: Idioma): string {
  return ETIQUETAS_ESTADO[idioma][valor];
}
