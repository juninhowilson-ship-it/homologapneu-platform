import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** npm run report:database — snapshot dos números do Banco Mestre + Storage. */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function storageUsageBytes(): Promise<number | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // Proxy confiável: soma de DocumentUpload.fileSize para linhas já
  // confirmadas no Storage (storagePath preenchido) — cada upload foi
  // conferido por hash no momento da migração/criação (ver
  // lib/storage/documentStorage.ts / scripts/migrate-documents-to-storage.ts).
  const result = await prisma.documentUpload.aggregate({
    where: { storagePath: { not: null } },
    _sum: { fileSize: true },
  });
  return result._sum.fileSize ?? 0;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(1)} ${units[unit]}`;
}

async function main() {
  const [manufacturers, models, versions, documents, documentsInStorage, homologations, dbSize, storageBytes] =
    await Promise.all([
      prisma.manufacturer.count({ where: { deletedAt: null } }),
      prisma.vehicleModel.count({ where: { deletedAt: null } }),
      prisma.vehicleVersion.count(),
      prisma.documentUpload.count(),
      prisma.documentUpload.count({ where: { storagePath: { not: null } } }),
      prisma.homologation.count({ where: { deletedAt: null } }),
      prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) as size`,
      storageUsageBytes(),
    ]);

  const report = {
    geradoEm: new Date().toISOString(),
    fabricantes: manufacturers,
    modelos: models,
    versoes: versions,
    documentos: documents,
    pdfsNoStorage: documentsInStorage,
    homologacoes: homologations,
    tamanhoPostgres: dbSize[0]?.size,
    espacoUsadoStorage: storageBytes !== null ? formatBytes(storageBytes) : "indisponível (Storage não configurado)",
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha ao gerar relatório:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
