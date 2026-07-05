import { useState, useEffect, useMemo, useRef } from "react";

/* ============================================================
   WORLD RUNNER — MVP v2
   · ~50 carreras reales en 30+ países con links oficiales
   · Búsqueda difusa: sin tildes, tolera errores, sugiere al escribir
   · Explorar (lista/mapa) · Ficha · Calendario · Rankings
   · Comparador · Viaje · Asistente IA · Perfil · Alertas · Favoritos
   ============================================================ */

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const HOY = new Date();

const STATUS = {
  abierta:      { label: "Inscripción abierta", color: "#16A34A", pulse: true },
  ultimos:      { label: "Últimos cupos",       color: "#EA580C", pulse: true },
  sorteo:       { label: "Sorteo / ballot",     color: "#7C3AED", pulse: true },
  proximamente: { label: "Abre pronto",         color: "#D97706", pulse: false },
  cerrada:      { label: "Inscripción cerrada", color: "#6B7280", pulse: false },
};

/* [id, nombre, ciudad, país, bandera, continente, lat, lng, fecha, km, dist, tipo, estado,
    precio, moneda, corredores, D+, temp, límite, dificultad, rating, nº reseñas, major,
    web oficial, aeropuerto, zona hoteles, grad1, grad2, desc, recM, recF] */
