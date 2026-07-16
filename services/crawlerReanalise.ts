import "server-only";
import { prisma } from "@/lib/prisma";
import { parseImportFile } from "@/lib/importer/parseFile";
import { extrairCandidatos } from "@/lib/curadoria/extrairCandidatos";
import { enfileirarJob } from "@/services/crawlerJobQueue";
import { NotFoundError } from "@/lib/errors";

/**
 * Reanálise sob demanda — arquivos novos e standalone (não tocam em
 * services/curadoria.ts nem services/intelligentCrawler.ts) para poder
 * ser criados com segurança enquanto uma execução do crawler está em
 * andamento. Reutilizam extrairCandidatos() e parseImportFile(), os
 * mesmos usados pelo upload manual — nenhuma lógica de extração
 * duplicada.
 */

/** Chave de dedupe de um candidato — mesma medida + mesmo trecho de
 * origem (primeiros 80 caracteres) já extraído para este documento não
 * gera uma segunda linha idêntica. */
function chaveDedupe(c: { tireSize: string | null; rawSnippet: string | null }): string {
  return `${c.tireSize ?? ""}|${(c.rawSnippet ?? "").slice(0, 80)}`;
}

/** Reexecuta extrairCandidatos() sobre o texto já armazenado de um
 * DocumentUpload (não baixa nada de novo) — útil depois de melhorar o
 * extrator, sem precisar reenviar o arquivo. Só cria candidatos que
 * ainda não existem (mesma chave de dedupe) para não duplicar. */
export async function reanalisarDocumento(documentUploadId: number) {
  const documento = await prisma.documentUpload.findUnique({
    where: { id: documentUploadId },
  });
  if (!documento) throw new NotFoundError("Documento não encontrado");

  const parsed = await parseImportFile(
    new Uint8Array(documento.fileContent).buffer as ArrayBuffer,
    documento.fileName
  );
  const extraidos = await extrairCandidatos(parsed);

  const existentes = await prisma.homologationCandidate.findMany({
    where: { documentUploadId },
    select: { tireSize: true, rawSnippet: true },
  });
  const chavesExistentes = new Set(existentes.map(chaveDedupe));

  const novos = extraidos.filter((c) => !chavesExistentes.has(chaveDedupe(c)));

  const criados = await prisma.$transaction(
    novos.map((c) => prisma.homologationCandidate.create({ data: { documentUploadId, ...c } }))
  );

  return { candidatosExtraidos: extraidos.length, candidatosNovos: criados.length, candidatos: criados };
}

export async function listarDocumentos(filtro?: { manufacturerName?: string; status?: string }) {
  return prisma.documentUpload.findMany({
    where: {
      manufacturerName: filtro?.manufacturerName,
      status: filtro?.status ? (filtro.status as never) : undefined,
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      fileHash: true,
      manufacturerName: true,
      sourceUrl: true,
      declaredSourceType: true,
      declaredSourceName: true,
      status: true,
      ocrPending: true,
      errorMessage: true,
      uploadedAt: true,
      _count: { select: { candidates: true } },
    },
    orderBy: { uploadedAt: "desc" },
    take: 200,
  });
}

/**
 * "Reanalisar fabricante": reabre para nova tentativa qualquer fonte
 * BLOQUEADA/ERRO desse fabricante (volta para PENDENTE, elegível na
 * próxima execução do crawler) e registra um job de prioridade alta na
 * fila DOWNLOAD para rastreabilidade. O processamento real desse job
 * (baixar de fato) é ligado em services/intelligentCrawler.ts assim que
 * a execução atualmente em andamento terminar — reaproveita
 * processarDocumento/extrairLinksPdf já existentes lá, não duplica.
 */
export async function reanalisarFabricante(manufacturerName: string) {
  const fontes = await prisma.crawlerSource.findMany({ where: { manufacturerName } });
  if (fontes.length === 0) throw new NotFoundError(`Nenhuma fonte cadastrada para "${manufacturerName}"`);

  const reabertas = await prisma.crawlerSource.updateMany({
    where: { manufacturerName, status: { in: ["BLOQUEADA", "ERRO"] } },
    data: { status: "PENDENTE" },
  });

  const job = await enfileirarJob({
    queue: "DOWNLOAD",
    payload: { manufacturerName, sourceIds: fontes.map((f) => f.id) },
    priority: 10,
  });

  return { fontesReabertas: reabertas.count, totalFontes: fontes.length, jobId: job.id };
}
