// Sem `server-only`: funções puras, precisam rodar também em scripts
// standalone de importação — mesmo motivo de columnMapping.ts.
import type { AxlePosition, ManufacturerProductStatus } from "@prisma/client";

/**
 * Normaliza o texto livre da coluna "Eixo" para o enum AxlePosition já
 * existente (DIANTEIRO/TRASEIRO/AMBOS/ESTEPE) — "TODOS OS EIXOS" (pedido
 * nesta fase) mapeia para AMBOS em vez de virar um valor de enum novo,
 * para não duplicar o que já existe. Retorna null quando o texto não
 * bate com nenhum valor reconhecido (nunca assume um padrão).
 */
export function normalizarEixo(valor: string | undefined): AxlePosition | null {
  if (!valor) return null;
  const texto = valor.trim().toUpperCase();

  if (["TODOS OS EIXOS", "TODOS", "AMBOS", "DIANTEIRO E TRASEIRO", "FRONT E REAR"].includes(texto)) {
    return "AMBOS";
  }
  if (["DIANTEIRO", "DIANT", "DIANT.", "FRONT", "FRONTAL"].includes(texto)) {
    return "DIANTEIRO";
  }
  if (["TRASEIRO", "TRAS", "TRAS.", "REAR", "TRASEIRA"].includes(texto)) {
    return "TRASEIRO";
  }
  if (["ESTEPE", "SPARE", "SOBRESSALENTE"].includes(texto)) {
    return "ESTEPE";
  }
  return null;
}

const VALORES_AFIRMATIVOS = new Set(["SIM", "S", "YES", "Y", "TRUE", "1", "X", "HOMOLOGADO"]);
const VALORES_NEGATIVOS = new Set(["NAO", "NÃO", "N", "NO", "FALSE", "0"]);

/**
 * Interpreta um valor de texto livre como booleano — retorna null (nunca
 * assume) quando o texto não é reconhecidamente afirmativo/negativo.
 */
export function normalizarBooleano(valor: string | undefined): boolean | null {
  if (!valor) return null;
  const texto = valor.trim().toUpperCase();
  if (VALORES_AFIRMATIVOS.has(texto)) return true;
  if (VALORES_NEGATIVOS.has(texto)) return false;
  return null;
}

/**
 * Deriva o status de ManufacturerHomologation a partir dos campos já
 * normalizados — NUNCA inferido além do que as colunas declaram
 * explicitamente. Ordem de prioridade: Phase Out > Substituto >
 * Homologado > Aplicação (sem homologação declarada) > Sem Status.
 */
export function derivarStatus(campos: {
  homologado: boolean | null;
  phaseOut: boolean | null;
  temProdutoSubstituto: boolean;
  temAplicacao: boolean;
}): ManufacturerProductStatus {
  if (campos.phaseOut === true) return "PHASE_OUT";
  if (campos.temProdutoSubstituto) return "SUBSTITUTO";
  if (campos.homologado === true) return "HOMOLOGADO";
  if (campos.temAplicacao) return "APLICACAO";
  return "SEM_STATUS";
}
