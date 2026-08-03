import { readFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadImageFromUrl, BUCKET_VEHICLE_IMAGES } from "./lib/storage/supabaseStorage.ts";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// Carregar dados verificados do JSON
const jsonFilePath = process.argv[2] || "C:\\Users\\Wilson\\AppData\\Local\\Temp\\claude\\C--Projetos-homologapneu\\5e1e470e-9163-4a16-b0a2-a84a60062a87\\scratchpad\\verified_vehicle_images.json";

let imageData = [];

if (existsSync(jsonFilePath)) {
  try {
    const jsonContent = await readFile(jsonFilePath, "utf8");
    const parsed = JSON.parse(jsonContent);
    imageData = Array.isArray(parsed) ? parsed : [parsed];
    console.log(`✓ Carregado ${imageData.length} URLs de ${jsonFilePath}\n`);
  } catch (e) {
    console.error(`✗ Erro ao ler JSON: ${e.message}`);
  }
}

// Função para encontrar modelo_id pelo nome
async function findModelIdByName(modelName) {
  const model = await prisma.vehicleModel.findFirst({
    where: { name: { equals: modelName, mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  return model;
}

// Agrupar por modelo
const byModel = {};
for (const img of imageData) {
  if (!byModel[img.modelo]) byModel[img.modelo] = [];
  byModel[img.modelo].push(img);
}

console.log(`📊 Dados compilados: ${imageData.length} URLs de ${Object.keys(byModel).length} modelos\n`);

// Upload
let totalSuccess = 0, totalSkipped = 0, totalErrors = 0;

for (const [modelName, images] of Object.entries(byModel)) {
  const model = await findModelIdByName(modelName);

  if (!model) {
    console.log(`✗ ${modelName}: modelo não encontrado no banco`);
    totalSkipped++;
    continue;
  }

  const versions = await prisma.vehicleVersion.findMany({
    where: { vehicleModelId: model.id, isActive: true },
    select: { id: true }
  });

  if (versions.length === 0) {
    console.log(`⊘ ${modelName}: sem versões ativas`);
    totalSkipped++;
    continue;
  }

  let modelSuccess = 0, modelErrors = 0;

  for (const img of images) {
    try {
      let stored;
      try {
        stored = await uploadImageFromUrl(
          BUCKET_VEHICLE_IMAGES,
          `veiculos/${model.id}_${img.tipo.toLowerCase()}.webp`,
          img.url
        );
      } catch (downloadError) {
        modelErrors++;
        continue;
      }

      for (const version of versions) {
        await prisma.vehicleImage.upsert({
          where: { vehicleVersionId_type: { vehicleVersionId: version.id, type: img.tipo } },
          update: { url: stored.publicUrl },
          create: { vehicleVersionId: version.id, type: img.tipo, url: stored.publicUrl }
        });
      }

      modelSuccess++;
    } catch (e) {
      modelErrors++;
    }
  }

  if (modelSuccess > 0) {
    console.log(`✓ ${modelName}: ${modelSuccess} imagens em ${versions.length} versão(s)`);
    totalSuccess += modelSuccess;
  }
  if (modelErrors > 0) {
    console.log(`  ✗ ${modelErrors} falhas durante upload`);
    totalErrors += modelErrors;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✓ ${totalSuccess} imagens gravadas com sucesso`);
if (totalSkipped > 0) console.log(`⊘ ${totalSkipped} modelos pulados`);
if (totalErrors > 0) console.log(`✗ ${totalErrors} falhas`);

await prisma.$disconnect();
