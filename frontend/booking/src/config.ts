/** Datos del negocio que se muestran en el sitio. */
export const SITE = {
  name: 'VillaKar Transfers',
  maxPassengers: 7,
  /** Aeropuerto fijo de los traslados Airport → Hotel y Hotel → Airport. */
  airport: { code: 'CUN', name: 'Cancun International Airport (CUN)' },
} as const;
