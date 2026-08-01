import "server-only";
import type { ImportEntity } from "@prisma/client";
import { importMontadoras } from "@/services/montadoras";
import { importFabricantes } from "@/services/fabricantes";
import { importVeiculos } from "@/services/veiculos";
import { importPneus, importarTecnologias, importarOeCodes } from "@/services/pneus";
import { importHomologacoes } from "@/services/homologacoes";
import { importRodas } from "@/services/rodas";
import { importarPaises, importarMercados } from "@/services/paises";
import { importarAplicacoesCsv } from "@/services/homologationEvidence";
import type { ImportContexto } from "@/lib/importer/context";
import type { ImportacaoResultado } from "@/types/importacao";

type Importer = (
  rows: Record<string, string>[],
  contexto: ImportContexto
) => Promise<ImportacaoResultado>;

/**
 * Catálogo de fabricante de pneu usa o fluxo dedicado
 * ManufacturerCatalogImport (lib/importer/manufacturerCatalog/), não este
 * dispatcher genérico por linha — infraestrutura pronta (Auditoria
 * Técnica 1), nenhuma execução real implementada nesta fase. Existe aqui
 * só para satisfazer o Record exaustivo por ImportEntity; nunca deve ser
 * chamado por nenhuma rota real.
 */
const importCatalogoFabricantePneu: Importer = async () => {
  throw new Error(
    "CATALOGO_FABRICANTE_PNEU não usa este dispatcher — ver lib/importer/manufacturerCatalog/ " +
      "(ManufacturerCatalogImport) para o fluxo dedicado desta entidade."
  );
};

const IMPORTERS: Record<ImportEntity, Importer> = {
  MONTADORAS: importMontadoras,
  FABRICANTES_PNEUS: importFabricantes,
  VEICULOS: importVeiculos,
  PNEUS: importPneus,
  HOMOLOGACOES: importHomologacoes,
  RODAS: importRodas,
  CATALOGO_FABRICANTE_PNEU: importCatalogoFabricantePneu,
  PAISES: importarPaises,
  TECNOLOGIAS: importarTecnologias,
  CODIGOS_OE: importarOeCodes,
  APLICACOES: importarAplicacoesCsv,
  MERCADOS: importarMercados,
};

export function importerFor(entity: ImportEntity): Importer {
  return IMPORTERS[entity];
}
