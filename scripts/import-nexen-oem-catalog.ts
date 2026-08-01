import "dotenv/config";
import * as fs from "node:fs";
import { PrismaClient, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";
import { parseTireSize, parseTireIndex } from "../lib/importer/manufacturerCatalog/tireSpec";

/**
 * Importa o catálogo real da página de equipamento original da Nexen
 * (https://www.nexentire.com/br/product/original_equipment/), extraído
 * do HTML bruto (não da versão resumida por IA — 177 linhas reais contra
 * 172 na primeira extração, que tinha perdido/alterado linhas). Mesma
 * regra combinada de Pirelli/Giti: cadastra Montadora+Modelo+Pneu reais,
 * nunca cria Homologation real (falta motor/ano/versão).
 *
 * Duas correções feitas sobre o dado bruto da própria página, ambas
 * documentadas linha a linha abaixo:
 *
 * 1. Marca/modelo combinados por CONTROLADOR CORPORATIVO, não por marca
 *    real do veículo — "PSA" (holding, não é marca) e "RAM/JEEP" (duas
 *    marcas reais numa célula só). Corrigido para a marca real de cada
 *    veículo. Onde duas nameplates reais e distintas dividem uma célula
 *    com "/" (ex.: "X3 / X4", "GRAND CHEROKEE / DURANGO"), foram
 *    separadas em duas aplicações — a mesma medida/produto listado se
 *    aplica às duas, exatamente como a fonte apresenta.
 * 2. Três tamanhos com "/" no lugar de "R" antes do aro (erro de
 *    digitação da própria página, confirmado por consulta direta —
 *    "235/55/19" não é um formato de medida real) foram corrigidos para
 *    o formato padrão. Um tamanho com o dígito do aro literalmente
 *    ausente na fonte ("255/60R 113T") foi mantido como está — sem
 *    adivinhar o aro — e fica pendente (nunca vira Tire).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FONTE_NOME = "Nexen — Equipamento Original (nexentire.com/br)";
const FONTE_URL = "https://www.nexentire.com/br/product/original_equipment/";

type Row = { brand: string; model: string; size: string; product: string };

const RAW_ROWS: { brand: string; model: string; size: string; product: string }[] = JSON.parse(
  fs.readFileSync(
    "C:/Users/Wilson/AppData/Local/Temp/claude/c--Projetos-homologapneu/47f1c4ac-a537-447d-8833-f540b3bcce76/scratchpad/nexen-oem-parsed.json",
    "utf8"
  )
);

/** Correções de tamanho — erro de digitação confirmado na própria página
 * (ver comentário no topo do arquivo), não normalização especulativa. */
const SIZE_FIXES: Record<string, string> = {
  "235/55/19 105V": "235/55R19 105V",
  "235/60/18 103H": "235/60R18 103H",
  "215/65/16 102T": "215/65R16 102T",
};

/** Divide uma célula "marca combinada" ou "modelo combinado" em
 * aplicações separadas por veículo real — ver comentário no topo do
 * arquivo. Cada entrada é [marca real, modelo real]. `null` = sem
 * correção necessária (usa brand/model originais da linha). */
function splitCombined(row: Row): [string, string][] | null {
  const key = `${row.brand}|${row.model}`;
  const overrides: Record<string, [string, string][]> = {
    "BMW|1-SERIES/ 2-SERIES GT": [["BMW", "1-Series"], ["BMW", "2-Series Gran Tourer"]],
    "BMW|X1 / 5-SERIES": [["BMW", "X1"], ["BMW", "5-Series"]],
    "BMW|X3 / X4": [["BMW", "X3"], ["BMW", "X4"]],
    "AUDI|A6/A7": [["AUDI", "A6"], ["AUDI", "A7"]],
    "MINI|MINI 5 DOOR / HATCH": [["MINI", "5 Door"], ["MINI", "Hatch"]],
    "JEEP|WRANGLER/GLADIATOR": [["JEEP", "Wrangler"], ["JEEP", "Gladiator"]],
    "JEEP|GRAND CHEROKEE / DURANGO": [["JEEP", "Grand Cherokee"], ["DODGE", "Durango"]],
    "PSA|CITROEN BERLINGO/C3": [["CITROEN", "Berlingo"], ["CITROEN", "C3"]],
    "PSA|PEUGEOT PARTNER": [["PEUGEOT", "Partner"]],
    "RAM/JEEP|1500/WAGONEER": [["RAM", "1500"], ["JEEP", "Wagoneer"]],
    "KIA|China K8": [["KIA", "K8 (China)"]],
  };
  return overrides[key] ?? null;
}

/** Pesquisado em fontes confiáveis (nexentireusa.com, nexentirecanada.com,
 * retailers) antes de cadastrar — ver conversa/relatório para as fontes
 * citadas por linha. */
const CATEGORY_BY_PRODUCT: Record<string, TireCategory> = {
  "N'FERA SPORT SUV": "SUV",
  "N'FERA RU1": "SUV",
  "WINGUARD SPORT 2": "ESPORTIVO",
  "N'FERA SPORT": "ESPORTIVO",
  "N'FERA AU7": "PASSEIO",
  "N'FERA PRIMUS": "PASSEIO",
  "N'FERA SU1": "ESPORTIVO",
  "N'FERA SUPREME S": "PASSEIO",
  "N'BLUE S": "PASSEIO",
  "N'BLUE HD PLUS": "PASSEIO",
  "N'BLUE 4 SEASON": "PASSEIO",
  "N'PRIZ RH7": "SUV",
  "N'PRIZ RH7@": "SUV",
  "N'PRIZ AH8": "PASSEIO",
  "N'PRIZ AH5": "PASSEIO",
  "N'PRIZ S": "PASSEIO",
  "ROADIAN GTX": "SUV",
  "ROADIAN ATX": "SUV",
  "ROADIAN HTX": "SUV",
  "ROADIAN HTX 2": "SUV",
  "ROADIAN HTX RH5": "SUV",
  "ROADIAN AT PRO": "SUV",
  "ROADIAN CTX": "COMERCIAL",
  "ROADIAN CT8": "COMERCIAL",
  "ROADIAN CT8 HL": "COMERCIAL",
  "WINGUARD WT1": "COMERCIAL",
  CP321: "COMERCIAL",
};

async function findOrCreateManufacturerByName(name: string): Promise<number> {
  const existente = await resolveManufacturerId(prisma, name);
  if (existente) return existente.id;
  const criado = await prisma.manufacturer.create({
    data: { name, normalizedName: normalizeLookupKey(name), validationStatus: "NECESSITA_VALIDACAO", source: FONTE_NOME },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateTireManufacturerNexen(): Promise<number> {
  const existente = await prisma.tireManufacturer.findFirst({ where: { name: "Nexen" } });
  if (existente) return existente.id;
  const criado = await prisma.tireManufacturer.create({
    data: {
      name: "Nexen",
      slug: "nexen",
      country: "Coreia do Sul",
      website: "https://www.nexentire.com",
      validationStatus: "NECESSITA_VALIDACAO",
      source: FONTE_NOME,
    },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateTireModelId(tireManufacturerId: number, name: string, category: TireCategory): Promise<number> {
  const existente = await prisma.tireModel.findUnique({
    where: { tireManufacturerId_name: { tireManufacturerId, name } },
    select: { id: true },
  });
  if (existente) return existente.id;
  const criado = await prisma.tireModel.create({ data: { tireManufacturerId, name, category }, select: { id: true } });
  return criado.id;
}

async function main() {
  const tireManufacturerId = await findOrCreateTireManufacturerNexen();

  const catalog = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId, name: "Equipamento Original" } },
    create: { tireManufacturerId, name: "Equipamento Original" },
    update: {},
  });

  const catalogImport = await prisma.manufacturerCatalogImport.create({
    data: {
      catalogId: catalog.id,
      fileName: FONTE_URL,
      fileType: "API",
      status: "EXECUTANDO",
      totalRows: RAW_ROWS.length,
    },
  });

  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let aplicacoesVeiculo = 0;
  const pendentes: string[] = [];

  for (const [index, raw] of RAW_ROWS.entries()) {
    const rawSizeKey = raw.size;
    const size = SIZE_FIXES[rawSizeKey] ?? rawSizeKey;
    const row: Row = { brand: raw.brand, model: raw.model!, size, product: raw.product };

    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: { importId: catalogImport.id, rowNumber: index + 1, rawData: JSON.stringify(raw) },
    });

    const category = CATEGORY_BY_PRODUCT[row.product];
    const [medida, ...indiceTokens] = size.split(" ");
    const tamanhoParsed = parseTireSize(medida);
    const indiceParsed = parseTireIndex(indiceTokens.join(" ") || size);

    const produto = await prisma.manufacturerProduct.create({
      data: { catalogId: catalog.id, rowId: rowRecord.id, medida, descricao: `${size} ${row.product}` },
    });

    let tireId: number | null = null;
    if (category && tamanhoParsed && indiceParsed) {
      const tireModelId = await findOrCreateTireModelId(tireManufacturerId, row.product, category);
      const existente = await prisma.tire.findUnique({
        where: { tireManufacturerId_model_size: { tireManufacturerId, model: row.product, size: medida } },
        select: { id: true },
      });
      const tire =
        existente ??
        (await prisma.tire.create({
          data: {
            tireManufacturerId,
            tireModelId,
            brand: "Nexen",
            model: row.product,
            size: medida,
            width: tamanhoParsed.width,
            profile: tamanhoParsed.profile,
            rim: tamanhoParsed.rim,
            loadIndex: indiceParsed.loadIndex,
            speedIndex: indiceParsed.speedIndex,
            xl: indiceParsed.xl,
            runFlat: indiceParsed.runFlat,
            seal: indiceParsed.seal,
            category,
            validationStatus: "NECESSITA_VALIDACAO",
            source: FONTE_NOME,
          },
          select: { id: true },
        }));
      tireId = tire.id;
      pneusResolvidos++;
    } else {
      pneusPendentes++;
      pendentes.push(`${row.brand} ${row.model} — ${size} ${row.product}`);
    }

    if (tireId) {
      await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId } });
      await prisma.manufacturerCatalogRow.update({ where: { id: rowRecord.id }, data: { normalized: true } });
    }

    const veiculos = splitCombined(row) ?? [[row.brand, row.model] as [string, string]];
    for (const [vehicleBrand, vehicleModel] of veiculos) {
      const aplicacao = await prisma.manufacturerApplication.create({
        data: { productId: produto.id, vehicleBrand, vehicleModel },
      });
      await prisma.manufacturerHomologation.create({
        data: { applicationId: aplicacao.id, status: "HOMOLOGADO", homologado: true },
      });

      const manufacturerId = await findOrCreateManufacturerByName(vehicleBrand);
      const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, vehicleModel);
      await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
      aplicacoesVeiculo++;
    }
  }

  await prisma.manufacturerCatalogImport.update({
    where: { id: catalogImport.id },
    data: {
      status: pneusPendentes === 0 ? "CONCLUIDO" : "CONCLUIDO_COM_ERROS",
      processedRows: pneusResolvidos,
      errorRows: pneusPendentes,
      finishedAt: new Date(),
      log: pendentes.length ? JSON.stringify(pendentes) : null,
    },
  });

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({ total: RAW_ROWS.length, pneusResolvidos, pneusPendentes, aplicacoesVeiculo, pendentes }, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
