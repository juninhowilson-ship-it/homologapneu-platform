#!/usr/bin/env node
/**
 * BLITZ: Bulk insert Pirelli homologations for Mercedes, BMW, Audi
 * Logic: 1 tire_vehicle_application row → 1 VehicleVersion + 1 Homologation + 1 HomologationTire
 *
 * Usage: npx tsx scripts/blitz-pirelli-mercedes-bmw-audi.ts
 */

import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 50;
const MANUFACTURERS = ["Mercedes", "BMW", "Audi"];
const TIRE_MANUFACTURER_ID = 2; // Pirelli

interface Evidence {
  vehicleManufacturerName: string;
  vehicleModel: string;
  tireModel: string;
  tireSize: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(
    "🚀 BLITZ: Mercedes+BMW+Audi Pirelli homologations\n━━━━━━━━━━━━━━━━━━━━━"
  );

  try {
    // Step 1: Pull all Pirelli evidence for target manufacturers
    console.log("📥 Pulling tire_vehicle_applications...");
    const evidences = await prisma.$queryRaw<Evidence[]>`
      SELECT DISTINCT
        "vehicleManufacturerName",
        "vehicleModel",
        "tireModel",
        "tireSize"
      FROM tire_vehicle_applications
      WHERE "tireManufacturerName" = 'Pirelli'
        AND "vehicleManufacturerName" IN ('Mercedes','BMW','Audi')
      ORDER BY "vehicleManufacturerName", "vehicleModel", "tireModel"
    `;

    console.log(`✓ Found ${evidences.length} evidences\n`);

    // Step 2: Get tire manufacturer + engine sample
    const pirelli = await prisma.tireManufacturer.findUnique({
      where: { name: "Pirelli" },
    });
    if (!pirelli) throw new Error("Pirelli tire manufacturer not found");

    const sampleEngine = await prisma.engine.findFirst({
      where: { name: { startsWith: "Generic" } },
    });
    if (!sampleEngine) {
      console.warn(
        "⚠️  No Generic engines found — creating one for fallback..."
      );
      const fallbackEngine = await prisma.engine.create({
        data: {
          name: "Generic 4-Cylinder Engine",
          fuel: "GASOLINA",
          power: "150cv",
        },
      });
      console.log(`✓ Fallback engine created: ${fallbackEngine.id}\n`);
    }

    // Step 3: Get manufacturer IDs
    const manufacturers = await prisma.manufacturer.findMany({
      where: { name: { in: MANUFACTURERS } },
    });
    const mfgMap = new Map(manufacturers.map((m) => [m.name, m.id]));

    if (mfgMap.size < 3) {
      console.warn(`⚠️  Only found ${mfgMap.size}/3 manufacturers. Proceeding...`);
    }

    // Step 4: Batch process evidences
    let created = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`\n📦 Processing ${evidences.length} evidences in batches...\n`);

    for (let i = 0; i < evidences.length; i += BATCH_SIZE) {
      const batch = evidences.slice(i, Math.min(i + BATCH_SIZE, evidences.length));
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(evidences.length / BATCH_SIZE);

      process.stdout.write(
        `  Batch ${batchNum}/${totalBatches} (${batch.length} items)... `
      );

      let batchCreated = 0;

      for (const ev of batch) {
        try {
          const mfgId = mfgMap.get(ev.vehicleManufacturerName);
          if (!mfgId) {
            skipped++;
            continue;
          }

          // 1. Get or create tire
          let tire = await prisma.tire.findUnique({
            where: {
              tireManufacturerId_model_size: {
                tireManufacturerId: pirelli.id,
                model: ev.tireModel,
                size: ev.tireSize,
              },
            },
          });

          if (!tire) {
            const [width, rest] = ev.tireSize.split("/");
            const [profile, rimStr] = rest.split("R");
            const rim = rimStr.replace(/C$/, ""); // Handle XC suffix

            tire = await prisma.tire.create({
              data: {
                tireManufacturerId: pirelli.id,
                model: ev.tireModel,
                size: ev.tireSize,
                width: parseInt(width),
                profile: parseInt(profile),
                rim: parseInt(rim),
                brand: "Pirelli",
                category: "PASSEIO",
                type: "RADIAL",
                loadIndex: "91",
                speedIndex: "V",
                isActive: true,
                validationStatus: "NECESSITA_VALIDACAO",
                source: "Bulk Pirelli Import",
              },
            });
          }

          // 2. Get or create vehicle model
          const normalizedName = ev.vehicleModel.toLowerCase().trim();
          let vModel = await prisma.vehicleModel.findFirst({
            where: {
              manufacturerId: mfgId,
              normalizedName,
            },
          });

          if (!vModel) {
            vModel = await prisma.vehicleModel.create({
              data: {
                manufacturerId: mfgId,
                name: ev.vehicleModel,
                normalizedName,
              },
            });
          }

          // 3. Get or create generic engine
          let engine = await prisma.engine.findFirst({
            where: {
              name: `Generic ${ev.vehicleModel} Engine`,
              fuel: "GASOLINA",
            },
          });

          if (!engine) {
            engine = await prisma.engine.create({
              data: {
                name: `Generic ${ev.vehicleModel} Engine`,
                fuel: "GASOLINA",
                power: "150cv",
              },
            });
          }

          // 4. Get or create vehicle version
          let version = await prisma.vehicleVersion.findFirst({
            where: {
              vehicleModelId: vModel.id,
              engineId: engine.id,
              yearStart: 2018,
              yearEnd: 2025,
            },
          });

          if (!version) {
            version = await prisma.vehicleVersion.create({
              data: {
                vehicleModelId: vModel.id,
                engineId: engine.id,
                yearStart: 2018,
                yearEnd: 2025,
                name: `${ev.vehicleModel} (2018-2025)`,
                category: "SEDAN",
                transmissionId: 1,
              },
            });
          }

          // 5. Create homologation (one per evidence)
          const code = `PR-${ev.vehicleModel.substring(0, 2).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const homolog = await prisma.homologation.create({
            data: {
              vehicleVersionId: version.id,
              code,
              year: 2024,
              validationStatus: "NECESSITA_VALIDACAO",
            },
          });

          // 6. Create homologation-tire link
          await prisma.homologationTire.create({
            data: {
              homologationId: homolog.id,
              tireId: tire.id,
              role: "ORIGINAL",
              position: "AMBOS",
            },
          });

          created++;
          batchCreated++;
        } catch (e: any) {
          if (e.code === "P2002") {
            skipped++; // Unique constraint
          } else {
            errors++;
            console.error(`\n    ❌ Error: ${e.message}`);
          }
        }
      }

      console.log(`✓ +${batchCreated}\n`);
      await sleep(100); // Small delay between batches
    }

    // Step 5: Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ BLITZ COMPLETE");
    console.log(`   Created:  ${created} homologations`);
    console.log(`   Skipped:  ${skipped} (duplicates)`);
    console.log(`   Errors:   ${errors}`);
    console.log(
      `   Total:    ${created + skipped + errors}/${evidences.length}`
    );

    // Verify creation
    const homologCount = await prisma.homologation.count();
    const tireLinksCount = await prisma.homologationTire.count();
    console.log(`\n📊 Database state:`);
    console.log(`   Homologations: ${homologCount}`);
    console.log(`   Tire mappings: ${tireLinksCount}`);
  } catch (error) {
    console.error("❌ FATAL:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
