import "server-only";
import type { EvidenceSourceType } from "@prisma/client";
import type { EvidenciaInput } from "@/services/homologationEvidence";
import type { HomologationIngestionRecord, IngestionSourceKind } from "./types";

/** Cada IngestionSourceKind mapeia para o EvidenceSourceType mais
 * próximo já existente (nenhum enum novo foi criado) — CATALOGO_REVENDA
 * vira DISTRIBUIDOR_OFICIAL (revenda == distribuidor), CATALOGO_TECNICO
 * vira CATALOGO_OE (ficha técnica != manual do proprietário, mas é do
 * mesmo nível de formalidade de um catálogo OE), e REVISAO_HUMANA vira
 * MANUAL (procedência humana declarada, sem documento raspado — mesmo
 * nível de confiança de um manual lido manualmente). */
const KIND_TO_EVIDENCE_SOURCE_TYPE: Record<IngestionSourceKind, EvidenceSourceType> = {
  MANUAL_OFICIAL: "MANUAL",
  FABRICANTE_PNEU: "FABRICANTE_PNEU",
  CATALOGO_REVENDA: "DISTRIBUIDOR_OFICIAL",
  CATALOGO_TECNICO: "CATALOGO_OE",
  REVISAO_HUMANA: "MANUAL",
};

/**
 * Converte um HomologationIngestionRecord (formato comum de qualquer
 * adapter) para o formato que o Motor de Validação já existente
 * (services/homologationEvidence.ts, registrarEvidencia) espera — a
 * ponte de FORMATO entre a Plataforma de Ingestão (esta fase) e o
 * pipeline de Curadoria já em produção.
 *
 * Só transforma o formato — nunca chama registrarEvidencia nem grava
 * nada; quem orquestra a chamada real é uma fase futura ("implementar
 * apenas a infraestrutura"). Retorna null quando o registro não tem os
 * três campos essenciais de uma aplicação pneu↔veículo (marca do pneu,
 * modelo do pneu, medida) — nunca inferido, mesma regra de
 * calcularConfianca (lib/curadoria/extracaoPura.ts).
 */
export function toEvidenciaInput(
  record: HomologationIngestionRecord,
  kind: IngestionSourceKind
): EvidenciaInput | null {
  if (!record.marcaPneu || !record.modeloPneu || !record.medida) {
    return null;
  }

  return {
    tireManufacturerName: record.marcaPneu,
    tireModel: record.modeloPneu,
    tireSize: record.medida,
    vehicleManufacturerName: record.fabricante,
    vehicleModel: record.modelo,
    vehicleVersion: record.versao,
    yearStart: record.anoInicial,
    yearEnd: record.anoFinal,
    sourceUrl: record.documentoOrigem,
    sourceName: record.documentoOrigem,
    sourceType: KIND_TO_EVIDENCE_SOURCE_TYPE[kind],
    collectedAt: record.dataCaptura,
  };
}
