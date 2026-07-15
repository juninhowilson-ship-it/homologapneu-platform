import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseImportFile, inferFileType } from "@/lib/importer/parseFile";
import { extrairCandidatos } from "@/lib/curadoria/extrairCandidatos";
import { registrarEvidencia } from "@/services/homologationEvidence";
import { registrarFonteCuradoria } from "@/services/sourceManager";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { EvidenceSourceType, CandidateStatus, DocumentFileType } from "@prisma/client";

/**
 * Sistema de Curadoria Inteligente: upload de documento -> extração
 * determinística de candidatos -> revisão humana obrigatória -> só então
 * vira uma HomologationEvidence real via o Motor de Validação já
 * existente (services/homologationEvidence.ts). Nada é publicado sozinho
 * — toda HomologationCandidate nasce com status PENDENTE_REVISAO.
 */

/** Remove os bytes do arquivo original antes de devolver pela API — o
 * cliente nunca precisa deles, só os metadados. */
function omitirConteudoArquivo<T extends { fileContent: Uint8Array }>(
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
};

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

  const documentUpload = await prisma.documentUpload.create({
    data: {
      fileName: input.fileName,
      fileType,
      fileHash,
      fileSize: input.buffer.byteLength,
      fileContent: Buffer.from(input.buffer),
      declaredSourceType: input.declaredSourceType,
      declaredSourceName: input.declaredSourceName,
      uploadedById: input.userId,
      status: "PENDENTE",
    },
  });

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
    await prisma.documentUpload.update({
      where: { id: documentUpload.id },
      data: { status: "ERRO", errorMessage: mensagem },
    });
    const semConteudo = omitirConteudoArquivo(documentUpload);
    return { documentUpload: semConteudo, candidatos: [], duplicado: false, erro: mensagem };
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
          uploadedAt: true,
          uploadedBy: { select: { name: true } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
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
          declaredSourceType: true,
          declaredSourceName: true,
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

  return { candidato: atualizado, resultado };
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
