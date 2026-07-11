import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  MANUFACTURERS,
  TIRE_MANUFACTURERS,
  VEHICLES,
  TIRES,
  HOMOLOGATIONS,
} from "./seedData";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const manufacturerIds = new Map<string, number>();
  for (const name of MANUFACTURERS) {
    const manufacturer = await prisma.manufacturer.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    manufacturerIds.set(name, manufacturer.id);
  }

  const tireManufacturerIds = new Map<string, number>();
  for (const tireManufacturer of TIRE_MANUFACTURERS) {
    const created = await prisma.tireManufacturer.upsert({
      where: { name: tireManufacturer.name },
      update: {},
      create: tireManufacturer,
    });
    tireManufacturerIds.set(tireManufacturer.name, created.id);
  }

  const vehicleIds = new Map<string, number>();
  for (const vehicle of VEHICLES) {
    const manufacturerId = manufacturerIds.get(vehicle.manufacturer);
    if (!manufacturerId) continue;

    const key = `${vehicle.manufacturer}|${vehicle.model}|${vehicle.version}`;
    const existing = await prisma.vehicle.findFirst({
      where: { manufacturerId, model: vehicle.model, version: vehicle.version },
    });
    const record =
      existing ??
      (await prisma.vehicle.create({
        data: {
          manufacturerId,
          model: vehicle.model,
          version: vehicle.version,
          yearStart: vehicle.yearStart,
          yearEnd: vehicle.yearEnd,
          engine: vehicle.engine,
          power: vehicle.power,
          fuel: vehicle.fuel,
          category: vehicle.category,
          segment: vehicle.segment,
          country: vehicle.country,
          notes: vehicle.notes,
          isActive: vehicle.isActive,
        },
      }));
    vehicleIds.set(key, record.id);
  }

  const tireIds = new Map<string, number>();
  for (const tire of TIRES) {
    const tireManufacturerId = tireManufacturerIds.get(tire.manufacturer);
    if (!tireManufacturerId) continue;

    const key = `${tire.manufacturer}|${tire.model}|${tire.size}`;
    const existing = await prisma.tire.findFirst({
      where: { tireManufacturerId, model: tire.model, size: tire.size },
    });
    const record =
      existing ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          model: tire.model,
          size: tire.size,
          loadIndex: tire.loadIndex,
          speedIndex: tire.speedIndex,
          runFlat: tire.runFlat,
          xl: tire.xl,
        },
      }));
    tireIds.set(key, record.id);
  }

  for (const homologation of HOMOLOGATIONS) {
    const vehicleId = vehicleIds.get(
      `${homologation.vehicle.manufacturer}|${homologation.vehicle.model}|${homologation.vehicle.version}`
    );
    const tireId = tireIds.get(
      `${homologation.tire.manufacturer}|${homologation.tire.model}|${homologation.tire.size}`
    );
    if (!vehicleId || !tireId) continue;

    const existing = await prisma.homologation.findFirst({
      where: { vehicleId, tireId, code: homologation.code },
    });
    if (!existing) {
      await prisma.homologation.create({
        data: { code: homologation.code, vehicleId, tireId },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
