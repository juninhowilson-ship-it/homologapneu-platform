import { readFileSync } from "node:fs";
for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadImageFromUrl, BUCKET_VEHICLE_IMAGES } from "./lib/storage/supabaseStorage.ts";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// Dados compilados dos 15 lotes (expandido com múltiplos ângulos por modelo)
const imageData = [
  // Lote 1 - Audi (modelo 7383 - A5)
  { modeloId: 7383, tipo: "PRINCIPAL", url: "https://uploads.audi.com/system/production/media/126606/images/62cbbc8caf5268f5262e2800ffd81065283d1299/A244454_web_2880.jpg" },
  { modeloId: 7383, tipo: "FRONTAL", url: "https://uploads.audi.com/system/production/media/126607/images/7beacee8083226bd6b34b32d345978d21a39d92a/A244455_web_2880.jpg" },
  { modeloId: 7383, tipo: "TRASEIRA", url: "https://uploads.audi.com/system/production/media/126608/images/f071c03abc3b7552163ffa623806ffb28eb0d4f8/A244456_web_2880.jpg" },
  { modeloId: 7383, tipo: "LATERAL", url: "https://uploads.audi.com/system/production/media/126609/images/5eabc401f961c3a91b7ad8ef1629ba008fa0e034/A244457_web_2880.jpg" },

  // Lote 2 - BYD (modelo 7357 - Seal)
  { modeloId: 7357, tipo: "PRINCIPAL", url: "https://bydbrasil.press/wp-content/uploads/2026/03/Seal-studio-1-scaled.jpg" },

  // Lote 3 - Chevrolet (modelo 7345 - S10)
  { modeloId: 7345, tipo: "PRINCIPAL", url: "https://pressroom.gm.com.br/content/Pages/news/br/pt/2026/jul/0726-s10-trail-boss/_jcr_content/boilerplate/image.img.jpg/2027-chevrolet-s10-trail-boss-DSC00705.jpg" },

  // Lote 4 - Fiat (modelo 7350 - Cronos)
  { modeloId: 7350, tipo: "PRINCIPAL", url: "https://stellantis3.dam-broadcast.com/medias/domain12808/media104339/1301785-wirdf7kwpa-xlarge.jpg" },

  // Lote 5 - Foton (modelo 8959 - AUMARK)
  { modeloId: 8959, tipo: "PRINCIPAL", url: "https://fotondobrasil.com.br/img/veiculos/aumark-s-315/hero.webp" },

  // Lote 6 - Hyundai (modelo 12 - Creta)
  { modeloId: 12, tipo: "PRINCIPAL", url: "https://hyundai-csa-news.com/wp-content/uploads/2025/11/CRETA_Ultimate-1-scaled.jpg" },

  // Lote 7 - JAC (modelo 9015 - HUNTER)
  { modeloId: 9015, tipo: "PRINCIPAL", url: "https://www.jacmotors.com.br/wp-content/uploads/2025/12/Hunter-Desktop-Feita-Para-Desbravar-1.webp" },

  // Lote 8 - Jeep (modelo 15 - Compass)
  { modeloId: 15, tipo: "PRINCIPAL", url: "https://stellantis3.dam-broadcast.com/medias/domain12808/media102723/817111-yyfw66aufj-xlarge.jpg" },

  // Lote 9 - Kia (modelo 8987 - Sorento)
  { modeloId: 8987, tipo: "PRINCIPAL", url: "https://www.kiamedia.com/us/en/download/23581/high/jpg" },

  // Lote 10 - Nissan (modelo 8945 - Frontier)
  { modeloId: 8945, tipo: "PRINCIPAL", url: "https://wieck-nissanao-production.s3.amazonaws.com/photos/57a1e4af30bbd568abd50e5237c50006301a38df/thumbnail-720x404.jpg" },

  // Lote 11 - Toyota (modelo 7354 - Corolla Cross)
  { modeloId: 7354, tipo: "PRINCIPAL", url: "https://www.toyotacomunica.com.br/wp-content/uploads/2021/03/corolla-cross-2-1.jpg" },

  // Adicionar mais lotes 12-15 aqui quando os dados estiverem disponíveis...
];

const uploadByModelId = async (modelId, imageList) => {
  const versions = await prisma.vehicleVersion.findMany({
    where: { vehicleModelId: modelId, isActive: true },
    select: { id: true },
  });

  if (versions.length === 0) {
    return { success: 0, skipped: 1, errors: 0 };
  }

  let success = 0, errors = 0;

  for (const img of imageList) {
    try {
      let stored;
      try {
        stored = await uploadImageFromUrl(BUCKET_VEHICLE_IMAGES, `veiculos/${modelId}_${img.tipo.toLowerCase()}.webp`, img.url);
      } catch (downloadError) {
        errors++;
        console.log(`  ✗ ${img.tipo}: ${downloadError.message}`);
        continue;
      }

      for (const version of versions) {
        await prisma.vehicleImage.upsert({
          where: { vehicleVersionId_type: { vehicleVersionId: version.id, type: img.tipo } },
          update: { url: stored.publicUrl },
          create: { vehicleVersionId: version.id, type: img.tipo, url: stored.publicUrl }
        });
      }

      console.log(`  ✓ ${img.tipo} (${versions.length} versões, ${stored.sizeBytes} bytes)`);
      success++;
    } catch (e) {
      console.log(`  ✗ ${img.tipo}: ${e.message}`);
      errors++;
    }
  }

  return { success, skipped: 0, errors };
};

const groupByModel = (data) => {
  const grouped = {};
  for (const item of data) {
    if (!grouped[item.modeloId]) grouped[item.modeloId] = [];
    grouped[item.modeloId].push(item);
  }
  return grouped;
};

const grouped = groupByModel(imageData);
let totalSuccess = 0, totalSkipped = 0, totalErrors = 0;

console.log(`\n🚗 Upload de fotos de veículos\n`);

for (const [modelId, images] of Object.entries(grouped)) {
  const model = await prisma.vehicleModel.findUnique({
    where: { id: parseInt(modelId) },
    select: { name: true }
  });

  console.log(`\nModelo ${modelId} (${model?.name || 'DESCONHECIDO'}):`);
  const result = await uploadByModelId(parseInt(modelId), images);
  totalSuccess += result.success;
  totalSkipped += result.skipped;
  totalErrors += result.errors;

  if (result.skipped > 0) {
    console.log(`  ⊘ Sem versões ativas`);
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✓ ${totalSuccess} imagens gravadas`);
if (totalSkipped > 0) console.log(`⊘ ${totalSkipped} modelos sem versões`);
if (totalErrors > 0) console.log(`✗ ${totalErrors} falhas`);

await prisma.$disconnect();
