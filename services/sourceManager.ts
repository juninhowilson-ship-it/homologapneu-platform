import "server-only";
import { prisma } from "@/lib/prisma";
import { listConnectors, getConnector, CONNECTORS } from "@/lib/importer/connectors/registry";
import { importerFor } from "@/lib/importer/connectors/dispatch";
import {
  listEvidenceConnectors,
  getEvidenceConnector,
  EVIDENCE_CONNECTORS,
} from "@/lib/importer/connectors/evidenceSources";
import { registrarLoteEvidencias } from "@/services/homologationEvidence";
import { SOURCE_TYPE_POINTS } from "@/lib/constants/evidence";
import type { ImportConnector, ConnectorKind } from "@/lib/importer/connectors/types";
import type { EvidenceConnector } from "@/lib/importer/connectors/evidenceSources";

/**
 * Source Manager: catálogo formal (tabela DataSource) de TODA fonte de
 * dados conhecida — deriva automaticamente dos conectores reais já
 * implementados (registry.ts + evidenceSources.ts). Adicionar uma fonte
 * nova é só registrar um novo ImportConnector/EvidenceConnector no código
 * — sincronizarCatalogoFontes() reflete no painel sem alterar esta
 * arquitetura. Nunca cria uma fonte "fake": cada linha corresponde a um
 * conector real e testável.
 */

const CATEGORY_BY_KIND: Record<ConnectorKind, string> = {
  CATALOGO_MONTADORA: "Montadora",
  CATALOGO_FABRICANTE_PNEU: "Fabricante de Pneu",
  API_PUBLICA: "API Pública",
  BASE_GOVERNAMENTAL: "Governamental",
};

/** Sem uma forma estruturada de declarar "tipo de mecanismo" por
 * conector, inferimos pelo id/kind — puramente para exibição no painel,
 * nunca afeta a lógica de sincronização em si. */
function inferirTipo(connector: ImportConnector): string {
  if (connector.id === "pbe-veicular") return "PDF";
  if (connector.id.startsWith("wikidata")) return "SPARQL";
  if (connector.id.startsWith("wikipedia")) return "API";
  if (connector.id.startsWith("fipe")) return "API";
  if (connector.kind === "CATALOGO_FABRICANTE_PNEU") return "Scraper";
  return "API";
}

function inferirConfiabilidade(connector: ImportConnector): number {
  if (!connector.isConfigured()) return 0;
  if (connector.id === "pbe-veicular") return 90;
  if (connector.id.startsWith("fipe")) return 85;
  if (connector.id.startsWith("wikidata")) return 75;
  if (connector.id.startsWith("wikipedia")) return 70;
  return 60;
}

function inferirManufacturerName(connector: { id: string; label: string }): string | null {
  if (connector.id.startsWith("catalogo-pneu-")) {
    return connector.id.replace("catalogo-pneu-", "");
  }
  return null;
}

const SEM_FONTE_CONHECIDA = new Set(["catalogo-montadora-oficial", "base-homologacoes-oficial"]);

function inferirStatusImport(connector: ImportConnector): string {
  if (connector.isConfigured()) return "ATIVA";
  return SEM_FONTE_CONHECIDA.has(connector.id) ? "PENDENTE" : "BLOQUEADA";
}

/**
 * Encontra-ou-cria a linha DataSource de cada conector real conhecido, e
 * atualiza os campos descritivos (nome/categoria/URL/tipo/status) —
 * nunca mexe em lastSyncAt/importedRecordsCount/confirmedHomologationsCount
 * aqui, que só mudam quando a fonte é de fato sincronizada.
 */
export async function sincronizarCatalogoFontes(): Promise<{ total: number }> {
  let total = 0;

  for (const connector of CONNECTORS) {
    await prisma.dataSource.upsert({
      where: { connectorId: connector.id },
      create: {
        connectorId: connector.id,
        mechanism: "IMPORT",
        name: connector.label,
        category: CATEGORY_BY_KIND[connector.kind],
        manufacturerName: inferirManufacturerName(connector),
        type: inferirTipo(connector),
        baseUrl: connector.sourceUrl ?? null,
        status: inferirStatusImport(connector),
        reliability: inferirConfiabilidade(connector),
      },
      update: {
        name: connector.label,
        category: CATEGORY_BY_KIND[connector.kind],
        manufacturerName: inferirManufacturerName(connector),
        type: inferirTipo(connector),
        baseUrl: connector.sourceUrl ?? null,
        status: inferirStatusImport(connector),
        reliability: inferirConfiabilidade(connector),
      },
    });
    total++;
  }

  for (const connector of EVIDENCE_CONNECTORS) {
    await prisma.dataSource.upsert({
      where: { connectorId: connector.id },
      create: {
        connectorId: connector.id,
        mechanism: "EVIDENCE",
        name: connector.label,
        category: "Marketplace",
        manufacturerName: null,
        type: "Scraper",
        baseUrl: `https://${connector.domain}`,
        status: connector.isConfigured() ? "ATIVA" : "BLOQUEADA",
        reliability: SOURCE_TYPE_POINTS[connector.sourceType],
      },
      update: {
        name: connector.label,
        category: "Marketplace",
        type: "Scraper",
        baseUrl: `https://${connector.domain}`,
        status: connector.isConfigured() ? "ATIVA" : "BLOQUEADA",
        reliability: SOURCE_TYPE_POINTS[connector.sourceType],
      },
    });
    total++;
  }

  return { total };
}

