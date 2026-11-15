import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import geoip from 'geoip-lite';
import { PrismaService } from '../../prisma/prisma.service';
import type { TrackEventDto } from './dto/track-event.dto';

/** Eventos que acepta el sitio; cualquier otro nombre se ignora. */
const EVENT_NAMES = new Set([
  'page_view',
  'click',
  'route_change',
  'hotel_selected',
  'quote_submit',
  'quote_result',
  'vehicle_select',
  'checkout_view',
  'field_focus',
  'booking_submit',
  'purchase',
  'contact_view',
  'contact_submit',
]);

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit/i;
/** Cancún no cambia de horario: siempre UTC-5. */
const CANCUN_OFFSET_HOURS = 5;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const num = (value: unknown) => Number(value ?? 0);

function cancunDayStart(day: string): Date {
  return new Date(`${day}T0${CANCUN_OFFSET_HOURS}:00:00Z`);
}

function isoDay(date: Date): string {
  return new Date(date.getTime() - CANCUN_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

type Row = Record<string, unknown>;

/** 'YYYY-MM-DD' a fecha; null si no es una fecha real. */
function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : date;
}
const dayOf = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : null);

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(dto: TrackEventDto, userAgent?: string, ip?: string): Promise<void> {
    if (!EVENT_NAMES.has(dto.name) || (userAgent && BOT.test(userAgent))) return;
    // País y ciudad aproximados a partir de la IP; la IP en sí nunca se guarda.
    const geo = ip ? geoip.lookup(ip.replace(/^::ffff:/, '')) : null;
    const props = dto.props && JSON.stringify(dto.props).length <= 1000 ? (dto.props as Prisma.InputJsonValue) : undefined;
    try {
      await this.prisma.siteEvent.create({
        data: {
          sid: dto.sid,
          name: dto.name,
          path: dto.path,
          route: dto.route,
          tripType: dto.tripType,
          hotel: dto.hotel,
          label: dto.label,
          amount: dto.amount,
          passengers: dto.passengers,
          serviceDate: toDate(dto.serviceDate),
          returnDate: toDate(dto.returnDate),
          device: dto.device,
          source: dto.source,
          country: geo?.country || undefined,
          city: geo?.city ? geo.city.slice(0, 80) : undefined,
          tz: dto.tz,
          props,
        },
      });
    } catch (error) {
      // La analítica nunca debe afectar al cliente.
      this.logger.warn(`No se pudo guardar el evento ${dto.name}: ${(error as Error).message}`);
    }
  }

  async stats(fromInput?: string, toInput?: string) {
    const to = toInput && DAY.test(toInput) ? toInput : isoDay(new Date());
    const from = fromInput && DAY.test(fromInput) ? fromInput : isoDay(new Date(cancunDayStart(to).getTime() - 29 * 86_400_000));
    const start = cancunDayStart(from);
    const end = new Date(cancunDayStart(to).getTime() + 86_400_000);
    const range = Prisma.sql`created_at >= ${start} AND created_at < ${end}`;
    const query = (sql: Prisma.Sql) => this.prisma.$queryRaw<Row[]>(sql);

    const [funnelRows, routes, hotels, clicks, fields, vehicles, daily, sources, devices, onlyQuoted, totalEvents, countries, cities, hours, recent, serviceDates, serviceMonths, stayRows] = await Promise.all([
      query(Prisma.sql`
        SELECT
          COUNT(DISTINCT CASE WHEN name = 'page_view' THEN sid END) AS visits,
          COUNT(DISTINCT CASE WHEN name = 'hotel_selected' THEN sid END) AS hotelChosen,
          COUNT(DISTINCT CASE WHEN name = 'quote_submit' THEN sid END) AS quotes,
          COUNT(DISTINCT CASE WHEN name = 'quote_result' AND label = 'serviceable' THEN sid END) AS priced,
          COUNT(DISTINCT CASE WHEN name = 'checkout_view' THEN sid END) AS checkout,
          COUNT(DISTINCT CASE WHEN name = 'field_focus' THEN sid END) AS startedForm,
          COUNT(DISTINCT CASE WHEN name = 'booking_submit' THEN sid END) AS submitted,
          COUNT(DISTINCT CASE WHEN name = 'purchase' THEN sid END) AS purchased,
          COUNT(DISTINCT CASE WHEN name = 'quote_result' AND label = 'contact' THEN sid END) AS outOfZone,
          COUNT(DISTINCT CASE WHEN name = 'contact_submit' THEN sid END) AS contactSent
        FROM site_events WHERE ${range}`),
      query(Prisma.sql`
        SELECT route, trip_type AS tripType, COUNT(*) AS n
        FROM site_events WHERE name = 'quote_submit' AND route IS NOT NULL AND ${range}
        GROUP BY route, trip_type`),
      query(Prisma.sql`
        SELECT hotel, COUNT(*) AS searches, COUNT(DISTINCT sid) AS visitors,
          SUM(route = 'AIRPORT_HOTEL') AS arrivals, SUM(route = 'HOTEL_AIRPORT') AS departures,
          SUM(label = 'serviceable') AS priced, AVG(CASE WHEN label = 'serviceable' THEN amount END) AS avgFrom
        FROM site_events WHERE name = 'quote_result' AND hotel IS NOT NULL AND ${range}
        GROUP BY hotel ORDER BY searches DESC LIMIT 20`),
      query(Prisma.sql`
        SELECT label, COUNT(*) AS clicks, COUNT(DISTINCT sid) AS visitors
        FROM site_events WHERE name = 'click' AND label IS NOT NULL AND ${range}
        GROUP BY label ORDER BY clicks DESC LIMIT 25`),
      query(Prisma.sql`
        SELECT label, COUNT(DISTINCT sid) AS visitors
        FROM site_events WHERE name = 'field_focus' AND label IS NOT NULL AND ${range}
        GROUP BY label`),
      query(Prisma.sql`
        SELECT label, COUNT(*) AS n
        FROM site_events WHERE name = 'vehicle_select' AND label IS NOT NULL AND ${range}
        GROUP BY label ORDER BY n DESC`),
      query(Prisma.sql`
        SELECT DATE(DATE_SUB(created_at, INTERVAL ${CANCUN_OFFSET_HOURS} HOUR)) AS day,
          COUNT(DISTINCT CASE WHEN name = 'page_view' THEN sid END) AS visits,
          COUNT(DISTINCT CASE WHEN name = 'quote_submit' THEN sid END) AS quotes,
          COUNT(DISTINCT CASE WHEN name = 'booking_submit' THEN sid END) AS bookings
        FROM site_events WHERE ${range} GROUP BY day ORDER BY day`),
      query(Prisma.sql`
        SELECT COALESCE(source, 'directo') AS bucket, COUNT(DISTINCT sid) AS visitors
        FROM site_events WHERE name = 'page_view' AND ${range}
        GROUP BY bucket ORDER BY visitors DESC LIMIT 10`),
      query(Prisma.sql`
        SELECT COALESCE(device, 'desconocido') AS bucket, COUNT(DISTINCT sid) AS visitors
        FROM site_events WHERE name = 'page_view' AND ${range}
        GROUP BY bucket ORDER BY visitors DESC`),
      // Visitas que recibieron precio pero nunca llegaron a enviar la reserva.
      query(Prisma.sql`
        SELECT COUNT(DISTINCT q.sid) AS n FROM site_events q
        WHERE q.name = 'quote_result' AND q.label = 'serviceable' AND q.created_at >= ${start} AND q.created_at < ${end}
          AND NOT EXISTS (SELECT 1 FROM site_events b WHERE b.sid = q.sid AND b.name = 'booking_submit')`),
      this.prisma.siteEvent.count({ where: { createdAt: { gte: start, lt: end } } }),
      query(Prisma.sql`
        SELECT COALESCE(country, '??') AS bucket,
          COUNT(DISTINCT CASE WHEN name = 'page_view' THEN sid END) AS visits,
          COUNT(CASE WHEN name = 'quote_submit' THEN 1 END) AS quotes
        FROM site_events WHERE ${range}
        GROUP BY bucket HAVING visits > 0 OR quotes > 0 ORDER BY quotes DESC, visits DESC LIMIT 20`),
      query(Prisma.sql`
        SELECT COALESCE(country, '??') AS bucket, city AS cityName,
          COUNT(DISTINCT CASE WHEN name = 'page_view' THEN sid END) AS visits,
          COUNT(CASE WHEN name = 'quote_submit' THEN 1 END) AS quotes
        FROM site_events WHERE city IS NOT NULL AND ${range}
        GROUP BY bucket, cityName HAVING visits > 0 OR quotes > 0 ORDER BY quotes DESC, visits DESC LIMIT 20`),
      query(Prisma.sql`
        SELECT HOUR(DATE_SUB(created_at, INTERVAL ${CANCUN_OFFSET_HOURS} HOUR)) AS h,
          COUNT(CASE WHEN name = 'quote_submit' THEN 1 END) AS quotes,
          COUNT(DISTINCT CASE WHEN name = 'page_view' THEN sid END) AS visits
        FROM site_events WHERE ${range} GROUP BY h ORDER BY h`),
      query(Prisma.sql`
        SELECT created_at AS at, country, city, tz, route, trip_type AS tripType, hotel, label, amount, passengers,
          service_date AS serviceDate, return_date AS returnDate
        FROM site_events WHERE name = 'quote_result' AND ${range} ORDER BY id DESC LIMIT 30`),
      query(Prisma.sql`
        SELECT service_date AS d, COUNT(*) AS quotes,
          SUM(route = 'AIRPORT_HOTEL') AS arrivals, SUM(route = 'HOTEL_AIRPORT') AS departures
        FROM site_events WHERE name = 'quote_submit' AND service_date IS NOT NULL AND ${range}
        GROUP BY d ORDER BY quotes DESC, d LIMIT 15`),
      query(Prisma.sql`
        SELECT DATE_FORMAT(service_date, '%Y-%m') AS m, COUNT(*) AS quotes
        FROM site_events WHERE name = 'quote_submit' AND service_date IS NOT NULL AND ${range}
        GROUP BY m ORDER BY m`),
      query(Prisma.sql`
        SELECT DATEDIFF(return_date, service_date) AS nights, COUNT(*) AS quotes
        FROM site_events WHERE name = 'quote_submit' AND trip_type = 'ROUND_TRIP' AND return_date IS NOT NULL AND service_date IS NOT NULL AND ${range}
        GROUP BY nights ORDER BY quotes DESC, nights LIMIT 10`),
    ]);

    const f = funnelRows[0] ?? {};
    return {
      from,
      to,
      totalEvents,
      funnel: {
        visits: num(f.visits),
        hotelChosen: num(f.hotelChosen),
        quotes: num(f.quotes),
        priced: num(f.priced),
        checkout: num(f.checkout),
        startedForm: num(f.startedForm),
        submitted: num(f.submitted),
        purchased: num(f.purchased),
        outOfZone: num(f.outOfZone),
        contactSent: num(f.contactSent),
        onlyQuoted: num(onlyQuoted[0]?.n),
      },
      routes: routes.map((r) => ({ route: String(r.route), tripType: r.tripType ? String(r.tripType) : null, count: num(r.n) })),
      hotels: hotels.map((h) => ({
        hotel: String(h.hotel),
        searches: num(h.searches),
        visitors: num(h.visitors),
        arrivals: num(h.arrivals),
        departures: num(h.departures),
        priced: num(h.priced),
        avgFrom: h.avgFrom == null ? null : Math.round(num(h.avgFrom) * 100) / 100,
      })),
      clicks: clicks.map((c) => ({ label: String(c.label), clicks: num(c.clicks), visitors: num(c.visitors) })),
      fields: fields.map((c) => ({ label: String(c.label), visitors: num(c.visitors) })),
      vehicles: vehicles.map((v) => ({ label: String(v.label), count: num(v.n) })),
      daily: daily.map((d) => ({
        day: d.day instanceof Date ? d.day.toISOString().slice(0, 10) : String(d.day).slice(0, 10),
        visits: num(d.visits),
        quotes: num(d.quotes),
        bookings: num(d.bookings),
      })),
      countries: countries.map((c) => ({ country: String(c.bucket), visits: num(c.visits), quotes: num(c.quotes) })),
      cities: cities.map((c) => ({ country: String(c.bucket), city: String(c.cityName), visits: num(c.visits), quotes: num(c.quotes) })),
      hours: Array.from({ length: 24 }, (_, h) => {
        const row = hours.find((r) => num(r.h) === h);
        return { hour: h, quotes: num(row?.quotes), visits: num(row?.visits) };
      }),
      recent: recent.map((r) => ({
        at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
        country: r.country ? String(r.country) : null,
        city: r.city ? String(r.city) : null,
        tz: r.tz ? String(r.tz) : null,
        route: r.route ? String(r.route) : null,
        tripType: r.tripType ? String(r.tripType) : null,
        hotel: r.hotel ? String(r.hotel) : null,
        serviceable: r.label === 'serviceable',
        amount: r.amount == null ? null : num(r.amount),
        passengers: r.passengers == null ? null : num(r.passengers),
        serviceDate: dayOf(r.serviceDate),
        returnDate: dayOf(r.returnDate),
      })),
      serviceDates: serviceDates.map((r) => ({ date: dayOf(r.d)!, quotes: num(r.quotes), arrivals: num(r.arrivals), departures: num(r.departures) })),
      serviceMonths: serviceMonths.map((r) => ({ month: String(r.m), quotes: num(r.quotes) })),
      stays: stayRows.map((r) => ({ nights: num(r.nights), quotes: num(r.quotes) })),
      sources: sources.map((s) => ({ label: String(s.bucket), visitors: num(s.visitors) })),
      devices: devices.map((s) => ({ label: String(s.bucket), visitors: num(s.visitors) })),
    };
  }
}
