import "server-only";
import { createHash } from "node:crypto";
import { createAiJob, findAiJobByHash, type AiJobSummary } from "@/repositories/ai/aiJobs";
import { ValidationError } from "@/lib/errors";

export type ReceberDocumentoInput = {
  buffer: ArrayBuffer;
  fileName: string;
  userId: number | null;
};

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

/** Recebe um documento para a IA Engine processar: calcula hash, cria um
 * AiJob (PENDENTE) via repositories/ai — nunca processa inline, só
 * enfileira (workers/ai/processor.ts processa de forma assíncrona,
 * disparado por POST /api/ai/jobs/process). Se o mesmo arquivo (mesmo
 * hash) já foi enfileirado/processado antes, devolve o job existente em
 * vez de duplicar — services/ai/analyze.ts ainda gera um AiConflict
 * DOCUMENTO_ANTIGO se um novo upload do mesmo hash for feito depois. */
export async function receberDocumento(input: ReceberDocumentoInput): Promise<AiJobSummary> {
  if (input.buffer.byteLength === 0) {
    throw new ValidationError("Arquivo vazio.");
  }
  if (input.buffer.byteLength > MAX_FILE_SIZE) {
    throw new ValidationError("Arquivo maior que o limite de 30MB.");
  }

  const buffer = Buffer.from(input.buffer);
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const existente = await findAiJobByHash(fileHash);
  if (existente && existente.status !== "ERRO") {
    return existente;
  }

  return createAiJob({
    fileName: input.fileName,
    fileHash,
    fileSize: buffer.byteLength,
    fileContent: buffer,
    requestedByIdRaw: input.userId,
  });
}
