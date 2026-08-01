import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "node:fs";
import * as path from "node:path";
import ExcelJS from "exceljs";
import { getColumnMapping } from "../lib/importer/manufacturerCatalog/mappings/registry";
import {
  parseManufacturerCatalogRow,
  type NormalizedCatalogRow,
} from "../lib/importer/manufacturerCatalog/parser";
import {
  normalizarEixo,
  normalizarBooleano,
  derivarStatus,
} from "../lib/importer/manufacturerCatalog/normalize";

/**
 * Importação pontual do catálogo real "Pirelli Tabela de Aplicação e
 * Homologação Abril - 2026.xlsx" para a camada de Catálogo de Fabricante
 * (ManufacturerCatalog/Product/Application/Homologation) — dado bruto
 * declarado pela Pirelli, nunca promovido automaticamente a Tire/
 * VehicleVersion/Homologation reais (decisão do usuário: essa promoção
 * exige revisão humana, fora do escopo deste script).
 *
 * Reimplementa localmente (sem importar services/repositories, que têm
 * `server-only`) a mesma lógica de services/manufacturerCatalog.ts, que
 * fica como a versão "de verdade" reutilizável por uma rota futura.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TIRE_MANUFACTURER_NAME = "Pirelli";
const CATALOG_NAME = "Tabela de Aplicação e Homologação";
const SOURCE_DIR =
  "C:/Users/Wilson/OneDrive/Desktop/TRABALHO/EQUIPAMENTOS ORIGINAIS";
const HEADER_ROW = 10;

const VALOR_VAZIO = new Set(["-", ""]);
function limpar(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  const texto = valor.trim();
  return VALOR_VAZIO.has(texto) ? undefined : texto;
}

async function lerArquivo(): Promise<{
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}> {
  const entries = fs.readdirSync(SOURCE_DIR);
  const match = entries.find(
    (f) => f.toLowerCase().startsWith("pirelli") && f.toLowerCase().endsWith(".xlsx")
  );
  if (!match) {
    throw new Error(`Arquivo da Pirelli não encontrado em ${SOURCE_DIR}`);
  }
  const fullPath = path.join(SOURCE_DIR, match);
  const buffer = fs.readFileSync(fullPath);
  // exceljs tipa load() para Buffer, mas a versão de @types/node deste
  // projeto gera um Buffer<ArrayBuffer> estruturalmente incompatível com o
  // Buffer esperado (faltam maxByteLength/resizable/etc.) — mesmo
  // descompasso de tipagem já visto em repositories/ai/aiJobs.ts. Passar
  // como ArrayBuffer evita o conflito (mesmo padrão de
  // lib/importer/parsers/excel.ts).
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Planilha vazia");

  const headerRow = ws.getRow(HEADER_ROW);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= HEADER_ROW) return;
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row.getCell(index + 1).value;
      const text = value === null || value === undefined ? "" : String(value).trim();
      if (text) hasValue = true;
      record[header] = text;
    });
    if (hasValue) rows.push(record);
  });

  return { fileName: match, headers: headers.filter(Boolean), rows };
}

async function main() {
  const { fileName, rows: todasAsLinhas } = await lerArquivo();
  const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
  const rows = limite ? todasAsLinhas.slice(0, limite) : todasAsLinhas;
  console.log(
    `Arquivo: ${fileName} — ${todasAsLinhas.length} linhas de dado no total` +
      (limite ? ` (rodando só as primeiras ${rows.length}, teste)` : "")
  );

  const fabricante = await prisma.tireManufacturer.findFirst({
    where: { name: TIRE_MANUFACTURER_NAME },
  });
  if (!fabricante) {
    throw new Error(`TireManufacturer "${TIRE_MANUFACTURER_NAME}" não encontrado`);
  }

  const config = getColumnMapping(TIRE_MANUFACTURER_NAME);
  if (!config || !config.confirmed) {
    throw new Error(`Mapeamento de colunas não confirmado para ${TIRE_MANUFACTURER_NAME}`);
  }

  const catalog = await prisma.manufacturerCatalog.upsert({
    where: {
      tireManufacturerId_name: { tireManufacturerId: fabricante.id, name: CATALOG_NAME },
    },
    create: { tireManufacturerId: fabricante.id, name: CATALOG_NAME },
    update: {},
  });
  console.log(`Catálogo: id=${catalog.id} (${catalog.name})`);

  const importBatch = await prisma.importBatch.create({
    data: {
      fileName,
      fileType: "XLSX",
      entity: "CATALOGO_FABRICANTE_PNEU",
      userId: null,
      status: "PROCESSANDO",
      sourceVersion: "Abril 2026",
    },
  });

  const catalogImport = await prisma.manufacturerCatalogImport.create({
    data: {
      catalogId: catalog.id,
      importBatchId: importBatch.id,
      fileName,
      fileType: "XLSX",
      status: "EXECUTANDO",
      totalRows: rows.length,
    },
  });

  const erros: { linha: number; mensagem: string }[] = [];
  const produtoIdPorCodigo = new Map<string, number>();
  const pendentesSubstituto: { produtoId: number; codigoSubstituto: string }[] = [];

  let produtosCriados = 0;
  let aplicacoesCriadas = 0;
  let homologacoesCriadas = 0;
  const inicio = Date.now();

  for (const [index, row] of rows.entries()) {
    const numeroLinha = index + 1 + HEADER_ROW;
    try {
      const campos: NormalizedCatalogRow = parseManufacturerCatalogRow(row, config.mapping);

      const vehicleBrand = limpar(campos.vehicleBrand);
      const vehicleModel = limpar(campos.vehicleModel);
      const medida = limpar(campos.medida);
      if (!vehicleBrand || !vehicleModel || !medida) {
        throw new Error("Linha sem marca/modelo/medida — ignorada");
      }

      const catalogRow = await prisma.manufacturerCatalogRow.create({
        data: { importId: catalogImport.id, rowNumber: numeroLinha, rawData: JSON.stringify(row) },
      });

      const codigoRaw = limpar(campos.codigoInterno);
      const phaseOut = codigoRaw ? /\*\s*$/.test(codigoRaw) : false;
      const codigoInterno = codigoRaw ? codigoRaw.replace(/\*\s*$/, "").trim() : null;

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

      // "IP DE APLICAÇÃO" repete o próprio IP quando o produto ainda está
      // vigente (nada a substituir) — só conta como substituto de verdade
      // quando aponta para um código DIFERENTE do próprio produto.
      const codigoSubstitutoRaw = limpar(campos.produtoSubstituto);
      const temSubstitutoReal = Boolean(
        codigoSubstitutoRaw && codigoSubstitutoRaw !== codigoInterno
      );
      if (temSubstitutoReal) {
        pendentesSubstituto.push({ produtoId: produto.id, codigoSubstituto: codigoSubstitutoRaw! });
      }

      const eixo = normalizarEixo(limpar(campos.eixo));

      const aplicacao = await prisma.manufacturerApplication.create({
        data: { productId: produto.id, vehicleBrand, vehicleModel, axlePosition: eixo },
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
        data: { applicationId: aplicacao.id, status, homologado: homologadoBool },
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

    if ((index + 1) % 300 === 0) {
      console.log(`... ${index + 1}/${rows.length} linhas processadas`);
    }
  }

  // Segunda passada: resolve produtoSubstitutoId por código dentro do
  // mesmo catálogo — só depois que todos os produtos já existem.
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
    erros.length === 0 ? "CONCLUIDO" : produtosCriados > 0 ? "CONCLUIDO_COM_ERROS" : "FALHOU";

  await prisma.manufacturerCatalogImport.update({
    where: { id: catalogImport.id },
    data: {
      status: statusFinal,
      processedRows: produtosCriados,
      errorRows: erros.length,
      finishedAt: new Date(),
      log: erros.length ? JSON.stringify(erros.slice(0, 300)) : null,
    },
  });

  if (erros.length > 0) {
    await prisma.importError.createMany({
      data: erros.map((e) => ({
        importBatchId: importBatch.id,
        rowNumber: e.linha,
        message: e.mensagem,
        rawData: null,
      })),
    });
  }

  await prisma.importBatch.update({
    where: { id: importBatch.id },
    data: {
      totalRows: rows.length,
      importedCount: produtosCriados,
      updatedCount: 0,
      duplicateCount: 0,
      errorCount: erros.length,
      status: statusFinal,
      finishedAt: new Date(),
      durationMs: Date.now() - inicio,
    },
  });

  const resumo = {
    catalogId: catalog.id,
    importId: catalogImport.id,
    importBatchId: importBatch.id,
    totalRows: rows.length,
    produtosCriados,
    aplicacoesCriadas,
    homologacoesCriadas,
    substitutosResolvidos,
    linhasComErro: erros.length,
  };

  const logPath =
    "C:/Users/Wilson/AppData/Local/Temp/claude/c--Projetos-homologapneu/47f1c4ac-a537-447d-8833-f540b3bcce76/scratchpad/" +
    `pirelli-import-log-${Date.now()}.json`;
  fs.writeFileSync(logPath, JSON.stringify({ resumo, erros }, null, 1));

  console.log("=== RESUMO ===");
  console.log(JSON.stringify(resumo, null, 2));
  console.log("Log completo (com erros):", logPath);
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
