import "server-only";
import type { HomologationSourceAdapter, IngestionFetchParams } from "../adapter";
import type { HomologationIngestionRecord } from "../types";

/**
 * Adapter para homologações digitadas manualmente por um revisor humano
 * (ex.: um caso que a Curadoria confirmou por telefone com a montadora,
 * ou encontrou numa fonte fora do alcance de qualquer adapter
 * automatizado) — equivalente ao EvidenceSourceType.MANUAL já existente,
 * mas com procedência humana declarada em vez de um documento raspado.
 *
 * Diferente dos outros 4 adapters (que buscam de uma fonte externa),
 * este recebe registros SUBMETIDOS — por isso `fetchRecords()` aqui
 * retorna o que já foi submetido e ainda não processado, nunca busca
 * nada sozinho. Nenhuma submissão real acontece nesta fase (nenhuma UI
 * ou rota foi criada — "não alterar frontend, não alterar APIs
 * públicas").
 */
export interface HumanReviewAdapter extends HomologationSourceAdapter {
  readonly kind: "REVISAO_HUMANA";
  /** Aceita um registro digitado por um humano na mesma forma comum dos
   * demais adapters — quem chama é responsável por já ter aplicado toda
   * validação de UI (esta função só formaliza o contrato de entrada).
   * Retorna o registro tal como recebido; não persiste nada por conta
   * própria. */
  submitRecord(
    record: HomologationIngestionRecord,
    reviewerId: number
  ): Promise<HomologationIngestionRecord>;
  fetchRecords(params: IngestionFetchParams): Promise<HomologationIngestionRecord[]>;
}
