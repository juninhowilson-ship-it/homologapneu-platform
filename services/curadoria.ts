import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseImportFile, inferFileType } from "@/lib/importer/parseFile";
import { extrairCandidatos } from "@/lib/curadoria/extrairCandidatos";
import { registrarEvidencia } from "@/services/homologationEvidence";
import { registrarFonteCuradoria } from "@/services/sourceManager";
import { publishApprovedHomologation, type PublishResumo } from "@/services/publishApprovedHomologation";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { checkMagicBytes } from "@/lib/importer/magicBytes";
import {
  DOCUMENTS_BUCKET,
  buildDocumentStoragePath,
  mimeTypeForFileType,
  uploadAndVerifyDocument,
} from "@/lib/storage/documentStorage";
import { Prisma, type EvidenceSourceType, type CandidateStatus, type DocumentFileType } from "@prisma/client";

/**
 * Sistema de Curadoria Inteligente: upload de documento -> extração
 * determinística de candidatos -> revisão humana obrigatória -> só então
 * vira uma HomologationEvidence real via o Motor de Validação já
 * existente (services/homologationEvidence.ts). Nada é publicado sozinho
 * — toda HomologationCandidate nasce com status PENDENTE_REVISAO.
 */

/** Remove os bytes do arquivo original antes de devolver pela API — o
 * cliente nunca precisa deles, só os metadados. Hoje fileContent já nasce
 * nulo (arquivo vive no Supabase Storage, ver lib/storage/documentStorage.ts);
 * mantido por segurança para qualquer linha legada ainda não migrada. */
function omitirConteudoArquivo<T extends { fileContent: Uint8Array | null }>(
  documento: T
): Omit<T, "fileContent"> {
  const clone: Record<string, unknown> = { ...documento };
  delete clone.fileContent;
  return clone as Omit<T, "fileContent">;
}

function mapFileType(inferred: ReturnType<typeof inferFileType>): DocumentFileType {
  if (inferred === "PDF") return "PDF";
  if (inferred === "XLSX") return "XLSX";
  return "CSV";
}

export type UploadDocumentoInput = {
  buffer: ArrayBuffer;
  fileName: string;
  declaredSourceType: EvidenceSourceType;
  declaredSourceName: string;
  userId: number | null;
  /** URL de origem, quando o documento veio de um download automático
   * (Intelligent Crawler) em vez de um upload manual pelo painel. */
  sourceUrl?: string | null;
  manufacturerName?: string | null;
  /** Data de publicação/revisão do próprio documento, só quando a fonte
   * realmente a declara — nunca inferida. */
  publishedAt?: Date | null;
  /** Confiabilidade (0-100) herdada do tipo de fonte no momento da
   * captura — ver SOURCE_TYPE_POINTS em lib/constants/evidence.ts. */
  reliability?: number;
};

/** Mensagem literal lançada por parsePdfFile (lib/importer/parsers/pdf.ts)
 * quando o PDF é um documento escaneado sem texto extraível — usada para
 * distinguir "aguardando OCR" (não é uma falha real) de um erro genuíno. */
const SCANNED_PDF_MARKER = "documento escaneado";

