// SOLO DESARROLLO: carga tarifas de PRUEBA (precios inventados) para poder
// probar el cotizador. Las tarifas reales se capturan desde el panel de admin.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// [slug destino, precio base sencillo en Sedan]
const FROM_AIRPORT: Array<[string, number]> = [
  ['cancun', 40],
  ['puerto-juarez', 45],
  ['playa-mujeres', 50],
  ['costa-mujeres', 55],
  ['puerto-morelos', 60],
  ['playa-del-carmen', 75],
  ['puerto-aventuras', 95],
  ['akumal', 105],
  ['tulum', 125],
];

// Rangos de pasajeros por vehículo y multiplicador sobre el precio base.
const PAX_TIERS: Record<string, Array<{ minPax: number; maxPax: number; factor: number }>> = {
  SEDAN: [{ minPax: 1, maxPax: 2, factor: 1 }],
  CARRITO: [{ minPax: 1, maxPax: 4, factor: 1.25 }],
  TRANSPORTER: [
    { minPax: 1, maxPax: 4, factor: 1.5 },
    { minPax: 5, maxPax: 7, factor: 1.8 },
  ],
};

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('dev-sample-rates no debe ejecutarse en producción.');
  }

  const airport = await prisma.zone.findUniqueOrThrow({ where: { slug: 'cancun-airport' }, select: { id: true } });
  const vehicleTypes = await prisma.vehicleType.findMany({ select: { id: true, code: true } });
  const validFrom = new Date('2026-01-01T00:00:00Z');

  for (const [slug, basePrice] of FROM_AIRPORT) {
    const zone = await prisma.zone.findUniqueOrThrow({ where: { slug }, select: { id: true } });
    for (const vt of vehicleTypes) {
      for (const tier of PAX_TIERS[vt.code] ?? []) {
        const oneWay = Math.round(basePrice * tier.factor);
        await prisma.zoneRate.upsert({
          where: {
            originZoneId_destinationZoneId_vehicleTypeId_minPax_validFrom: {
              originZoneId: airport.id,
              destinationZoneId: zone.id,
              vehicleTypeId: vt.id,
              minPax: tier.minPax,
              validFrom,
            },
          },
          update: {},
          create: {
            originZoneId: airport.id,
            destinationZoneId: zone.id,
            vehicleTypeId: vt.id,
            minPax: tier.minPax,
            maxPax: tier.maxPax,
            priceOneWay: oneWay,
            priceRoundTrip: Math.round(oneWay * 1.85),
            isBidirectional: true,
            validFrom,
          },
        });
      }
    }
  }

  console.log('Tarifas de prueba cargadas (Aeropuerto <-> cada zona).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
