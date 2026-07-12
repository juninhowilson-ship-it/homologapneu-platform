import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  USERS,
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
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

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
  const vehiclesByKey = new Map<string, (typeof VEHICLES)[number]>();
  for (const vehicle of VEHICLES) {
    const manufacturerId = manufacturerIds.get(vehicle.manufacturer);
    if (!manufacturerId) continue;

    const key = `${vehicle.manufacturer}|${vehicle.model}|${vehicle.version}`;
    vehiclesByKey.set(key, vehicle);
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
          brand: tire.brand,
          model: tire.model,
          size: tire.size,
          width: tire.width,
          profile: tire.profile,
          rim: tire.rim,
          loadIndex: tire.loadIndex,
          speedIndex: tire.speedIndex,
          runFlat: tire.runFlat,
          xl: tire.xl,
          seal: tire.seal,
          tubeless: tire.tubeless,
          category: tire.category,
          segment: tire.segment,
          ean: tire.ean,
          description: tire.description,
          isActive: tire.isActive,
        },
      }));
    tireIds.set(key, record.id);
  }

  for (const homologation of HOMOLOGATIONS) {
    const vehicleKey = `${homologation.vehicle.manufacturer}|${homologation.vehicle.model}|${homologation.vehicle.version}`;
    const vehicleId = vehicleIds.get(vehicleKey);
    const vehicleSeed = vehiclesByKey.get(vehicleKey);
    if (!vehicleId || !vehicleSeed) continue;

    const tireEntries = homologation.tires
      .map((entry) => ({
        tireId: tireIds.get(
          `${entry.tire.manufacturer}|${entry.tire.model}|${entry.tire.size}`
        ),
        role: entry.role,
      }))
      .filter(
        (entry): entry is { tireId: number; role: typeof entry.role } =>
          entry.tireId !== undefined
      );

    if (tireEntries.length === 0) continue;

    const existing = await prisma.homologation.findFirst({
      where: { vehicleId, code: homologation.code },
    });
    if (existing) continue;

    await prisma.homologation.create({
      data: {
        code: homologation.code,
        vehicleId,
        year: homologation.year,
        version: vehicleSeed.version,
        engine: vehicleSeed.engine,
        notes: homologation.notes,
        tires: {
          create: tireEntries.map((entry) => ({
            tireId: entry.tireId,
            role: entry.role,
          })),
        },
      },
    });
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
