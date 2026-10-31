import { apiRequest } from './client';

export type TripType = 'ONE_WAY' | 'ROUND_TRIP';
export type RouteType = 'AIRPORT_HOTEL' | 'HOTEL_AIRPORT' | 'HOTEL_HOTEL';
export type NotServiceableReason = 'OUT_OF_SERVICE_AREA' | 'NO_RATE_AVAILABLE';

export interface PlaceSuggestion {
  googlePlaceId: string;
  mainText: string;
  secondaryText: string | null;
}

/** Un extremo del viaje: el aeropuerto (airportCode) u hotel de Google (googlePlaceId). */
export type QuoteLocation = { airportCode: string } | { googlePlaceId: string; sessionToken?: string };

export interface QuoteRequest {
  tripType: TripType;
  origin: QuoteLocation;
  destination: QuoteLocation;
  date: string;
  returnDate?: string;
  passengers: number;
}

export interface QuoteEndpoint {
  placeId: number;
  name: string;
  formattedAddress: string | null;
  zone: { id: number; name: string } | null;
}

export interface QuoteOption {
  rateId: number;
  vehicleType: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxPassengers: number;
    maxLuggage: number;
    imageUrl: string | null;
  };
  currency: 'USD';
  price: number;
}

export interface QuoteResult {
  serviceable: boolean;
  reason: NotServiceableReason | null;
  tripType: TripType;
  routeType: RouteType | null;
  passengers: number;
  origin: QuoteEndpoint;
  destination: QuoteEndpoint;
  options: QuoteOption[];
}

export interface ContactRequestPayload {
  name: string;
  email: string;
  /** Formato internacional E.164. */
  phone?: string;
  hotelName: string;
  googlePlaceId?: string;
  arrivalDate?: string;
  passengers?: number;
  message?: string;
}

export interface FleetVehicle {
  code: string;
  name: string;
  description: string | null;
  maxPassengers: number;
  maxLuggage: number;
  imageUrl: string | null;
}

/** Flota activa para la portada (sin precios: dependen de la ruta). */
export function fetchFleet(): Promise<FleetVehicle[]> {
  return apiRequest('/vehicle-types');
}

export function fetchPlaceSuggestions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const query = new URLSearchParams({ input, sessionToken });
  return apiRequest(`/places/autocomplete?${query}`, { signal });
}

export function requestQuote(payload: QuoteRequest): Promise<QuoteResult> {
  return apiRequest('/quote', { method: 'POST', json: payload });
}

export function sendContactRequest(payload: ContactRequestPayload): Promise<{ id: number }> {
  return apiRequest('/contact-requests', { method: 'POST', json: payload });
}

// ---- Reservas y pagos ----

export type Terminal = 'T2' | 'T3' | 'T4';
export type PaymentMethod = 'card' | 'paypal' | 'cash';
/** Moneda del cobro con tarjeta: el precio siempre es en USD; en MXN se convierte con el tipo de cambio del negocio. */
export type CardCurrency = 'usd' | 'mxn';

/** Qué métodos de pago hay; `mxnRate` (pesos por dólar) indica que la tarjeta también se puede cobrar en pesos. */
export type PaymentMethodsAvailability = Record<PaymentMethod, boolean> & { mxnRate: number | null };

/** Horas locales de Cancún ('HH:MM'). Qué campos aplican depende del tipo de tramo. */
export interface LegDetails {
  pickupTime?: string;
  flightTime?: string;
  flightNumber?: string;
  airline?: string;
  terminal?: Terminal;
}

export interface CreateReservationRequest extends QuoteRequest {
  vehicleTypeId: number;
  /** phone en formato internacional E.164 (+529981234567); phoneCountry es el país ISO (MX). */
  customer: { firstName: string; lastName: string; email: string; phone: string; phoneCountry: string };
  legs: LegDetails[];
  specialRequests?: string;
}

export interface ReservationSummary {
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';
  tripType: TripType;
  routeType: RouteType;
  vehicleName: string;
  passengers: number;
  total: number;
  currency: 'USD';
  customer: { firstName: string; lastName: string; email: string; phone: string | null };
  legs: Array<{
    legNumber: number;
    originName: string;
    destinationName: string;
    /** Hora local de Cancún, 'YYYY-MM-DDTHH:MM'. */
    pickupAt: string;
    flightNumber: string | null;
    airline: string | null;
    flightTime: string | null;
    terminal: string | null;
  }>;
  specialRequests: string | null;
  /** Cuándo se creó la reserva (instante UTC en ISO). */
  createdAt: string;
  expiresAt: string | null;
  canPay: boolean;
  /** El cliente pagará en efectivo al chofer después del servicio. */
  payInCash: boolean;
  /** Con qué se pagó (si ya está cobrado) o se pagará (efectivo pendiente). null si aún no hay. */
  paymentMethod: 'STRIPE' | 'PAYPAL' | 'CASH' | 'TRANSFER' | null;
  /** Servicio dentro de las próximas 8 horas: solo pago en línea. */
  lastMinute: boolean;
  /** Ya se envió el correo de confirmación al cliente. */
  confirmationEmailSent: boolean;
}

