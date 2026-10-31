/**
 * Páginas de destino (/destinations/:slug): una por cada zona principal que se atiende desde el
 * aeropuerto de Cancún. Todo el texto está en inglés, como el resto del sitio.
 *
 * Las fotos viven en public/destinations/photos y vienen de Wikimedia Commons con licencia libre;
 * cada una lleva su crédito (autor y licencia), que se muestra al pie de la página.
 * El mapa de cada destino es una imagen generada con scripts/build-destination-maps.mjs (ver destinationMaps.ts).
 */

export interface DestinationPhoto {
  /** Archivo dentro de public/destinations/photos. */
  file: string;
  alt: string;
  caption?: string;
  /** Qué parte de la foto queda a la vista al recortarla (object-position). */
  position?: string;
  author: string;
  license: string;
  /** Página de la foto en Wikimedia Commons. */
  source: string;
}

export interface Destination {
  slug: string;
  /** Nombre completo, para títulos. */
  name: string;
  /** Nombre corto, para etiquetas del mapa y enlaces. */
  shortName: string;
  tagline: string;
  /** Etiqueta del marcador en el mapa, si es distinta del nombre corto. */
  mapLabel?: string;
  /** Frase corta para la tarjeta de la portada y el SEO. */
  summary: string;
  /** Tiempo de manejo aproximado, sin tráfico. */
  time: string;
  distanceKm: string;
  distanceMi: string;
  /** Aclaración bajo el tiempo y la distancia. */
  note?: string;
  hero: DestinationPhoto;
  gallery: DestinationPhoto[];
  paragraphs: string[];
  /** Qué ver y hacer cerca. */
  highlights: string[];
  /** Detalles útiles para el viaje. */
  goodToKnow: string[];
}

export const AIRPORT = { name: 'Cancun Airport (CUN)' } as const;

const PHOTOS = '/destinations/photos/';
export const photoUrl = (file: string) => PHOTOS + file;

