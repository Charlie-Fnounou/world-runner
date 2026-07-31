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
    viendoPais: (v: string) => string;
    viendoCiudad: (v: string) => string;
    seguirLugar: string;
    siguiendoLugar: string;
    dejarDeSeguir: string;
    seguimientoAviso: string;
  };
  raceCard: {
    distancia: string;
    fecha: string;
    desde: string;
    sinResenas: string;
    favorito: string;
  };
  raceDetail: {
    volver: string;
    cta: { abierta: string; cerrada: string; sorteo: string; proximamente: string };
    alertasTitulo: string;
    alertasActivas: string;
    datos: {
      distancia: string;
      precioDesde: string;
      corredores: string;
      desnivel: string;
      tempPromedio: string;
      tiempoLimite: string;
      dificultad: string;
      valoracion: string;
      sinValoraciones: string;
    };
    sobreLaCarrera: string;
    amenities: string[];
    historialEdiciones: string;
    colEdicion: string;
    colCorredores: string;
    colPrecio: string;
    historialNota: string;
    perfilElevacion: string;
    desnivelAcumulado: (n: string) => string;
    records: string;
    masculino: string;
    femenino: string;
    yaLaCorriste: string;
    marcadaComoCorrida: string;
    tiempoPlaceholder: string;
    marcarComoCorrida: string;
    informacionPractica: string;
    aeropuerto: string;
    zonaHoteles: string;
    sitioOficial: string;
    reportarError: string;
    checklistTitulo: string;
    checklist: string[];
    dejaResena: string;
    resenasCorredores: string;
  };
  resena: {
    categorias: {
      organizacion: string;
      paisajes: string;
      dificultad: string;
      medalla: string;
      camiseta: string;
      hidratacion: string;
      expo: string;
      seguridad: string;
      calidadPrecio: string;
    };
    estrellasAria: (n: number) => string;
    errorFaltantes: string;
    errorGuardar: string;
    gracias: string;
    comentarioPlaceholder: string;
    guardando: string;
    publicar: string;
    sinResenas: string;
  };
  asistente: {
    titulo: string;
    descripcion: string;
    placeholder: string;
    pensando: string;
    preguntar: string;
    analizando: string;
    errorNoConfigurado: string;
    errorGenerico: string;
    ejemplos: string[];
  };
  mapa: {
    verCarrera: string;
  };
  rankings: {
    titulo: string;
    subtitulo: string;
    tabs: { rapidas: string; populares: string; economicas: string; dificiles: string; valoradas: string; frescas: string };
    corredoresSufijo: string;
    sinDatos: string;
  };
  comparar: {
    titulo: string;
    faltanCarreras: string;
    verFicha: string;
    filas: {
      fecha: string;
      distancia: string;
      precio: string;
      corredores: string;
      desnivel: string;
      tempPromedio: string;
      tiempoLimite: string;
      dificultad: string;
      valoracion: string;
      estado: string;
    };
  };
  viaje: {
    titulo: string;
    descripcion: string;
    destinoLabel: string;
    destinoPlaceholder: string;
    desdeLabel: string;
    hastaLabel: string;
    vacioTitulo: string;
    vacioTexto: string;
    sinResultadosTitulo: string;
    sinResultadosTexto: string;
    resultados: (n: number) => string;
  };
  perfil: {
    corredorDesde: (fecha: string) => string;
    statCarrerasCompletadas: string;
    statKmEnCarrera: string;
    statPaises: string;
    statFavoritas: string;
    mapaPersonal: string;
    logrosTitulo: string;
    logros: {
      primer10k: string;
      primeraMedia: string;
      primerMaraton: string;
      cincoPaises: string;
      diezCarreras: string;
      unaMajor: string;
      sixStar: string;
      primerTrail: string;
      primeraResena: string;
    };
    desbloqueado: string;
    bloqueado: string;
    carrerasCorridas: string;
    quitar: string;
    proximasFavoritos: string;
    sinFavoritos: string;
    alertasActivasTitulo: string;
    sinAlertas: string;
  };
  calendario: {
    titulo: string;
    diasSemana: [string, string, string, string, string, string, string];
    ayuda: string;
    fechaLarga: (dia: number, mes: string) => string;
    carrerasDia: (n: number) => string;
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
      viendoPais: (v) => `Mostrando carreras de ${v}`,
      viendoCiudad: (v) => `Mostrando carreras en ${v}`,
      seguirLugar: "🔔 Seguir",
      siguiendoLugar: "✅ Siguiendo",
      dejarDeSeguir: "Dejar de seguir",
      seguimientoAviso: "Te va a llegar un resumen semanal por correo con las próximas carreras de acá.",
    },
    raceCard: { distancia: "distancia", fecha: "fecha", desde: "desde", sinResenas: "sin reseñas", favorito: "Favorito" },
    raceDetail: {
      volver: "← Volver",
      cta: {
        abierta: "Inscribirse ahora ↗",
        cerrada: "Sitio oficial ↗",
        sorteo: "Entrar al sorteo ↗",
        proximamente: "Ver convocatoria ↗",
      },
      alertasTitulo: "Alertas de esta carrera",
      alertasActivas:
        "🔔 Alertas activas: te avisaremos si cambia el precio, quedan pocos cupos, cambia la fecha o el recorrido, o abre/cierra la inscripción.",
      datos: {
        distancia: "Distancia",
        precioDesde: "Precio desde",
        corredores: "Corredores",
        desnivel: "Desnivel +",
        tempPromedio: "Temp. promedio",
        tiempoLimite: "Tiempo límite",
        dificultad: "Dificultad",
        valoracion: "Valoración",
        sinValoraciones: "Sin valoraciones",
      },
      sobreLaCarrera: "Sobre la carrera",
      amenities: ["🏅 Medalla finisher", "👕 Camiseta oficial", "💧 Hidratación en ruta", "🎪 Expo del corredor", "📸 Fotos oficiales", "🚑 Asistencia médica"],
      historialEdiciones: "Historial de ediciones",
      colEdicion: "Edición",
      colCorredores: "Corredores*",
      colPrecio: "Precio*",
      historialNota: "* Estimado a partir de la edición actual. Se reemplaza por datos reales cuando los robots registren cada edición.",
      perfilElevacion: "Perfil de elevación",
      desnivelAcumulado: (n) => `Desnivel positivo acumulado: ${n} m`,
      records: "Récords",
      masculino: "Masculino",
      femenino: "Femenino",
      yaLaCorriste: "¿Ya la corriste?",
      marcadaComoCorrida: "✅ Marcada como corrida · quitar",
      tiempoPlaceholder: "Tu tiempo (opcional), ej. 3:45:12",
      marcarComoCorrida: "Marcar como corrida",
      informacionPractica: "Información práctica",
      aeropuerto: "Aeropuerto",
      zonaHoteles: "Zona de hoteles",
      sitioOficial: "Sitio oficial",
      reportarError: "⚠️ Reportar un error en esta carrera",
      checklistTitulo: "Checklist del corredor",
      checklist: [
        "Inscripción confirmada",
        "Pasaporte vigente",
        "Visa (si aplica)",
        "Seguro de viaje",
        "Vuelo reservado",
        "Hotel reservado",
        "Recogida de dorsal agendada",
        "Chip / dorsal",
        "Equipamiento probado",
        "Plan de hidratación",
        "Transporte a la salida",
        "Visita a la Expo",
      ],
      dejaResena: "Dejá tu reseña",
      resenasCorredores: "Reseñas de corredores",
    },
    resena: {
      categorias: {
        organizacion: "Organización",
        paisajes: "Paisajes",
        dificultad: "Dificultad",
        medalla: "Medalla",
        camiseta: "Camiseta",
        hidratacion: "Hidratación",
        expo: "Expo del corredor",
        seguridad: "Seguridad",
        calidadPrecio: "Calidad/precio",
      },
      estrellasAria: (n) => `${n} estrellas`,
      errorFaltantes: "Calificá todas las categorías antes de enviar.",
      errorGuardar: "No pudimos guardar tu reseña. Intenta de nuevo.",
      gracias: "✅ ¡Gracias por tu reseña! Ya se sumó al promedio de esta carrera.",
      comentarioPlaceholder: "Contá tu experiencia (opcional)",
      guardando: "Guardando…",
      publicar: "Publicar reseña",
      sinResenas: "Todavía no hay reseñas de esta carrera. ¡Sé el primero en dejar una!",
    },
    asistente: {
      titulo: "Asistente IA",
      descripcion:
        "Describe tu objetivo con tus palabras y el asistente elegirá las mejores carreras usando todos los datos de la plataforma.",
      placeholder: "p. ej. «Quiero bajar de 3:30 en maratón: busco algo plano, fresco y con inscripción abierta»",
      pensando: "Pensando…",
      preguntar: "Preguntar",
      analizando: "Analizando fechas, precios, clima y desniveles…",
      errorNoConfigurado: "El asistente todavía no está activado. Hace falta configurar la clave de la IA.",
      errorGenerico: "No pude consultar al asistente en este momento. Inténtalo de nuevo.",
      ejemplos: [
        "Quiero correr una media maratón en octubre por menos de $150",
        "Un maratón plano y fresco para hacer mi mejor marca en 2027",
        "Quiero correr 4 carreras este año gastando poco, cerca de Latinoamérica",
        "Recomiéndame un trail épico para mi primera ultra",
      ],
    },
    mapa: { verCarrera: "Ver carrera →" },
    rankings: {
      titulo: "Rankings mundiales",
      subtitulo: "Generados automáticamente a partir de los datos de cada carrera.",
      tabs: {
        rapidas: "⚡ Más rápidas",
        populares: "👥 Más populares",
        economicas: "💰 Más económicas",
        dificiles: "🔥 Más difíciles",
        valoradas: "⭐ Mejor valoradas",
        frescas: "❄️ Mejor clima frío",
      },
      corredoresSufijo: "corredores",
      sinDatos: "Todavía no hay suficientes carreras para este ranking.",
    },
    comparar: {
      titulo: "Comparador",
      faltanCarreras: "Hacen falta al menos 2 carreras para comparar.",
      verFicha: "Ver ficha →",
      filas: {
        fecha: "Fecha",
        distancia: "Distancia",
        precio: "Precio",
        corredores: "Corredores",
        desnivel: "Desnivel +",
        tempPromedio: "Temp. promedio",
        tiempoLimite: "Tiempo límite",
        dificultad: "Dificultad",
        valoracion: "Valoración",
        estado: "Estado",
      },
    },
    viaje: {
      titulo: "Corre durante tu viaje",
      descripcion:
        "Decinos a dónde vas y cuándo, y te mostramos todas las carreras disponibles en ese destino y rango de fechas. Ej.: «Japón» del 1 al 15 de marzo.",
      destinoLabel: "Destino (país, ciudad o continente)",
      destinoPlaceholder: "p. ej. España, Japón, Europa…",
      desdeLabel: "Desde",
      hastaLabel: "Hasta",
      vacioTitulo: "Planifica tu próximo viaje corriendo",
      vacioTexto: "Escribe un destino o elige fechas para empezar.",
      sinResultadosTitulo: "No encontramos carreras en ese destino y fechas",
      sinResultadosTexto: "Prueba ampliando el rango o buscando por país o continente.",
      resultados: (n) => `${n} carrera${n !== 1 ? "s" : ""} durante tu viaje:`,
    },
    perfil: {
      corredorDesde: (fecha) => `Corredor/a desde ${fecha}`,
      statCarrerasCompletadas: "Carreras completadas",
      statKmEnCarrera: "Km en carrera",
      statPaises: "Países",
      statFavoritas: "Favoritas",
      mapaPersonal: "Mapa personal · dónde has corrido",
      logrosTitulo: "Logros",
      logros: {
        primer10k: "Primer 10K",
        primeraMedia: "Primera media",
        primerMaraton: "Primer maratón",
        cincoPaises: "5 países",
        diezCarreras: "10 carreras",
        unaMajor: "Una Major",
        sixStar: "Six Star Finisher",
        primerTrail: "Primer trail",
        primeraResena: "Primera reseña",
      },
      desbloqueado: "Desbloqueado",
      bloqueado: "Bloqueado",
      carrerasCorridas: "Carreras corridas",
      quitar: "Quitar",
      proximasFavoritos: "Próximas carreras (tus favoritos)",
      sinFavoritos: "Marca ❤️ en cualquier carrera para verla aquí con su cuenta regresiva.",
      alertasActivasTitulo: "🔔 Alertas activas",
      sinAlertas:
        "Activa la campanita 🔔 en la ficha de una carrera para recibir avisos de apertura de inscripciones, cambios de precio, pocos cupos, cambios de fecha o recorrido.",
    },
    calendario: {
      titulo: "Calendario mundial",
      diasSemana: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      ayuda: "Los colores indican el estado de inscripción. Toca un día con carreras para ver el detalle.",
      fechaLarga: (dia, mes) => `${dia} de ${mes}`,
      carrerasDia: (n) => `${n} carrera${n !== 1 ? "s" : ""}`,
    },
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
      viendoPais: (v) => `Showing races in ${v}`,
      viendoCiudad: (v) => `Showing races in ${v}`,
      seguirLugar: "🔔 Follow",
      siguiendoLugar: "✅ Following",
      dejarDeSeguir: "Unfollow",
      seguimientoAviso: "You'll get a weekly email summary with upcoming races here.",
    },
    raceCard: { distancia: "distance", fecha: "date", desde: "from", sinResenas: "no reviews yet", favorito: "Favorite" },
    raceDetail: {
      volver: "← Back",
      cta: {
        abierta: "Register now ↗",
        cerrada: "Official site ↗",
        sorteo: "Enter the lottery ↗",
        proximamente: "See details ↗",
      },
      alertasTitulo: "Alerts for this race",
      alertasActivas:
        "🔔 Alerts active: we'll notify you if the price changes, spots run low, the date or route changes, or registration opens/closes.",
      datos: {
        distancia: "Distance",
        precioDesde: "Price from",
        corredores: "Runners",
        desnivel: "Elevation +",
        tempPromedio: "Avg. temp.",
        tiempoLimite: "Time limit",
        dificultad: "Difficulty",
        valoracion: "Rating",
        sinValoraciones: "No ratings yet",
      },
      sobreLaCarrera: "About the race",
      amenities: ["🏅 Finisher medal", "👕 Official t-shirt", "💧 Water stations", "🎪 Runner expo", "📸 Official photos", "🚑 Medical assistance"],
      historialEdiciones: "Edition history",
      colEdicion: "Edition",
      colCorredores: "Runners*",
      colPrecio: "Price*",
      historialNota: "* Estimated from the current edition. Replaced with real data as robots record each edition.",
      perfilElevacion: "Elevation profile",
      desnivelAcumulado: (n) => `Total elevation gain: ${n} m`,
      records: "Records",
      masculino: "Men's",
      femenino: "Women's",
      yaLaCorriste: "Have you run it?",
      marcadaComoCorrida: "✅ Marked as completed · remove",
      tiempoPlaceholder: "Your time (optional), e.g. 3:45:12",
      marcarComoCorrida: "Mark as completed",
      informacionPractica: "Practical information",
      aeropuerto: "Airport",
      zonaHoteles: "Hotel area",
      sitioOficial: "Official site",
      reportarError: "⚠️ Report an error in this race",
      checklistTitulo: "Runner's checklist",
      checklist: [
        "Registration confirmed",
        "Valid passport",
        "Visa (if applicable)",
        "Travel insurance",
        "Flight booked",
        "Hotel booked",
        "Bib pickup scheduled",
        "Chip / bib",
        "Gear tested",
        "Hydration plan",
        "Transport to the start",
        "Expo visit",
      ],
      dejaResena: "Leave your review",
      resenasCorredores: "Runner reviews",
    },
    resena: {
      categorias: {
        organizacion: "Organization",
        paisajes: "Scenery",
        dificultad: "Difficulty",
        medalla: "Medal",
        camiseta: "T-shirt",
        hidratacion: "Hydration",
        expo: "Runner expo",
        seguridad: "Safety",
        calidadPrecio: "Value for money",
      },
      estrellasAria: (n) => `${n} stars`,
      errorFaltantes: "Rate every category before submitting.",
      errorGuardar: "We couldn't save your review. Please try again.",
      gracias: "✅ Thanks for your review! It's now part of this race's average rating.",
      comentarioPlaceholder: "Tell us about your experience (optional)",
      guardando: "Saving…",
      publicar: "Post review",
      sinResenas: "No reviews for this race yet. Be the first to leave one!",
    },
    asistente: {
      titulo: "AI Assistant",
      descripcion:
        "Describe your goal in your own words and the assistant will pick the best races using all the platform's data.",
      placeholder: "e.g. «I want to break 3:30 in a marathon: looking for something flat, cool and with open registration»",
      pensando: "Thinking…",
      preguntar: "Ask",
      analizando: "Analyzing dates, prices, weather and elevation…",
      errorNoConfigurado: "The assistant isn't activated yet. The AI key needs to be configured.",
      errorGenerico: "I couldn't reach the assistant right now. Please try again.",
      ejemplos: [
        "I want to run a half marathon in October for under $150",
        "A flat, cool marathon to set my best time in 2027",
        "I want to run 4 races this year on a budget, near Latin America",
        "Recommend an epic trail race for my first ultra",
      ],
    },
    mapa: { verCarrera: "View race →" },
    rankings: {
      titulo: "World rankings",
      subtitulo: "Automatically generated from each race's data.",
      tabs: {
        rapidas: "⚡ Fastest",
        populares: "👥 Most popular",
        economicas: "💰 Most affordable",
        dificiles: "🔥 Toughest",
        valoradas: "⭐ Top rated",
        frescas: "❄️ Coolest climate",
      },
      corredoresSufijo: "runners",
      sinDatos: "Not enough races yet for this ranking.",
    },
    comparar: {
      titulo: "Compare",
      faltanCarreras: "You need at least 2 races to compare.",
      verFicha: "View race →",
      filas: {
        fecha: "Date",
        distancia: "Distance",
        precio: "Price",
        corredores: "Runners",
        desnivel: "Elevation +",
        tempPromedio: "Avg. temp.",
        tiempoLimite: "Time limit",
        dificultad: "Difficulty",
        valoracion: "Rating",
        estado: "Status",
      },
    },
    viaje: {
      titulo: "Run during your trip",
      descripcion:
        "Tell us where you're going and when, and we'll show you every race available at that destination and date range. E.g.: «Japan» from March 1 to 15.",
      destinoLabel: "Destination (country, city or continent)",
      destinoPlaceholder: "e.g. Spain, Japan, Europe…",
      desdeLabel: "From",
      hastaLabel: "To",
      vacioTitulo: "Plan your next running trip",
      vacioTexto: "Type a destination or pick dates to get started.",
      sinResultadosTitulo: "We couldn't find races for that destination and dates",
      sinResultadosTexto: "Try widening the range or searching by country or continent.",
      resultados: (n) => `${n} race${n !== 1 ? "s" : ""} during your trip:`,
    },
    perfil: {
      corredorDesde: (fecha) => `Runner since ${fecha}`,
      statCarrerasCompletadas: "Completed races",
      statKmEnCarrera: "Km raced",
      statPaises: "Countries",
      statFavoritas: "Favorites",
      mapaPersonal: "Personal map · where you've run",
      logrosTitulo: "Achievements",
      logros: {
        primer10k: "First 10K",
        primeraMedia: "First half",
        primerMaraton: "First marathon",
        cincoPaises: "5 countries",
        diezCarreras: "10 races",
        unaMajor: "One Major",
        sixStar: "Six Star Finisher",
        primerTrail: "First trail",
        primeraResena: "First review",
      },
      desbloqueado: "Unlocked",
      bloqueado: "Locked",
      carrerasCorridas: "Races run",
      quitar: "Remove",
      proximasFavoritos: "Upcoming races (your favorites)",
      sinFavoritos: "Mark ❤️ on any race to see it here with its countdown.",
      alertasActivasTitulo: "🔔 Active alerts",
      sinAlertas:
        "Turn on the 🔔 bell on a race's page to get notified about registration opening, price changes, low spots, or date/route changes.",
    },
    calendario: {
      titulo: "World calendar",
      diasSemana: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      ayuda: "Colors show the registration status. Tap a day with races to see the details.",
      fechaLarga: (dia, mes) => `${mes} ${dia}`,
      carrerasDia: (n) => `${n} race${n !== 1 ? "s" : ""}`,
    },
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
      viendoPais: (v) => `Mostrando corridas de ${v}`,
      viendoCiudad: (v) => `Mostrando corridas em ${v}`,
      seguirLugar: "🔔 Seguir",
      siguiendoLugar: "✅ Seguindo",
      dejarDeSeguir: "Deixar de seguir",
      seguimientoAviso: "Você vai receber um resumo semanal por email com as próximas corridas daqui.",
    },
    raceCard: { distancia: "distância", fecha: "data", desde: "a partir de", sinResenas: "sem avaliações", favorito: "Favorito" },
    raceDetail: {
      volver: "← Voltar",
      cta: {
        abierta: "Inscreva-se agora ↗",
        cerrada: "Site oficial ↗",
        sorteo: "Participar do sorteio ↗",
        proximamente: "Ver detalhes ↗",
      },
      alertasTitulo: "Alertas desta corrida",
      alertasActivas:
        "🔔 Alertas ativos: avisaremos se o preço mudar, restarem poucas vagas, a data ou o percurso mudar, ou a inscrição abrir/fechar.",
      datos: {
        distancia: "Distância",
        precioDesde: "Preço a partir de",
        corredores: "Corredores",
        desnivel: "Desnível +",
        tempPromedio: "Temp. média",
        tiempoLimite: "Tempo limite",
        dificultad: "Dificuldade",
        valoracion: "Avaliação",
        sinValoraciones: "Sem avaliações",
      },
      sobreLaCarrera: "Sobre a corrida",
      amenities: ["🏅 Medalha de finisher", "👕 Camiseta oficial", "💧 Hidratação no percurso", "🎪 Expo do corredor", "📸 Fotos oficiais", "🚑 Assistência médica"],
      historialEdiciones: "Histórico de edições",
      colEdicion: "Edição",
      colCorredores: "Corredores*",
      colPrecio: "Preço*",
      historialNota: "* Estimado a partir da edição atual. Substituído por dados reais conforme os robôs registram cada edição.",
      perfilElevacion: "Perfil de elevação",
      desnivelAcumulado: (n) => `Ganho de elevação total: ${n} m`,
      records: "Recordes",
      masculino: "Masculino",
      femenino: "Feminino",
      yaLaCorriste: "Você já correu?",
      marcadaComoCorrida: "✅ Marcada como concluída · remover",
      tiempoPlaceholder: "Seu tempo (opcional), ex. 3:45:12",
      marcarComoCorrida: "Marcar como concluída",
      informacionPractica: "Informações práticas",
      aeropuerto: "Aeroporto",
      zonaHoteles: "Área de hotéis",
      sitioOficial: "Site oficial",
      reportarError: "⚠️ Reportar um erro nesta corrida",
      checklistTitulo: "Checklist do corredor",
      checklist: [
        "Inscrição confirmada",
        "Passaporte válido",
        "Visto (se aplicável)",
        "Seguro viagem",
        "Voo reservado",
        "Hotel reservado",
        "Retirada do kit agendada",
        "Chip / número",
        "Equipamento testado",
        "Plano de hidratação",
        "Transporte até a largada",
        "Visita à expo",
      ],
      dejaResena: "Deixe sua avaliação",
      resenasCorredores: "Avaliações dos corredores",
    },
    resena: {
      categorias: {
        organizacion: "Organização",
        paisajes: "Paisagens",
        dificultad: "Dificuldade",
        medalla: "Medalha",
        camiseta: "Camiseta",
        hidratacion: "Hidratação",
        expo: "Expo do corredor",
        seguridad: "Segurança",
        calidadPrecio: "Custo-benefício",
      },
      estrellasAria: (n) => `${n} estrelas`,
      errorFaltantes: "Avalie todas as categorias antes de enviar.",
      errorGuardar: "Não foi possível salvar sua avaliação. Tente novamente.",
      gracias: "✅ Obrigado pela sua avaliação! Ela já entrou na média desta corrida.",
      comentarioPlaceholder: "Conte sua experiência (opcional)",
      guardando: "Salvando…",
      publicar: "Publicar avaliação",
      sinResenas: "Ainda não há avaliações desta corrida. Seja o primeiro a deixar uma!",
    },
    asistente: {
      titulo: "Assistente de IA",
      descripcion:
        "Descreva seu objetivo com suas palavras e o assistente vai escolher as melhores corridas usando todos os dados da plataforma.",
      placeholder: "ex. «Quero fazer menos de 3h30 na maratona: busco algo plano, fresco e com inscrição aberta»",
      pensando: "Pensando…",
      preguntar: "Perguntar",
      analizando: "Analisando datas, preços, clima e desnível…",
      errorNoConfigurado: "O assistente ainda não está ativado. É preciso configurar a chave da IA.",
      errorGenerico: "Não consegui consultar o assistente agora. Tente de novo.",
      ejemplos: [
        "Quero correr uma meia maratona em outubro por menos de $150",
        "Uma maratona plana e fresca para bater meu recorde em 2027",
        "Quero correr 4 corridas este ano gastando pouco, perto da América Latina",
        "Recomende um trail épico para minha primeira ultra",
      ],
    },
    mapa: { verCarrera: "Ver corrida →" },
    rankings: {
      titulo: "Rankings mundiais",
      subtitulo: "Gerados automaticamente a partir dos dados de cada corrida.",
      tabs: {
        rapidas: "⚡ Mais rápidas",
        populares: "👥 Mais populares",
        economicas: "💰 Mais baratas",
        dificiles: "🔥 Mais difíceis",
        valoradas: "⭐ Melhor avaliadas",
        frescas: "❄️ Melhor clima frio",
      },
      corredoresSufijo: "corredores",
      sinDatos: "Ainda não há corridas suficientes para este ranking.",
    },
    comparar: {
      titulo: "Comparador",
      faltanCarreras: "São necessárias pelo menos 2 corridas para comparar.",
      verFicha: "Ver corrida →",
      filas: {
        fecha: "Data",
        distancia: "Distância",
        precio: "Preço",
        corredores: "Corredores",
        desnivel: "Desnível +",
        tempPromedio: "Temp. média",
        tiempoLimite: "Tempo limite",
        dificultad: "Dificuldade",
        valoracion: "Avaliação",
        estado: "Status",
      },
    },
    viaje: {
      titulo: "Corra durante sua viagem",
      descripcion:
        "Diga para onde você vai e quando, e mostramos todas as corridas disponíveis nesse destino e período. Ex.: «Japão» de 1 a 15 de março.",
      destinoLabel: "Destino (país, cidade ou continente)",
      destinoPlaceholder: "ex. Espanha, Japão, Europa…",
      desdeLabel: "De",
      hastaLabel: "Até",
      vacioTitulo: "Planeje sua próxima viagem correndo",
      vacioTexto: "Digite um destino ou escolha datas para começar.",
      sinResultadosTitulo: "Não encontramos corridas nesse destino e datas",
      sinResultadosTexto: "Tente ampliar o período ou buscar por país ou continente.",
      resultados: (n) => `${n} corrida${n !== 1 ? "s" : ""} durante sua viagem:`,
    },
    perfil: {
      corredorDesde: (fecha) => `Corredor(a) desde ${fecha}`,
      statCarrerasCompletadas: "Corridas concluídas",
      statKmEnCarrera: "Km em corrida",
      statPaises: "Países",
      statFavoritas: "Favoritas",
      mapaPersonal: "Mapa pessoal · onde você já correu",
      logrosTitulo: "Conquistas",
      logros: {
        primer10k: "Primeiro 10K",
        primeraMedia: "Primeira meia",
        primerMaraton: "Primeira maratona",
        cincoPaises: "5 países",
        diezCarreras: "10 corridas",
        unaMajor: "Uma Major",
        sixStar: "Six Star Finisher",
        primerTrail: "Primeiro trail",
        primeraResena: "Primeira avaliação",
      },
      desbloqueado: "Desbloqueado",
      bloqueado: "Bloqueado",
      carrerasCorridas: "Corridas realizadas",
      quitar: "Remover",
      proximasFavoritos: "Próximas corridas (seus favoritos)",
      sinFavoritos: "Marque ❤️ em qualquer corrida para vê-la aqui com sua contagem regressiva.",
      alertasActivasTitulo: "🔔 Alertas ativos",
      sinAlertas:
        "Ative o sino 🔔 na página de uma corrida para receber avisos de abertura de inscrições, mudanças de preço, poucas vagas, ou mudanças de data/percurso.",
    },
    calendario: {
      titulo: "Calendário mundial",
      diasSemana: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      ayuda: "As cores indicam o status da inscrição. Toque num dia com corridas para ver os detalhes.",
      fechaLarga: (dia, mes) => `${dia} de ${mes}`,
      carrerasDia: (n) => `${n} corrida${n !== 1 ? "s" : ""}`,
    },
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
      viendoPais: (v) => `Affichage des courses en ${v}`,
      viendoCiudad: (v) => `Affichage des courses à ${v}`,
      seguirLugar: "🔔 Suivre",
      siguiendoLugar: "✅ Suivi",
      dejarDeSeguir: "Ne plus suivre",
      seguimientoAviso: "Vous recevrez un résumé hebdomadaire par email avec les prochaines courses ici.",
    },
    raceCard: { distancia: "distance", fecha: "date", desde: "à partir de", sinResenas: "aucun avis", favorito: "Favori" },
    raceDetail: {
      volver: "← Retour",
      cta: {
        abierta: "S'inscrire maintenant ↗",
        cerrada: "Site officiel ↗",
        sorteo: "Participer au tirage au sort ↗",
        proximamente: "Voir les détails ↗",
      },
      alertasTitulo: "Alertes pour cette course",
      alertasActivas:
        "🔔 Alertes actives : nous vous préviendrons si le prix change, s'il reste peu de places, si la date ou le parcours change, ou si l'inscription ouvre/ferme.",
      datos: {
        distancia: "Distance",
        precioDesde: "Prix à partir de",
        corredores: "Coureurs",
        desnivel: "Dénivelé +",
        tempPromedio: "Temp. moyenne",
        tiempoLimite: "Temps limite",
        dificultad: "Difficulté",
        valoracion: "Note",
        sinValoraciones: "Aucun avis",
      },
      sobreLaCarrera: "À propos de la course",
      amenities: ["🏅 Médaille de finisher", "👕 T-shirt officiel", "💧 Ravitaillement en eau", "🎪 Expo coureurs", "📸 Photos officielles", "🚑 Assistance médicale"],
      historialEdiciones: "Historique des éditions",
      colEdicion: "Édition",
      colCorredores: "Coureurs*",
      colPrecio: "Prix*",
      historialNota: "* Estimé à partir de l'édition actuelle. Remplacé par des données réelles au fur et à mesure que les robots enregistrent chaque édition.",
      perfilElevacion: "Profil d'élévation",
      desnivelAcumulado: (n) => `Dénivelé positif total : ${n} m`,
      records: "Records",
      masculino: "Hommes",
      femenino: "Femmes",
      yaLaCorriste: "Vous l'avez déjà courue ?",
      marcadaComoCorrida: "✅ Marquée comme terminée · retirer",
      tiempoPlaceholder: "Votre temps (optionnel), ex. 3:45:12",
      marcarComoCorrida: "Marquer comme terminée",
      informacionPractica: "Informations pratiques",
      aeropuerto: "Aéroport",
      zonaHoteles: "Zone d'hôtels",
      sitioOficial: "Site officiel",
      reportarError: "⚠️ Signaler une erreur sur cette course",
      checklistTitulo: "Checklist du coureur",
      checklist: [
        "Inscription confirmée",
        "Passeport valide",
        "Visa (si applicable)",
        "Assurance voyage",
        "Vol réservé",
        "Hôtel réservé",
        "Retrait du dossard programmé",
        "Puce / dossard",
        "Équipement testé",
        "Plan d'hydratation",
        "Transport vers le départ",
        "Visite du salon",
      ],
      dejaResena: "Laissez votre avis",
      resenasCorredores: "Avis des coureurs",
    },
    resena: {
      categorias: {
        organizacion: "Organisation",
        paisajes: "Paysages",
        dificultad: "Difficulté",
        medalla: "Médaille",
        camiseta: "T-shirt",
        hidratacion: "Ravitaillement",
        expo: "Expo coureurs",
        seguridad: "Sécurité",
        calidadPrecio: "Rapport qualité/prix",
      },
      estrellasAria: (n) => `${n} étoiles`,
      errorFaltantes: "Notez toutes les catégories avant d'envoyer.",
      errorGuardar: "Impossible d'enregistrer votre avis. Réessayez.",
      gracias: "✅ Merci pour votre avis ! Il compte désormais dans la moyenne de cette course.",
      comentarioPlaceholder: "Racontez votre expérience (optionnel)",
      guardando: "Enregistrement…",
      publicar: "Publier l'avis",
      sinResenas: "Aucun avis pour cette course pour l'instant. Soyez le premier à en laisser un !",
    },
    asistente: {
      titulo: "Assistant IA",
      descripcion:
        "Décrivez votre objectif avec vos mots et l'assistant choisira les meilleures courses en utilisant toutes les données de la plateforme.",
      placeholder: "ex. « Je veux passer sous 3h30 au marathon : je cherche quelque chose de plat, frais et avec inscription ouverte »",
      pensando: "Réflexion…",
      preguntar: "Demander",
      analizando: "Analyse des dates, prix, météo et dénivelé…",
      errorNoConfigurado: "L'assistant n'est pas encore activé. La clé de l'IA doit être configurée.",
      errorGenerico: "Impossible de contacter l'assistant pour le moment. Réessayez.",
      ejemplos: [
        "Je veux courir un semi-marathon en octobre pour moins de 150 $",
        "Un marathon plat et frais pour battre mon record en 2027",
        "Je veux courir 4 courses cette année à petit budget, près de l'Amérique latine",
        "Recommandez-moi un trail épique pour mon premier ultra",
      ],
    },
    mapa: { verCarrera: "Voir la course →" },
    rankings: {
      titulo: "Classements mondiaux",
      subtitulo: "Générés automatiquement à partir des données de chaque course.",
      tabs: {
        rapidas: "⚡ Les plus rapides",
        populares: "👥 Les plus populaires",
        economicas: "💰 Les moins chères",
        dificiles: "🔥 Les plus difficiles",
        valoradas: "⭐ Les mieux notées",
        frescas: "❄️ Meilleur climat frais",
      },
      corredoresSufijo: "coureurs",
      sinDatos: "Pas encore assez de courses pour ce classement.",
    },
    comparar: {
      titulo: "Comparateur",
      faltanCarreras: "Il faut au moins 2 courses pour comparer.",
      verFicha: "Voir la course →",
      filas: {
        fecha: "Date",
        distancia: "Distance",
        precio: "Prix",
        corredores: "Coureurs",
        desnivel: "Dénivelé +",
        tempPromedio: "Temp. moyenne",
        tiempoLimite: "Temps limite",
        dificultad: "Difficulté",
        valoracion: "Note",
        estado: "Statut",
      },
    },
    viaje: {
      titulo: "Courez pendant votre voyage",
      descripcion:
        "Dites-nous où vous allez et quand, et on vous montre toutes les courses disponibles à cette destination et sur cette période. Ex. : « Japon » du 1er au 15 mars.",
      destinoLabel: "Destination (pays, ville ou continent)",
      destinoPlaceholder: "ex. Espagne, Japon, Europe…",
      desdeLabel: "Du",
      hastaLabel: "Au",
      vacioTitulo: "Planifiez votre prochain voyage en courant",
      vacioTexto: "Saisissez une destination ou choisissez des dates pour commencer.",
      sinResultadosTitulo: "Aucune course trouvée pour cette destination et ces dates",
      sinResultadosTexto: "Essayez d'élargir la période ou de chercher par pays ou continent.",
      resultados: (n) => `${n} course${n !== 1 ? "s" : ""} pendant votre voyage :`,
    },
    perfil: {
      corredorDesde: (fecha) => `Coureur/euse depuis ${fecha}`,
      statCarrerasCompletadas: "Courses terminées",
      statKmEnCarrera: "Km parcourus",
      statPaises: "Pays",
      statFavoritas: "Favoris",
      mapaPersonal: "Carte personnelle · où vous avez couru",
      logrosTitulo: "Succès",
      logros: {
        primer10k: "Premier 10K",
        primeraMedia: "Premier semi",
        primerMaraton: "Premier marathon",
        cincoPaises: "5 pays",
        diezCarreras: "10 courses",
        unaMajor: "Un Major",
        sixStar: "Six Star Finisher",
        primerTrail: "Premier trail",
        primeraResena: "Premier avis",
      },
      desbloqueado: "Débloqué",
      bloqueado: "Verrouillé",
      carrerasCorridas: "Courses effectuées",
      quitar: "Retirer",
      proximasFavoritos: "Prochaines courses (vos favoris)",
      sinFavoritos: "Marquez ❤️ sur une course pour la voir ici avec son compte à rebours.",
      alertasActivasTitulo: "🔔 Alertes actives",
      sinAlertas:
        "Activez la cloche 🔔 sur la page d'une course pour être averti de l'ouverture des inscriptions, des changements de prix, du nombre de places restantes, ou des changements de date/parcours.",
    },
    calendario: {
      titulo: "Calendrier mondial",
      diasSemana: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      ayuda: "Les couleurs indiquent le statut d'inscription. Touchez un jour avec des courses pour voir le détail.",
      fechaLarga: (dia, mes) => `${dia} ${mes}`,
      carrerasDia: (n) => `${n} course${n !== 1 ? "s" : ""}`,
    },
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

