import "server-only";
import type { HomologationSourceAdapter } from "./adapter";

/**
 * Registro central da Plataforma de Ingestão de Homologações. Vazio de
 * propósito nesta fase ("implementar apenas a infraestrutura, não
 * conectar nenhuma fonte externa") — ver adapters/_example.ts para uma
 * implementação de referência completa, não registrada aqui.
 *
 * Para adicionar uma nova fonte no futuro:
 *   1. Implemente um dos 5 contratos em adapters/ (ou
 *      HomologationSourceAdapter diretamente, se a fonte não se encaixar
 *      em nenhum dos 5) em um novo arquivo neste diretório.
 *   2. Importe a instância aqui e adicione à lista INGESTION_ADAPTERS.
 * Nenhuma outra mudança é necessária — getIngestionAdapter/
 * listIngestionAdapters e qualquer orquestrador futuro já descobrem
 * qualquer adapter registrado aqui automaticamente. Mesmo padrão já
 * usado por CONNECTORS (lib/importer/connectors/registry.ts) e
 * EVIDENCE_CONNECTORS (lib/importer/connectors/evidenceSources.ts).
 * Ver docs/plataforma-ingestao.md para o passo a passo completo com
 * exemplo.
 */
export const INGESTION_ADAPTERS: HomologationSourceAdapter[] = [];

export function getIngestionAdapter(id: string): HomologationSourceAdapter | undefined {
  return INGESTION_ADAPTERS.find((adapter) => adapter.id === id);
}

export function listIngestionAdapters() {
  return INGESTION_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
    kind: adapter.kind,
    configured: adapter.isConfigured(),
  }));
}