const RAW = [
["berlin","BMW Berlin Marathon","Berlín","Alemania","🇩🇪","Europa",52.52,13.40,"2026-09-27",42.195,"Maratón","Asfalto","cerrada",163,"€",48000,73,14,"6:15",2,4.9,3124,1,"https://www.bmw-berlin-marathon.com","BER · 30 min","Mitte / Tiergarten","#0E7490","#164E63","El circuito más rápido del mundo: plano, con curvas amplias y ambiente eléctrico. Aquí han caído más récords mundiales que en ninguna otra maratón. Inscripción por sorteo anual.","2:01:09 · E. Kipchoge","2:11:53 · T. Assefa"],
["chicago","Bank of America Chicago Marathon","Chicago","Estados Unidos","🇺🇸","América del Norte",41.88,-87.63,"2026-10-11",42.195,"Maratón","Asfalto","cerrada",250,"$",52000,41,12,"6:30",2,4.8,2871,1,"https://www.chicagomarathon.com","ORD · 45 min","The Loop / River North","#B91C1C","#7F1D1D","Circuito ultra plano por 29 barrios y sede del récord mundial (2:00:35). Público masivo en cada milla y organización de relojería. Entrada por sorteo o marca de clasificación.","2:00:35 · K. Kiptum","2:09:56 · R. Chepngetich"],
["nyc","TCS New York City Marathon","Nueva York","Estados Unidos","🇺🇸","América del Norte",40.71,-74.01,"2026-11-01",42.195,"Maratón","Asfalto","cerrada",315,"$",55000,247,10,"6:30",3,4.9,4102,1,"https://www.nyrr.org/tcsnycmarathon","JFK / EWR · 60 min","Midtown Manhattan","#1D4ED8","#1E3A8A","La maratón más grande del planeta: cinco distritos, cinco puentes y dos millones de espectadores. Sorteo anual muy competido; también hay cupos por tiempo y por charities.","2:04:58 · T. Kipruto","2:22:31 · M. Keitany"],
["boston","Boston Marathon","Boston","Estados Unidos","🇺🇸","América del Norte",42.36,-71.06,"2027-04-19",42.195,"Maratón","Asfalto","proximamente",230,"$",30000,247,11,"6:00",4,4.9,3540,1,"https://www.baa.org/races/boston-marathon","BOS · 20 min","Back Bay","#CA8A04","#713F12","La maratón más antigua del mundo (1897) y la única Major con marca de clasificación obligatoria. Heartbreak Hill en el km 32 decide la carrera. Registro en septiembre.","2:03:02 · G. Mutai","2:17:22 · H. Obiri"],
["london","TCS London Marathon","Londres","Reino Unido","🇬🇧","Europa",51.51,-0.13,"2027-04-25",42.195,"Maratón","Asfalto","cerrada",90,"£",56000,42,11,"8:00",2,4.9,3890,1,"https://www.tcslondonmarathon.com","LHR · 45 min","Greenwich / Canary Wharf","#0F766E","#134E4A","El sorteo más masivo del running mundial (ballot cerrado para 2027). Recorrido junto al Támesis, meta frente a Buckingham y la mayor recaudación benéfica del deporte.","2:01:25 · K. Kiptum","2:15:50 · P. Jepchirchir"],
["tokyo","Tokyo Marathon","Tokio","Japón","🇯🇵","Asia",35.68,139.69,"2027-03-07",42.195,"Maratón","Asfalto","proximamente",180,"$",38000,60,9,"7:00",2,4.8,1980,1,"https://www.marathon.tokyo","HND · 30 min","Shinjuku","#DB2777","#831843","Precisión japonesa, avituallamientos impecables y recorrido en ligero descenso por el corazón de Tokio. El sorteo suele abrir en agosto del año anterior.","2:02:16 · B. Legese","2:15:55 · S. Hassan"],
["sydney","TCS Sydney Marathon","Sídney","Australia","🇦🇺","Oceanía",-33.87,151.21,"2026-08-30",42.195,"Maratón","Asfalto","cerrada",170,"$",40000,220,15,"7:00",3,4.7,720,1,"https://www.tcssydneymarathon.com","SYD · 25 min","CBD / The Rocks","#0369A1","#0C4A6E","La séptima World Marathon Major. Cruce del Harbour Bridge al amanecer y meta frente a la Ópera. Ballot 2026 cerrado: quedan cupos por charities y paquetes de viaje oficiales.","2:06:18 · H. Kotu","2:21:41"],
["valencia","Maratón Valencia Trinidad Alfonso","Valencia","España","🇪🇸","Europa",39.47,-0.38,"2026-12-06",42.195,"Maratón","Asfalto","sorteo",120,"€",35000,30,15,"5:30",2,4.9,2455,0,"https://www.maratonvalencia.com","VLC · 20 min","Ciutat Vella / C. de las Artes","#EA580C","#9A3412","«La ciudad del running». Circuito rapidísimo, clima perfecto en diciembre y meta icónica sobre el agua. La demanda es tal que la edición 2026 se asigna por sorteo (57.500 solicitudes).","2:01:48 · S. Kiptum","2:14:58 · A. Beriso"],
["paris","Schneider Electric Marathon de Paris","París","Francia","🇫🇷","Europa",48.86,2.35,"2027-04-11",42.195,"Maratón","Asfalto","abierta",135,"€",54000,220,12,"6:00",3,4.7,2210,0,"https://www.schneiderelectricparismarathon.com","CDG · 45 min","Champs-Élysées / Bastille","#9333EA","#581C87","Salida en los Campos Elíseos, Louvre, Bastilla, Bois de Vincennes y meta junto al Arco del Triunfo. Una de las maratones más bellas y masivas de Europa.","2:05:04","2:19:48"],
["cdmx","Maratón de la Ciudad de México Telcel","Ciudad de México","México","🇲🇽","América del Norte",19.43,-99.13,"2026-08-30",42.195,"Maratón","Asfalto","ultimos",70,"$",30000,180,17,"6:30",4,4.6,1420,0,"https://maraton.cdmx.gob.mx","MEX · 30 min","Roma / Condesa","#15803D","#14532D","Correr a 2.240 m de altitud desde el Estadio Olímpico de CU hasta el Zócalo, por Reforma y el Ángel. World Athletics Elite Label y Boston Qualifier. Los cupos vuelan.","2:08:51","2:27:18"],
["bsas","Maratón Internacional de Buenos Aires","Buenos Aires","Argentina","🇦🇷","América del Sur",-34.60,-58.38,"2026-09-20",42.195,"Maratón","Asfalto","abierta",100,"$",12500,25,13,"6:00",2,4.6,860,0,"https://www.maratondebuenosaires.com","EZE · 45 min","Palermo / Recoleta","#0284C7","#075985","El circuito más rápido de Sudamérica: plano, fresco en septiembre, pasando por Puerto Madero, La Boca y el Obelisco. Organiza la Asociación Ñandú; inscripción online vía Ticketear.","2:05:00","2:23:24"],
["bsas21","Medio Maratón de Buenos Aires 21K","Buenos Aires","Argentina","🇦🇷","América del Sur",-34.58,-58.41,"2026-08-23",21.097,"Media maratón","Asfalto","abierta",100,"$",25000,20,11,"3:30",2,4.7,940,0,"https://www.maratondebuenosaires.com/medio-maraton-de-buenos-aires-21k.html","EZE · 45 min","Palermo","#0891B2","#164E63","El 21K más rápido y convocante de América: Planetario, Rosedal, Obelisco y Casa Rosada con más de 25.000 corredores. Récord del circuito por debajo de la hora.","59:05 · B. Karoki","1:07:44 · A. Yeshaneh"],
["medellin","Maratón Medellín","Medellín","Colombia","🇨🇴","América del Sur",6.24,-75.58,"2026-09-06",42.195,"Maratón","Asfalto","cerrada",45,"$",27000,320,22,"6:30",3,4.5,640,0,"https://maratonmedellin.com","MDE · 45 min","El Poblado","#65A30D","#3F6212","La fiesta del running colombiano en la ciudad de la eterna primavera, con salida en Parques del Río. Certificada AIMS y Boston Qualifier. 42K, 21K y 10K agotados para 2026; queda el 5K del sábado.","2:10:59","2:29:34"],
["panama","Maratón Internacional de Panamá","Ciudad de Panamá","Panamá","🇵🇦","América Central",8.98,-79.52,"2026-11-15",42.195,"Maratón","Asfalto","abierta",65,"$",5000,45,27,"8:00",3,4.3,310,0,"https://maratoninternacionaldepanama.com","PTY · 25 min","Cinta Costera / Casco Viejo","#0891B2","#155E75","Edición histórica: 50 años de la maratón original de Panamá, organizada por el Club Corredores del Istmo. Salida 4:00 a.m. por la Cinta Costera, Punta Pacífica y Amador. También 21K, 5K y relevos.","2:18:44","2:41:05"],
["bogota","Media Maratón de Bogotá","Bogotá","Colombia","🇨🇴","América del Sur",4.65,-74.08,"2026-07-26",21.097,"Media maratón","Asfalto","ultimos",40,"$",40000,280,15,"3:30",4,4.6,1120,0,"https://www.mediamaratonbogota.com","BOG · 40 min","Chapinero / Parque 93","#DC2626","#7F1D1D","La mmB: el 21K más importante de Colombia, a 2.600 m de altitud y con más de 40.000 corredores. World Athletics Label y ambiente incomparable por la Séptima.","1:02:26","1:10:36"],
["santiago","Maratón de Santiago","Santiago","Chile","🇨🇱","América del Sur",-33.45,-70.67,"2027-04-11",42.195,"Maratón","Asfalto","proximamente",80,"$",30000,120,14,"6:00",2,4.5,780,0,"https://www.maratondesantiago.com","SCL · 30 min","Providencia / Centro","#B91C1C","#450A0A","La maratón más masiva de Chile: plana, otoñal y con la cordillera de fondo. 42K, 21K y 10K desde la Plaza de la Ciudadanía.","2:08:09","2:26:14"],
["rio","Maratona do Rio","Río de Janeiro","Brasil","🇧🇷","América del Sur",-22.91,-43.17,"2027-06-20",42.195,"Maratón","Asfalto","proximamente",90,"$",40000,150,21,"6:30",3,4.7,950,0,"https://www.maratonadorio.com.br","GIG · 40 min","Copacabana / Leblon","#16A34A","#14532D","Posiblemente la meta más bella del mundo: correr junto al mar desde Recreio hasta el Aterro do Flamengo con el Pan de Azúcar de fondo.","2:12:26","2:33:32"],
["utmb","UTMB Mont-Blanc","Chamonix","Francia","🇫🇷","Europa",45.92,6.87,"2026-08-28",171,"Ultra maratón","Trail","cerrada",420,"€",2700,10000,8,"46:30",5,4.9,980,0,"https://montblanc.utmb.world","GVA · 75 min","Chamonix centro","#4338CA","#1E1B4B","La cumbre del trail mundial: 171 km y 10.000 m D+ alrededor del Mont Blanc por tres países. Se entra por sorteo acumulando running stones en carreras del circuito UTMB.","19:37:43 · K. Jornet","22:09:31 · C. Dauwalter"],
["comrades","Comrades Marathon","Durban","Sudáfrica","🇿🇦","África",-29.86,31.02,"2027-06-13",87.7,"Ultra maratón","Asfalto","proximamente",190,"$",20000,1900,16,"12:00",5,4.8,1240,0,"https://www.comrades.com","DUR · 30 min","Durban beachfront","#B45309","#78350F","«The Ultimate Human Race». El ultra más antiguo y masivo del mundo (desde 1921), entre Durban y Pietermaritzburg, con corte implacable a las 12 horas.","5:18:19","5:58:39"],
["twooceans","Totalsports Two Oceans Marathon","Ciudad del Cabo","Sudáfrica","🇿🇦","África",-33.92,18.42,"2027-04-03",56,"Ultra maratón","Asfalto","proximamente",95,"$",11000,850,17,"7:00",4,4.8,890,0,"https://www.twooceansmarathon.org.za","CPT · 25 min","V&A Waterfront","#0E7490","#134E63","«La ultra más bella del mundo»: 56 km bordeando dos océanos por Chapman's Peak, con Table Mountain de testigo. Semana Santa en Ciudad del Cabo.","3:03:44","3:29:42"],
["kili","Kilimanjaro Marathon","Moshi","Tanzania","🇹🇿","África",-3.35,37.34,"2027-02-28",42.195,"Maratón","Asfalto","abierta",80,"$",8000,400,24,"6:30",4,4.4,320,0,"https://www.kilimanjaromarathon.com","JRO · 45 min","Moshi town","#B45309","#7C2D12","Correr a los pies del Kilimanjaro entre cafetales y plátanos, con el techo de África nevado en el horizonte. Ideal para combinar con safari o ascenso.","2:11:47","2:32:23"],
["sansilvestre","San Silvestre Vallecana","Madrid","España","🇪🇸","Europa",40.42,-3.70,"2026-12-31",10,"10K","Asfalto","abierta",26,"€",40000,90,8,"1:30",2,4.7,1560,0,"https://www.sansilvestrevallecana.com","MAD · 30 min","Centro / Retiro","#DC2626","#7F1D1D","La forma más famosa de despedir el año: 40.000 corredores (muchos disfrazados) desde el Bernabéu hasta Vallecas cada 31 de diciembre desde 1964.","26:41","29:37"],
["behobia","Behobia – San Sebastián","San Sebastián","España","🇪🇸","Europa",43.32,-1.98,"2026-11-08",20,"20K","Asfalto","abierta",45,"€",30000,240,13,"2:45",3,4.8,1340,0,"https://www.behobia-sansebastian.com","EAS / BIO · 30-75 min","Parte Vieja / Gros","#0F766E","#134E4A","El clásico de noviembre: 20 km desde Behobia hasta el Boulevard donostiarra, con las subidas de Gaintxurizketa y Miracruz y un ambientazo irrepetible desde 1919.","57:58","1:06:35"],
["greatnorth","Great North Run","Newcastle","Reino Unido","🇬🇧","Europa",54.98,-1.61,"2026-09-13",21.097,"Media maratón","Asfalto","cerrada",70,"£",60000,150,14,"4:00",2,4.7,2100,0,"https://www.greatrun.org/events/great-north-run","NCL · 25 min","Newcastle centro","#1D4ED8","#172554","La media maratón más grande del mundo: 60.000 corredores de Newcastle a South Shields, con los Red Arrows sobrevolando la salida. Ballot anual.","58:56 · sub-59","1:05:16"],
["cph","Copenhagen Half Marathon","Copenhague","Dinamarca","🇩🇰","Europa",55.68,12.57,"2026-09-20",21.097,"Media maratón","Asfalto","sorteo",60,"€",25000,40,13,"3:00",1,4.8,980,0,"https://www.cphhalf.dk","CPH · 15 min","Indre By / Vesterbro","#0284C7","#0C4A6E","Uno de los 21K más rápidos del planeta: plano como una mesa, septiembre fresco y la elegancia danesa en la organización. Cupos por sorteo.","57:31 récord mundial aquí","1:04:21"],
["athens","Athens Authentic Marathon","Atenas","Grecia","🇬🇷","Europa",37.98,23.73,"2026-11-08",42.195,"Maratón","Asfalto","abierta",100,"€",20000,350,17,"8:00",4,4.7,1010,0,"https://www.athensauthenticmarathon.gr","ATH · 40 min","Plaka / Syntagma","#0369A1","#1E3A8A","LA maratón: el recorrido original desde el pueblo de Maratón hasta el estadio Panathinaikó de mármol. Dura, histórica y obligatoria una vez en la vida.","2:10:37","2:31:06"],
["rome","Run Rome The Marathon","Roma","Italia","🇮🇹","Europa",41.90,12.50,"2027-03-21",42.195,"Maratón","Asfalto","abierta",90,"€",30000,180,13,"6:30",3,4.6,1130,0,"https://www.runromethemarathon.com","FCO · 45 min","Centro storico","#CA8A04","#713F12","Salida y meta en los Foros Imperiales junto al Coliseo: 42 km de museo al aire libre sobre sampietrini, Vaticano incluido.","2:06:48","2:22:52"],
["vienna","Vienna City Marathon","Viena","Austria","🇦🇹","Europa",48.21,16.37,"2027-04-18",42.195,"Maratón","Asfalto","abierta",115,"€",42000,60,12,"6:30",2,4.7,1290,0,"https://www.vienna-marathon.com","VIE · 20 min","Innere Stadt","#DB2777","#831843","Del Reichsbrücke a la Ópera pasando por Schönbrunn y el Prater: velocidad y música clásica en el evento deportivo más grande de Austria.","2:05:41","2:20:59"],
["prague","Prague Marathon","Praga","Chequia","🇨🇿","Europa",50.08,14.42,"2027-05-02",42.195,"Maratón","Asfalto","abierta",110,"€",11000,80,13,"7:00",2,4.7,860,0,"https://www.runczech.com","PRG · 30 min","Staré Město","#7C3AED","#4C1D95","Salida en la plaza de la Ciudad Vieja y cruce del puente de Carlos: una de las maratones más bellas de Europa, organizada por RunCzech.","2:05:39","2:21:57"],
["stockholm","adidas Stockholm Marathon","Estocolmo","Suecia","🇸🇪","Europa",59.33,18.07,"2027-06-05",42.195,"Maratón","Asfalto","abierta",120,"€",18000,140,17,"6:00",3,4.6,740,0,"https://www.stockholmmarathon.se","ARN · 40 min","Norrmalm / Gamla Stan","#0284C7","#1E3A8A","Dos vueltas entre islas y agua con meta dentro del Estadio Olímpico de 1912. El verano nórdico en su mejor versión.","2:10:11","2:28:59"],
["tromso","Midnight Sun Marathon","Tromsø","Noruega","🇳🇴","Europa",69.65,18.96,"2027-06-19",42.195,"Maratón","Asfalto","abierta",95,"€",7000,120,10,"6:30",3,4.7,410,0,"https://www.msm.no","TOS · 15 min","Tromsø sentrum","#4338CA","#1E1B4B","La maratón del sol de medianoche: salida a las 20:30 y meta con luz de día plena a medianoche, 350 km al norte del círculo polar ártico.","2:20:42","2:42:53"],
["reykjavik","Reykjavík Marathon","Reikiavik","Islandia","🇮🇸","Europa",64.15,-21.94,"2026-08-22",42.195,"Maratón","Asfalto","abierta",90,"€",15000,150,11,"6:00",3,4.6,520,0,"https://www.marathon.is","KEF · 45 min","Miðborg","#0E7490","#164E63","Costa, geotermia y el festival Menningarnótt: la ciudad entera sale a la calle el día de la maratón de Reikiavik.","2:17:06","2:35:14"],
["istanbul","Istanbul Marathon","Estambul","Turquía","🇹🇷","Asia",41.01,28.98,"2026-11-01",42.195,"Maratón","Asfalto","abierta",70,"€",35000,250,14,"6:00",3,4.5,880,0,"https://maraton.istanbul","IST · 45 min","Sultanahmet / Beyoğlu","#B91C1C","#450A0A","La única maratón intercontinental del mundo: se cruza el Bósforo de Asia a Europa por el puente de los Mártires del 15 de Julio.","2:09:27","2:18:35"],
["dubai","Dubai Marathon","Dubái","Emiratos Árabes","🇦🇪","Asia",25.20,55.27,"2027-01-08",42.195,"Maratón","Asfalto","proximamente",120,"$",30000,20,19,"6:00",1,4.5,690,0,"https://www.dubaimarathon.org","DXB · 20 min","Jumeirah / Downtown","#CA8A04","#78350F","Plano absoluto junto a Jumeirah Beach y enero fresco (para Dubái): históricamente una de las maratones más rápidas del calendario.","2:03:34","2:16:07"],
["singapore","Standard Chartered Singapore Marathon","Singapur","Singapur","🇸🇬","Asia",1.29,103.85,"2026-12-06",42.195,"Maratón","Asfalto","abierta",110,"$",45000,90,28,"7:30",4,4.4,930,0,"https://www.singaporemarathon.com","SIN · 20 min","Marina Bay","#DC2626","#7F1D1D","Maratón nocturna-tropical por Marina Bay, Gardens by the Bay y el Padang. Calor y humedad garantizados; la hidratación es de las mejores del mundo.","2:12:19","2:31:55"],
["hk","Hong Kong Marathon","Hong Kong","China","🇭🇰","Asia",22.32,114.17,"2027-02-07",42.195,"Maratón","Asfalto","proximamente",95,"$",37000,420,16,"6:00",4,4.4,760,0,"https://www.hkmarathon.com","HKG · 35 min","Tsim Sha Tsui","#0F766E","#134E4A","Puentes, túneles y las subidas del Island Eastern Corridor: una de las maratones urbanas más duras y espectaculares de Asia.","2:09:20","2:26:31"],
["goldcoast","Gold Coast Marathon","Gold Coast","Australia","🇦🇺","Oceanía",-28.02,153.40,"2027-07-04",42.195,"Maratón","Asfalto","abierta",130,"$",25000,30,17,"6:10",1,4.7,650,0,"https://goldcoastmarathon.com.au","OOL · 20 min","Surfers Paradise","#0369A1","#0C4A6E","Plana, junto al mar y con el invierno perfecto de Queensland: la carrera favorita de Oceanía para lograr marca personal.","2:07:39","2:23:53"],
["queenstown","Queenstown Marathon","Queenstown","Nueva Zelanda","🇳🇿","Oceanía",-45.03,168.66,"2026-11-21",42.195,"Maratón","Mixto","abierta",115,"$",12000,380,13,"6:30",3,4.8,480,0,"https://www.queenstown-marathon.co.nz","ZQN · 15 min","Queenstown centro","#4338CA","#312E81","Senderos y caminos entre lagos y los Alpes del Sur: probablemente la maratón con los paisajes más cinematográficos del hemisferio sur.","2:19:29","2:41:15"],
["honolulu","Honolulu Marathon","Honolulu","Estados Unidos","🇺🇸","América del Norte",21.31,-157.86,"2026-12-13",42.195,"Maratón","Asfalto","abierta",185,"$",25000,180,24,"sin límite",3,4.6,1080,0,"https://www.honolulumarathon.org","HNL · 20 min","Waikiki","#DB2777","#831843","Fuegos artificiales en la salida a las 5 a.m., Diamond Head al amanecer y sin tiempo límite: la maratón más acogedora del Pacífico.","2:07:59","2:22:15"],
["la","Los Angeles Marathon","Los Ángeles","Estados Unidos","🇺🇸","América del Norte",34.05,-118.24,"2027-03-07",42.195,"Maratón","Asfalto","abierta",210,"$",25000,300,16,"6:30",3,4.5,1170,0,"https://www.lamarathon.com","LAX · 40 min","Downtown / Santa Monica","#CA8A04","#713F12","Del Dodger Stadium a Century City pasando por Hollywood, Sunset y Rodeo Drive: la ruta «Stadium to the Stars».","2:06:35","2:24:15"],
["mcm","Marine Corps Marathon","Washington D. C.","Estados Unidos","🇺🇸","América del Norte",38.90,-77.04,"2026-10-25",42.195,"Maratón","Asfalto","cerrada",200,"$",30000,200,12,"6:30",3,4.7,1390,0,"https://www.marinemarathon.com","DCA · 15 min","Arlington / National Mall","#B91C1C","#450A0A","«The People's Marathon»: monumentos, marines en cada avituallamiento y la subida final a Iwo Jima. Cupos por sorteo en primavera.","2:19:16","2:37:00"],
["houston","Chevron Houston Marathon","Houston","Estados Unidos","🇺🇸","América del Norte",29.76,-95.37,"2027-01-17",42.195,"Maratón","Asfalto","abierta",190,"$",27000,60,10,"6:00",2,4.6,830,0,"https://www.chevronhoustonmarathon.com","IAH · 35 min","Downtown","#1D4ED8","#172554","La maratón rápida de enero en EE. UU.: plana, fresca y con fama de fábrica de récords nacionales y marcas olímpicas.","2:04:33","2:14:18"],
["bigsur","Big Sur International Marathon","Big Sur","Estados Unidos","🇺🇸","América del Norte",36.27,-121.81,"2027-04-25",42.195,"Maratón","Asfalto","sorteo",240,"$",10000,650,12,"6:00",4,4.9,720,0,"https://www.bigsurmarathon.org","MRY · 40 min","Monterey / Carmel","#0E7490","#164E63","La Highway 1 cerrada para ti: acantilados sobre el Pacífico, el puente de Bixby con piano de cola y niebla californiana. Cupos por sorteo.","2:16:39","2:41:33"],
["toronto","TCS Toronto Waterfront Marathon","Toronto","Canadá","🇨🇦","América del Norte",43.65,-79.38,"2026-10-18",42.195,"Maratón","Asfalto","abierta",165,"$",28000,100,10,"6:30",2,4.6,890,0,"https://www.torontowaterfrontmarathon.com","YYZ · 30 min","Downtown / Harbourfront","#DC2626","#7F1D1D","El circuito rápido de Canadá junto al lago Ontario: sede de múltiples récords nacionales y World Athletics Elite Label.","2:05:00","2:22:16"],
["vancouver","BMO Vancouver Marathon","Vancouver","Canadá","🇨🇦","América del Norte",49.28,-123.12,"2027-05-02",42.195,"Maratón","Asfalto","abierta",150,"$",18000,340,12,"7:00",3,4.7,760,0,"https://www.bmovanmarathon.ca","YVR · 25 min","Downtown / Stanley Park","#0F766E","#134E4A","Montañas, océano y el rodeo completo de Stanley Park: votada repetidamente como una de las maratones más bonitas del mundo.","2:14:07","2:32:46"],
["greatwall","Great Wall Marathon","Tianjin","China","🇨🇳","Asia",40.05,117.40,"2027-05-15",42.195,"Maratón","Trail","abierta",190,"$",2500,1200,20,"8:00",5,4.7,380,0,"https://great-wall-marathon.com","PEK/TSN · 2 h","Huangyaguan","#B45309","#78350F","5.164 escalones sobre la Gran Muralla más pueblos y arrozales: una de las maratones más duras y memorables del planeta.","3:09:18","3:32:12"],
["mds","Marathon des Sables","Sahara","Marruecos","🇲🇦","África",31.10,-4.00,"2027-04-09",250,"Ultra maratón","Trail","abierta",3500,"€",1100,3000,32,"7 días",5,4.8,410,0,"https://www.marathondessables.com","RAK/ERH · 6 h","Bivouac en el desierto","#CA8A04","#713F12","La carrera por etapas más mítica: 250 km en autosuficiencia por el Sahara marroquí durante una semana, cargando tu propia comida.","etapas · 7 días","etapas · 7 días"],
["western","Western States 100","Auburn","Estados Unidos","🇺🇸","América del Norte",38.90,-121.07,"2027-06-26",161,"Ultra maratón","Trail","sorteo",410,"$",380,5500,25,"30:00",5,4.9,290,0,"https://www.wser.org","SMF · 60 min","Auburn / Squaw Valley","#B45309","#451A03","El 100 millas original (desde 1974), de Olympic Valley a Auburn por la Sierra Nevada. Entrar exige clasificar y ganar una lotería con años de espera.","14:09:28 · J. Walmsley","15:29:33 · C. Dauwalter"],
["sierrezinal","Sierre-Zinal","Sierre","Suiza","🇨🇭","Europa",46.29,7.53,"2026-08-08",31,"Trail","Trail","cerrada",90,"€",5000,2200,14,"8:30",5,4.9,360,0,"https://www.sierre-zinal.com","GVA · 2 h","Valle de Anniviers","#4338CA","#1E1B4B","«La carrera de los cinco 4.000»: la cita más prestigiosa del trail corto mundial, con vistas a Matterhorn y Weisshorn. Dorsales agotados en horas.","2:25:35 · K. Jornet","2:42:53"],
["zegama","Zegama-Aizkorri","Zegama","España","🇪🇸","Europa",42.97,-2.29,"2027-05-23",42,"Trail","Trail","sorteo",80,"€",500,2736,12,"8:00",5,4.9,420,0,"https://www.zegama-aizkorri.com","BIO/EAS · 60 min","Zegama / Ordizia","#15803D","#14532D","El templo del trail: barro, niebla y una afición que ruge en Sancti Spiritu. 500 dorsales por sorteo entre decenas de miles de solicitudes.","3:36:40 · K. Jornet","4:15:09"],
["parisienne","La Parisienne 10K","París","Francia","🇫🇷","Europa",48.86,2.29,"2026-09-13",10,"10K","Asfalto","abierta",35,"€",22000,40,16,"2:00",1,4.4,410,0,"https://www.la-parisienne.net","CDG · 45 min","7ème arr. / Tour Eiffel","#DB2777","#9D174D","El 10K femenino más grande de Europa, bajo la Torre Eiffel y a lo largo del Sena. Fiesta, disfraces y causa solidaria.","—","—"],
];

