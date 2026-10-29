/**
 * Páginas de destino (/destinations/:slug): una por cada zona principal que se atiende desde el
 * aeropuerto de Cancún. Todo el texto está en inglés, como el resto del sitio.
 *
 * Las fotos viven en public/destinations/photos y vienen de Wikimedia Commons con licencia libre;
 * cada una lleva su crédito (autor y licencia), que se muestra al pie de la página.
 * Las rutas del mapa son esquemáticas (ver RouteMap.vue): sirven para ubicar el destino, no para navegar.
 */

/** [longitud, latitud] */
export type LngLat = [number, number];

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
  /** Ubicación del destino en el mapa. */
  coord: LngLat;
  /** Ruta esquemática desde el aeropuerto (incluye el aeropuerto y el destino). */
  route: LngLat[];
  hero: DestinationPhoto;
  gallery: DestinationPhoto[];
  paragraphs: string[];
  /** Qué ver y hacer cerca. */
  highlights: string[];
  /** Detalles útiles para el viaje. */
  goodToKnow: string[];
}

export const AIRPORT: { name: string; coord: LngLat } = {
  name: 'Cancun Airport (CUN)',
  coord: [-86.8747, 21.0381],
};

/** Línea de costa del Caribe (de norte a sur), simplificada: el mar queda al este. */
export const COAST: LngLat[] = [
  [-86.8, 21.3],
  [-86.82, 21.25],
  [-86.82, 21.21],
  [-86.8107, 21.1935],
  [-86.78, 21.165],
  [-86.745, 21.138],
  [-86.745, 21.12],
  [-86.752, 21.09],
  [-86.76, 21.05],
  [-86.77, 21.015],
  [-86.777, 20.995],
  [-86.795, 20.97],
  [-86.82, 20.93],
  [-86.85, 20.88],
  [-86.866, 20.848],
  [-86.9, 20.8],
  [-86.95, 20.73],
  [-87.0, 20.67],
  [-87.045, 20.64],
  [-87.07, 20.63],
  [-87.1, 20.6],
  [-87.15, 20.55],
  [-87.2, 20.505],
  [-87.25, 20.46],
  [-87.29, 20.42],
  [-87.305, 20.395],
  [-87.34, 20.34],
  [-87.39, 20.29],
  [-87.43, 20.23],
  [-87.45, 20.2],
  [-87.47, 20.12],
  [-87.5, 20.05],
];

/** Poblaciones de referencia que se dibujan en el mapa cuando caen dentro del encuadre. */
export const TOWNS: Array<{ name: string; coord: LngLat }> = [
  { name: 'Downtown Cancun', coord: [-86.8475, 21.1619] },
  { name: 'Puerto Morelos', coord: [-86.8756, 20.8498] },
  { name: 'Playa del Carmen', coord: [-87.0739, 20.6296] },
  { name: 'Puerto Aventuras', coord: [-87.237, 20.509] },
  { name: 'Akumal', coord: [-87.3144, 20.3944] },
  { name: 'Tulum', coord: [-87.4654, 20.2114] },
];

/** Carretera 307 hacia el sur, con la que comparten tramo las rutas a Morelos, Playa, Akumal y Tulum. */
const HIGHWAY_SOUTH: LngLat[] = [
  [-86.8747, 21.0381],
  [-86.884, 21.0],
  [-86.887, 20.95],
  [-86.887, 20.9],
  [-86.883, 20.8498],
  [-86.91, 20.79],
  [-86.965, 20.72],
  [-87.025, 20.67],
  [-87.0845, 20.6296],
  [-87.155, 20.56],
  [-87.215, 20.5],
  [-87.28, 20.45],
  [-87.325, 20.3944],
  [-87.365, 20.34],
  [-87.41, 20.28],
  [-87.4755, 20.2114],
];

/** Tramo de la carretera hasta la longitud/latitud del destino (se corta en el punto indicado). */
function highwayTo(endIndex: number, destination: LngLat): LngLat[] {
  return [...HIGHWAY_SOUTH.slice(0, endIndex), destination];
}

const PHOTOS = '/destinations/photos/';
export const photoUrl = (file: string) => PHOTOS + file;

export const DESTINATIONS: Destination[] = [
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
    coord: [-86.7685, 21.0765],
    route: [
      [-86.8747, 21.0381],
      [-86.845, 21.025],
      [-86.8, 21.0155],
      [-86.7775, 21.0],
      [-86.7715, 21.04],
      [-86.7685, 21.0765],
    ],
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
    slug: 'puerto-morelos',
    name: 'Puerto Morelos',
    shortName: 'Puerto Morelos',
    tagline: 'A quiet fishing town with a reef just off the beach',
    summary: 'A relaxed fishing town with a leaning lighthouse and a reef close to shore.',
    time: 'About 25 min',
    distanceKm: '35 km',
    distanceMi: '22 mi',
    note: 'Driving time without traffic.',
    coord: [-86.8756, 20.8498],
    route: highwayTo(5, [-86.8756, 20.8498]),
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
    coord: [-87.0739, 20.6296],
    route: highwayTo(8, [-87.0739, 20.6296]),
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
    distanceKm: '100 km',
    distanceMi: '62 mi',
    note: 'Driving time without traffic.',
    coord: [-87.3144, 20.3944],
    route: highwayTo(12, [-87.3144, 20.3944]),
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
    distanceKm: '130 km',
    distanceMi: '80 mi',
    note: 'Driving time without traffic.',
    coord: [-87.4654, 20.2114],
    route: highwayTo(15, [-87.4654, 20.2114]),
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
