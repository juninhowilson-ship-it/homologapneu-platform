import "server-only";
import type { HomologationSourceAdapter } from "../adapter";

/**
 * Adapter para o site/catálogo oficial do próprio fabricante de pneu
 * (ex.: ferramentas "encontre seu pneu por veículo" da Michelin, Pirelli,
 * Continental etc.) — equivalente ao EvidenceSourceType.FABRICANTE_PNEU
 * já existente.
 *
 * Nenhum fabricante de pneu está conectado nesta fase — ver
 * lib/importer/connectors/tireCatalogStubs.ts para o levantamento já
 * feito (19 marcas, cada uma documentando por que ainda não há conector
 * funcional) e docs/plataforma-ingestao.md para o achado real da
 * Michelin (ferramenta pública por veículo, nunca conectada
 * programaticamente).
 */
export interface TireManufacturerAdapter extends HomologationSourceAdapter {
  readonly kind: "FABRICANTE_PNEU";
  /** Nome do fabricante de pneu exatamente como cadastrado em
   * TireManufacturer.name. */
  readonly tireManufacturerName: string;
}