const RACES = RAW.map(a=>{
  const [id,name,city,country,flag,continent,lat,lng,date,km,dist,type,status,price,cur,runners,elev,temp,limit,diff,rating,nrev,major,web,airport,hotel,g1,g2,desc,recM,recF]=a;
  const seed=[...id].reduce((s,c)=>s+c.charCodeAt(0),0);
  const base=elev>2000?800:elev>400?200:elev>100?60:15;
  const profile=[...Array(12)].map((_,i)=>Math.max(2,Math.round(base+Math.sin(seed+i*1.7)*base*0.55+Math.cos(seed*2+i)*base*0.3)));
  const y0=+date.slice(0,4);
  const history=[1,2,3].map(k=>({y:y0-k,r:Math.round(runners*Math.pow(0.93,k)),p:Math.round(price*Math.pow(0.9,k))}));
  return {id,name,city,country,flag,continent,lat,lng,date,km,dist,type,status,price,cur,runners,elev,temp,limit,diff,rating,nrev,major:!!major,web,airport,hotel,g:[g1,g2],desc,recM,recF,profile,history};
});

const DISTS = ["Todas","Maratón","Media maratón","10K","Ultra maratón","Trail"];
const CONTS = ["Todos","Europa","América del Norte","América Central","América del Sur","Asia","África","Oceanía"];
const STATS_F = ["Todos","abierta","ultimos","sorteo","proximamente","cerrada"];

