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
