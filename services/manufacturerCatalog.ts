import "server-only";
import { prisma } from "@/lib/prisma";
import { findFabricanteByName } from "@/repositories/fabricantes";
import { getColumnMapping } from "@/lib/importer/manufacturerCatalog/mappings/registry";
import {
  parseManufacturerCatalogRow,
  type NormalizedCatalogRow,
} from "@/lib/importer/manufacturerCatalog/parser";
import {
  normalizarEixo,
  normalizarBooleano,
  derivarStatus,
} from "@/lib/importer/manufacturerCatalog/normalize";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { iniciarLote, finalizarLote } from "@/services/importBatches";
import { inferFileType } from "@/lib/importer/parseFile";
import { computeImportHash } from "@/lib/importer/hash";
import type { ImportContexto } from "@/lib/importer/context";

/**
 * Persistência real da camada de "Catálogo de Fabricante" (Auditoria
 * Técnica 1) — ManufacturerCatalog → ManufacturerCatalogImport →
 * ManufacturerCatalogRow → ManufacturerProduct → ManufacturerApplication
 * → ManufacturerHomologation. Grava só o que o PRÓPRIO fabricante declara
 * no catálogo; nunca cria/atualiza Tire, VehicleVersion ou Homologation
 * reais (essa promoção continua exigindo revisão humana, fora do escopo
 * desta função — mesmo espírito do fluxo de Curadoria).
 */

/** Marcador de "sem valor" usado por catálogos reais que preenchem toda
 * célula vazia com um traço em vez de deixá-la em branco. */
const VALOR_VAZIO = new Set(["-", ""]);

function limpar(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  const texto = valor.trim();
  return VALOR_VAZIO.has(texto) ? undefined : texto;
}

export type ManufacturerCatalogImportResumo = {
  importId: number;
  catalogId: number;
  totalRows: number;
  produtosCriados: number;
  aplicacoesCriadas: number;
  homologacoesCriadas: number;
  substitutosResolvidos: number;
  linhasComErro: number;
  erros: { linha: number; mensagem: string }[];
};

