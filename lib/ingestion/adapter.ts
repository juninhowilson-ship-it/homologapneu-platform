import "server-only";
import type { HomologationIngestionRecord, IngestionSourceKind } from "./types";

/**
 * Parâmetros de busca comuns a qualquer adapter — cada implementação usa
 * o subconjunto que fizer sentido para sua fonte (ex.: um adapter de
 * manual oficial normalmente exige manufacturerName; um de revisão
 * humana pode ignorar todos e aceitar qualquer registro submetido).
 */
export interface IngestionFetchParams {
  manufacturerName?: string;
  vehicleModel?: string;
}

/**
 * Contrato base de todo adapter de ingestão de homologações — a
 * "Plataforma de Ingestão" pedida na Fase 7. Cada tipo de fonte (manual
 * oficial, fabricante de pneu, revenda, catálogo técnico, revisão
 * humana) implementa esta interface — ver os 5 contratos especializados
 * em adapters/.
 *
 * Nenhum adapter grava no banco nem chama o Motor de Validação
 * diretamente: cada um só RETORNA registros no formato comum
 * (HomologationIngestionRecord). Quem decide o que fazer com eles é um
 * orquestrador único e futuro — fora do escopo desta fase
 * ("implementar apenas a infraestrutura, não conectar nenhuma fonte
 * externa"). A ponte de formato até o pipeline já existente
 * (HomologationEvidence/TireVehicleApplication) já está pronta em
 * toEvidenciaInput.ts, mas não é chamada por nada nesta fase.
 */
export interface HomologationSourceAdapter {
  readonly id: string;
  readonly label: string;
  readonly kind: IngestionSourceKind;
  /** true quando o adapter tem tudo que precisa para operar (endpoint,
   * credencial, fonte validada etc.) — nunca deve fabricar dado quando
   * false; fetchRecords() deve rejeitar com mensagem clara nesse caso.
   * Mesmo contrato já usado por ImportConnector.isConfigured() e
   * EvidenceConnector.isConfigured(). */
  isConfigured(): boolean;
  fetchRecords(params: IngestionFetchParams): Promise<HomologationIngestionRecord[]>;
}
