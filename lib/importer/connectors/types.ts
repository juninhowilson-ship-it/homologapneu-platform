import type { ImportEntity } from "@prisma/client";

export type ConnectorFetchResult = {
  headers: string[];
  rows: Record<string, string>[];
  /** Versão/identificador do catálogo/fonte reportado pela própria fonte
   * (ex.: "2026.1", um ETag, um hash de conteúdo), quando disponível. */
  sourceVersion?: string;
  /** Data em que a fonte declara ter publicado/coletado os dados. */
  collectedAt?: Date;
  /** URL do endpoint efetivamente consultado. */
  sourceUrl?: string;
};

/**
 * Categoria da fonte oficial. Usada apenas para organização/exibição —
 * qualquer categoria segue o mesmo contrato ImportConnector.
 */
export type ConnectorKind =
  | "CATALOGO_MONTADORA"
  | "CATALOGO_FABRICANTE_PNEU"
  | "API_PUBLICA";

/**
 * Contrato para um conector de fonte oficial (catálogo de montadora,
 * catálogo de fabricante de pneus, ou API pública). Cada conector real
 * (quando uma fonte oficial for definida) implementa esta interface em um
 * arquivo próprio neste diretório e é registrado em registry.ts.
 */
export interface ImportConnector {
  id: string;
  label: string;
  kind: ConnectorKind;
  entity: ImportEntity;
  description: string;
  /** true quando as credenciais/endpoint necessários estão presentes
   * (normalmente variáveis de ambiente). Nunca deve fabricar dados quando
   * false — a sincronização deve falhar com uma mensagem clara. */
  isConfigured(): boolean;
  fetchRows(): Promise<ConnectorFetchResult>;
}
