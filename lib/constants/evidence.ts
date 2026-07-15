import type { ApplicationStatus, EvidenceSourceType } from "@prisma/client";

/** Pontos por tipo de fonte confirmando uma aplicação (soma por fonte
 * distinta) — ver services/homologationEvidence.ts para a lógica completa. */
export const SOURCE_TYPE_POINTS: Record<EvidenceSourceType, number> = {
  MARKETPLACE: 20,
  DISTRIBUIDOR_OFICIAL: 30,
  FABRICANTE_PNEU: 40,
  MONTADORA: 40,
  MANUAL: 50,
  CATALOGO_OE: 60,
};

export const SOURCE_TYPE_LABEL: Record<EvidenceSourceType, string> = {
  MARKETPLACE: "Marketplace",
  DISTRIBUIDOR_OFICIAL: "Distribuidor Oficial",
  FABRICANTE_PNEU: "Fabricante do Pneu",
  MONTADORA: "Montadora",
  MANUAL: "Manual do Proprietário",
  CATALOGO_OE: "Catálogo OEM",
};

/** Só HOMOLOGACAO_VALIDADA deve ser apresentada como homologação oficial —
 * todo o resto é "aplicação compatível" ainda em consolidação. */
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  EVIDENCIA_ISOLADA: "Evidência Isolada",
  APLICACAO_COMERCIAL: "Aplicação Comercial",
  ALTA_CONFIANCA: "Alta Confiança",
  HOMOLOGACAO_VALIDADA: "Homologação Validada",
  DIVERGENCIA: "Divergência",
};

export const STATUS_TONE: Record<ApplicationStatus, "neutral" | "success" | "warning" | "danger"> = {
  EVIDENCIA_ISOLADA: "neutral",
  APLICACAO_COMERCIAL: "neutral",
  ALTA_CONFIANCA: "warning",
  HOMOLOGACAO_VALIDADA: "success",
  DIVERGENCIA: "danger",
};

export function isHomologacaoOficial(status: ApplicationStatus): boolean {
  return status === "HOMOLOGACAO_VALIDADA";
}
