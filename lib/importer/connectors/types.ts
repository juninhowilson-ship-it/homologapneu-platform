import type { ImportEntity } from "@prisma/client";

export type ConnectorFetchResult = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Contrato para um conector de API oficial. Cada conector real (quando uma
 * fonte oficial for definida) implementa esta interface em um arquivo próprio
 * neste diretório e é registrado em registry.ts.
 */
export interface ImportConnector {
  id: string;
  label: string;
  entity: ImportEntity;
  description: string;
  /** true quando as credenciais/endpoint necessários estão presentes
   * (normalmente variáveis de ambiente). Nunca deve fabricar dados quando
   * false — a sincronização deve falhar com uma mensagem clara. */
  isConfigured(): boolean;
  fetchRows(): Promise<ConnectorFetchResult>;
}
