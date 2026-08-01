import "server-only";
import type { HomologationSourceAdapter } from "../adapter";

/**
 * Adapter para manuais do proprietário e documentação oficial publicada
 * pela própria montadora — a fonte de maior confiança da plataforma
 * (equivalente ao EvidenceSourceType.MANUAL / MONTADORA já existente).
 *
 * Implementações reais tipicamente envolvem baixar e fazer OCR/parse do
 * PDF (mesmo mecanismo já usado por services/intelligentCrawler.ts no
 * pipeline de Curadoria em produção) — esta interface só formaliza o
 * contrato; nenhum PDF real é conectado nesta fase.
 */
export interface OfficialManualAdapter extends HomologationSourceAdapter {
  readonly kind: "MANUAL_OFICIAL";
  /** Nome do fabricante de veículo exatamente como cadastrado em
   * Manufacturer.name — todo OfficialManualAdapter é específico de UMA
   * montadora (mesmo padrão de CrawlerSource.manufacturerName). */
  readonly manufacturerName: string;
}
