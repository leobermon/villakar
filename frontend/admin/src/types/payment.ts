/**
 * Pagos y links de pago. Mismos valores que el backend (tabla `payments`:
 * provider, type, status) para conectar la API sin traducir campos.
 */

export type PaymentProvider = 'STRIPE' | 'PAYPAL' | 'CASH' | 'TRANSFER';
export type PaymentType = 'CHARGE' | 'REFUND';
export type PaymentRecordStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface Payment {
  id: number;
  orderId: number;
  orderCode: string;
  customerName: string;
  provider: PaymentProvider;
  type: PaymentType;
  amount: number;
  currency: 'USD';
  status: PaymentRecordStatus;
  /** Id del proveedor (Stripe/PayPal) o referencia bancaria de la transferencia. */
  reference: string | null;
  /** Quién recibió el dinero (chofer u oficina) en efectivo. */
  receivedBy: string | null;
  note: string | null;
  /** Instante UTC ISO. */
  createdAt: string;
  paidAt: string | null;
}

/** Alta manual desde el panel: efectivo o transferencia ya recibidos. */
export interface NewManualPayment {
  orderId: number;
  provider: Extract<PaymentProvider, 'CASH' | 'TRANSFER'>;
  amount: number;
  reference: string | null;
  receivedBy: string | null;
  note: string | null;
}

export type PaymentLinkStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface PaymentLink {
  id: number;
  token: string;
  url: string;
  /** null en cobros libres (no ligados a una orden). */
  orderId: number | null;
  orderCode: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  description: string;
  amount: number;
  currency: 'USD';
  /** Guardado; EXPIRED se calcula al leer si ya pasó `expiresAt`. */
  status: Exclude<PaymentLinkStatus, 'EXPIRED'>;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
}

export interface NewPaymentLink {
  orderId: number | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  description: string;
  amount: number;
  /** Horas de vigencia. */
  validHours: number;
}
