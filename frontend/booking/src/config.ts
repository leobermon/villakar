/** Datos del negocio que se muestran en el sitio. */
export const SITE = {
  name: 'VillaKar Transfers',
  maxPassengers: 7,
  /** Servicio Hotel → Hotel en el buscador. Desactivado temporalmente; para volver a ofrecerlo, pasar a true. */
  hotelToHotelEnabled: false,
  /** Aeropuerto fijo de los traslados Airport → Hotel y Hotel → Airport. */
  airport: { code: 'CUN', name: 'Cancun International Airport (CUN)' },
  /** Servicios a menos de estas horas no aceptan efectivo (backend: CASH_MIN_NOTICE_HOURS). */
  cashMinNoticeHours: 8,
  /** Horario de servicio (hora de Cancún); el backend valida lo mismo (SERVICE_HOURS). */
  serviceHours: { start: '05:00', end: '20:00', label: '5:00 am to 8:00 pm' },
} as const;
