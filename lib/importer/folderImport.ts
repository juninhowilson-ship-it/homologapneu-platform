import "server-only";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";
import type { ImportContexto } from "./context";
import type { ImportacaoResultado } from "@/types/importacao";
import { importFabricantes } from "@/services/fabricantes";
import {
  importarModelosPorNome,
  importPneus,
  importarTecnologias,
  importarOeCodes,
} from "@/services/pneus";
import { importVeiculos, importModelosVeiculo } from "@/services/veiculos";
import { importMontadoras } from "@/services/montadoras";
import { importHomologacoes } from "@/services/homologacoes";
import { importarPaises, importarMercados } from "@/services/paises";
import { importarAplicacoesCsv } from "@/services/homologationEvidence";
import {
  FOLDER_KEYS,
  FOLDER_LABELS,
  FOLDER_PREREQUISITES,
  type FolderKey,
} from "@/lib/constants/databaseImport";

export { FOLDER_KEYS, FOLDER_LABELS, isFolderKey, type FolderKey } from "@/lib/constants/databaseImport";

/**
 * Um caminho por pasta de database/import/ — dispatcher central (Master
 * Data Layer, fase de conteúdo): traduz linhas já parseadas (CSV/XLSX,
 * via lib/importer/parseFile.ts) para a função de import de cada
 * entidade, sem duplicar nenhuma lógica de validação/dedup já existente.
 */

/**
 * Contagem real da tabela de cada pasta — usada só para o gate de
 * pré-requisitos abaixo. Nada aqui decide se UMA linha é válida (isso é
 * papel de cada importador); decide só se a etapa da qual esta pasta
 * depende já tem algum dado real.
 */
async function countForFolder(folder: FolderKey): Promise<number> {
  switch (folder) {
    case "countries":
      return prisma.country.count();
    case "vehicle_manufacturers":
      return prisma.manufacturer.count();
    case "brands":
      return prisma.tireManufacturer.count();
    case "markets":
      return prisma.market.count();
    case "vehicle_models":
      return prisma.vehicleModel.count();
    case "tire_models":
      return prisma.tireModel.count();
    case "vehicles":
      return prisma.vehicleVersion.count();
    case "tire_sizes":
      return prisma.tire.count();
    case "oe_codes":
      return prisma.oeCode.count();
    case "technologies":
      return prisma.technology.count();
    case "applications":
      return prisma.tireVehicleApplication.count();
    case "homologations":
      return prisma.homologation.count();
    case "sources":
      return prisma.officialSource.count();
    case "documents":
      return prisma.vehicleDocument.count();
    default: {
      const exhaustive: never = folder;
      throw new Error(`Pasta desconhecida: ${exhaustive}`);
    }
  }
}

/**
 * Pré-requisitos diretos (ver FOLDER_PREREQUISITES em
 * lib/constants/databaseImport.ts — cada pasta lista só do que ela
 * depende de verdade, não "tudo que vem antes numa lista única", que
 * quebraria assim que existisse mais de uma trilha independente).
 */
async function assertPriorStepsConsistent(folder: FolderKey): Promise<void> {
  for (const prerequisite of FOLDER_PREREQUISITES[folder]) {
    const count = await countForFolder(prerequisite);
    if (count === 0) {
      throw new ConflictError(
        `Etapa "${FOLDER_LABELS[folder]}" bloqueada: a etapa "${FOLDER_LABELS[prerequisite]}" ainda não tem nenhum registro. Importe ${prerequisite}/ primeiro.`
      );
    }
  }
}

/** database/import/sources e database/import/documents — pasta criada,
 * mas sem importador ainda: nenhuma delas tem um repository/service
 * reutilizável hoje (OfficialSource é populado só via
 * scripts/lib/sourceDiscovery.ts, com vários campos calculados
 * automaticamente — healthScore, priority — nunca via CSV; documents
 * exigiria decidir se aponta para VehicleDocument, HomologationDocument,
 * ou ambos). Lança um erro claro em vez de fingir que funciona. */
function notYetImplemented(folder: FolderKey): never {
  throw new ConflictError(
    `Pasta "${FOLDER_LABELS[folder]}" ainda não tem importador — decisão de produto pendente (ver relatório da etapa Master Data). Nenhum dado foi processado.`
  );
}

export async function importByFolder(
  folder: FolderKey,
  rows: Record<string, string>[],
  contexto: ImportContexto
): Promise<ImportacaoResultado> {
  await assertPriorStepsConsistent(folder);

  switch (folder) {
    case "brands":
      return importFabricantes(rows, contexto);
    case "vehicle_manufacturers":
      return importMontadoras(rows, contexto);
    case "vehicle_models":
      return importModelosVeiculo(rows, contexto);
    case "tire_models":
      return importarModelosPorNome(
        rows.map((r) => ({ nome: r.nome ?? "", fabricante: r.fabricante ?? "" })),
        contexto
      );
    case "tire_sizes":
      return importPneus(rows, contexto);
    case "vehicles":
      return importVeiculos(rows, contexto);
    case "homologations":
      return importHomologacoes(rows, contexto);
    case "oe_codes":
      return importarOeCodes(rows, contexto);
    case "technologies":
      return importarTecnologias(rows, contexto);
    case "countries":
      return importarPaises(rows, contexto);
    case "markets":
      return importarMercados(rows, contexto);
    case "applications":
      return importarAplicacoesCsv(rows, contexto);
    case "sources":
    case "documents":
      return notYetImplemented(folder);
    default: {
      const exhaustive: never = folder;
      throw new Error(`Pasta desconhecida: ${exhaustive}`);
    }
  }
}