export async function listarFontes() {
  await sincronizarCatalogoFontes();
  return prisma.dataSource.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { queueItems: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

export async function enfileirarSincronizacao(sourceId: number) {
  const source = await prisma.dataSource.findUniqueOrThrow({ where: { id: sourceId } });
  return prisma.importQueueItem.create({
    data: { sourceId: source.id, status: "PENDENTE" },
  });
}

export type ProcessamentoResultado = {
  queueItemId: number;
  status: "CONCLUIDO" | "ERRO";
  registrosImportados?: number;
  homologacoesConfirmadas?: number;
  erro?: string;
};

/**
 * Processa UM item pendente da fila (o mais antigo primeiro): identifica
 * o conector real pelo connectorId, chama fetchRows+importer (fontes de
 * importação) ou fetchEvidencias+registrarLoteEvidencias (fontes de
 * evidência), e atualiza as estatísticas reais da fonte. Nunca inventa um
 * resultado — se o conector não estiver configurado, o item vai para ERRO
 * com a mensagem real do conector.
 */
export async function processarProximoDaFila(): Promise<ProcessamentoResultado | null> {
  const item = await prisma.importQueueItem.findFirst({
    where: { status: "PENDENTE" },
    orderBy: { createdAt: "asc" },
    include: { source: true },
  });
  if (!item) return null;

  await prisma.importQueueItem.update({
    where: { id: item.id },
    data: { status: "PROCESSANDO", startedAt: new Date() },
  });

  try {
    if (item.source.mechanism === "IMPORT") {
      const connector = getConnector(item.source.connectorId);
      if (!connector) throw new Error(`Conector "${item.source.connectorId}" não encontrado.`);
      if (!connector.isConfigured()) {
        throw new Error(`Fonte ainda não configurada: ${connector.description}`);
      }
      const { rows, sourceVersion, collectedAt, sourceUrl } = await connector.fetchRows();
      const importer = connector.importer ?? importerFor(connector.entity);
      const resultado = await importer(rows, {
        fileName: `fontes:${connector.id}`,
        fileType: "API",
        userId: null,
        sourceVersion,
        collectedAt,
        sourceUrl,
      });

      await prisma.dataSource.update({
        where: { id: item.source.id },
        data: {
          lastSyncAt: new Date(),
          importedRecordsCount: { increment: resultado.criados + resultado.atualizados },
          lastError: null,
        },
      });
      await prisma.importQueueItem.update({
        where: { id: item.id },
        data: {
          status: "CONCLUIDO",
          finishedAt: new Date(),
          result: JSON.stringify(resultado),
        },
      });
      return {
        queueItemId: item.id,
        status: "CONCLUIDO",
        registrosImportados: resultado.criados + resultado.atualizados,
      };
    }

    const connector = getEvidenceConnector(item.source.connectorId);
    if (!connector) throw new Error(`Fonte de evidência "${item.source.connectorId}" não encontrada.`);
    if (!connector.isConfigured()) {
      throw new Error(`Fonte ainda não configurada: ${connector.finding}`);
    }
    const itens = await connector.fetchEvidencias();
    const resultado = await registrarLoteEvidencias(itens);

    await prisma.dataSource.update({
      where: { id: item.source.id },
      data: {
        lastSyncAt: new Date(),
        importedRecordsCount: { increment: resultado.evidenciasNovas },
        confirmedHomologationsCount: { increment: resultado.aplicacoesValidadas },
        lastError: null,
      },
    });
    await prisma.importQueueItem.update({
      where: { id: item.id },
      data: {
        status: "CONCLUIDO",
        finishedAt: new Date(),
        result: JSON.stringify(resultado),
      },
    });
    return {
      queueItemId: item.id,
      status: "CONCLUIDO",
      registrosImportados: resultado.evidenciasNovas,
      homologacoesConfirmadas: resultado.aplicacoesValidadas,
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
    await prisma.dataSource.update({
      where: { id: item.source.id },
      data: { lastError: mensagem },
    });
    await prisma.importQueueItem.update({
      where: { id: item.id },
      data: { status: "ERRO", finishedAt: new Date(), error: mensagem },
    });
    return { queueItemId: item.id, status: "ERRO", erro: mensagem };
  }
}

export async function obterResumoPainel() {
  const fontes = await listarFontes();
  const pendencias = await prisma.importQueueItem.count({ where: { status: "PENDENTE" } });
  const comErro = await prisma.dataSource.count({ where: { lastError: { not: null } } });

  return {
    fontesCadastradas: fontes.length,
    fontesAtivas: fontes.filter((f) => f.status === "ATIVA").length,
    fontesBloqueadas: fontes.filter((f) => f.status === "BLOQUEADA").length,
    fontesPendentes: fontes.filter((f) => f.status === "PENDENTE").length,
    ultimaSincronizacao: fontes
      .map((f) => f.lastSyncAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null,
    totalRegistrosImportados: fontes.reduce((s, f) => s + f.importedRecordsCount, 0),
    totalHomologacoesPorFonte: fontes.reduce((s, f) => s + f.confirmedHomologationsCount, 0),
    itensPendentesNaFila: pendencias,
    fontesComErro: comErro,
    fontes,
  };
}

// Reexportado para os tipos ImportConnector/EvidenceConnector não
// ficarem "unused" quando este módulo é importado só pelas funções.
export type { EvidenceConnector };
export { listConnectors, listEvidenceConnectors };