const ETIQUETAS_TERRENO: Record<Idioma, Record<string, string>> = {
  es: { Asfalto: "Asfalto", Trail: "Trail", Mixto: "Mixto", Pista: "Pista" },
  en: { Asfalto: "Road", Trail: "Trail", Mixto: "Mixed", Pista: "Track" },
  pt: { Asfalto: "Asfalto", Trail: "Trail", Mixto: "Misto", Pista: "Pista" },
  fr: { Asfalto: "Route", Trail: "Trail", Mixto: "Mixte", Pista: "Piste" },
};

export function traducirDistancia(valor: string, idioma: Idioma): string {
  return ETIQUETAS_DISTANCIA[idioma][valor] ?? valor;
}

export function traducirTerreno(valor: string, idioma: Idioma): string {
  return ETIQUETAS_TERRENO[idioma][valor] ?? valor;
}

export function traducirContinente(valor: string, idioma: Idioma): string {
  return ETIQUETAS_CONTINENTE[idioma][valor] ?? valor;
}

export function traducirEstado(valor: EstadoInscripcion, idioma: Idioma): string {
  return ETIQUETAS_ESTADO[idioma][valor];
}

// La descripción de cada carrera es contenido libre cargado por los
// collectors/admin (no una etiqueta fija de la UI), así que se traduce
// aparte con IA (ver traducciones.ts) y se guarda una copia por idioma
// en la base. Si todavía no se tradujo (carrera nueva, cron no pasó
// todavía) se muestra el original en español antes que dejarlo vacío.
export function descripcionParaIdioma(
  carrera: { desc: string; descEn: string; descPt: string; descFr: string },
  idioma: Idioma,
): string {
  if (idioma === "en") return carrera.descEn || carrera.desc;
  if (idioma === "pt") return carrera.descPt || carrera.desc;
  if (idioma === "fr") return carrera.descFr || carrera.desc;
  return carrera.desc;
}
