import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

// imageUrl: rutas del sitio de reservas (frontend/booking/public/vehicles), todas
// con el mismo lienzo 800x400 y el vehículo centrado.
const VEHICLE_TYPES = [
  {
    code: 'SEDAN',
    name: 'Sedan',
    description: 'Volkswagen Jetta or similar',
    maxPassengers: 2,
    maxLuggage: 2,
    imageUrl: '/vehicles/jetta.webp',
    sortOrder: 1,
  },
  {
    code: 'CARRITO',
    name: 'Carrito',
    description: 'Volkswagen Teramont or similar',
    maxPassengers: 4,
    maxLuggage: 4,
    imageUrl: '/vehicles/vip.webp',
    sortOrder: 2,
  },
  {
    code: 'TRANSPORTER',
    name: 'Transporter',
    description: 'Ford Transit or similar',
    maxPassengers: 7,
    maxLuggage: 7,
    imageUrl: '/vehicles/transit.webp',
    sortOrder: 3,
  },
];

type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

// Polígonos APROXIMADOS (rectángulos) solo para arrancar en desarrollo.
// Se redibujan en el panel de admin o se reemplazan importando el KML real.
// Si dos zonas se traslapan, gana la de mayor `priority`.
const ZONES: Array<{
  slug: string;
  name: string;
  color: string;
  priority: number;
  isAirport: boolean;
  bbox: BBox;
}> = [
  { slug: 'cancun-airport', name: 'Cancun Airport', color: '#EF4444', priority: 100, isAirport: true, bbox: [-86.9, 21.015, -86.85, 21.055] },
  { slug: 'cancun', name: 'Cancun', color: '#3B82F6', priority: 10, isAirport: false, bbox: [-86.9, 21.02, -86.73, 21.19] },
  { slug: 'puerto-juarez', name: 'Puerto Juarez', color: '#0EA5E9', priority: 20, isAirport: false, bbox: [-86.83, 21.175, -86.79, 21.215] },
  { slug: 'playa-mujeres', name: 'Playa Mujeres', color: '#8B5CF6', priority: 20, isAirport: false, bbox: [-86.83, 21.215, -86.78, 21.25] },
  { slug: 'costa-mujeres', name: 'Costa Mujeres', color: '#A855F7', priority: 20, isAirport: false, bbox: [-86.84, 21.25, -86.77, 21.31] },
  { slug: 'puerto-morelos', name: 'Puerto Morelos', color: '#14B8A6', priority: 10, isAirport: false, bbox: [-86.96, 20.78, -86.85, 20.9] },
  { slug: 'playa-del-carmen', name: 'Playa del Carmen', color: '#F59E0B', priority: 10, isAirport: false, bbox: [-87.12, 20.57, -87.03, 20.7] },
  { slug: 'puerto-aventuras', name: 'Puerto Aventuras', color: '#F97316', priority: 10, isAirport: false, bbox: [-87.26, 20.47, -87.2, 20.53] },
  { slug: 'akumal', name: 'Akumal', color: '#22C55E', priority: 10, isAirport: false, bbox: [-87.35, 20.37, -87.29, 20.43] },
  { slug: 'tulum', name: 'Tulum', color: '#10B981', priority: 10, isAirport: false, bbox: [-87.52, 20.14, -87.4, 20.26] },
];

// Único aeropuerto del servicio. La terminal (T2/T3/T4) se captura con los datos del vuelo.
const AIRPORT = { code: 'CUN', name: 'Cancun International Airport (CUN)', lng: -86.8747, lat: 21.0381 };

// Anillo en sentido antihorario (convención GeoJSON), cerrado en el primer punto.
function bboxToWkt([minLng, minLat, maxLng, maxLat]: BBox): string {
  return `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
}

async function main() {
  // En producción el catálogo se importa desde la base de desarrollo: solo se crea el usuario del panel.
  if (process.env.SEED_ADMIN_ONLY === 'true') {
    await seedFirstAdmin();
    return;
  }

  for (const vt of VEHICLE_TYPES) {
    await prisma.vehicleType.upsert({ where: { code: vt.code }, update: {}, create: vt });
    // Imagen y descripción solo si aún no tienen: no pisa lo que se edite en el panel.
    await prisma.vehicleType.updateMany({ where: { code: vt.code, imageUrl: null }, data: { imageUrl: vt.imageUrl } });
    await prisma.vehicleType.updateMany({
      where: { code: vt.code, description: null },
      data: { description: vt.description },
    });
  }

  // INSERT IGNORE: no sobreescribe zonas que ya se hayan editado en el panel.
  for (const [index, zone] of ZONES.entries()) {
    await prisma.$executeRaw`
      INSERT IGNORE INTO zones (name, slug, boundary, color, priority, is_airport, sort_order)
      VALUES (${zone.name}, ${zone.slug},
              ST_GeomFromText(${bboxToWkt(zone.bbox)}, 4326, 'axis-order=long-lat'),
              ${zone.color}, ${zone.priority}, ${zone.isAirport}, ${index + 1})`;
  }

  await prisma.$executeRaw`
    INSERT IGNORE INTO places (code, place_type, name, location, is_featured)
    VALUES (${AIRPORT.code}, 'AIRPORT', ${AIRPORT.name},
            ST_GeomFromText(${`POINT(${AIRPORT.lng} ${AIRPORT.lat})`}, 4326, 'axis-order=long-lat'),
            1)`;

  await seedFirstAdmin();

  console.log('Seed completado: tipos de vehículo, zonas de ejemplo y aeropuerto CUN.');
}

/**
 * Primer usuario del panel, desde ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD del .env
 * (la contraseña nunca va en el código). Si el correo ya existe no lo toca.
 */
async function seedFirstAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.log('Sin ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD: no se crea usuario del panel.');
    return;
  }
  if (password.length < 12) throw new Error('ADMIN_SEED_PASSWORD debe tener al menos 12 caracteres.');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`El usuario del panel ${email} ya existe; no se modifica.`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name: process.env.ADMIN_SEED_NAME?.trim() || 'Administrador',
      passwordHash: await hashPassword(password),
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`Usuario del panel creado: ${email} (SUPER_ADMIN).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
