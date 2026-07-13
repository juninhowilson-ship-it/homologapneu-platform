import "server-only";
import type { ImportEntity } from "@prisma/client";
import { importMontadoras } from "@/services/montadoras";
import { importFabricantes } from "@/services/fabricantes";
import { importVeiculos } from "@/services/veiculos";
import { importPneus } from "@/services/pneus";
import { importHomologacoes } from "@/services/homologacoes";
import type { ImportContexto } from "@/lib/importer/context";
import type { ImportacaoResultado } from "@/types/importacao";

type Importer = (
  rows: Record<string, string>[],
  contexto: ImportContexto
) => Promise<ImportacaoResultado>;

const IMPORTERS: Record<ImportEntity, Importer> = {
  MONTADORAS: importMontadoras,
  FABRICANTES_PNEUS: importFabricantes,
  VEICULOS: importVeiculos,
  PNEUS: importPneus,
  HOMOLOGACOES: importHomologacoes,
};

export function importerFor(entity: ImportEntity): Importer {
  return IMPORTERS[entity];
}