export async function uploadDocumento(input: UploadDocumentoInput) {
  const fileHash = createHash("sha256").update(Buffer.from(input.buffer)).digest("hex");

  const existente = await prisma.documentUpload.findFirst({ where: { fileHash } });
  if (existente) {
    const candidatosExistentes = await prisma.homologationCandidate.findMany({
      where: { documentUploadId: existente.id },
    });
    const semConteudo = omitirConteudoArquivo(existente);
    return { documentUpload: semConteudo, candidatos: candidatosExistentes, duplicado: true };
  }

  const fileType = mapFileType(inferFileType(input.fileName));
  const mimeType = mimeTypeForFileType(fileType);
  const storagePath = buildDocumentStoragePath(input.manufacturerName ?? null, fileHash, fileType);
  const bytes = new Uint8Array(input.buffer);

  // Confere o CONTEÚDO real (magic bytes) contra o tipo inferido do nome —
  // nunca confia só na extensão declarada.
  const divergencia = checkMagicBytes(bytes, fileType);
  if (divergencia) {
    throw new ValidationError(divergencia);
  }

  // Sobe (e confere) no Storage ANTES de criar a linha no banco — nunca
  // gravamos uma referência a um objeto que não existe de verdade.
  await uploadAndVerifyDocument(storagePath, bytes, mimeType, fileHash);

  let documentUpload;
  try {
    documentUpload = await prisma.documentUpload.create({
      data: {
        fileName: input.fileName,
        fileType,
        fileHash,
        fileSize: input.buffer.byteLength,
        mimeType,
        storageBucket: DOCUMENTS_BUCKET,
        storagePath,
        declaredSourceType: input.declaredSourceType,
        declaredSourceName: input.declaredSourceName,
        sourceUrl: input.sourceUrl ?? null,
        manufacturerName: input.manufacturerName ?? null,
        publishedAt: input.publishedAt ?? null,
        reliability: input.reliability ?? 0,
        uploadedById: input.userId,
        status: "PENDENTE",
      },
    });
  } catch (error) {
    // Fecha a corrida entre execuções concorrentes do crawler: o índice
    // único parcial (fileHash WHERE deletedAt IS NULL) rejeita a segunda
    // inserção do mesmo hash — tratamos exatamente como o caminho
    // "existente" acima, nunca como erro real. (Índice criado via SQL bruto,
    // não declarado como @@unique no schema — Prisma não preenche
    // error.meta.target para constraints que não conhece, por isso o
    // código P2002 sozinho já é o sinal usado aqui; nenhum outro índice
    // único existe nesta tabela.)
    const isRaceDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isRaceDuplicate) throw error;

    const jaExistente = await prisma.documentUpload.findFirstOrThrow({ where: { fileHash, deletedAt: null } });
    const candidatosExistentes = await prisma.homologationCandidate.findMany({
      where: { documentUploadId: jaExistente.id },
    });
    const semConteudo = omitirConteudoArquivo(jaExistente);
    return { documentUpload: semConteudo, candidatos: candidatosExistentes, duplicado: true };
  }

  try {
    const parsed = await parseImportFile(input.buffer, input.fileName);
    const extractedText = JSON.stringify(parsed.rows).slice(0, 500_000);

    const candidatosExtraidos = await extrairCandidatos(parsed);

    const candidatos = await prisma.$transaction(
      candidatosExtraidos.map((c) =>
        prisma.homologationCandidate.create({
          data: { documentUploadId: documentUpload.id, ...c },
        })
      )
    );

    await prisma.documentUpload.update({
      where: { id: documentUpload.id },
      data: { status: "PROCESSADO", extractedText },
    });

    const semConteudo = omitirConteudoArquivo(documentUpload);
    return { documentUpload: semConteudo, candidatos, duplicado: false };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
    const ocrPending = mensagem.includes(SCANNED_PDF_MARKER);
    await prisma.documentUpload.update({
      where: { id: documentUpload.id },
      // PDF escaneado sem OCR disponível não é uma falha de processamento
      // real: o documento e o hash já ficam registrados e vinculados,
      // só sem candidatos, até que OCR rode neste ambiente.
      data: { status: ocrPending ? "PENDENTE" : "ERRO", errorMessage: mensagem, ocrPending },
    });
    const semConteudo = omitirConteudoArquivo(documentUpload);
    return { documentUpload: semConteudo, candidatos: [], duplicado: false, erro: mensagem, ocrPending };
  }
}

