import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

/**
 * Migração única: move todo PDF/XLSX/CSV ainda guardado em
 * DocumentUpload.fileContent (Bytes no Postgres) para o bucket privado
 * "documents" do Supabase Storage, em "{fabricante}/{sha256}.{ext}"
 * (determinístico, nunca aleatório). Só zera fileContent depois de subir
 * E conferir o hash de volta — nunca apaga antes de validar. Gera um log
 * (JSON) de cada linha processada.
 *
 * Uso: npx tsx scripts/migrate-documents-to-storage.ts
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const BUCKET = "documents";

const EXTENSION_BY_TYPE: Record<string, string> = { PDF: "pdf", XLSX: "xlsx", CSV: "csv" };
const MIME_BY_TYPE: Record<string, string> = {
  PDF: "application/pdf",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  CSV: "text/csv",
};

function folderNameForManufacturer(name: string | null): string {
  if (!name) return "sem-fabricante";
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "sem-fabricante";
}

type LogEntry = {
  id: number;
  fileName: string;
  manufacturerName: string | null;
  storagePath: string;
  fileSize: number;
  originalHash: string;
  verifiedHash: string;
  hashMatchesRecordedFileHash: boolean;
  status: "MIGRADO" | "ERRO";
  error?: string;
};

async function main() {
  // Primeiro só os metadados (nunca os bytes de todos de uma vez — uma
  // única query trazendo centenas de MB de BYTEA estourou o
  // statement_timeout do pooler na primeira tentativa).
  const pending = await prisma.documentUpload.findMany({
    where: { fileContent: { not: null } },
    select: { id: true, fileName: true, fileType: true, fileHash: true, fileSize: true, manufacturerName: true },
    orderBy: { id: "asc" },
  });

  console.log(`Documentos com fileContent ainda no Postgres: ${pending.length}`);

  const log: LogEntry[] = [];
  let migrados = 0;
  let erros = 0;

  for (const row of pending) {
    const full = await prisma.documentUpload.findUnique({
      where: { id: row.id },
      select: { fileContent: true },
    });
    if (!full?.fileContent) {
      console.log(`[${row.id}] pulado: fileContent já nulo (migrado por outra execução).`);
      continue;
    }
    const bytes = new Uint8Array(full.fileContent as Buffer);
    const originalHash = createHash("sha256").update(bytes).digest("hex");
    const ext = EXTENSION_BY_TYPE[row.fileType] ?? "bin";
    const mimeType = MIME_BY_TYPE[row.fileType] ?? "application/octet-stream";
    const folder = folderNameForManufacturer(row.manufacturerName);
    const storagePath = `${folder}/${originalHash}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, bytes, { contentType: mimeType, upsert: true });
      if (uploadError) throw new Error(`upload: ${uploadError.message}`);

      const { data: downloaded, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(storagePath);
      if (downloadError || !downloaded) throw new Error(`download de verificação: ${downloadError?.message}`);

      const verifiedHash = createHash("sha256")
        .update(new Uint8Array(await downloaded.arrayBuffer()))
        .digest("hex");

      if (verifiedHash !== originalHash) {
        throw new Error(`hash divergente apos upload: original=${originalHash} storage=${verifiedHash}`);
      }

      // Só agora, com o arquivo confirmado no Storage, zeramos o BYTEA.
      await prisma.documentUpload.update({
        where: { id: row.id },
        data: {
          storageBucket: BUCKET,
          storagePath,
          mimeType,
          fileContent: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          entity: "DocumentUpload",
          entityId: row.id,
          action: "UPDATE",
          changes: JSON.stringify({
            migracao: "fileContent -> Supabase Storage",
            storageBucket: BUCKET,
            storagePath,
            fileSizeBytes: row.fileSize,
            sha256: originalHash,
          }),
        },
      });

      migrados++;
      log.push({
        id: row.id,
        fileName: row.fileName,
        manufacturerName: row.manufacturerName,
        storagePath,
        fileSize: row.fileSize,
        originalHash,
        verifiedHash,
        hashMatchesRecordedFileHash: originalHash === row.fileHash,
        status: "MIGRADO",
      });
      console.log(`[${row.id}] OK -> ${storagePath} (${row.fileSize} bytes)`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      erros++;
      log.push({
        id: row.id,
        fileName: row.fileName,
        manufacturerName: row.manufacturerName,
        storagePath,
        fileSize: row.fileSize,
        originalHash,
        verifiedHash: "",
        hashMatchesRecordedFileHash: false,
        status: "ERRO",
        error: message,
      });
      console.log(`[${row.id}] ERRO: ${message}`);
    }
  }

  const logPath = `C:/Users/Wilson/AppData/Local/Temp/claude/c--Projetos-homologapneu/dbd8da0b-35be-436a-959e-d86a58f38b07/scratchpad/migration-log-documents-to-storage-${Date.now()}.json`;
  writeFileSync(logPath, JSON.stringify({ total: pending.length, migrados, erros, log }, null, 2));
  console.log(`\nResumo: ${migrados} migrados, ${erros} erros. Log: ${logPath}`);
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