/* ---------- utilidades ---------- */
const fmtDate = d => { const dt=new Date(d+"T12:00:00"); return `${dt.getDate()} ${MESES[dt.getMonth()]} ${dt.getFullYear()}`; };
const daysTo = d => Math.ceil((new Date(d+"T07:00:00") - HOY)/86400000);
const proj = (lat,lng) => ({ x:(lng+180)/360*1000, y:(90-lat)/180*500 });
const nf = n => n.toLocaleString("es");

/* ---------- búsqueda difusa: sin tildes + tolerante a errores ---------- */
const norm = s => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function lev(a,b){
  if(a===b) return 0;
  const m=a.length,n=b.length;
  if(Math.abs(m-n)>2) return 9;
  let prev=[...Array(n+1)].map((_,j)=>j);
  for(let i=1;i<=m;i++){
    const cur=[i];
    for(let j=1;j<=n;j++)
      cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[n];
}
function tokenScore(qt, hayTokens, hayFull){
  if(hayFull.startsWith(qt)) return 4;
  if(hayFull.includes(qt)) return 3;
  for(const w of hayTokens){
    if(w.startsWith(qt)) return 3;
    if(qt.length>=4){
      const tol = qt.length>=7?2:1;
      if(lev(qt,w)<=tol) return 2;
      if(w.length>qt.length && lev(qt,w.slice(0,qt.length+1))<=tol) return 2;
    }
  }
  return 0;
}
function raceScore(r, q){
  const qts = norm(q).split(/\s+/).filter(Boolean);
  if(!qts.length) return 1;
  const hayFull = norm([r.name,r.city,r.country,r.continent,r.dist,r.type].join(" "));
  const hayTokens = hayFull.split(/\s+/);
  let total=0;
  for(const qt of qts){
    const s=tokenScore(qt,hayTokens,hayFull);
    if(s===0) return 0;
    total+=s;
  }
  return total;
}

/* ---------- tema ---------- */
const themes = {
  dark: { bg:"#0B0D11", panel:"#12151B", panel2:"#181C24", line:"#252B36", ink:"#F2F4F8", mut:"#8B94A7",
          acc:"#3B5BFF", accInk:"#FFFFFF", land:"#1B212C", sea:"#0E1117", chip:"#1D2330", grad:"linear-gradient(135deg,#0B0D11 0%,#131A2E 100%)" },
  light:{ bg:"#F7F8FA", panel:"#FFFFFF", panel2:"#F1F3F7", line:"#E4E7EE", ink:"#12151B", mut:"#5B6472",
          acc:"#2547E8", accInk:"#FFFFFF", land:"#E2E6EE", sea:"#F1F4F9", chip:"#EDF0F5", grad:"linear-gradient(135deg,#FFFFFF 0%,#EDF1FB 100%)" },
};

/* ---------- componentes básicos ---------- */
function Badge({ s, sm }) {
  const st = STATUS[s];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background:st.color+"1c", color:st.color, fontSize:sm?11:12, padding:sm?"3px 9px":"4px 12px" }}>
      <span className="relative flex" style={{width:7,height:7}}>
        {st.pulse && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{background:st.color,opacity:.5}}/>}
        <span className="relative inline-flex rounded-full" style={{width:7,height:7,background:st.color}}/>
      </span>
      {st.label}
    </span>
  );
}

function Countdown({ date, t, big }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(i); },[]);
  const diff = Math.max(0, new Date(date+"T07:00:00") - now);
  const d = Math.floor(diff/86400000), h=Math.floor(diff/3600000)%24, m=Math.floor(diff/60000)%60, s=Math.floor(diff/1000)%60;
  const cell = (v,l) => (
    <div className="text-center">
      <div className="font-mono font-bold tabular-nums" style={{fontSize:big?36:19, color:t.ink, letterSpacing:"-0.02em"}}>{String(v).padStart(2,"0")}</div>
      <div className="uppercase tracking-widest" style={{fontSize:big?11:9, color:t.mut}}>{l}</div>
    </div>
  );
  return <div className="flex items-start" style={{gap:big?18:11}}>{cell(d,"días")}{cell(h,"hrs")}{cell(m,"min")}{cell(s,"seg")}</div>;
}

