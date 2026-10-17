import writeXlsxFile from 'write-excel-file/universal';
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, ROUTE_LABEL, SOURCE_LABEL, paymentSummary } from '@/config/orders';
import type { Order, OrderLeg } from '@/types/order';

const TRIP_LABEL = { ONE_WAY: 'Sencillo', ROUND_TRIP: 'Redondo' } as const;

/** 'YYYY-MM-DDTHH:MM' (hora local de Cancún) → ['DD/MM/YYYY', 'HH:MM']. */
function splitLocal(value: string | undefined): [string, string] {
  if (!value) return ['', ''];
  const [date = '', time = ''] = value.split('T');
  const [y, m, d] = date.split('-');
  return [`${d}/${m}/${y}`, time.slice(0, 5)];
}

/** Instante UTC ISO → "DD/MM/YYYY HH:MM" en hora de Cancún. */
function formatCreated(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Cancun',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/** El aeropuerto se escribe corto, igual que en la tabla del panel. */
function shortPlace(name: string | undefined): string {
  return (name ?? '').replace(/Cancun International Airport(\s*\(CUN\))?/i, 'Cancun Airport');
}

type Cell = string | number | null;

/** Datos de un tramo (ida o regreso) en el mismo orden que sus encabezados. */
function legCells(leg: OrderLeg | undefined): Cell[] {
  if (!leg) return ['', '', '', '', '', '', '', '', ''];
  const [date, time] = splitLocal(leg.pickupAt);
  return [
    date,
    time,
    shortPlace(leg.originName),
    shortPlace(leg.destinationName),
    leg.flightNumber ?? '',
    leg.airline ?? '',
    leg.terminal ?? '',
    leg.driverName ?? '',
    leg.driverPhone ?? '',
  ];
}

const LEG_HEADERS = ['Fecha', 'Hora', 'Origen', 'Destino', 'Vuelo', 'Aerolínea', 'Terminal', 'Chofer', 'Tel. chofer'];

const HEADERS: string[] = [
  'Orden',
  'Reservada el',
  'Estado',
  'Pago',
  'Método de pago',
  'Cliente',
  'Correo',
  'Teléfono',
  'Vehículo',
  'Pasajeros',
  'Total (USD)',
  'Tipo de viaje',
  'Ruta',
  'Origen de la orden',
  ...LEG_HEADERS.map((header) => `Ida · ${header}`),
  ...LEG_HEADERS.map((header) => `Regreso · ${header}`),
  'Peticiones del cliente',
  'Notas internas',
];

/** Anchos de columna (en caracteres), en el mismo orden que HEADERS. */
const WIDTHS = [
  13, 17, 15, 24, 15, 24, 28, 17, 14, 10, 12, 12, 20, 16,
  12, 7, 28, 28, 10, 14, 9, 18, 15,
  12, 7, 28, 28, 10, 14, 9, 18, 15,
  34, 34,
];

function toRow(order: Order): Cell[] {
  const [outbound, inbound] = [...order.legs].sort((a, b) => a.legNumber - b.legNumber);
  return [
    order.code,
    formatCreated(order.createdAt),
    ORDER_STATUS[order.status].label,
    paymentSummary(order).label,
    order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : '',
    `${order.customer.firstName} ${order.customer.lastName}`.trim(),
    order.customer.email,
    order.customer.phone,
    order.vehicle.name,
    order.passengers,
    order.total,
    TRIP_LABEL[order.tripType],
    ROUTE_LABEL[order.routeType],
    SOURCE_LABEL[order.source],
    ...legCells(outbound),
    ...legCells(inbound),
    order.specialRequests ?? '',
    order.internalNotes ?? '',
  ];
}

/** Hoy en Cancún como YYYY-MM-DD, para el nombre del archivo. */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun' }).format(new Date());
}

/** Descarga un archivo .xlsx con las órdenes recibidas (una fila por orden). */
export async function exportOrdersToExcel(orders: Order[]): Promise<void> {
  const TOTAL_COLUMN = HEADERS.indexOf('Total (USD)');
  const header = HEADERS.map((value) => ({
    value,
    fontWeight: 'bold' as const,
    backgroundColor: '#dbeafe',
    textColor: '#023047',
    wrap: true,
    alignVertical: 'center' as const,
  }));
  const rows = orders.map((order) =>
    toRow(order).map((value, index) =>
      index === TOTAL_COLUMN && typeof value === 'number'
        ? { value, type: Number, format: '"$"#,##0.00' }
        : value === '' || value === null
          ? null
          : { value, type: typeof value === 'number' ? Number : String },
    ),
  );

  const blob = await writeXlsxFile([header, ...rows], {
    columns: WIDTHS.map((width) => ({ width })),
    stickyRowsCount: 1,
    sheet: 'Órdenes',
  }).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ordenes-${today()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