export async function importarCatalogoFabricante(params: {
  tireManufacturerName: string;
  catalogName: string;
  rows: Record<string, string>[];
  contexto: ImportContexto;
  /** Deslocamento entre o índice de `rows` e o número de linha real do
   * arquivo original (ex.: 10 quando o cabeçalho não está na linha 1) —
   * só afeta o número de linha reportado em erros, nunca a lógica. */
  rowNumberOffset?: number;
}): Promise<ManufacturerCatalogImportResumo> {
  const inicio = Date.now();
  const { tireManufacturerName, catalogName, rows, contexto } = params;
  const offset = params.rowNumberOffset ?? 0;

  const fabricante = await findFabricanteByName(tireManufacturerName);
  if (!fabricante) {
    throw new NotFoundError(
      `Fabricante de pneu "${tireManufacturerName}" não encontrado`
    );
  }

  const config = getColumnMapping(tireManufacturerName);
  if (!config || !config.confirmed) {
    throw new ValidationError(
      `Não há mapeamento de colunas confirmado para "${tireManufacturerName}" — ` +
        "ver lib/importer/manufacturerCatalog/mappings/registry.ts"
    );
  }

  const catalog = await prisma.manufacturerCatalog.upsert({
    where: {
      tireManufacturerId_name: {
        tireManufacturerId: fabricante.id,
        name: catalogName,
      },
    },
    create: { tireManufacturerId: fabricante.id, name: catalogName },
    update: {},
  });

  const fileType = contexto.fileType ?? inferFileType(contexto.fileName);

  const lote = await iniciarLote({
    fileName: contexto.fileName,
    fileType,
    entity: "CATALOGO_FABRICANTE_PNEU",
    userId: contexto.userId,
    sourceVersion: contexto.sourceVersion,
    collectedAt: contexto.collectedAt,
    sourceUrl: contexto.sourceUrl,
    importHash: computeImportHash(rows),
  });

  const catalogImport = await prisma.manufacturerCatalogImport.create({
    data: {
      catalogId: catalog.id,
      importBatchId: lote.id,
      fileName: contexto.fileName,
      fileType,
      status: "EXECUTANDO",
      totalRows: rows.length,
    },
  });

  const erros: { linha: number; mensagem: string }[] = [];
  const produtoIdPorCodigo = new Map<string, number>();
  const pendentesSubstituto: { produtoId: number; codigoSubstituto: string }[] =
    [];

  let produtosCriados = 0;
  let aplicacoesCriadas = 0;
  let homologacoesCriadas = 0;

  for (const [index, row] of rows.entries()) {
    const numeroLinha = index + 1 + offset;
    try {
      const campos: NormalizedCatalogRow = parseManufacturerCatalogRow(
        row,
        config.mapping
      );

      const vehicleBrand = limpar(campos.vehicleBrand);
      const vehicleModel = limpar(campos.vehicleModel);
      const medida = limpar(campos.medida);
      if (!vehicleBrand || !vehicleModel || !medida) {
        throw new Error("Linha sem marca/modelo/medida — ignorada");
      }

      const catalogRow = await prisma.manufacturerCatalogRow.create({
        data: {
          importId: catalogImport.id,
          rowNumber: numeroLinha,
          rawData: JSON.stringify(row),
        },
      });

      const codigoRaw = limpar(campos.codigoInterno);
      const phaseOut = codigoRaw ? /\*\s*$/.test(codigoRaw) : false;
      const codigoInterno = codigoRaw
        ? codigoRaw.replace(/\*\s*$/, "").trim()
        : null;

      const produto = await prisma.manufacturerProduct.create({
        data: {
          catalogId: catalog.id,
          rowId: catalogRow.id,
          medida,
          descricao: limpar(campos.descricao) ?? null,
          codigoInterno,
          rr: limpar(campos.rr) ?? null,
          wet: limpar(campos.wet) ?? null,
          noise: limpar(campos.noise) ?? null,
          phaseOut,
        },
      });
      produtosCriados++;

      // Preserva a primeira ocorrência — o mesmo código pode se repetir
      // como identificador estável em mais de uma aplicação/veículo.
      if (codigoInterno && !produtoIdPorCodigo.has(codigoInterno)) {
        produtoIdPorCodigo.set(codigoInterno, produto.id);
      }

      // "IP DE APLICAÇÃO" (ou equivalente) repete o próprio código quando
      // o produto ainda está vigente (nada a substituir) — só conta como
      // substituto de verdade quando aponta para um código DIFERENTE.
      const codigoSubstitutoRaw = limpar(campos.produtoSubstituto);
      const temSubstitutoReal = Boolean(
        codigoSubstitutoRaw && codigoSubstitutoRaw !== codigoInterno
      );
      if (temSubstitutoReal) {
        pendentesSubstituto.push({ produtoId: produto.id, codigoSubstituto: codigoSubstitutoRaw! });
      }

      const eixo = normalizarEixo(limpar(campos.eixo));

      const aplicacao = await prisma.manufacturerApplication.create({
        data: {
          productId: produto.id,
          vehicleBrand,
          vehicleModel,
          axlePosition: eixo,
        },
      });
      aplicacoesCriadas++;

      const homologadoBool = normalizarBooleano(limpar(campos.homologado));
      const status = derivarStatus({
        homologado: homologadoBool,
        phaseOut,
        temProdutoSubstituto: temSubstitutoReal,
        temAplicacao: true,
      });

      await prisma.manufacturerHomologation.create({
        data: {
          applicationId: aplicacao.id,
          status,
          homologado: homologadoBool,
        },
      });
      homologacoesCriadas++;

      await prisma.manufacturerCatalogRow.update({
        where: { id: catalogRow.id },
        data: { normalized: true },
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      erros.push({ linha: numeroLinha, mensagem });
    }
  }

  // Segunda passada: resolve produtoSubstitutoId por código dentro do
  // mesmo catálogo — o substituto pode ter sido criado antes ou depois
  // na planilha, então só dá para ligar depois que todos existem.
  let substitutosResolvidos = 0;
  for (const pendente of pendentesSubstituto) {
    const substitutoId = produtoIdPorCodigo.get(pendente.codigoSubstituto);
    if (!substitutoId) continue;
    await prisma.manufacturerProduct.update({
      where: { id: pendente.produtoId },
      data: { produtoSubstitutoId: substitutoId },
    });
    substitutosResolvidos++;
  }

  const statusFinal =
    erros.length === 0
      ? "CONCLUIDO"
      : produtosCriados > 0
        ? "CONCLUIDO_COM_ERROS"
        : "FALHOU";

  await prisma.manufacturerCatalogImport.update({
    where: { id: catalogImport.id },
    data: {
      status: statusFinal,
      processedRows: produtosCriados,
      errorRows: erros.length,
      finishedAt: new Date(),
      log: erros.length ? JSON.stringify(erros.slice(0, 200)) : null,
    },
  });

  await finalizarLote(lote.id, {
    totalRows: rows.length,
    importedCount: produtosCriados,
    updatedCount: 0,
    duplicateCount: 0,
    errorCount: erros.length,
    durationMs: Date.now() - inicio,
    erros: erros.map((e) => ({
      rowNumber: e.linha,
      message: e.mensagem,
      rawData: null,
    })),
  });

  return {
    importId: catalogImport.id,
    catalogId: catalog.id,
    totalRows: rows.length,
    produtosCriados,
    aplicacoesCriadas,
    homologacoesCriadas,
    substitutosResolvidos,
    linhasComErro: erros.length,
    erros: erros.slice(0, 50),
  };
}
