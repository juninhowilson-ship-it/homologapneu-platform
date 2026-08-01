import "server-only";
import type { HomologationSourceAdapter } from "../adapter";

/**
 * Adapter para catálogo técnico/ficha técnica publicada pela montadora
 * fora do manual do proprietário (ex.: PDFs de imprensa/mídia com
 * especificações de motor+chassi, catálogos de concessionária) —
 * equivalente ao EvidenceSourceType.CATALOGO_OE já existente.
 *
 * Nenhum catálogo técnico está conectado nesta fase.
 */
export interface TechnicalCatalogAdapter extends HomologationSourceAdapter {
  readonly kind: "CATALOGO_TECNICO";
  readonly manufacturerName: string;
}