export interface ReservationAccess {
  code: string;
  email: string;
}

export function createReservation(payload: CreateReservationRequest): Promise<ReservationSummary> {
  return apiRequest('/reservations', { method: 'POST', json: payload });
}

export function lookupReservation(access: ReservationAccess): Promise<ReservationSummary> {
  return apiRequest('/reservations/lookup', { method: 'POST', json: access });
}

/** Datos de la empresa editados en Configuración del panel. */
export interface CompanyInfo {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
}

export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  const settings = await apiRequest<{ company: CompanyInfo }>('/site-settings');
  return settings.company;
}

export function fetchPaymentMethods(): Promise<PaymentMethodsAvailability> {
  return apiRequest('/payments/methods');
}

/** Método preseleccionado: tarjeta, luego PayPal, luego efectivo. */
export function defaultPaymentMethod(available: PaymentMethodsAvailability): PaymentMethod | null {
  return (['card', 'paypal', 'cash'] as const).find((method) => available[method]) ?? null;
}

/** Confirma la reserva para pagar en efectivo al chofer después del servicio. */
export function chooseCashPayment(access: ReservationAccess): Promise<{ confirmed: true }> {
  return apiRequest('/payments/cash', { method: 'POST', json: access });
}

/** Crea el cobro en línea con el proveedor y devuelve la URL a la que hay que redirigir. */
export async function startPayment(
  method: Exclude<PaymentMethod, 'cash'>,
  access: ReservationAccess,
  currency: CardCurrency = 'usd',
): Promise<string> {
  if (method === 'card') {
    const { url } = await apiRequest<{ url: string }>('/payments/stripe/checkout-session', {
      method: 'POST',
      json: { ...access, currency },
    });
    return url;
  }
  const { approveUrl } = await apiRequest<{ approveUrl: string }>('/payments/paypal/orders', { method: 'POST', json: access });
  return approveUrl;
}

export interface PaymentReturnResult {
  paid: boolean;
  message?: string;
}

export function confirmStripePayment(sessionId: string): Promise<PaymentReturnResult> {
  return apiRequest('/payments/stripe/confirm', { method: 'POST', json: { sessionId } });
}

export function capturePaypalPayment(orderId: string): Promise<PaymentReturnResult> {
  return apiRequest('/payments/paypal/capture', { method: 'POST', json: { orderId } });
}

// ---- Links de pago (/pay/<token>) ----

/** Lo que muestra la página de un link de pago (sin correo ni teléfono del cliente). */
export interface PaymentLinkInfo {
  token: string;
  description: string;
  amount: number;
  currency: 'USD';
  /** Pesos por dólar si la tarjeta también se puede cobrar en MXN; null si no. */
  mxnRate: number | null;
  customerName: string;
  /** Código de la reserva a la que abona, si el link es de una orden. */
  reservationCode: string | null;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  paidAt: string | null;
  methods: { card: boolean; paypal: boolean };
}

export function fetchPaymentLink(token: string): Promise<PaymentLinkInfo> {
  return apiRequest(`/payment-links/${encodeURIComponent(token)}`);
}

/** Crea el cobro del link con el proveedor y devuelve la URL a la que hay que redirigir. */
export async function startLinkPayment(token: string, method: 'card' | 'paypal', currency: CardCurrency = 'usd'): Promise<string> {
  const path = `/payment-links/${encodeURIComponent(token)}`;
  if (method === 'card') {
    const { url } = await apiRequest<{ url: string }>(`${path}/stripe`, { method: 'POST', json: { currency } });
    return url;
  }
  const { approveUrl } = await apiRequest<{ approveUrl: string }>(`${path}/paypal`, { method: 'POST' });
  return approveUrl;
}

export interface PaymentLinkReturnResult {
  token: string;
  paid: boolean;
  message?: string;
}

export function confirmLinkStripe(sessionId: string): Promise<PaymentLinkReturnResult> {
  return apiRequest('/payment-links/stripe/confirm', { method: 'POST', json: { sessionId } });
}

export function captureLinkPaypal(orderId: string): Promise<PaymentLinkReturnResult> {
  return apiRequest('/payment-links/paypal/capture', { method: 'POST', json: { orderId } });
}
