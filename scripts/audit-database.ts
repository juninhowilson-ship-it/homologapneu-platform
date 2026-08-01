import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

/**
 * npm run audit:database
 *
 * Auditoria de integridade do Banco Mestre — só lê, nunca corrige nada
 * sozinho (qualquer problema encontrado precisa de decisão humana sobre
 * como resolver, mesmo espírito de "nunca inventar dados"). Sai com
 * código 1 se encontrar qualquer problema, para poder ser usado em CI.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// count(*) bruto do Postgres vem como BigInt — JSON.stringify não serializa
// BigInt nativamente, então convertemos para Number nos relatórios abaixo
// (valores de contagem aqui nunca chegam perto do limite seguro de Number).
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

type Finding = { check: string; count: number; sample: unknown[] };
const findings: Finding[] = [];

function report(check: string, rows: unknown[]) {
  findings.push({ check, count: rows.length, sample: rows.slice(0, 10) });
}

async function main() {
  console.log("=== Auditoria do Banco Mestre ===\n");

  // --- Órfãos (defensivo — FKs já devem impedir isto; aqui é conferência) ---
  report(
    "VehicleVersion sem VehicleModel",
    await prisma.$queryRaw`SELECT v.id FROM vehicle_versions v LEFT JOIN vehicle_models m ON m.id = v."vehicleModelId" WHERE m.id IS NULL`
  );
  report(
    "VehicleModel sem Manufacturer",
    await prisma.$queryRaw`SELECT vm.id FROM vehicle_models vm LEFT JOIN manufacturers mf ON mf.id = vm."manufacturerId" WHERE mf.id IS NULL`
  );
  report(
    "Homologation sem VehicleVersion",
    await prisma.$queryRaw`SELECT h.id FROM homologations h LEFT JOIN vehicle_versions v ON v.id = h."vehicleVersionId" WHERE v.id IS NULL`
  );
  report(
    "HomologationTire sem Tire ou Homologation",
    await prisma.$queryRaw`
      SELECT ht.id FROM homologation_tires ht
      LEFT JOIN tires t ON t.id = ht."tireId"
      LEFT JOIN homologations h ON h.id = ht."homologationId"
      WHERE t.id IS NULL OR h.id IS NULL`
  );
  report(
    "HomologationWheel sem Wheel ou Homologation",
    await prisma.$queryRaw`
      SELECT hw.id FROM homologation_wheels hw
      LEFT JOIN wheels w ON w.id = hw."wheelId"
      LEFT JOIN homologations h ON h.id = hw."homologationId"
      WHERE w.id IS NULL OR h.id IS NULL`
  );
  report(
    "HomologationCandidate sem DocumentUpload",
    await prisma.$queryRaw`
      SELECT hc.id FROM homologation_candidates hc
      LEFT JOIN document_uploads du ON du.id = hc."documentUploadId"
      WHERE du.id IS NULL`
  );

  // --- "Versões sem fabricante" pedido explicitamente (mesmo caso do
  // primeiro check, via cadeia completa) ---
  report(
    "VehicleVersion sem fabricante (cadeia completa)",
    await prisma.$queryRaw`
      SELECT v.id FROM vehicle_versions v
      JOIN vehicle_models vm ON vm.id = v."vehicleModelId"
      LEFT JOIN manufacturers mf ON mf.id = vm."manufacturerId"
      WHERE mf.id IS NULL`
  );

  // --- "Homologações inconsistentes": código duplicado pra mesma versão
  // (não deveria existir — @@unique — conferência extra) + homologação
  // sem nenhum pneu vinculado (pode ser legítimo em andamento, mas vale
  // reportar) ---
  report(
    "Homologation sem nenhum HomologationTire vinculado",
    await prisma.$queryRaw`
      SELECT h.id, h.code FROM homologations h
      LEFT JOIN homologation_tires ht ON ht."homologationId" = h.id
      WHERE ht.id IS NULL`
  );

  // --- Duplicidades (por chave de negócio, ignorando soft-deleted) ---
  report(
    "Manufacturer com nome duplicado",
    await prisma.$queryRaw`
      SELECT name, count(*) FROM manufacturers WHERE "deletedAt" IS NULL
      GROUP BY name HAVING count(*) > 1`
  );
  report(
    "VehicleModel com nome duplicado (mesmo fabricante, ativos)",
    await prisma.$queryRaw`
      SELECT "manufacturerId", name, count(*) FROM vehicle_models WHERE "deletedAt" IS NULL
      GROUP BY "manufacturerId", name HAVING count(*) > 1`
  );
  report(
    "Tire com chave de negócio duplicada",
    await prisma.$queryRaw`
      SELECT "tireManufacturerId", model, size, count(*) FROM tires WHERE "deletedAt" IS NULL
      GROUP BY "tireManufacturerId", model, size HAVING count(*) > 1`
  );
  report(
    "DocumentUpload com fileHash duplicado (ativos)",
    await prisma.$queryRaw`
      SELECT "fileHash", count(*) FROM document_uploads WHERE "deletedAt" IS NULL
      GROUP BY "fileHash" HAVING count(*) > 1`
  );

  // --- PDFs sem storagePath (nem no Storage, nem mais no Postgres = perdido) ---
  const semStorage = await prisma.documentUpload.findMany({
    where: { storagePath: null },
    select: { id: true, fileName: true, fileContent: true },
  });
  const perdidos = semStorage.filter((d) => !d.fileContent);
  const aindaSoBanco = semStorage.filter((d) => d.fileContent);
  report(
    "DocumentUpload sem storagePath E sem fileContent (arquivo perdido)",
    perdidos.map((d) => ({ id: d.id, fileName: d.fileName }))
  );
  report(
    "DocumentUpload ainda só no Postgres (fileContent, sem storagePath)",
    aindaSoBanco.map((d) => ({ id: d.id, fileName: d.fileName }))
  );

  // --- storagePath apontando para objeto inexistente no Storage ---
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const comStorage = await prisma.documentUpload.findMany({
      where: { storagePath: { not: null } },
      select: { id: true, fileName: true, storagePath: true, storageBucket: true },
    });
    const inexistentes: { id: number; fileName: string; storagePath: string | null }[] = [];
    for (const doc of comStorage) {
      const folder = doc.storagePath!.split("/").slice(0, -1).join("/");
      const fileNameInBucket = doc.storagePath!.split("/").pop();
      const { data, error } = await supabase.storage
        .from(doc.storageBucket ?? "documents")
        .list(folder, { search: fileNameInBucket });
      if (error || !data || data.length === 0) {
        inexistentes.push({ id: doc.id, fileName: doc.fileName, storagePath: doc.storagePath });
      }
    }
    report("DocumentUpload com storagePath gravado mas objeto inexistente no Storage", inexistentes);
  } else {
    console.log("(SUPABASE_URL/SERVICE_ROLE_KEY ausentes — pulando checagem de existência no Storage)\n");
  }

  // --- Resultado ---
  let hasProblems = false;
  for (const f of findings) {
    const status = f.count === 0 ? "OK" : "PROBLEMA";
    if (f.count > 0) hasProblems = true;
    console.log(`[${status}] ${f.check}: ${f.count}`);
    if (f.count > 0) console.log("  amostra:", JSON.stringify(f.sample));
  }

  console.log(hasProblems ? "\nAuditoria encontrou problemas — ver acima." : "\nAuditoria limpa — nenhum problema encontrado.");
  process.exitCode = hasProblems ? 1 : 0;
}

main()
  .catch((e) => {
    console.error("Falha geral na auditoria:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
