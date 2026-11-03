/** Guía para encontrar al chofer en el aeropuerto de Cancún (página /airport-pickup, enlazada desde los correos). */

export const AIRPORT_PICKUP_PATH = '/airport-pickup';

export interface AirportTerminal {
  /** Código que usa la reserva ('T2', 'T3', 'T4'). */
  code: 'T2' | 'T3' | 'T4';
  /** Ancla de la página: /airport-pickup#terminal-3. */
  id: string;
  name: string;
  /** Mapa de la terminal (public/airport). */
  map: string;
  mapAlt: string;
  /** Qué hacer al llegar, en orden. */
  steps: string[];
}

export const AIRPORT_TERMINALS: AirportTerminal[] = [
  {
    code: 'T2',
    id: 'terminal-2',
    name: 'Terminal 2',
    map: '/airport/terminal-2.svg',
    mapAlt: 'Map of Cancun Airport Terminal 2 showing the path from baggage claim to the exit',
    steps: [
      'Collect your bags at baggage claim.',
      'Follow the red path on the map along the arrivals corridor to the exit.',
      'Your driver is waiting outside, holding a sign with your name.',
    ],
  },
  {
    code: 'T3',
    id: 'terminal-3',
    name: 'Terminal 3',
    map: '/airport/terminal-3.webp',
    mapAlt: 'Map of Cancun Airport Terminal 3 showing the path from passport control and baggage claim to the exit',
    steps: [
      'Go through passport control and collect your bags at baggage claim.',
      'Follow the red path on the map to the exit.',
      'Your driver is waiting outside, holding a sign with your name.',
    ],
  },
  {
    code: 'T4',
    id: 'terminal-4',
    name: 'Terminal 4',
    map: '/airport/terminal-4.webp',
    mapAlt: 'Map of Cancun Airport Terminal 4 showing the path from baggage claim to the exits (Salidas)',
    steps: [
      'Go through passport control and collect your bags at baggage claim.',
      'Follow the red path on the map to the exits (Salidas).',
      'Your driver is waiting there, holding a sign with your name.',
    ],
  },
];

export function terminalByCode(code: string | null | undefined): AirportTerminal | undefined {
  return AIRPORT_TERMINALS.find((terminal) => terminal.code === code);
}