export const DESTINATIONS: Destination[] = [
  {
    slug: 'costa-mujeres',
    name: 'Costa Mujeres',
    shortName: 'Costa Mujeres',
    tagline: 'Wide, quiet beaches at the northern end of the Cancun coast',
    summary: 'Large resorts and wide, quiet beaches north of Playa Mujeres.',
    time: 'About 40 min',
    distanceKm: '35 km',
    distanceMi: '22 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'costa-mujeres-hero.jpg',
      alt: 'A resort pool with palm trees at dusk in Costa Mujeres',
      position: 'center 60%',
      author: 'Oleg Yunakov',
      license: 'CC BY-SA 4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Riu_Palace_Costa_Mujeres_-_03.jpg',
    },
    gallery: [
      {
        file: 'costa-mujeres-1.jpg',
        alt: 'A wide sandy beach with palm trees leading toward the sea in Costa Mujeres',
        caption: 'The beach at Costa Mujeres',
        author: 'Oleg Yunakov',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Costa_Mujeres_-_02.jpg',
      },
      {
        file: 'costa-mujeres-2.jpg',
        alt: 'Waves reaching a quiet beach in Costa Mujeres under a moody sky',
        caption: 'Quiet shoreline at Costa Mujeres',
        author: 'Oleg Yunakov',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Costa_Mujeres_-_07.jpg',
      },
      {
        file: 'costa-mujeres-3.jpg',
        alt: 'Palm trees and thatched huts behind the dunes at Costa Mujeres',
        caption: 'Palm trees and palapas behind the beach',
        author: 'Oleg Yunakov',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Costa_Mujeres_-_06.jpg',
      },
      {
        file: 'costa-mujeres-4.jpg',
        alt: 'Thatched palapas and palm trees on the sand at Costa Mujeres',
        caption: 'Palapas on the sand',
        author: 'Oleg Yunakov',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Costa_Mujeres_-_01.jpg',
      },
      {
        file: 'costa-mujeres-5.jpg',
        alt: 'Green gardens and resort buildings on the Costa Mujeres coast under a stormy sky',
        caption: 'Resort gardens along the coast',
        author: 'Oleg Yunakov',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Riu_Palace_Costa_Mujeres_-_02.jpg',
      },
    ],
    paragraphs: [
      'Costa Mujeres is a newer resort area at the northern end of the Cancun coast, just past Playa Mujeres. Large all-inclusive resorts sit along its wide, quiet beaches, and the atmosphere is much more relaxed than in the Hotel Zone.',
      'Isla Blanca, a long, narrow stretch of white sand popular for kitesurfing, is next door, and Isla Mujeres and Isla Contoy are easy day trips by boat.',
    ],
    highlights: [
      'Wide, quiet beaches and large resorts',
      'Isla Blanca and its lagoon nearby',
      'Day trips to Isla Mujeres and Isla Contoy',
      'A calm area to unwind, away from the Hotel Zone crowds',
    ],
    goodToKnow: [
      'It is one of the farthest areas we serve on the north side, so a private transfer is the easiest way to arrive after your flight.',
      'Tell us your resort name when you book so your driver goes straight to the right entrance.',
    ],
  },
  {
    slug: 'playa-mujeres',
    name: 'Playa Mujeres',
    shortName: 'Playa Mujeres',
    tagline: 'A calm resort area north of Cancun, facing Isla Mujeres',
    summary: 'A quiet resort community north of Cancun, across the bay from Isla Mujeres.',
    time: 'About 35 min',
    distanceKm: '28 km',
    distanceMi: '17 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'playa-mujeres-hero.jpg',
      alt: 'Aerial view of Isla Mujeres with turquoise water and a long white beach',
      position: 'center 45%',
      author: 'dronepicr',
      license: 'CC BY 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Playa_Norte,_Isla_Mujeres_(42695470885).jpg',
    },
    gallery: [
      {
        file: 'playa-mujeres-1.jpg',
        alt: 'A white-sand beach with green coastal vegetation north of Cancun',
        caption: 'White sand on the coast north of Cancun',
        author: 'Stefan Joerger',
        license: 'CC BY-SA 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Isla_Blanca_nahe_Canc%C3%BAn_(40877026953).jpg',
      },
      {
        file: 'playa-mujeres-2.jpg',
        alt: 'A beach and a pier at Puerto Juarez, north of Cancun',
        caption: 'The beach at Puerto Juarez',
        author: 'Federico Mata',
        license: 'CC BY 3.0',
        source: 'https://commons.wikimedia.org/wiki/File:Puerto_Juarez_-_panoramio.jpg',
      },
      {
        file: 'playa-mujeres-3.jpg',
        alt: 'Turquoise water with the Cancun skyline far away on the horizon',
        caption: 'The Cancun skyline seen from Isla Mujeres',
        author: 'Bernard DUPONT',
        license: 'CC BY-SA 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Cancun_Skyline,_view_from_Isla_Mujeres_south_coast_-_Quintana_Roo_Mexico_March_2020.jpg',
      },
      {
        file: 'playa-mujeres-4.jpg',
        alt: 'A ferry arriving at a dock in the turquoise water near Isla Mujeres',
        caption: 'The ferry to Isla Mujeres',
        author: 'Kirt Edblom',
        license: 'CC BY-SA 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Ferry_at_Punta_Juarez_to_Isla_Mujeres_(8951148661).jpg',
      },
      {
        file: 'playa-mujeres-5.jpg',
        alt: 'Aerial view of the Bahia de Mujeres with boats on turquoise water',
        caption: 'The Bahia de Mujeres from above',
        author: 'Mauro I. Barea G.',
        license: 'CC BY-SA 3.0',
        source: 'https://commons.wikimedia.org/wiki/File:Bahiamujeres.JPG',
      },
    ],
    paragraphs: [
      'Playa Mujeres is a planned resort community on the mainland coast north of Cancun, across the water from Isla Mujeres. It is known for large all-inclusive resorts, a golf course and a calm beach, and it feels far quieter than the Hotel Zone.',
      'Isla Mujeres is a short boat ride away, and the ferries leave from nearby Puerto Juarez. Cancun is close enough for a dinner out, but most guests stay at their resort and enjoy the beach.',
    ],
    highlights: [
      'A calm beach and quiet, upscale resorts',
      'Boat trips and ferries to Isla Mujeres from nearby Puerto Juarez',
      'Golf and a marina in the area',
      'Restaurants and shops in Cancun, a short drive south',
    ],
    goodToKnow: [
      'The route goes through the north side of Cancun, so traffic can slow the trip at rush hour.',
      'Tell us your resort name when you book so your driver goes straight to the right entrance.',
    ],
  },
  {
    slug: 'cancun',
    name: 'Cancun Hotel Zone',
    shortName: 'Cancun',
    mapLabel: 'Hotel Zone',
    tagline: 'White-sand beaches and resorts a short ride from the airport',
    summary: 'The closest beach resorts to the airport, along Kukulcan Boulevard.',
    time: 'About 20 min',
    distanceKm: '15–25 km',
    distanceMi: '10–15 mi',
    note: 'Depends on where your hotel is along the Hotel Zone.',
    hero: {
      file: 'cancun-hero.jpg',
      alt: 'White-sand beach and turquoise water in Cancun, with hotels in the distance',
      position: 'center 70%',
      author: 'Luka Peternel',
      license: 'CC BY-SA 4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Cancun-beach-Mexico-2016-Luka-Peternel.jpg',
    },
    gallery: [
      {
        file: 'cancun-1.jpg',
        alt: 'Aerial view of the Cancun Hotel Zone with the Caribbean Sea behind it',
        caption: 'The Hotel Zone seen from above',
        author: 'ProtoplasmaKid',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Canc%C3%BAn_-_Playa_Gaviota_Azul_-_05.jpg',
      },
      {
        file: 'cancun-2.jpg',
        alt: 'Turquoise waves reaching a sandy beach in Cancun',
        caption: 'Turquoise water along the Hotel Zone',
        author: 'G.Mannaerts',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Beach_Cancun.JPG',
      },
      {
        file: 'cancun-3.jpg',
        alt: 'Aerial view of Punta Cancun, where the Hotel Zone bends, with a turquoise bay beside the hotels',
        caption: 'Punta Cancun, where the Hotel Zone bends',
        author: 'ProtoplasmaKid',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Canc%C3%BAn_-_Playa_Gaviota_Azul_-_03.jpg',
      },
      {
        file: 'cancun-4.jpg',
        alt: 'A sandy beach with hotels along the shore in Cancun',
        caption: 'Beach and hotels near Punta Cancun',
        author: 'Keith Pomakis',
        license: 'CC BY-SA 2.5',
        source: 'https://commons.wikimedia.org/wiki/File:Cancun_Beach.jpg',
      },
      {
        file: 'cancun-5.jpg',
        alt: 'Nichupte Lagoon surrounded by green vegetation and hotels',
        caption: 'Nichupte Lagoon, on the other side of the Hotel Zone',
        author: 'Isabel A01706197',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Laguna_Nichupt%C3%A9.jpg',
      },
    ],
    paragraphs: [
      'The Cancun Hotel Zone is a long, narrow strip of land between the Caribbean Sea and the Nichupte Lagoon. It is lined with resorts, restaurants, shopping centers and beaches, all along Kukulcan Boulevard.',
      'It is the closest beach destination to the airport, so you can be at your hotel and out on the sand shortly after you land. Resorts at the southern end are the nearest; those near Punta Cancun, at the northern tip, are a little farther.',
    ],
    highlights: [
      'Beaches with calm turquoise water on the Caribbean side',
      'Restaurants, shopping and nightlife along Kukulcan Boulevard',
      'Boat trips and ferries to Isla Mujeres',
      'Snorkeling, diving and water sports',
    ],
    goodToKnow: [
      'Tell us your hotel name when you book so your driver goes straight to the right entrance.',
      'Traffic on Kukulcan Boulevard is usually heaviest around midday and early evening.',
    ],
  },
  {
    slug: 'bahia-petempich',
    name: 'Bahia Petempich',
    shortName: 'Bahia Petempich',
    tagline: 'Quiet resort beaches with the reef just off the coast',
    summary: 'Resort beaches on the quiet coast just north of Puerto Morelos.',
    time: 'About 30 min',
    distanceKm: '22 km',
    distanceMi: '14 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'bahia-petempich-hero.jpg',
      alt: 'Turquoise water and a long beach with resort buildings along the Puerto Morelos coast',
      position: 'center 60%',
      author: 'Tony Hisgett',
      license: 'CC BY 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Sand_and_sea_(4385101684).jpg',
    },
    gallery: [
      {
        file: 'bahia-petempich-1.jpg',
        alt: 'Sunrise colors reflected on calm water, seen from under a thatched roof on the Riviera Maya coast',
        caption: 'Sunrise on the Riviera Maya coast',
        author: 'Tonirx',
        license: 'Public domain',
        source: 'https://commons.wikimedia.org/wiki/File:Sunrise_at_Riviera_Maya_Resort,_Mexico.jpg',
      },
      {
        file: 'bahia-petempich-2.jpg',
        alt: 'The Caribbean Sea seen from the Puerto Morelos Reef National Park',
        caption: 'The Caribbean from the Puerto Morelos reef',
        author: 'ProtoplasmaKid',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Vista_del_Mar_Caribe_desde_el_Parque_nacional_Arrecife_de_Puerto_Morelos.jpg',
      },
      {
        file: 'bahia-petempich-3.jpg',
        alt: 'A school of fish over coral on the reef off Puerto Morelos',
        caption: 'Fish on the reef, a short swim from shore',
        author: 'Tony Hisgett',
        license: 'CC BY 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Blue_Shoal_2_(4385123381).jpg',
      },
      {
        file: 'bahia-petempich-4.jpg',
        alt: 'A sea turtle swimming over coral on the reef off Puerto Morelos',
        caption: 'A sea turtle on the reef',
        author: 'Tony Hisgett',
        license: 'CC BY 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Turtle_5_(4385132589).jpg',
      },
      {
        file: 'bahia-petempich-5.jpg',
        alt: 'Coconut palm trees on a white-sand Caribbean beach',
        caption: 'Palm trees along the Caribbean coast',
        author: 'Nicholas Hartmann',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:2009_Yucat%C3%A1n_beach_palms.jpg',
      },
    ],
    paragraphs: [
      'Bahia Petempich is a calm stretch of Caribbean coast in the Puerto Morelos area, home to several large all-inclusive resorts. It is close to the airport, so you can be on the beach soon after you land.',
      'The reef that runs along this coast lies close to shore, which makes snorkeling easy right from the beach. Puerto Morelos, with its leaning lighthouse and seafood restaurants, is only a short drive away.',
    ],
    highlights: [
      'Resort beaches with calm, clear water',
      'Snorkeling on the reef just off the coast',
      'Puerto Morelos town and its seafood restaurants nearby',
      'A short transfer from the airport',
    ],
    goodToKnow: [
      'Resorts here are set back from the highway; tell us your hotel name when you book so your driver goes to the right entrance.',
      'If you land early, ask your hotel about early check-in or luggage storage.',
    ],
  },
  {
    slug: 'puerto-morelos',
    name: 'Puerto Morelos',
    shortName: 'Puerto Morelos',
    tagline: 'A quiet fishing town with a reef just off the beach',
    summary: 'A relaxed fishing town with a leaning lighthouse and a reef close to shore.',
    time: 'About 25 min',
    distanceKm: '26 km',
    distanceMi: '16 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'puerto-morelos-hero.jpg',
      alt: 'Small fishing boats in turquoise shallow water at Puerto Morelos',
      position: 'center 60%',
      author: 'Edna Winti',
      license: 'CC BY 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Puerto_Morelos,_QR_Mexico_-_On_the_beach_May_2025.jpg',
    },
    gallery: [
      {
        file: 'puerto-morelos-1.jpg',
        alt: 'The lighthouse of Puerto Morelos on the shore, with the reef behind it',
        caption: 'The lighthouse and the reef',
        author: 'Jaontiveros',
        license: 'Public domain',
        source: 'https://commons.wikimedia.org/wiki/File:Faro_y_arrecife_Pto.Morelos.jpg',
      },
      {
        file: 'puerto-morelos-2.jpg',
        alt: 'The old leaning lighthouse of Puerto Morelos next to the newer lighthouse',
        caption: 'The leaning lighthouse, a symbol of the town',
        author: 'Jaontiveros',
        license: 'CC BY-SA 3.0',
        source: 'https://commons.wikimedia.org/wiki/File:Faro_inclinado_Pto.Morelos.jpg',
      },
      {
        file: 'puerto-morelos-3.jpg',
        alt: 'The colorful Puerto Morelos sign on the town beach square',
        caption: 'The colorful Puerto Morelos sign',
        author: 'Gordon Leggett',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:2020-02-13_Puerto_Morelos_sign.jpg',
      },
      {
        file: 'puerto-morelos-4.jpg',
        alt: 'A child snorkeling in clear shallow water off Puerto Morelos',
        caption: 'Snorkeling just off the beach',
        author: 'Wotancito',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Buceando_en_Puerto_Morelos.jpg',
      },
      {
        file: 'puerto-morelos-5.jpg',
        alt: 'The lighthouse and houses of Puerto Morelos seen from the sea',
        caption: 'The town seen from the sea',
        author: 'Alfonzo Buscemi',
        license: 'CC BY 3.0',
        source: 'https://commons.wikimedia.org/wiki/File:PoMo_from_the_sea_-_panoramio.jpg',
      },
    ],
    paragraphs: [
      'Puerto Morelos is a small fishing town south of Cancun that has kept its relaxed, local feel. A short walk takes you from the town square to the beach and the pier.',
      'Its best-known landmark is the old lighthouse that tilted during Hurricane Beulah in 1967 and still leans today. Just offshore is a coral reef, which makes the town popular for snorkeling and diving.',
    ],
    highlights: [
      'The leaning lighthouse and the town square',
      'Snorkeling and diving on the reef just off the coast',
      'Fresh seafood in family-run restaurants',
      'Quiet beaches and a laid-back atmosphere',
    ],
    goodToKnow: [
      'It is the closest Riviera Maya town to the airport, so it is a good choice if you want a short transfer.',
      'The town is small and walkable; many hotels are a few minutes from the beach.',
    ],
  },
  {
    slug: 'playa-del-carmen',
    name: 'Playa del Carmen',
    shortName: 'Playa del Carmen',
    tagline: 'The lively heart of the Riviera Maya',
    summary: 'Fifth Avenue, beach clubs and easy trips to cenotes, parks and Cozumel.',
    time: 'About 45 min',
    distanceKm: '55 km',
    distanceMi: '34 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'playa-del-carmen-hero.jpg',
      alt: 'The beach at Playa del Carmen with the pier in the distance',
      position: 'center 82%',
      author: 'dronepicr',
      license: 'CC BY 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Playa_del_Carmen_beach_(43548346932).jpg',
    },
    gallery: [
      {
        file: 'playa-del-carmen-1.jpg',
        alt: 'A pedestrian street with thatched-roof restaurants in Playa del Carmen',
        caption: 'Fifth Avenue, the main pedestrian street',
        author: 'Giorgio Galeotti',
        license: 'CC BY 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Quinta_Avenida_-_Playa_del_Carmen,_Mexico_-_August_15,_2014_01.jpg',
      },
      {
        file: 'playa-del-carmen-2.jpg',
        alt: 'A wide sandy beach with palm trees in Playa del Carmen',
        caption: 'Long beaches just south of town',
        author: 'Giorgio Galeotti',
        license: 'CC BY 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Beach_-_Playa_del_Carmen,_Mexico_-_August_15,_2014_01.jpg',
      },
      {
        file: 'playa-del-carmen-3.jpg',
        alt: 'Aerial view of Playa del Carmen with its beach, pier and streets',
        caption: 'Playa del Carmen from above',
        author: 'dronepicr',
        license: 'CC BY 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Aerial_of_Playa_del_Carmen,_Mexico_(28708057347).jpg',
      },
      {
        file: 'playa-del-carmen-4.jpg',
        alt: 'A ferry to Cozumel at the Playa del Carmen pier at sunrise',
        caption: 'The Cozumel ferry at sunrise',
        author: 'Giorgio Galeotti',
        license: 'CC BY 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Ferry_for_Cozumel_at_Sunrise_-_Playa_del_Carmen,_Mexico_-_August_15,_2014.jpg',
      },
      {
        file: 'playa-del-carmen-5.jpg',
        alt: 'Tourists walking toward the ferry terminal arch on Fifth Avenue in Playa del Carmen',
        caption: 'The ferry terminal at the end of Fifth Avenue',
        author: 'TampAGS,',
        license: 'CC BY-SA 3.0',
        source: 'https://commons.wikimedia.org/wiki/File:Terminal_Maritima_Playa_del_Carmen.JPG',
      },
    ],
    paragraphs: [
      'Playa del Carmen is the most lively town on the Riviera Maya. Fifth Avenue, a pedestrian street running parallel to the sea, is full of shops, cafes, restaurants and bars, and the beach is only a few blocks away.',
      'It is also a convenient base for exploring: the ferry to Cozumel leaves from the main pier, and cenotes, Maya sites and eco-parks are a short ride away. Playacar, next to the town, is a quieter area of resorts.',
    ],
    highlights: [
      'Fifth Avenue for shopping, dining and nightlife',
      'Beach clubs and long stretches of white sand',
      'Ferries to Cozumel from the main pier',
      'Cenotes, Xcaret and other attractions nearby',
    ],
    goodToKnow: [
      'Some hotels near Fifth Avenue are on pedestrian-only streets, so the drop-off point may be a short walk from your door.',
      'Tell us your hotel when you book so we can plan the best drop-off spot.',
    ],
  },
  {
    slug: 'akumal',
    name: 'Akumal',
    shortName: 'Akumal',
    tagline: 'A calm bay known for its sea turtles',
    summary: 'A peaceful bay where green sea turtles feed in the shallows.',
    time: 'About 1 h 15 min',
    distanceKm: '92 km',
    distanceMi: '57 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'akumal-hero.jpg',
      alt: 'Small boats resting in the calm water of Akumal bay at dusk',
      position: 'center 55%',
      author: 'Serge Melki',
      license: 'CC BY 2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Akumal_Beach_-_Mexico_(4303205262).jpg',
    },
    gallery: [
      {
        file: 'akumal-1.jpg',
        alt: 'A green sea turtle feeding on seagrass in Akumal bay',
        caption: 'A green sea turtle in Akumal bay',
        author: 'Andresvilla92',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:GreenSeaTurtlesAkumalCancunMexico02.JPG',
      },
      {
        file: 'akumal-2.jpg',
        alt: 'Clear shallow water over rocks on the Akumal coast',
        caption: 'Clear, shallow water on the coast',
        author: 'Ken Thomas',
        license: 'Public domain',
        source: 'https://commons.wikimedia.org/wiki/File:Akumal_Half-moon_Bay-27527.jpg',
      },
      {
        file: 'akumal-3.jpg',
        alt: 'A white-sand beach with palm trees and calm shallow water in Akumal',
        caption: 'The beach at Akumal',
        author: 'Alfonzo Buscemi',
        license: 'CC BY 3.0',
        source: 'https://commons.wikimedia.org/wiki/File:Busy_beach_-_panoramio.jpg',
      },
      {
        file: 'akumal-4.jpg',
        alt: 'A calm lagoon with rocks and green vegetation in Akumal',
        caption: 'Yal-Ku Lagoon, a short ride from the bay',
        author: 'Laura',
        license: 'CC BY 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Yal-Ku_Lagoon,_Akumal_(8182528258).jpg',
      },
      {
        file: 'akumal-5.jpg',
        alt: 'Aerial view of the rocky coastline near Akumal with white houses in the trees',
        caption: 'The coastline near Akumal from above',
        author: 'Branko',
        license: 'Public domain',
        source: 'https://commons.wikimedia.org/wiki/File:Karstic_coastline_Akumal_Q.R._by_branko.jpg',
      },
    ],
    paragraphs: [
      'Akumal, often translated as “place of the turtles”, is a small beach community with a sheltered bay and calm, clear water. It is a favorite for families and for travelers who want a slower pace than the bigger towns.',
      'Green sea turtles feed on the seagrass in the bay, and snorkeling here is one of the highlights of the area. Please follow local rules and keep a respectful distance to help protect them.',
    ],
    highlights: [
      'Snorkeling in the bay with sea turtles',
      'Calm beaches, good for swimming',
      'Half Moon Bay and Yal-Ku Lagoon nearby',
      'Cenotes and Maya sites a short ride away',
    ],
    goodToKnow: [
      'Akumal is about halfway between Playa del Carmen and Tulum, so it works well as a base for both.',
      'Tell us your hotel or rental address when you book; some are on private roads.',
    ],
  },
  {
    slug: 'tulum',
    name: 'Tulum',
    shortName: 'Tulum',
    tagline: 'Maya ruins above the Caribbean and a laid-back beach scene',
    summary: 'Cliff-top Maya ruins, beach-road boutique hotels and cenotes.',
    time: 'About 1 h 30 min',
    distanceKm: '118 km',
    distanceMi: '73 mi',
    note: 'Driving time without traffic.',
    hero: {
      file: 'tulum-hero.jpg',
      alt: 'The Temple of the God of the Winds on a rocky cliff above the turquoise sea in Tulum',
      position: 'center 40%',
      author: 'Martin Falbisoner',
      license: 'CC BY-SA 4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Tulum_-_God_of_the_Winds_Temple_03.JPG',
    },
    gallery: [
      {
        file: 'tulum-1.jpg',
        alt: 'Rocks and waves below the Maya temple at Tulum',
        caption: 'The temple seen from the beach',
        author: 'Bernard DUPONT',
        license: 'CC BY-SA 2.0',
        source:
          'https://commons.wikimedia.org/wiki/File:Temple_of_the_God_of_the_Winds,_seen_from_the_beach_-_Tulum_Maya_site_QR_Feb_2020.jpg',
      },
      {
        file: 'tulum-2.jpg',
        alt: 'A quiet sandy beach with turquoise water and palm trees in Tulum',
        caption: 'A quiet cove near the ruins',
        author: 'ROberto Carlos Román Don',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Beach_in_Tulum.jpg',
      },
      {
        file: 'tulum-3.jpg',
        alt: 'El Castillo, the main pyramid of the Tulum archaeological site',
        caption: 'El Castillo, the main building of the ruins',
        author: 'Adam Jones',
        license: 'CC BY-SA 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:El_Castillo_-_Tulum_Archaeological_Site_-_Quintana_Roo_-_Mexico_(15556406619).jpg',
      },
      {
        file: 'tulum-4.jpg',
        alt: 'A cave pool with clear turquoise water at Gran Cenote near Tulum',
        caption: 'Gran Cenote, one of the best-known cenotes near Tulum',
        author: 'Mrd93',
        license: 'CC BY-SA 4.0',
        source: 'https://commons.wikimedia.org/wiki/File:Gran_Cenote.JPG',
      },
      {
        file: 'tulum-5.jpg',
        alt: 'People swimming on a sandy beach with turquoise water in Tulum',
        caption: 'Swimming at the beach in Tulum',
        author: 'Tony Hisgett',
        license: 'CC BY 2.0',
        source: 'https://commons.wikimedia.org/wiki/File:Tulum_Beach_(4385141008).jpg',
      },
    ],
    paragraphs: [
      'Tulum is known for its Maya walled city, built on cliffs above the Caribbean Sea. The Temple of the God of the Winds and the beaches below it are among the most photographed views in the region.',
      'Beyond the ruins, Tulum has a relaxed beach road with boutique hotels and restaurants, a lively town center, and some of the best-known cenotes in the Riviera Maya. To the south begins the Sian Ka’an biosphere reserve.',
    ],
    highlights: [
      'The Tulum archaeological site on the sea cliffs',
      'Beaches along the beach road',
      'Cenotes for swimming and snorkeling',
      'Sian Ka’an biosphere reserve to the south',
    ],
    goodToKnow: [
      'It is our longest regular route, so a private transfer is a comfortable way to arrive after your flight.',
      'Hotels on the beach road can be slow to reach at busy times; tell us your hotel when you book.',
    ],
  },
];

export function destinationBySlug(slug: unknown): Destination | undefined {
  return typeof slug === 'string' ? DESTINATIONS.find((destination) => destination.slug === slug) : undefined;
}

export const destinationPath = (slug: string) => `/destinations/${slug}`;
