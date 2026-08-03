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

// Função para consolidar dados de múltiplos arquivos JSON
async function consolidateAgentData(filePaths) {
  const consolidated = [];

  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      console.log(`⊘ Arquivo não encontrado: ${filePath}`);
      continue;
    }

    try {
      const content = await readFile(filePath, "utf8");
      const lines = content.split("\n").filter(l => l.trim());

      for (const line of lines) {
        try {
          // Tenta parsear como JSON (pode ser JSONL ou estrutura aninhada)
          const data = JSON.parse(line);

          // Procura pelo campo de dados (pode estar em diferentes formatos)
          const imageData = data.modelo && data.tipo && data.url ? data : data.data;

          if (imageData?.modelo && imageData?.tipo && imageData?.url) {
            consolidated.push(imageData);
          }
        } catch (e) {
          // Linha não é JSON válido, pula
        }
      }

      console.log(`✓ ${filePath}: ${content.split("\n").filter(l => l.trim()).length} linhas processadas`);
    } catch (e) {
      console.log(`✗ Erro ao ler ${filePath}: ${e.message}`);
    }
  }

  return consolidated;
}

// Função para agrupar dados por modelo
function groupByModel(data) {
  const grouped = {};
  for (const item of data) {
    if (!grouped[item.modelo]) grouped[item.modelo] = [];
    grouped[item.modelo].push(item);
  }
  return grouped;
}

// Função para encontrar modelo_id a partir do nome do modelo
async function findModelIdByName(modelName) {
  const model = await prisma.vehicleModel.findFirst({
    where: {
      name: { equals: modelName, mode: 'insensitive' }
    },
    select: { id: true }
  });
  return model?.id;
}

// Função para fazer upload para um modelo
async function uploadForModel(modelName, modelId, images) {
  if (!modelId) {
    return { success: 0, skipped: 1, errors: 0, reason: 'Modelo não encontrado no banco' };
  }

  const versions = await prisma.vehicleVersion.findMany({
    where: { vehicleModelId: modelId, isActive: true },
    select: { id: true },
  });

  if (versions.length === 0) {
    return { success: 0, skipped: 1, errors: 0, reason: 'Sem versões ativas' };
  }

  let success = 0, errors = 0;

  for (const img of images) {
    try {
      let stored;
      try {
        stored = await uploadImageFromUrl(
          BUCKET_VEHICLE_IMAGES,
          `veiculos/${modelId}_${img.tipo.toLowerCase()}.webp`,
          img.url
        );
      } catch (downloadError) {
        errors++;
        continue;
      }

      for (const version of versions) {
        await prisma.vehicleImage.upsert({
          where: {
            vehicleVersionId_type: {
              vehicleVersionId: version.id,
              type: img.tipo
            }
          },
          update: { url: stored.publicUrl },
          create: {
            vehicleVersionId: version.id,
            type: img.tipo,
            url: stored.publicUrl
          }
        });
      }

      success++;
    } catch (e) {
      errors++;
    }
  }

  return { success, skipped: 0, errors };
}

// MAIN
console.log(`\n${'='.repeat(60)}`);
console.log(`🚗 CONSOLIDAÇÃO E UPLOAD DE FOTOS DE VEÍCULOS`);
console.log(`${'='.repeat(60)}\n`);

// Arquivos de saída dos agentes (serão preenchidos quando os agentes terminarem)
const agentOutputFiles = [
  process.env.AGENT_1_OUTPUT || 'C:\\Users\\Wilson\\AppData\\Local\\Temp\\claude\\C--Projetos-homologapneu\\5e1e470e-9163-4a16-b0a2-a84a60062a87\\tasks\\a3d4a1b9cb10b71cb.output',
  process.env.AGENT_2_OUTPUT || 'C:\\Users\\Wilson\\AppData\\Local\\Temp\\claude\\C--Projetos-homologapneu\\5e1e470e-9163-4a16-b0a2-a84a60062a87\\tasks\\a97b2a1f89a9fbbcf.output',
  process.env.AGENT_3_OUTPUT || 'C:\\Users\\Wilson\\AppData\\Local\\Temp\\claude\\C--Projetos-homologapneu\\5e1e470e-9163-4a16-b0a2-a84a60062a87\\tasks\\a8321f07c34281894.output',
];

console.log(`📥 Consolidando dados de ${agentOutputFiles.length} agentes...\n`);
const allData = await consolidateAgentData(agentOutputFiles);
const groupedData = groupByModel(allData);

console.log(`✓ ${allData.length} URLs compiladas de ${Object.keys(groupedData).length} modelos\n`);

// Upload para cada modelo
let totalSuccess = 0, totalSkipped = 0, totalErrors = 0;
const uploadResults = [];

console.log(`📤 Iniciando upload...\n`);

for (const [modelName, images] of Object.entries(groupedData)) {
  const modelId = await findModelIdByName(modelName);

  const result = await uploadForModel(modelName, modelId, images);
  uploadResults.push({ modelName, ...result });

  totalSuccess += result.success;
  totalSkipped += result.skipped;
  totalErrors += result.errors;

  if (modelId) {
    const status = result.success > 0 ? '✓' : result.skipped > 0 ? '⊘' : '✗';
    console.log(`${status} ${modelName}: ${result.success}✓ ${result.errors}✗`);
  } else {
    console.log(`✗ ${modelName}: modelo não encontrado`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 RESUMO FINAL`);
console.log(`${'='.repeat(60)}`);
console.log(`✓ ${totalSuccess} imagens gravadas`);
console.log(`⊘ ${totalSkipped} modelos pulados`);
console.log(`✗ ${totalErrors} falhas`);
console.log(`${'='.repeat(60)}\n`);

await prisma.$disconnect();