export async function listarCandidatos(status?: CandidateStatus) {
  return prisma.homologationCandidate.findMany({
    where: status ? { status } : undefined,
    include: {
      documentUpload: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          declaredSourceType: true,
          declaredSourceName: true,
          sourceUrl: true,
          manufacturerName: true,
          publishedAt: true,
          reliability: true,
          ocrPending: true,
          uploadedAt: true,
          uploadedBy: { select: { name: true } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type FiltrosCandidatos = {
  status?: CandidateStatus;
  manufacturerName?: string;
  vehicleModel?: string;
  vehicleVersion?: string;
  tireQuery?: string;
  documentUploadId?: number;
  confidenceMin?: number;
  confidenceMax?: number;
  q?: string;
  page?: number;
  pageSize?: number;
};

const candidatosInclude = {
  documentUpload: {
    select: {
      id: true,
      fileName: true,
      fileType: true,
      declaredSourceType: true,
      declaredSourceName: true,
      sourceUrl: true,
      manufacturerName: true,
      publishedAt: true,
      reliability: true,
      ocrPending: true,
      uploadedAt: true,
      uploadedBy: { select: { name: true } },
    },
  },
  reviewedBy: { select: { name: true } },
} satisfies Prisma.HomologationCandidateInclude;

/** Listagem pronta para dezenas de milhares de candidatos: paginada,
 * filtrável por montadora/modelo/versão/pneu/documento/confiança, com
 * busca livre — nunca carrega a tabela inteira de uma vez (diferente do
 * listarCandidatos original, mantido acima só por compatibilidade). */
export async function buscarCandidatos(filtros: FiltrosCandidatos) {
  const page = Math.max(1, filtros.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filtros.pageSize ?? 50));

  const where: Prisma.HomologationCandidateWhereInput = {
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(filtros.documentUploadId ? { documentUploadId: filtros.documentUploadId } : {}),
    ...(filtros.confidenceMin != null || filtros.confidenceMax != null
      ? { extractionConfidence: { gte: filtros.confidenceMin ?? 0, lte: filtros.confidenceMax ?? 100 } }
      : {}),
    ...(filtros.manufacturerName
      ? { documentUpload: { manufacturerName: { equals: filtros.manufacturerName, mode: "insensitive" } } }
      : {}),
    ...(filtros.vehicleModel ? { vehicleModel: { contains: filtros.vehicleModel, mode: "insensitive" } } : {}),
    ...(filtros.vehicleVersion ? { vehicleVersion: { contains: filtros.vehicleVersion, mode: "insensitive" } } : {}),
    ...(filtros.tireQuery
      ? {
          OR: [
            { tireModel: { contains: filtros.tireQuery, mode: "insensitive" } },
            { tireManufacturerName: { contains: filtros.tireQuery, mode: "insensitive" } },
            { tireSize: { contains: filtros.tireQuery, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filtros.q
      ? {
          OR: [
            { tireManufacturerName: { contains: filtros.q, mode: "insensitive" } },
            { tireModel: { contains: filtros.q, mode: "insensitive" } },
            { tireSize: { contains: filtros.q, mode: "insensitive" } },
            { vehicleManufacturerName: { contains: filtros.q, mode: "insensitive" } },
            { vehicleModel: { contains: filtros.q, mode: "insensitive" } },
            { vehicleVersion: { contains: filtros.q, mode: "insensitive" } },
            { documentUpload: { fileName: { contains: filtros.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.homologationCandidate.findMany({
      where,
      include: candidatosInclude,
      orderBy: [{ extractionConfidence: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.homologationCandidate.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

async function obterCandidatoOuFalhar(id: number) {
  const candidato = await prisma.homologationCandidate.findUnique({
    where: { id },
    include: {
      documentUpload: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileHash: true,
          declaredSourceType: true,
          declaredSourceName: true,
          sourceUrl: true,
          manufacturerName: true,
          publishedAt: true,
          reliability: true,
          ocrPending: true,
          uploadedAt: true,
          uploadedById: true,
        },
      },
    },
  });
  if (!candidato) throw new NotFoundError("Candidato não encontrado");
  return candidato;
}

export async function obterComparacao(id: number) {
  const candidato = await obterCandidatoOuFalhar(id);

  const aplicacoesRelacionadas = await prisma.tireVehicleApplication.findMany({
    where: {
      ...(candidato.vehicleManufacturerName
        ? { vehicleManufacturerName: { equals: candidato.vehicleManufacturerName, mode: "insensitive" } }
        : {}),
      ...(candidato.vehicleModel
        ? { vehicleModel: { equals: candidato.vehicleModel, mode: "insensitive" } }
        : {}),
    },
    include: { evidences: true },
    take: 20,
  });

  return { candidato, aplicacoesRelacionadas };
}

export async function atualizarCandidato(
  id: number,
  patch: Partial<{
    tireManufacturerName: string | null;
    tireModel: string | null;
    tireSize: string | null;
    loadIndex: string | null;
    speedIndex: string | null;
    runFlat: boolean | null;
    xl: boolean | null;
    vehicleManufacturerName: string | null;
    vehicleModel: string | null;
    vehicleVersion: string | null;
    yearStart: number | null;
    yearEnd: number | null;
  }>
) {
  await obterCandidatoOuFalhar(id);
  return prisma.homologationCandidate.update({ where: { id }, data: patch });
}

export async function aprovarCandidato(id: number, userId: number | null, notes: string | null) {
  const candidato = await obterCandidatoOuFalhar(id);

  if (candidato.status === "APROVADA") {
    throw new ValidationError("Candidato já foi aprovado");
  }
  if (
    !candidato.tireSize ||
    !(candidato.tireManufacturerName || candidato.tireModel) ||
    !candidato.vehicleManufacturerName ||
    !candidato.vehicleModel
  ) {
    throw new ValidationError(
      "Preencha ao menos medida do pneu, fabricante ou modelo do pneu, e marca/modelo do veículo antes de aprovar."
    );
  }

  const resultado = await registrarEvidencia({
    tireManufacturerName: candidato.tireManufacturerName || "(não informado)",
    tireModel: candidato.tireModel || "(não informado)",
    tireSize: candidato.tireSize,
    vehicleManufacturerName: candidato.vehicleManufacturerName,
    vehicleModel: candidato.vehicleModel,
    vehicleVersion: candidato.vehicleVersion,
    yearStart: candidato.yearStart,
    yearEnd: candidato.yearEnd,
    sourceUrl: `upload:${candidato.documentUpload.id}:${candidato.documentUpload.fileName}`,
    sourceName: candidato.documentUpload.declaredSourceName,
    sourceType: candidato.documentUpload.declaredSourceType,
    collectedAt: candidato.documentUpload.uploadedAt,
  });

  const atualizado = await prisma.homologationCandidate.update({
    where: { id },
    data: {
      status: "APROVADA",
      reviewedById: userId,
      reviewedAt: new Date(),
      reviewNotes: notes,
      evidenceId: resultado.evidenceId,
    },
  });

  await registrarFonteCuradoria(resultado.status === "HOMOLOGACAO_VALIDADA");

  // Toda evidência aprovada tenta atualizar automaticamente a Base
  // Mestre estruturada (Homologation/VehicleVersion/Tire/Wheel/
  // VehiclePressureSpec/HomologationDocument) — nunca falha a aprovação
  // em si; quando os dados reais não bastam para publicar sem inventar,
  // volta "skipped" com o motivo (ver services/publishApprovedHomologation.ts).
  const publicacao: PublishResumo = await publishApprovedHomologation(
    { ...atualizado, documentUpload: candidato.documentUpload },
    userId
  );

  return { candidato: atualizado, resultado, publicacao };
}

export async function rejeitarCandidato(id: number, userId: number | null, notes: string | null) {
  await obterCandidatoOuFalhar(id);
  return prisma.homologationCandidate.update({
    where: { id },
    data: { status: "REJEITADA", reviewedById: userId, reviewedAt: new Date(), reviewNotes: notes },
  });
}

export async function solicitarRevisao(id: number, userId: number | null, notes: string | null) {
  await obterCandidatoOuFalhar(id);
  return prisma.homologationCandidate.update({
    where: { id },
    data: {
      status: "SOLICITAR_REVISAO",
      reviewedById: userId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  });
}

export type ResultadoLote = {
  id: number;
  sucesso: boolean;
  erro?: string;
};

/** Aprova/rejeita vários candidatos de uma vez — reaproveita
 * aprovarCandidato/rejeitarCandidato (mesmas validações, mesmo Motor de
 * Validação, mesmo "nunca publica automaticamente sem dado suficiente"),
 * um por um. Nunca para o lote por causa de um item com erro — mesma regra
 * já usada no crawler ("nunca parar por uma única fonte"). */
async function executarEmLote(
  ids: number[],
  acao: (id: number) => Promise<unknown>
): Promise<ResultadoLote[]> {
  const resultados: ResultadoLote[] = [];
  for (const id of ids) {
    try {
      await acao(id);
      resultados.push({ id, sucesso: true });
    } catch (error) {
      resultados.push({ id, sucesso: false, erro: error instanceof Error ? error.message : "Erro desconhecido" });
    }
  }
  return resultados;
}

export async function aprovarCandidatosEmLote(ids: number[], userId: number | null, notes: string | null) {
  return executarEmLote(ids, (id) => aprovarCandidato(id, userId, notes));
}

export async function rejeitarCandidatosEmLote(ids: number[], userId: number | null, notes: string | null) {
  return executarEmLote(ids, (id) => rejeitarCandidato(id, userId, notes));
}

/** Desfaz uma aprovação: o candidato volta para PENDENTE_REVISAO e pode
 * ser revisado de novo. NÃO reverte Homologation/Tire/HomologationTire/
 * VehiclePressureSpec já publicados por publishApprovedHomologation — esses
 * registros usam find-or-create sobre entidades reais (o mesmo Tire/
 * VehicleVersion pode já ser compartilhado por outras homologações
 * legítimas), então apagá-los automaticamente arriscaria destruir dado real
 * de outro candidato. Fica registrado em auditoria para decisão manual se
 * o dado publicado realmente precisar ser corrigido. */
export async function desfazerAprovacao(id: number, userId: number | null) {
  const candidato = await obterCandidatoOuFalhar(id);
  if (candidato.status !== "APROVADA") {
    throw new ValidationError("Só é possível desfazer um candidato que está Aprovado.");
  }

  const atualizado = await prisma.homologationCandidate.update({
    where: { id },
    data: {
      status: "PENDENTE_REVISAO",
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "HomologationCandidate",
      entityId: id,
      action: "UPDATE",
      userId,
      changes: JSON.stringify({
        acao: "desfazer-aprovacao",
        evidenceIdAnterior: candidato.evidenceId,
        aviso:
          "Candidato voltou para PENDENTE_REVISAO. Qualquer Homologation/Tire já publicado por essa aprovação NÃO foi revertido automaticamente (pode ser compartilhado com outros registros reais) — revisar manualmente se necessário.",
      }),
    },
  });

  return atualizado;
}

export type EstatisticasCuradoria = {
  totais: Record<string, number>;
  confiancaMedia: number;
  revisadosUltimas24h: number;
  revisadosUltimaHora: number;
  porMontadora: {
    manufacturerName: string;
    pendentes: number;
    aprovados: number;
    rejeitados: number;
    total: number;
  }[];
};

/** Estatísticas em tempo real (sempre lidas direto do banco, nunca
 * cacheadas — o objetivo aqui é o operador ver o efeito imediato de cada
 * aprovação/rejeição, diferente das agregações de dashboard que toleram
 * até 60s de atraso). */
export async function obterEstatisticasCuradoria(): Promise<EstatisticasCuradoria> {
  const agora = new Date();
  const ha24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const ha1h = new Date(agora.getTime() - 60 * 60 * 1000);

  const [porStatus, confianca, revisados24h, revisados1h, candidatos] = await Promise.all([
    prisma.homologationCandidate.groupBy({ by: ["status"], _count: true }),
    prisma.homologationCandidate.aggregate({ _avg: { extractionConfidence: true } }),
    prisma.homologationCandidate.count({ where: { reviewedAt: { gte: ha24h } } }),
    prisma.homologationCandidate.count({ where: { reviewedAt: { gte: ha1h } } }),
    prisma.homologationCandidate.findMany({
      select: { status: true, documentUpload: { select: { manufacturerName: true } } },
    }),
  ]);

  const totais: Record<string, number> = {};
  for (const grupo of porStatus) {
    totais[grupo.status] = grupo._count;
  }

  const porMontadoraMap = new Map<string, { pendentes: number; aprovados: number; rejeitados: number; total: number }>();
  for (const c of candidatos) {
    const nome = c.documentUpload.manufacturerName ?? "Sem fabricante declarado";
    const atual = porMontadoraMap.get(nome) ?? { pendentes: 0, aprovados: 0, rejeitados: 0, total: 0 };
    atual.total++;
    if (c.status === "PENDENTE_REVISAO" || c.status === "SOLICITAR_REVISAO") atual.pendentes++;
    if (c.status === "APROVADA") atual.aprovados++;
    if (c.status === "REJEITADA") atual.rejeitados++;
    porMontadoraMap.set(nome, atual);
  }

  const porMontadora = [...porMontadoraMap.entries()]
    .map(([manufacturerName, v]) => ({ manufacturerName, ...v }))
    .sort((a, b) => b.pendentes - a.pendentes);

  return {
    totais,
    confiancaMedia: Math.round(confianca._avg.extractionConfidence ?? 0),
    revisadosUltimas24h: revisados24h,
    revisadosUltimaHora: revisados1h,
    porMontadora,
  };
}

/** Signed URL (curta duração) do PDF/arquivo original no Storage, para a
 * comparação lado a lado — nunca uma URL persistida (o bucket é privado
 * de propósito, ver lib/storage/documentStorage.ts). */
export async function obterUrlDocumento(candidatoId: number): Promise<string | null> {
  const candidato = await obterCandidatoOuFalhar(candidatoId);
  const documento = await prisma.documentUpload.findUnique({
    where: { id: candidato.documentUpload.id },
    select: { storagePath: true },
  });
  if (!documento?.storagePath) return null;
  const { createSignedDocumentUrl } = await import("@/lib/storage/documentStorage");
  return createSignedDocumentUrl(documento.storagePath, 600);
}
