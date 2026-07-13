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
  REAL_HOMOLOGATION_TIRES,
  HOMOLOGATIONS,
} from "./seedData";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const REAL_TIRE_KEYS = new Set(
  REAL_HOMOLOGATION_TIRES.map((t) => `${t.manufacturer}|${t.model}|${t.size}`)
);

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
      create: {
        name,
        validationStatus: "NECESSITA_VALIDACAO",
        source: "Cadastro inicial de demonstração",
      },
    });
    manufacturerIds.set(name, manufacturer.id);
  }

  const tireManufacturerIds = new Map<string, number>();
  for (const tireManufacturer of TIRE_MANUFACTURERS) {
    const created = await prisma.tireManufacturer.upsert({
      where: { name: tireManufacturer.name },
      update: {},
      create: {
        ...tireManufacturer,
        validationStatus: "NECESSITA_VALIDACAO",
        source: "Cadastro inicial de demonstração",
      },
    });
    tireManufacturerIds.set(tireManufacturer.name, created.id);
  }

  // --- Veículos: Modelo -> Motor -> Versão (normalizado) ---
  const vehicleModelIds = new Map<string, number>();
  const engineIds = new Map<string, number>();
  const vehicleVersionIds = new Map<string, number>();

  for (const vehicle of VEHICLES) {
    const manufacturerId = manufacturerIds.get(vehicle.manufacturer);
    if (!manufacturerId) continue;

    const modelKey = `${vehicle.manufacturer}|${vehicle.model}`;
    let vehicleModelId = vehicleModelIds.get(modelKey);
    if (!vehicleModelId) {
      const existingModel = await prisma.vehicleModel.findFirst({
        where: { manufacturerId, name: vehicle.model },
      });
      const model =
        existingModel ??
        (await prisma.vehicleModel.create({
          data: { manufacturerId, name: vehicle.model },
        }));
      vehicleModelId = model.id;
      vehicleModelIds.set(modelKey, vehicleModelId);
    }

    const engineKey = `${vehicle.engine}|${vehicle.fuel}|${vehicle.power ?? ""}`;
    let engineId = engineIds.get(engineKey);
    if (!engineId) {
      const existingEngine = await prisma.engine.findFirst({
        where: { name: vehicle.engine, fuel: vehicle.fuel, power: vehicle.power },
      });
      const engine =
        existingEngine ??
        (await prisma.engine.create({
          data: {
            name: vehicle.engine,
            fuel: vehicle.fuel,
            power: vehicle.power,
            turbo: /turbo|tsi|tfsi/i.test(vehicle.engine),
          },
        }));
      engineId = engine.id;
      engineIds.set(engineKey, engineId);
    }

    const versionKey = `${vehicle.manufacturer}|${vehicle.model}|${vehicle.version}`;
    const existingVersion = await prisma.vehicleVersion.findFirst({
      where: { vehicleModelId, name: vehicle.version, engineId },
    });
    const version =
      existingVersion ??
      (await prisma.vehicleVersion.create({
        data: {
          vehicleModelId,
          engineId,
          name: vehicle.version,
          yearStart: vehicle.yearStart,
          yearEnd: vehicle.yearEnd,
          category: vehicle.category,
          segment: vehicle.segment,
          country: vehicle.country,
          notes: vehicle.notes,
          isActive: vehicle.isActive,
          validationStatus: "NECESSITA_VALIDACAO",
          source: "Cadastro inicial de demonstração",
        },
      }));
    vehicleVersionIds.set(versionKey, version.id);
  }

  // --- Pneus: Família -> Pneu ---
  const tireFamilyIds = new Map<string, number>();
  const tireIds = new Map<string, number>();

  for (const tire of TIRES) {
    const tireManufacturerId = tireManufacturerIds.get(tire.manufacturer);
    if (!tireManufacturerId) continue;

    let tireFamilyId: number | undefined;
    if (tire.family) {
      const familyKey = `${tire.manufacturer}|${tire.family}`;
      tireFamilyId = tireFamilyIds.get(familyKey);
      if (!tireFamilyId) {
        const existingFamily = await prisma.tireFamily.findFirst({
          where: { tireManufacturerId, name: tire.family },
        });
        const family =
          existingFamily ??
          (await prisma.tireFamily.create({
            data: { tireManufacturerId, name: tire.family },
          }));
        tireFamilyId = family.id;
        tireFamilyIds.set(familyKey, tireFamilyId);
      }
    }

    const key = `${tire.manufacturer}|${tire.model}|${tire.size}`;
    const isRealTire = REAL_TIRE_KEYS.has(key);
    const existing = await prisma.tire.findFirst({
      where: { tireManufacturerId, model: tire.model, size: tire.size },
    });
    const record =
      existing ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          tireFamilyId,
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
          validationStatus: "NECESSITA_VALIDACAO",
          source: isRealTire
            ? "Pesquisa em fontes especializadas (ver fonte da homologação vinculada)"
            : "Catálogo sintético de demonstração",
          confidence: isRealTire ? 70 : 20,
        },
      }));
    tireIds.set(key, record.id);
  }

  // --- Homologações ---
  for (const homologation of HOMOLOGATIONS) {
    const vehicleKey = `${homologation.vehicle.manufacturer}|${homologation.vehicle.model}|${homologation.vehicle.version}`;
    const vehicleVersionId = vehicleVersionIds.get(vehicleKey);
    if (!vehicleVersionId) continue;

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
      where: { vehicleVersionId, code: homologation.code },
    });
    if (existing) continue;

    await prisma.homologation.create({
      data: {
        code: homologation.code,
        vehicleVersionId,
        year: homologation.year,
        notes: homologation.notes,
        source: homologation.source,
        validationStatus: "NECESSITA_VALIDACAO",
        confidence: 70,
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