function Elevation({ profile, t, color, h=100 }) {
  const min = Math.min(...profile), max = Math.max(...profile), rng = Math.max(max-min, 10);
  const w = 400;
  const pts = profile.map((v,i)=>`${(i/(profile.length-1))*w},${h-8-((v-min)/rng)*(h-22)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height:h}}>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={color} opacity="0.15"/>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
      <text x="4" y="12" fontSize="10" fill={t.mut} fontFamily="monospace">{max} m</text>
      <text x="4" y={h-2} fontSize="10" fill={t.mut} fontFamily="monospace">{min} m</text>
    </svg>
  );
}

/* ---------- mapa mundial ---------- */
const LAND = [
  "M45,55 L120,42 L165,55 L185,80 L230,85 L255,105 L275,125 L280,150 L262,168 L250,190 L262,210 L278,222 L288,232 L280,238 L268,230 L252,215 L235,200 L218,185 L200,175 L175,168 L150,150 L120,140 L95,120 L70,105 L50,85 Z",
  "M285,235 L310,228 L330,240 L345,262 L352,290 L345,318 L335,345 L328,372 L322,395 L315,410 L305,400 L300,375 L296,345 L290,315 L282,285 L278,258 Z",
  "M478,100 L500,88 L525,82 L555,90 L575,100 L565,112 L545,120 L560,130 L545,142 L525,138 L505,145 L490,135 L480,120 Z",
  "M480,155 L510,148 L540,152 L565,165 L580,190 L590,220 L585,250 L572,280 L558,305 L545,325 L535,340 L525,325 L515,300 L505,270 L495,240 L485,210 L478,185 Z",
  "M580,95 L620,75 L680,60 L750,55 L820,60 L880,70 L920,85 L940,105 L925,125 L900,140 L880,155 L860,145 L840,160 L820,150 L800,165 L780,160 L760,150 L740,155 L720,145 L700,150 L680,140 L655,145 L630,135 L610,120 L595,108 Z",
  "M760,168 L790,162 L815,172 L825,190 L815,205 L795,210 L775,200 L762,185 Z",
  "M865,320 L910,310 L945,320 L955,345 L940,368 L905,375 L875,362 L862,340 Z",
  "M300,30 L345,22 L380,32 L375,55 L345,65 L315,55 L298,42 Z",
];

function WorldMap({ races, t, onPick, height=460 }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{border:`1px solid ${t.line}`, background:t.sea}}>
      <svg viewBox="0 0 1000 500" className="w-full block" style={{height, minHeight:280}}>
        {[...Array(9)].map((_,i)=><line key={"h"+i} x1="0" y1={(i+1)*50} x2="1000" y2={(i+1)*50} stroke={t.line} strokeWidth="0.5" opacity="0.4"/>)}
        {[...Array(19)].map((_,i)=><line key={"v"+i} x1={(i+1)*50} y1="0" x2={(i+1)*50} y2="500" stroke={t.line} strokeWidth="0.5" opacity="0.4"/>)}
        {LAND.map((d,i)=><path key={i} d={d} fill={t.land} stroke={t.line} strokeWidth="1"/>)}
        {races.map(r=>{
          const {x,y}=proj(r.lat,r.lng); const st=STATUS[r.status]; const sel=hover===r.id;
          return (
            <g key={r.id} transform={`translate(${x},${y})`} style={{cursor:"pointer"}}
               onClick={()=>onPick(r)} onMouseEnter={()=>setHover(r.id)} onMouseLeave={()=>setHover(null)}>
              {st.pulse && <circle r="10" fill={st.color} opacity="0.25"><animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.35;0.05;0.35" dur="2.2s" repeatCount="indefinite"/></circle>}
              <circle r={sel?8:5.5} fill={st.color} stroke={t.bg} strokeWidth="1.8"/>
            </g>
          );
        })}
      </svg>
      {hover && (()=>{ const r=races.find(x=>x.id===hover); const {x,y}=proj(r.lat,r.lng);
        return (
          <div className="absolute pointer-events-none rounded-xl px-3 py-2 shadow-lg z-10"
               style={{left:`${x/10}%`, top:`${y/5}%`, transform:"translate(-50%,-120%)", background:t.panel, border:`1px solid ${t.line}`, minWidth:180}}>
            <div className="font-semibold text-sm" style={{color:t.ink}}>{r.flag} {r.name}</div>
            <div className="text-xs mt-0.5" style={{color:t.mut}}>{fmtDate(r.date)} · {r.dist}</div>
            <div className="mt-1"><Badge s={r.status} sm/></div>
          </div>
        );})()}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-xl px-3 py-2 max-w-[92%]" style={{background:t.panel+"E6", border:`1px solid ${t.line}`}}>
        {Object.entries(STATUS).map(([k,v])=>(
          <span key={k} className="flex items-center gap-1.5 text-[11px]" style={{color:t.mut}}>
            <span className="rounded-full" style={{width:8,height:8,background:v.color}}/>{v.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- tarjeta de carrera ---------- */
function RaceCard({ r, t, onOpen, fav, onFav, note }) {
  const d = daysTo(r.date);
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-1 cursor-pointer"
         style={{background:t.panel, border:`1px solid ${t.line}`}} onClick={()=>onOpen(r)}>
      <div className="relative h-32 flex items-end p-4" style={{background:`linear-gradient(135deg,${r.g[0]},${r.g[1]})`}}>
        <span className="absolute top-3 left-3"><Badge s={r.status} sm/></span>
        <button onClick={e=>{e.stopPropagation();onFav(r.id);}} aria-label="Favorito"
          className="absolute top-2.5 right-3 rounded-full w-8 h-8 flex items-center justify-center text-base transition-transform hover:scale-110"
          style={{background:"rgba(255,255,255,0.18)", backdropFilter:"blur(4px)"}}>
          {fav ? "❤️" : "🤍"}
        </button>
        <div>
          {r.major && <span className="text-[10px] font-bold uppercase tracking-widest text-white/85">★ World Marathon Major</span>}
          <div className="text-white font-bold leading-tight" style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:23}}>{r.name}</div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between text-sm">
          <span style={{color:t.mut}}>{r.flag} {r.city}, {r.country}</span>
          <span className="font-mono font-semibold tabular-nums" style={{color:t.ink}}>{d>0?`T–${d}d`:"—"}</span>
        </div>
        {note && <div className="text-xs rounded-lg px-2.5 py-1.5" style={{background:t.chip, color:t.mut}}>💡 {note}</div>}
        <div className="grid grid-cols-4 gap-2 text-center mt-auto">
          {[[r.dist==="Ultra maratón"||r.dist==="Trail"?r.km+"K":r.dist, "distancia"],[fmtDate(r.date).slice(0,6),"fecha"],[r.cur+r.price,"desde"],["★ "+r.rating,"("+nf(r.nrev)+")"]].map(([v,l],i)=>(
            <div key={i} className="rounded-lg py-1.5" style={{background:t.panel2}}>
              <div className="text-[13px] font-semibold" style={{color:t.ink}}>{v}</div>
              <div className="text-[10px]" style={{color:t.mut}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- detalle de carrera ---------- */
function RaceDetail({ r, t, onBack, fav, onFav, onCompare, alertOn, onAlert }) {
  const [checks, setChecks] = useState({});
  const checklist = ["Inscripción confirmada","Pasaporte vigente","Visa (si aplica)","Seguro de viaje","Vuelo reservado","Hotel reservado","Recogida de dorsal agendada","Chip / dorsal","Equipamiento probado","Plan de hidratación","Transporte a la salida","Visita a la Expo"];
  const revs = [["Organización", r.rating],["Paisajes", Math.min(5,r.rating+0.1-((r.id.length%3)*0.15))],["Público", Math.min(5,r.rating-(r.runners<8000?0.5:0))],["Medalla", Math.max(3.4,r.rating-0.2)],["Hidratación", Math.max(3.5,r.rating-0.1)],["Calidad-precio", r.price>250?Math.max(3.4,r.rating-0.6):Math.max(3.6,r.rating-0.1)]];
  const done = Object.values(checks).filter(Boolean).length;
  const cta = r.status==="cerrada"?"Sitio oficial ↗": r.status==="sorteo"?"Entrar al sorteo ↗": r.status==="proximamente"?"Ver convocatoria ↗":"Inscribirse ahora ↗";
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <button onClick={onBack} className="mt-4 mb-3 text-sm font-medium flex items-center gap-1 hover:opacity-70" style={{color:t.mut}}>← Volver</button>

      <div className="rounded-3xl overflow-hidden" style={{background:`linear-gradient(135deg,${r.g[0]},${r.g[1]})`}}>
        <div className="p-6 md:p-10 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <Badge s={r.status}/>
            {r.major && <span className="text-xs font-bold uppercase tracking-widest bg-white/15 rounded-full px-3 py-1">★ World Marathon Major</span>}
            <span className="text-xs bg-white/15 rounded-full px-3 py-1">{r.type}</span>
            <span className="text-xs bg-white/15 rounded-full px-3 py-1">{r.km} km</span>
          </div>
          <h1 className="mt-4 font-bold leading-none" style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:"clamp(32px,6vw,56px)", letterSpacing:"0.01em"}}>{r.name}</h1>
          <p className="mt-1 text-white/85 text-lg">{r.flag} {r.city}, {r.country} · {fmtDate(r.date)}</p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="rounded-2xl bg-black/25 px-5 py-4"><Countdown date={r.date} t={{ink:"#fff",mut:"rgba(255,255,255,0.65)"}} big/></div>
            <div className="flex flex-wrap gap-3">
              <a href={r.web} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                 className="rounded-xl px-6 py-3.5 font-bold text-base transition-transform hover:scale-105"
                 style={{background:"#fff", color:r.g[1]}}>{cta}</a>
              <button onClick={()=>onAlert(r.id)} title="Alertas de esta carrera"
                className="rounded-xl px-4 py-3.5 text-xl transition-colors"
                style={{background:alertOn?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.15)"}}>
                {alertOn?"🔔":"🔕"}
              </button>
              <button onClick={()=>onFav(r.id)} className="rounded-xl px-4 py-3.5 bg-white/15 hover:bg-white/25 text-xl">{fav?"❤️":"🤍"}</button>
            </div>
          </div>
          {alertOn && <p className="mt-3 text-xs text-white/80">🔔 Alertas activas: te avisaremos si cambia el precio, quedan pocos cupos, cambia la fecha o el recorrido, o abre/cierra la inscripción.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {[["Distancia", r.km+" km"],["Precio desde", r.cur+nf(r.price)],["Corredores", nf(r.runners)],["Desnivel +", nf(r.elev)+" m"],
          ["Temp. promedio", r.temp+" °C"],["Tiempo límite", r.limit],["Dificultad", "●".repeat(r.diff)+"○".repeat(5-r.diff)],["Valoración", "★ "+r.rating+" ("+nf(r.nrev)+")"]].map(([l,v],i)=>(
          <div key={i} className="rounded-xl p-3.5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <div className="text-[11px] uppercase tracking-wider" style={{color:t.mut}}>{l}</div>
            <div className="mt-1 font-semibold font-mono tabular-nums text-[15px]" style={{color:t.ink}}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 flex flex-col gap-4">
          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <h3 className="font-bold mb-2" style={{color:t.ink}}>Sobre la carrera</h3>
            <p className="text-sm leading-relaxed" style={{color:t.mut}}>{r.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{color:t.mut}}>
              {["🏅 Medalla finisher","👕 Camiseta oficial","💧 Hidratación en ruta","🎪 Expo del corredor","📸 Fotos oficiales","🚑 Asistencia médica"].map(s=>(
                <span key={s} className="rounded-full px-3 py-1.5" style={{background:t.chip}}>{s}</span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <h3 className="font-bold mb-1" style={{color:t.ink}}>Perfil de elevación (aprox.)</h3>
            <p className="text-xs mb-3" style={{color:t.mut}}>Desnivel positivo acumulado: {nf(r.elev)} m · el trazado exacto se sincroniza desde el sitio oficial</p>
            <Elevation profile={r.profile} t={t} color={r.g[0]} h={110}/>
          </section>

          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <h3 className="font-bold mb-3" style={{color:t.ink}}>Valoraciones de corredores</h3>
            <div className="flex flex-col gap-2.5">
              {revs.map(([l,v])=>(
                <div key={l} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0" style={{color:t.mut}}>{l}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:t.panel2}}>
                    <div className="h-full rounded-full" style={{width:(v/5*100)+"%", background:r.g[0]}}/>
                  </div>
                  <span className="font-mono tabular-nums w-8 text-right" style={{color:t.ink}}>{v.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <h3 className="font-bold mb-3" style={{color:t.ink}}>Historial de ediciones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider" style={{color:t.mut}}>
                  <th className="pb-2 pr-4">Edición</th><th className="pb-2 pr-4">Corredores*</th><th className="pb-2">Precio*</th></tr></thead>
                <tbody>
                  {r.history.map(h=>(
                    <tr key={h.y} style={{borderTop:`1px solid ${t.line}`, color:t.ink}}>
                      <td className="py-2.5 pr-4 font-semibold">{h.y}</td>
                      <td className="py-2.5 pr-4 font-mono tabular-nums">{nf(h.r)}</td>
                      <td className="py-2.5 font-mono tabular-nums">{r.cur}{nf(h.p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] mt-3 font-mono" style={{color:t.mut}}>*estimado (demo) · en producción se sincroniza automáticamente desde el sitio oficial y registros históricos</p>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <h3 className="font-bold mb-3" style={{color:t.ink}}>Récords del recorrido</h3>
            <div className="text-sm flex flex-col gap-2" style={{color:t.mut}}>
              <div><span className="text-xs uppercase tracking-wider">Masculino</span><div className="font-mono text-[15px]" style={{color:t.ink}}>{r.recM}</div></div>
              <div><span className="text-xs uppercase tracking-wider">Femenino</span><div className="font-mono text-[15px]" style={{color:t.ink}}>{r.recF}</div></div>
            </div>
          </section>

          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <h3 className="font-bold mb-3" style={{color:t.ink}}>Logística del viaje</h3>
            <div className="text-sm flex flex-col gap-2.5" style={{color:t.mut}}>
              <div>✈️ <b style={{color:t.ink}}>Aeropuerto:</b> {r.airport}</div>
              <div>🏨 <b style={{color:t.ink}}>Zona de hoteles:</b> {r.hotel}</div>
              <div>🌡️ <b style={{color:t.ink}}>Clima histórico:</b> {r.temp} °C promedio en carrera</div>
              <div>🌐 <b style={{color:t.ink}}>Web oficial:</b> <a href={r.web} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{color:t.acc}}>{r.web.replace("https://","").replace("www.","")}</a></div>
            </div>
          </section>

          <section className="rounded-2xl p-5" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold" style={{color:t.ink}}>Checklist del corredor</h3>
              <span className="text-xs font-mono" style={{color:t.mut}}>{done}/{checklist.length}</span>
            </div>
            <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{background:t.panel2}}>
              <div className="h-full rounded-full transition-all" style={{width:(done/checklist.length*100)+"%", background:STATUS.abierta.color}}/>
            </div>
            <div className="flex flex-col gap-1.5">
              {checklist.map(c=>(
                <label key={c} className="flex items-center gap-2.5 text-sm cursor-pointer rounded-lg px-2 py-1.5 hover:opacity-80"
                       style={{color:checks[c]?t.mut:t.ink, textDecoration:checks[c]?"line-through":"none", background:checks[c]?t.panel2:"transparent"}}>
                  <input type="checkbox" checked={!!checks[c]} onChange={()=>setChecks(p=>({...p,[c]:!p[c]}))} style={{accentColor:r.g[0]}}/>
                  {c}
                </label>
              ))}
            </div>
          </section>

          <button onClick={()=>onCompare(r.id)} className="rounded-xl py-3 font-semibold text-sm transition-opacity hover:opacity-85"
                  style={{background:t.chip, color:t.ink, border:`1px solid ${t.line}`}}>⇄ Comparar con otra carrera</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- calendario ---------- */
function CalendarView({ races, t, onOpen }) {
  const [ym, setYm] = useState([HOY.getFullYear(), HOY.getMonth()]);
  const [y,m] = ym;
  const first = new Date(y,m,1); const startDow = (first.getDay()+6)%7; const days = new Date(y,m+1,0).getDate();
  const byDay = {};
  races.forEach(r=>{ const d=new Date(r.date+"T12:00:00"); if(d.getFullYear()===y&&d.getMonth()===m) (byDay[d.getDate()]=byDay[d.getDate()]||[]).push(r); });
  const nav = dir => setYm(([yy,mm])=>{ const d=new Date(yy,mm+dir,1); return [d.getFullYear(),d.getMonth()]; });
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mt-6 mb-4">
        <h2 className="font-bold" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:30}}>CALENDARIO MUNDIAL</h2>
        <div className="flex items-center gap-2">
          <button onClick={()=>nav(-1)} className="rounded-lg w-9 h-9 font-bold" style={{background:t.chip, color:t.ink}}>←</button>
          <span className="font-semibold w-36 text-center text-sm" style={{color:t.ink}}>{MESES_FULL[m]} {y}</span>
          <button onClick={()=>nav(1)} className="rounded-lg w-9 h-9 font-bold" style={{background:t.chip, color:t.ink}}>→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs uppercase tracking-wider mb-1.5" style={{color:t.mut}}>
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=><div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {[...Array(startDow)].map((_,i)=><div key={"e"+i}/>)}
        {[...Array(days)].map((_,i)=>{
          const day=i+1; const rs=byDay[day]||[]; const isToday = y===HOY.getFullYear()&&m===HOY.getMonth()&&day===HOY.getDate();
          return (
            <div key={day} className="rounded-xl p-1.5 min-h-[74px] flex flex-col gap-1"
                 style={{background:t.panel, border:`1px solid ${isToday?t.acc:t.line}`}}>
              <span className="text-[11px] font-mono" style={{color:isToday?t.acc:t.mut}}>{day}</span>
              {rs.map(r=>(
                <button key={r.id} onClick={()=>onOpen(r)} className="rounded-md px-1.5 py-1 text-left text-[10px] font-semibold leading-tight text-white hover:opacity-85"
                        style={{background:STATUS[r.status].color}}>
                  {r.flag} {r.city}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-xs mt-4" style={{color:t.mut}}>Los colores indican el estado de inscripción. Toca una carrera para abrir su ficha.</p>
    </div>
  );
}

/* ---------- rankings ---------- */
function RankingsView({ races, t, onOpen }) {
  const tabs = [
    ["rapidas","⚡ Más rápidas", rs=>[...rs].filter(r=>r.dist==="Maratón").sort((a,b)=>a.elev-b.elev)],
    ["populares","👥 Más populares", rs=>[...rs].sort((a,b)=>b.runners-a.runners)],
    ["economicas","💰 Más económicas", rs=>[...rs].sort((a,b)=>a.price-b.price)],
    ["dificiles","🔥 Más difíciles", rs=>[...rs].sort((a,b)=>(b.diff*1000+b.elev)-(a.diff*1000+a.elev))],
    ["valoradas","⭐ Mejor valoradas", rs=>[...rs].sort((a,b)=>b.rating-a.rating)],
    ["frescas","❄️ Mejor clima frío", rs=>[...rs].sort((a,b)=>a.temp-b.temp)],
  ];
  const [tab, setTab] = useState("rapidas");
  const cur = tabs.find(x=>x[0]===tab);
  const list = cur[2](races).slice(0,10);
  const medal = i => i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`;
  const metric = r => tab==="rapidas"?`${r.elev} m D+`: tab==="populares"?`${nf(r.runners)} corredores`: tab==="economicas"?`${r.cur}${r.price}`: tab==="dificiles"?`${"●".repeat(r.diff)} · ${nf(r.elev)} m D+`: tab==="valoradas"?`★ ${r.rating}`:`${r.temp} °C`;
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <h2 className="font-bold mt-6 mb-1" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:30}}>RANKINGS MUNDIALES</h2>
      <p className="text-sm mb-4" style={{color:t.mut}}>Generados automáticamente a partir de los datos de cada carrera.</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className="rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap"
                  style={{background:tab===id?t.acc:t.chip, color:tab===id?t.accInk:t.mut, border:`1px solid ${tab===id?t.acc:t.line}`}}>{label}</button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {list.map((r,i)=>(
          <button key={r.id} onClick={()=>onOpen(r)} className="rounded-xl p-3.5 flex items-center gap-4 text-left hover:opacity-90 transition-opacity"
                  style={{background:t.panel, border:`1px solid ${i<3?t.acc+"55":t.line}`}}>
            <span className="w-8 text-center text-lg font-bold font-mono" style={{color:t.ink}}>{medal(i)}</span>
            <div className="w-10 h-10 rounded-lg shrink-0" style={{background:`linear-gradient(135deg,${r.g[0]},${r.g[1]})`}}/>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{color:t.ink}}>{r.flag} {r.name}</div>
              <div className="text-xs" style={{color:t.mut}}>{r.city}, {r.country} · {fmtDate(r.date)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-bold tabular-nums text-sm" style={{color:t.acc}}>{metric(r)}</div>
              <Badge s={r.status} sm/>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- viaje: carreras durante un destino y fechas ---------- */
function TripView({ races, t, onOpen, favs, onFav }) {
  const [dest, setDest] = useState("");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const results = useMemo(()=>{
    if(!dest && !d1 && !d2) return null;
    return races.filter(r=>{
      if(dest){
        const hay = norm([r.city,r.country,r.continent].join(" "));
        const toks = hay.split(/\s+/);
        const qts = norm(dest).split(/\s+/).filter(Boolean);
        if(!qts.every(qt=>tokenScore(qt,toks,hay)>0)) return false;
      }
      if(d1 && r.date < d1) return false;
      if(d2 && r.date > d2) return false;
      return true;
    }).sort((a,b)=>a.date.localeCompare(b.date));
  },[dest,d1,d2,races]);
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <h2 className="font-bold mt-6 mb-1" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:30}}>CORRE DURANTE TU VIAJE</h2>
      <p className="text-sm mb-4" style={{color:t.mut}}>Dinos a dónde vas y cuándo, y te mostramos todas las carreras disponibles en ese destino y rango de fechas. Ej.: «Japón» del 1 al 15 de marzo.</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-3" style={{background:t.panel, border:`1px solid ${t.line}`}}>
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{color:t.mut}}>Destino (país, ciudad o continente)</label>
          <input value={dest} onChange={e=>setDest(e.target.value)} placeholder="p. ej. Espana, Japon, Europa…"
                 className="w-full bg-transparent outline-none text-sm" style={{color:t.ink}}/>
        </div>
        <div className="rounded-xl p-3" style={{background:t.panel, border:`1px solid ${t.line}`}}>
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{color:t.mut}}>Desde</label>
          <input type="date" value={d1} onChange={e=>setD1(e.target.value)} className="w-full bg-transparent outline-none text-sm" style={{color:t.ink, colorScheme:"auto"}}/>
        </div>
        <div className="rounded-xl p-3" style={{background:t.panel, border:`1px solid ${t.line}`}}>
          <label className="text-[11px] uppercase tracking-wider block mb-1" style={{color:t.mut}}>Hasta</label>
          <input type="date" value={d2} onChange={e=>setD2(e.target.value)} className="w-full bg-transparent outline-none text-sm" style={{color:t.ink, colorScheme:"auto"}}/>
        </div>
      </div>
      {results===null ? (
        <div className="rounded-2xl p-10 text-center" style={{background:t.panel, border:`1px dashed ${t.line}`}}>
          <div className="text-3xl mb-2">🧳</div>
          <p className="font-semibold" style={{color:t.ink}}>Planifica tu próximo viaje corriendo</p>
          <p className="text-sm mt-1" style={{color:t.mut}}>Escribe un destino o elige fechas para empezar.</p>
        </div>
      ) : results.length===0 ? (
        <div className="rounded-2xl p-10 text-center" style={{background:t.panel, border:`1px dashed ${t.line}`}}>
          <div className="text-3xl mb-2">🏜️</div>
          <p className="font-semibold" style={{color:t.ink}}>No encontramos carreras en ese destino y fechas</p>
          <p className="text-sm mt-1" style={{color:t.mut}}>Prueba ampliando el rango o buscando por país o continente.</p>
        </div>
      ) : (
        <>
          <p className="text-sm mb-3" style={{color:t.mut}}><b style={{color:t.ink}}>{results.length}</b> carrera{results.length!==1?"s":""} durante tu viaje:</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(r=><RaceCard key={r.id} r={r} t={t} onOpen={onOpen} fav={favs.has(r.id)} onFav={onFav}/>)}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- asistente IA ---------- */
function AiView({ races, t, onOpen, favs, onFav }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const examples = [
    "Quiero correr una media maratón en octubre por menos de $150",
    "Un maratón plano y fresco para hacer mi mejor marca en 2027",
    "Quiero correr 4 carreras este año gastando poco, cerca de Latinoamérica",
    "Recomiéndame un trail épico para mi primera ultra",
  ];
  async function ask(text){
    const query = text ?? q;
    if(!query.trim() || loading) return;
    setLoading(true); setErr(""); setRes(null);
    const dataset = races.map(r=>({id:r.id,n:r.name,lugar:`${r.city}, ${r.country} (${r.continent})`,fecha:r.date,km:r.km,tipo:r.dist,sup:r.type,precio:`${r.cur}${r.price}`,tempC:r.temp,desnivel_m:r.elev,estado:STATUS[r.status].label,rating:r.rating,dificultad:r.diff,major:r.major}));
    try{
      const response = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000,
          messages:[{role:"user",content:
`Eres el asistente experto de World Runner, una plataforma para descubrir carreras de running.
Hoy es ${HOY.toISOString().slice(0,10)}.
Base de datos de carreras (JSON): ${JSON.stringify(dataset)}

Petición del usuario: "${query}"

Recomienda entre 2 y 5 carreras de la base de datos que mejor cumplan la petición, considerando fecha, precio, clima, desnivel, dificultad, estado de inscripción y ubicación. Si pide un plan anual, ordena las carreras con recuperación razonable entre ellas.
Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional, con esta forma exacta:
{"intro":"1-2 frases en español resumiendo tu recomendación","recs":[{"id":"id_exacto_de_la_base","reason":"por qué encaja, en 1-2 frases en español"}]}`}]})
      });
      const data = await response.json();
      const text = (data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(text);
      parsed.recs = (parsed.recs||[]).filter(x=>races.some(r=>r.id===x.id));
      setRes(parsed);
    }catch(e){
      setErr("No pude consultar al asistente en este momento. Inténtalo de nuevo.");
    }finally{ setLoading(false); }
  }
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <h2 className="font-bold mt-6 mb-1" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:30}}>ASISTENTE IA</h2>
      <p className="text-sm mb-4" style={{color:t.mut}}>Describe tu objetivo con tus palabras y el asistente elegirá las mejores carreras usando todos los datos de la plataforma.</p>
      <div className="rounded-2xl p-3 flex items-end gap-2" style={{background:t.panel, border:`1px solid ${t.line}`}}>
        <textarea value={q} onChange={e=>setQ(e.target.value)} rows={2}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); ask(); } }}
          placeholder="p. ej. «Quiero bajar de 3:30 en maratón: busco algo plano, fresco y con inscripción abierta»"
          className="flex-1 bg-transparent outline-none text-sm resize-none" style={{color:t.ink}}/>
        <button onClick={()=>ask()} disabled={loading}
          className="rounded-xl px-5 py-2.5 font-bold text-sm shrink-0 disabled:opacity-50"
          style={{background:t.acc, color:t.accInk}}>{loading?"Pensando…":"Preguntar"}</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {examples.map(ex=>(
          <button key={ex} onClick={()=>{setQ(ex); ask(ex);}} className="rounded-full px-3.5 py-1.5 text-xs text-left hover:opacity-80"
                  style={{background:t.chip, color:t.mut, border:`1px solid ${t.line}`}}>💬 {ex}</button>
        ))}
      </div>
      {loading && (
        <div className="mt-6 rounded-2xl p-8 text-center" style={{background:t.panel, border:`1px solid ${t.line}`}}>
          <div className="text-2xl animate-pulse">🏃‍♀️💨</div>
          <p className="text-sm mt-2" style={{color:t.mut}}>Analizando fechas, precios, clima y desniveles…</p>
        </div>
      )}
      {err && <div className="mt-6 rounded-2xl p-5 text-sm" style={{background:t.panel, border:`1px solid #EF4444`, color:t.ink}}>⚠️ {err}</div>}
      {res && (
        <div className="mt-6">
          <div className="rounded-2xl p-5 mb-4" style={{background:t.panel, border:`1px solid ${t.acc}55`}}>
            <p className="text-sm leading-relaxed" style={{color:t.ink}}>🤖 {res.intro}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {res.recs.map(rec=>{
              const r = races.find(x=>x.id===rec.id);
              return <RaceCard key={rec.id} r={r} t={t} onOpen={onOpen} fav={favs.has(r.id)} onFav={onFav} note={rec.reason}/>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- comparador ---------- */
function CompareView({ races, t, initial, onOpen }) {
  const [a,setA] = useState(initial||"berlin");
  const [b,setB] = useState(initial==="chicago"?"valencia":"chicago");
  const A = races.find(r=>r.id===a), B = races.find(r=>r.id===b);
  const rows = [
    ["Fecha", r=>fmtDate(r.date), null],
    ["Distancia", r=>r.km+" km", null],
    ["Precio", r=>r.cur+nf(r.price), (x,y)=>x.price<y.price],
    ["Corredores", r=>nf(r.runners), (x,y)=>x.runners>y.runners],
    ["Desnivel +", r=>nf(r.elev)+" m", (x,y)=>x.elev<y.elev],
    ["Temp. promedio", r=>r.temp+" °C", null],
    ["Tiempo límite", r=>r.limit, null],
    ["Dificultad", r=>"●".repeat(r.diff)+"○".repeat(5-r.diff), (x,y)=>x.diff<y.diff],
    ["Valoración", r=>"★ "+r.rating, (x,y)=>x.rating>y.rating],
    ["Estado", r=><Badge s={r.status} sm/>, null],
  ];
  const Sel = ({v,set,other}) => (
    <select value={v} onChange={e=>set(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
            style={{background:t.panel, color:t.ink, border:`1px solid ${t.line}`}}>
      {[...races].sort((x,y)=>x.name.localeCompare(y.name)).filter(r=>r.id!==other).map(r=><option key={r.id} value={r.id}>{r.flag} {r.name}</option>)}
    </select>
  );
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <h2 className="font-bold mt-6 mb-4" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:30}}>COMPARADOR</h2>
      <div className="grid grid-cols-2 gap-3 mb-4"><Sel v={a} set={setA} other={b}/><Sel v={b} set={setB} other={a}/></div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[A,B].map(r=>(
          <button key={r.id} onClick={()=>onOpen(r)} className="rounded-2xl h-24 p-4 text-left text-white font-bold hover:opacity-90"
                  style={{background:`linear-gradient(135deg,${r.g[0]},${r.g[1]})`, fontFamily:"'Barlow Condensed',sans-serif", fontSize:19}}>
            {r.name}<div className="text-xs font-normal opacity-80 mt-1" style={{fontFamily:"system-ui"}}>{r.flag} {r.city} · Ver ficha →</div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{border:`1px solid ${t.line}`}}>
        {rows.map(([l,fn,better],i)=>{
          const winA = better && better(A,B), winB = better && better(B,A);
          return (
            <div key={l} className="grid grid-cols-[1fr_110px_1fr] items-center text-sm"
                 style={{background:i%2?t.panel:t.panel2, borderTop:i?`1px solid ${t.line}`:"none"}}>
              <div className="p-3 text-right font-mono tabular-nums" style={{color:winA?STATUS.abierta.color:t.ink, fontWeight:winA?700:400}}>{fn(A)}{winA?" ✓":""}</div>
              <div className="p-3 text-center text-[11px] uppercase tracking-wider" style={{color:t.mut}}>{l}</div>
              <div className="p-3 font-mono tabular-nums" style={{color:winB?STATUS.abierta.color:t.ink, fontWeight:winB?700:400}}>{winB?"✓ ":""}{fn(B)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- perfil ---------- */
function ProfileView({ races, t, favs, alerts, onOpen }) {
  const completed = ["berlin","cdmx","medellin","panama","bsas21"];
  const done = races.filter(r=>completed.includes(r.id));
  const countries = [...new Set(done.map(r=>r.country))];
  const km = done.reduce((s,r)=>s+r.km,0);
  const achievements = [
    ["🥉","Primer 10K",true],["🥈","Primera media",true],["🥇","Primer maratón",true],["🌎","5 países",countries.length>=5],
    ["🔟","10 carreras",false],["⭐","Una Major",true],["👑","Six Star Finisher",false],["🏔️","Primer trail",false],
  ];
  const next = races.filter(r=>favs.has(r.id)&&daysTo(r.date)>0).sort((x,y)=>x.date.localeCompare(y.date));
  const alertList = races.filter(r=>alerts.has(r.id));
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <div className="flex items-center gap-4 mt-6 mb-5">
        <div className="rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold text-white" style={{background:t.acc}}>AR</div>
        <div>
          <h2 className="font-bold leading-none" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:30}}>ANA RUNNER</h2>
          <p className="text-sm" style={{color:t.mut}}>Corredora desde 2022 · Objetivo: sub 3:45 en maratón</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Carreras completadas",done.length],["Km en carrera",km.toFixed(1)],["Países",countries.length],["Mejor maratón","3:52:18"]].map(([l,v])=>(
          <div key={l} className="rounded-xl p-4" style={{background:t.panel, border:`1px solid ${t.line}`}}>
            <div className="font-mono font-bold text-2xl tabular-nums" style={{color:t.ink}}>{v}</div>
            <div className="text-[11px] uppercase tracking-wider mt-1" style={{color:t.mut}}>{l}</div>
          </div>
        ))}
      </div>

      <h3 className="font-bold mt-7 mb-3" style={{color:t.ink}}>Mapa personal · dónde has corrido</h3>
      <WorldMap races={done} t={t} onPick={onOpen} height={300}/>

      <h3 className="font-bold mt-7 mb-3" style={{color:t.ink}}>Logros</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {achievements.map(([e,l,ok])=>(
          <div key={l} className="rounded-xl p-3.5 flex items-center gap-3" style={{background:t.panel, border:`1px solid ${ok?t.acc:t.line}`, opacity:ok?1:0.45}}>
            <span className="text-2xl">{e}</span>
            <div><div className="text-sm font-semibold" style={{color:t.ink}}>{l}</div><div className="text-[11px]" style={{color:t.mut}}>{ok?"Desbloqueado":"Bloqueado"}</div></div>
          </div>
        ))}
      </div>

      <h3 className="font-bold mt-7 mb-3" style={{color:t.ink}}>Próximas carreras (tus favoritos)</h3>
      {next.length===0 ? (
        <div className="rounded-xl p-6 text-center text-sm" style={{background:t.panel, border:`1px dashed ${t.line}`, color:t.mut}}>
          Marca ❤️ en cualquier carrera para verla aquí con su cuenta regresiva.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {next.map(r=>(
            <button key={r.id} onClick={()=>onOpen(r)} className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:opacity-90"
                    style={{background:t.panel, border:`1px solid ${t.line}`}}>
              <div><div className="font-semibold" style={{color:t.ink}}>{r.flag} {r.name}</div>
                <div className="text-xs mt-0.5" style={{color:t.mut}}>{fmtDate(r.date)} · {r.city}</div></div>
              <Countdown date={r.date} t={t}/>
            </button>
          ))}
        </div>
      )}

      <h3 className="font-bold mt-7 mb-3" style={{color:t.ink}}>🔔 Alertas activas</h3>
      {alertList.length===0 ? (
        <div className="rounded-xl p-6 text-center text-sm" style={{background:t.panel, border:`1px dashed ${t.line}`, color:t.mut}}>
          Activa la campanita 🔔 en la ficha de una carrera para recibir avisos de apertura de inscripciones, cambios de precio, pocos cupos, cambios de fecha o recorrido.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {alertList.map(r=>(
            <button key={r.id} onClick={()=>onOpen(r)} className="rounded-full px-4 py-2 text-sm font-medium hover:opacity-80"
                    style={{background:t.chip, color:t.ink, border:`1px solid ${t.line}`}}>🔔 {r.flag} {r.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- app ---------- */
export default function App() {
  const [dark, setDark] = useState(true);
  const t = dark ? themes.dark : themes.light;
  const [view, setView] = useState({name:"home"});
  const [q, setQ] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [fDist, setFDist] = useState("Todas");
  const [fCont, setFCont] = useState("Todos");
  const [fStat, setFStat] = useState("Todos");
  const [mode, setMode] = useState("lista");
  const [favs, setFavs] = useState(new Set(["panama","valencia"]));
  const [alerts, setAlerts] = useState(new Set(["valencia"]));
  const [compareInit, setCompareInit] = useState(null);
  const topRef = useRef(null);

  const toggleFav = id => setFavs(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAlert = id => setAlerts(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const open = r => { setView({name:"race", id:r.id}); setShowSug(false); topRef.current?.scrollIntoView(); };
  const goCompare = id => { setCompareInit(id); setView({name:"compare"}); topRef.current?.scrollIntoView(); };

  const scored = useMemo(()=>RACES.map(r=>({r, s:raceScore(r,q)})).filter(x=>x.s>0),[q]);

  const suggestions = useMemo(()=>{
    if(norm(q).length<2) return [];
    return [...scored].sort((a,b)=>b.s-a.s || a.r.date.localeCompare(b.r.date)).slice(0,6).map(x=>x.r);
  },[scored,q]);

  const results = useMemo(()=>scored.map(x=>x.r).filter(r=>{
    if (fDist==="Trail"){ if(r.type!=="Trail") return false; }
    else if (fDist!=="Todas" && r.dist!==fDist) return false;
    if (fCont!=="Todos" && r.continent!==fCont) return false;
    if (fStat!=="Todos" && r.status!==fStat) return false;
    return true;
  }).sort((a,b)=>a.date.localeCompare(b.date)),[scored,fDist,fCont,fStat]);

  const upcoming = RACES.filter(r=>daysTo(r.date)>0).sort((a,b)=>a.date.localeCompare(b.date));
  const closing = RACES.filter(r=>r.status==="ultimos"||r.status==="sorteo").sort((a,b)=>a.date.localeCompare(b.date));
  const race = view.name==="race" ? RACES.find(r=>r.id===view.id) : null;

  const NavBtn = ({id,label}) => (
    <button onClick={()=>setView({name:id})}
      className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap"
      style={{background:view.name===id?t.acc:"transparent", color:view.name===id?t.accInk:t.mut}}>
      {label}
    </button>
  );

  const Chip = ({active, label, onClick}) => (
    <button onClick={onClick} className="rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors"
      style={{background:active?t.acc:t.chip, color:active?t.accInk:t.mut, border:`1px solid ${active?t.acc:t.line}`}}>
      {label}
    </button>
  );

  return (
    <div ref={topRef} style={{background:t.bg, minHeight:"100vh", fontFamily:"Inter, system-ui, -apple-system, sans-serif", transition:"background 0.3s"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        .font-mono{font-family:'JetBrains Mono',ui-monospace,monospace!important}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`}</style>

      {/* header */}
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{background:t.bg+"D9", borderBottom:`1px solid ${t.line}`}}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <button onClick={()=>setView({name:"home"})} className="flex items-center gap-2 shrink-0">
            <span className="rounded-lg w-8 h-8 flex items-center justify-center text-white font-black" style={{background:t.acc, fontFamily:"'Barlow Condensed',sans-serif"}}>W</span>
            <span className="font-bold tracking-tight hidden md:block" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:19, letterSpacing:"0.02em"}}>WORLD RUNNER</span>
          </button>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            <NavBtn id="home" label="Explorar"/><NavBtn id="calendar" label="Calendario"/><NavBtn id="rankings" label="Rankings"/><NavBtn id="compare" label="Comparar"/><NavBtn id="trip" label="Viaje"/><NavBtn id="ai" label="IA ✨"/><NavBtn id="profile" label="Perfil"/>
          </nav>
          <button onClick={()=>setDark(d=>!d)} aria-label="Cambiar tema" className="rounded-lg w-9 h-9 text-lg shrink-0" style={{background:t.chip}}>{dark?"☀️":"🌙"}</button>
        </div>
      </header>

      {view.name==="home" && (
        <main className="max-w-6xl mx-auto px-4 pb-16">
          {/* hero */}
          <section className="rounded-3xl mt-5 p-6 md:p-12 relative" style={{background:t.grad, border:`1px solid ${t.line}`}}>
            <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{color:t.acc}}>● {RACES.filter(r=>r.status==="abierta").length} carreras con inscripción abierta ahora</div>
            <h1 className="font-extrabold leading-none uppercase" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:"clamp(38px,7vw,72px)", letterSpacing:"0.01em"}}>
              Toda carrera.<br/><span style={{color:t.acc}}>Todo el planeta.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px]" style={{color:t.mut}}>
              Descubre, compara y planifica maratones, medias, 10K, trails y ultras en cualquier país — con links de inscripción oficiales.
            </p>
            <div className="relative max-w-2xl">
              <div className="mt-6 flex items-center gap-2 rounded-2xl p-2" style={{background:t.panel, border:`1px solid ${showSug&&suggestions.length?t.acc:t.line}`}}>
                <span className="pl-2 text-lg">🔍</span>
                <input value={q}
                  onChange={e=>{setQ(e.target.value); setShowSug(true);}}
                  onFocus={()=>setShowSug(true)}
                  placeholder="Busca sin tildes y con errores: «medellin», «marathon berlin», «trail suiza»…"
                  className="flex-1 bg-transparent outline-none text-[15px] py-2 min-w-0" style={{color:t.ink}}/>
                {q && <button onClick={()=>{setQ("");setShowSug(false);}} className="text-sm px-2" style={{color:t.mut}}>✕</button>}
              </div>
              {showSug && suggestions.length>0 && (
                <div className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-xl z-20" style={{background:t.panel, border:`1px solid ${t.line}`}}>
                  {suggestions.map(r=>(
                    <button key={r.id} onClick={()=>open(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                      style={{borderBottom:`1px solid ${t.line}`}}>
                      <div className="w-8 h-8 rounded-lg shrink-0" style={{background:`linear-gradient(135deg,${r.g[0]},${r.g[1]})`}}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{color:t.ink}}>{r.flag} {r.name}</div>
                        <div className="text-xs" style={{color:t.mut}}>{r.city}, {r.country} · {fmtDate(r.date)} · {r.dist}</div>
                      </div>
                      <Badge s={r.status} sm/>
                    </button>
                  ))}
                  <button onClick={()=>setShowSug(false)} className="w-full px-4 py-2.5 text-xs font-semibold text-center" style={{color:t.acc}}>
                    Ver los {results.length} resultados abajo ↓
                  </button>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm" style={{color:t.mut}}>
              <span><b style={{color:t.ink}}>{RACES.length}</b> carreras verificadas</span>
              <span><b style={{color:t.ink}}>{[...new Set(RACES.map(r=>r.country))].length}</b> países</span>
              <span><b style={{color:t.ink}}>{nf(RACES.reduce((s,r)=>s+r.runners,0))}</b> corredores/año</span>
              <span><b style={{color:t.ink}}>{RACES.filter(r=>r.major).length}</b> Majors</span>
            </div>
          </section>

          {/* filtros */}
          <section className="mt-5 flex flex-col gap-2.5" onClick={()=>setShowSug(false)}>
            <div className="flex gap-2 overflow-x-auto pb-1">{DISTS.map(d=><Chip key={d} label={d} active={fDist===d} onClick={()=>setFDist(d)}/>)}</div>
            <div className="flex gap-2 overflow-x-auto pb-1">{CONTS.map(c=><Chip key={c} label={c} active={fCont===c} onClick={()=>setFCont(c)}/>)}</div>
            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
              {STATS_F.map(s=><Chip key={s} label={s==="Todos"?"Cualquier estado":STATUS[s].label} active={fStat===s} onClick={()=>setFStat(s)}/>)}
              <div className="ml-auto flex rounded-xl overflow-hidden shrink-0" style={{border:`1px solid ${t.line}`}}>
                {["lista","mapa"].map(m=>(
                  <button key={m} onClick={()=>setMode(m)} className="px-4 py-1.5 text-sm font-semibold"
                          style={{background:mode===m?t.acc:t.panel, color:mode===m?t.accInk:t.mut}}>{m==="lista"?"☰ Lista":"🗺 Mapa"}</button>
                ))}
              </div>
            </div>
          </section>

          {/* resultados */}
          <section className="mt-4" onClick={()=>setShowSug(false)}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-bold" style={{color:t.ink}}>{results.length} carrera{results.length!==1?"s":""} encontrada{results.length!==1?"s":""}</h2>
              <span className="text-xs font-mono" style={{color:t.mut}}>ordenadas por fecha</span>
            </div>
            {mode==="mapa" ? (
              <WorldMap races={results} t={t} onPick={open}/>
            ) : results.length===0 ? (
              <div className="rounded-2xl p-10 text-center" style={{background:t.panel, border:`1px dashed ${t.line}`}}>
                <div className="text-3xl mb-2">🏜️</div>
                <p className="font-semibold" style={{color:t.ink}}>No hay carreras con esos filtros</p>
                <p className="text-sm mt-1" style={{color:t.mut}}>Prueba con otra distancia o continente, o limpia la búsqueda.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(r=><RaceCard key={r.id} r={r} t={t} onOpen={open} fav={favs.has(r.id)} onFav={toggleFav}/>)}
              </div>
            )}
          </section>

          {/* cierran pronto */}
          {closing.length>0 && fStat==="Todos" && !q && (
            <section className="mt-10">
              <h2 className="font-bold mb-1" style={{color:t.ink, fontFamily:"'Barlow Condensed',sans-serif", fontSize:25}}>⏳ ÚLTIMOS CUPOS Y SORTEOS ACTIVOS</h2>
              <p className="text-sm mb-3" style={{color:t.mut}}>Estas inscripciones están a punto de agotarse o dependen de un sorteo. Activa alertas 🔔 para no perder tu dorsal.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {closing.slice(0,6).map(r=><RaceCard key={r.id} r={r} t={t} onOpen={open} fav={favs.has(r.id)} onFav={toggleFav}/>)}
              </div>
            </section>
          )}

          {/* próxima gran cita */}
          {upcoming[0] && !q && (
            <section className="mt-10 rounded-3xl p-6 md:p-8 flex flex-wrap items-center justify-between gap-6 text-white"
                     style={{background:`linear-gradient(135deg,${upcoming[0].g[0]},${upcoming[0].g[1]})`}}>
              <div>
                <div className="text-xs uppercase tracking-widest opacity-80 font-mono">Próxima gran cita</div>
                <div className="font-bold mt-1" style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:28}}>{upcoming[0].flag} {upcoming[0].name}</div>
                <div className="text-sm opacity-85 mt-0.5">{fmtDate(upcoming[0].date)} · {upcoming[0].city}</div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <Countdown date={upcoming[0].date} t={{ink:"#fff",mut:"rgba(255,255,255,0.65)"}} big/>
                <button onClick={()=>open(upcoming[0])} className="rounded-xl px-5 py-3 font-bold" style={{background:"#fff", color:upcoming[0].g[1]}}>Ver carrera →</button>
              </div>
            </section>
          )}
        </main>
      )}

      {view.name==="race" && race && <RaceDetail r={race} t={t} onBack={()=>setView({name:"home"})} fav={favs.has(race.id)} onFav={toggleFav} onCompare={goCompare} alertOn={alerts.has(race.id)} onAlert={toggleAlert}/>}
      {view.name==="calendar" && <CalendarView races={RACES} t={t} onOpen={open}/>}
      {view.name==="rankings" && <RankingsView races={RACES} t={t} onOpen={open}/>}
      {view.name==="compare" && <CompareView races={RACES} t={t} initial={compareInit} onOpen={open}/>}
      {view.name==="trip" && <TripView races={RACES} t={t} onOpen={open} favs={favs} onFav={toggleFav}/>}
      {view.name==="ai" && <AiView races={RACES} t={t} onOpen={open} favs={favs} onFav={toggleFav}/>}
      {view.name==="profile" && <ProfileView races={RACES} t={t} favs={favs} alerts={alerts} onOpen={open}/>}

      <footer className="py-8 px-4 text-center text-xs font-mono leading-relaxed" style={{color:t.mut, borderTop:`1px solid ${t.line}`}}>
        WORLD RUNNER · MVP demo · {RACES.length} carreras con webs oficiales verificadas a mano · fechas, precios y estados son orientativos: confirma siempre en el sitio oficial ·<br/>
        la cobertura total (decenas de miles de carreras locales por país) llega con el backend de sincronización automática en producción
      </footer>
    </div>
  );
}
