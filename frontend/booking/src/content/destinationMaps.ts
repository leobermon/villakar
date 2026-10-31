/**
 * Mapas de las páginas de destino. ARCHIVO GENERADO por scripts/build-destination-maps.mjs: no se edita a mano.
 * Cada mapa es una imagen (public/destinations/maps) hecha con mosaicos de OpenStreetMap, y la ruta real en carretera
 * (calculada con OSRM) va dibujada encima, en las mismas coordenadas de la imagen.
 */
export interface DestinationMap {
  /** Archivo dentro de public/destinations/maps. */
  file: string;
  width: number;
  height: number;
  /** Ruta en carretera, como trazo SVG en píxeles de la imagen. */
  route: string;
  /** Posición del aeropuerto y del destino en la imagen. */
  airport: [number, number];
  dest: [number, number];
  /** Datos de la ruta calculada (sin tráfico). */
  km: number;
  minutes: number;
}

export const DESTINATION_MAPS: Record<string, DestinationMap> = {
  'cancun': {
    file: 'cancun.webp',
    width: 900,
    height: 620,
    route: 'M164.7 377.6 L172.9 369.2 L184.6 373.9 L193.2 362.1 L196.4 360.3 L276.0 412.0 L295.7 414.1 L302.1 410.9 L311.4 401.4 L320.2 400.1 L345.8 410.6 L358.8 413.7 L413.1 433.1 L428.5 440.0 L479.6 456.9 L490.0 463.4 L505.8 466.7 L512.7 465.6 L518.4 460.8 L522.9 441.0 L527.2 435.3 L561.1 409.3 L593.5 390.5 L626.7 388.5 L662.4 409.7 L669.7 411.0 L676.0 404.5 L677.1 387.4 L689.9 364.1 L688.2 325.2 L692.6 273.9 L697.8 254.0 L708.1 241.6 L710.7 232.6 L711.1 225.8 L703.8 189.2 L709.5 173.6 L721.4 153.7 L736.1 158.7',
    airport: [164.7, 377.6],
    dest: [736.1, 158.7],
    km: 16,
    minutes: 19,
  },
  'puerto-morelos': {
    file: 'puerto-morelos.webp',
    width: 900,
    height: 1100,
    route: 'M455.8 255.8 L460.0 251.6 L465.8 254.0 L470.6 247.5 L472.4 247.4 L509.7 272.7 L515.2 280.1 L515.4 284.6 L491.6 448.5 L468.6 522.7 L446.5 657.0 L383.7 827.4 L448.7 852.1 L452.9 845.7',
    airport: [455.8, 255.8],
    dest: [452.9, 845.7],
    km: 26,
    minutes: 26,
  },
  'playa-del-carmen': {
    file: 'playa-del-carmen.webp',
    width: 900,
    height: 1100,
    route: 'M581.9 232.9 L584.0 230.8 L586.9 232.0 L590.2 228.7 L608.8 241.4 L611.7 247.3 L599.8 329.3 L588.3 366.4 L577.3 433.5 L544.2 523.4 L418.7 698.1 L393.6 710.9 L388.7 715.7 L289.6 853.5 L294.1 857.5 L288.6 865.9 L292.6 868.7 L290.7 871.7 L289.5 870.9',
    airport: [581.9, 232.9],
    dest: [289.5, 870.9],
    km: 55,
    minutes: 46,
  },
  'akumal': {
    file: 'akumal.webp',
    width: 900,
    height: 1100,
    route: 'M605.0 300.4 L609.1 298.3 L618.4 304.7 L619.8 307.6 L613.9 348.6 L608.2 367.2 L602.6 400.8 L585.6 446.7 L523.3 533.0 L509.2 540.7 L449.3 624.0 L386.7 675.2 L367.1 701.5 L341.0 718.3 L319.6 740.2 L303.1 760.9 L287.3 784.7 L279.2 799.9 L280.2 798.5 L283.0 801.2',
    airport: [605, 300.4],
    dest: [283, 801.2],
    km: 92,
    minutes: 73,
  },
  'tulum': {
    file: 'tulum.webp',
    width: 900,
    height: 1100,
    route: 'M658.0 228.4 L662.1 226.3 L671.4 232.7 L672.8 235.6 L666.9 276.6 L661.2 295.2 L655.6 328.8 L638.6 374.7 L576.3 461.0 L562.2 468.7 L502.3 552.0 L439.7 603.2 L420.6 629.1 L394.0 646.3 L372.0 668.8 L355.8 689.2 L340.3 712.7 L293.7 799.4 L253.5 863.0 L226.7 872.6',
    airport: [658, 228.4],
    dest: [226.7, 872.6],
    km: 117,
    minutes: 94,
  },
};
