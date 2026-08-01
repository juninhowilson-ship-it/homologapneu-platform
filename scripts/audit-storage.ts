import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

/** npm run audit:storage — integridade do Supabase Storage (bucket "documents"). */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

async function main() {
  console.log("=== Auditoria de Storage ===\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — nada a auditar.");
    process.exitCode = 1;
    return;
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket("documents");
  if (bucketError || !bucket) {
    console.log(`[PROBLEMA] Bucket "documents" não encontrado: ${bucketError?.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Bucket "documents": public=${bucket.public} (${bucket.public ? "PROBLEMA: deveria ser privado" : "OK, privado"})`);
  console.log(`Limite de tamanho do bucket: ${bucket.file_size_limit ?? "herdado do limite global do projeto (ver Dashboard > Settings > Storage)"}`);

  const docsComPath = await prisma.documentUpload.findMany({
    where: { storagePath: { not: null } },
    select: { id: true, storagePath: true, storageBucket: true, fileSize: true },
  });
  console.log(`\nDocumentUpload com storagePath: ${docsComPath.length}`);
  const somaTamanhoEsperado = docsComPath.reduce((acc, d) => acc + d.fileSize, 0);
  console.log(`Soma de fileSize (proxy do espaço usado, confirmado por hash no upload): ${(somaTamanhoEsperado / 1024 / 1024).toFixed(1)} MB`);

  // Objetos no Storage sem nenhum DocumentUpload apontando pra eles
  // (upload órfão: chegou a subir mas o registro não foi criado/foi perdido)
  const pastasConhecidas = [...new Set(docsComPath.map((d) => d.storagePath!.split("/")[0]))];
  let objetosOrfaos = 0;
  const orfaosDetalhe: string[] = [];
  const pathsConhecidos = new Set(docsComPath.map((d) => d.storagePath));
  for (const pasta of pastasConhecidas) {
    const { data: objetos, error } = await supabase.storage.from("documents").list(pasta, { limit: 1000 });
    if (error || !objetos) continue;
    for (const obj of objetos) {
      const fullPath = `${pasta}/${obj.name}`;
      if (!pathsConhecidos.has(fullPath)) {
        objetosOrfaos++;
        orfaosDetalhe.push(fullPath);
      }
    }
  }
  console.log(`\n[${objetosOrfaos > 0 ? "PROBLEMA" : "OK"}] Objetos no Storage sem DocumentUpload correspondente: ${objetosOrfaos}`);
  if (orfaosDetalhe.length) console.log("  amostra:", JSON.stringify(orfaosDetalhe.slice(0, 10)));

  const semStorage = await prisma.documentUpload.count({ where: { storagePath: null, fileContent: { not: null } } });
  console.log(`\n[${semStorage > 0 ? "ATENÇÃO" : "OK"}] Documentos ainda só no Postgres (não migrados): ${semStorage}`);

  const hasProblems = bucket.public || objetosOrfaos > 0;
  console.log(hasProblems ? "\nAuditoria de Storage encontrou problemas." : "\nAuditoria de Storage limpa.");
  process.exitCode = hasProblems ? 1 : 0;
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
