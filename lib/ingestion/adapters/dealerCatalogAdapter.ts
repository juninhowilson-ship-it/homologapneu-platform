import "server-only";
import type { HomologationSourceAdapter } from "../adapter";

/**
 * Adapter para catálogo/loja de uma revenda de pneus (ex.: DPaschoal,
 * Campneus, PneuStore, TireShop) — equivalente ao
 * EvidenceSourceType.DISTRIBUIDOR_OFICIAL já existente, com confiança
 * naturalmente menor que um manual oficial (o mesmo pneu pode ser
 * OPCIONAL/aftermarket, não necessariamente ORIGINAL de fábrica).
 *
 * Nenhuma revenda está conectada nesta fase. Achado real já documentado
 * em lib/importer/connectors/evidenceSources.ts: TireShop, Campneus e
 * DPaschoal bloqueiam especificamente a busca-por-veículo via robots.txt
 * (mesmo permitindo o catálogo de produto geral); PneuStore bloqueia
 * inclusive a leitura do próprio robots.txt (Akamai anti-bot).
 */
export interface DealerCatalogAdapter extends HomologationSourceAdapter {
  readonly kind: "CATALOGO_REVENDA";
  /** Nome da revenda (ex.: "DPaschoal") — texto livre, não há tabela de
   * referência para revendas no Banco Mestre hoje. */
  readonly dealerName: string;
}
