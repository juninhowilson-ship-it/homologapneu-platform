import "dotenv/config";
import ExcelJS from "exceljs";
import * as fs from "node:fs";
import { PrismaClient, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";
import { parseTireSize, parseTireIndex } from "../lib/importer/manufacturerCatalog/tireSpec";

/**
 * Importa o catálogo real "BRIDGESTONE FEV 22.xlsx" (planilha real
 * fornecida pelo usuário, mesma pasta da Pirelli/Continental) — mesma
 * regra combinada: cadastra Montadora+Modelo+Pneu reais, nunca cria
 * Homologation real (falta motor/ano/versão), homologado=true só quando a
 * própria linha tem um veículo de equipamento original real (não "-").
 *
 * Peculiaridades REAIS da planilha, tratadas explicitamente (nunca
 * adivinhadas):
 *
 * 1. Coluna MARCA mistura dois fabricantes de pneu reais e distintos:
 *    BRIDGESTONE e FIRESTONE (mesmo grupo corporativo, marcas comerciais
 *    diferentes) — tratados como dois TireManufacturer separados.
 *
 * 2. Coluna "EQUIPAMENTO ORIGINAL" empacota múltiplos veículos por
 *    célula, com separadores inconsistentes (";" e "&", às vezes uma nova
 *    marca aparece só depois de ";" sem "&"). A regra real observada nos
 *    144 valores distintos desta coluna (ver scripts/_inspect5.ts desta
 *    sessão, já removido): depois de dividir por ";" e "&", cada segmento
 *    que COMEÇA com um nome de montadora reconhecido inicia uma nova
 *    marca corrente; qualquer segmento que não comece com uma montadora
 *    reconhecida é um modelo adicional da marca corrente. Testado contra
 *    os 144 valores reais antes de rodar (ver dry-run abaixo).
 *
 * 3. Anotações entre parênteses — mercado de exportação "(EXP: ...)",
 *    geração/código de chassi "(E87)", "(952)", "(VW326)" — são
 *    descartadas da extração de veículo (não são um veículo, são uma nota
 *    sobre o mesmo veículo já identificado) mas o texto original completo
 *    fica preservado em ManufacturerApplication via o raw da linha.
 *
 * 4. Duas células cujo conteúdo não permite identificar uma montadora real
 *    sem adivinhar ficam SEM vínculo de veículo (pneu ainda é cadastrado
 *    normalmente): "New City" (nenhuma marca reconhecível no texto) e
 *    "Fiat IVECO" (IVECO é fabricante próprio, não um modelo Fiat — vincular
 *    a "Fiat" seria inventar um modelo que não existe).
 *
 * 5. Coluna "MARCAÇÃO ESPECIAL" traz o código de homologação/fitment OE
 *    real desta linha (AO, MO, MOE, N0, N1, AOE, "* RSC") quando existe —
 *    grava em OeCode vinculado a cada montadora real já resolvida nesta
 *    linha (nunca cria OeCode sem uma montadora real por trás).
 *
 * 6. Coluna "RUN-FLAT": RFT = run-flat confirmado (runFlat=true). NRFT,
 *    EXT, SLT ou vazio => runFlat=false — EXT/SLT são marcações Bridgestone
 *    cujo significado exato não foi verificado nesta sessão; tratadas como
 *    não-run-flat por padrão conservador, não confirmadas como o oposto.
 *
 * 7. Categoria (TireCategory) por linha de produto: dicionário abaixo
 *    baseado em conhecimento geral já consolidado sobre essas linhas
 *    comerciais globais da Bridgestone/Firestone (Turanza/Ecopia =
 *    passeio; Dueler/Destination = SUV; Potenza/Firehawk = esportivo;
 *    Duravis/CV5000 = comercial) — NÃO é uma pesquisa em página específica
 *    feita nesta sessão, ao contrário do dicionário da Pirelli. Sinalizado
 *    explicitamente no relatório para o usuário poder revisar se quiser
 *    mais rigor aqui.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SOURCE_DIR = "C:/Users/Wilson/OneDrive/Desktop/TRABALHO/EQUIPAMENTOS ORIGINAIS";
const FONTE_NOME = "Bridgestone/Firestone — Portfólio OE (BRIDGESTONE FEV 22.xlsx)";

const CATEGORY_BY_MODEL: Record<string, TireCategory> = {
  "ALENZA 001": "SUV",
  "ALENZA H/L33": "SUV",
  B250: "PASSEIO",
  "DUELER A/T 693": "SUV",
  "DUELER A/T 693 III": "SUV",
  "DUELER A/T REVO2": "SUV",
  "DUELER A/T RH-S": "SUV",
  "DUELER H/L 33": "SUV",
  "DUELER H/L 33A": "SUV",
  "DUELER H/P SPORT": "SUV",
  "DUELER H/T 684": "SUV",
  "DUELER H/T 684 II": "SUV",
  "DUELER H/T 684 II ECOPIA": "SUV",
  "DUELER H/T 684 III": "SUV",
  "DUELER H/T 684 III ECOPIA": "SUV",
  "DUELER H/T 685": "SUV",
  "DUELER H/T 687": "SUV",
  "DUELER H/T 689": "SUV",
  "DUELER H/T 840": "SUV",
  "DUELER HL400": "SUV",
  "DURAVIS R630": "COMERCIAL",
  "ECOPIA EP150": "PASSEIO",
  "ECOPIA EP422 PLUS": "PASSEIO",
  EP500: "PASSEIO",
  "POTENZA RE050": "ESPORTIVO",
  "POTENZA RE050A": "ESPORTIVO",
  "POTENZA RE050A I": "ESPORTIVO",
  "POTENZA RE050A II": "ESPORTIVO",
  "POTENZA S001": "ESPORTIVO",
  "POTENZA S007": "ESPORTIVO",
  "TURANZA EL400": "PASSEIO",
  "TURANZA ER30": "PASSEIO",
  "TURANZA ER300": "PASSEIO",
  "TURANZA ER300 ECOPIA": "PASSEIO",
  "TURANZA ER300 I": "PASSEIO",
  "TURANZA ER33": "PASSEIO",
  "TURANZA ER370": "PASSEIO",
  "TURANZA T001": "PASSEIO",
  "TURANZA T005": "PASSEIO",
  "TURANZA T005 AD": "PASSEIO",
  "TURANZA T005A": "PASSEIO",
  CV5000: "COMERCIAL",
  "DESTINATION A/T": "SUV",
  "DESTINATION ATX": "SUV",
  "DESTINATION H/T": "SUV",
  "DESTINATION LE2": "SUV",
  "DESTINATION M/T 23º": "SUV",
  "F-700": "PASSEIO",
  "FIREHAWK 900": "ESPORTIVO",
  MULTIHAWK: "PASSEIO",
};

// Ordem importa: tokens de duas palavras antes dos de uma palavra, para
// não casar só a primeira palavra de "Alfa Romeo" com um "Alfa" isolado
// (que nem aparece nesta planilha, mas mantém a regra segura).
const BRAND_TOKENS: { token: string; canonical: string }[] = [
  { token: "Alfa Romeo", canonical: "Alfa Romeo" },
  { token: "BMW", canonical: "BMW" },
  { token: "Chevrolet", canonical: "Chevrolet" },
  { token: "GM", canonical: "Chevrolet" },
  { token: "Toyota", canonical: "Toyota" },
  { token: "Nissan", canonical: "Nissan" },
  { token: "Jeep", canonical: "Jeep" },
  { token: "Honda", canonical: "Honda" },
  { token: "VW", canonical: "Volkswagen" },
  { token: "Fiat", canonical: "Fiat" },
  { token: "Peugeot", canonical: "Peugeot" },
  { token: "Renault", canonical: "Renault" },
  { token: "Mercedes", canonical: "Mercedes-Benz" },
  { token: "Audi", canonical: "Audi" },
  { token: "Porsche", canonical: "Porsche" },
  { token: "Mini", canonical: "Mini" },
  { token: "Hyundai", canonical: "Hyundai" },
  { token: "Ferrari", canonical: "Ferrari" },
  { token: "Subaru", canonical: "Subaru" },
  { token: "Lexus", canonical: "Lexus" },
  { token: "Suzuki", canonical: "Suzuki" },
  { token: "Mitsubishi", canonical: "Mitsubishi" },
];

// Células inteiras que não permitem identificar uma montadora real sem
// adivinhar (ver item 4 do comentário no topo do arquivo).
const EQUIPAMENTO_SEM_MARCA_IDENTIFICAVEL = new Set(["New City", "Fiat IVECO"]);

type VeiculoResolvido = { vehicleBrand: string; vehicleModel: string };

function parseEquipamentoOriginal(raw: string): VeiculoResolvido[] {
  if (!raw || raw === "-" || EQUIPAMENTO_SEM_MARCA_IDENTIFICAVEL.has(raw)) return [];

  const semParenteses = raw.replace(/\([^)]*\)/g, "").trim();
  const segmentos = semParenteses
    .split(/[;&]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const resultado: VeiculoResolvido[] = [];
  let marcaAtual: string | null = null;

  for (const segmento of segmentos) {
    const match = BRAND_TOKENS.find(
      (b) => segmento.toLowerCase() === b.token.toLowerCase() || segmento.toLowerCase().startsWith(b.token.toLowerCase() + " ")
    );
    if (match) {
      marcaAtual = match.canonical;
      const modelo = segmento.slice(match.token.length).trim();
      if (modelo) resultado.push({ vehicleBrand: marcaAtual, vehicleModel: modelo });
      continue;
    }
    if (marcaAtual) {
      resultado.push({ vehicleBrand: marcaAtual, vehicleModel: segmento });
    }
    // Sem marcaAtual e sem match: segmento inicial não reconhecido —
    // ignorado (não inventa marca), célula inteira já teria caído no
    // Set de exclusão explícita se fosse um caso conhecido como esse.
  }
  return resultado;
}

function parseMarcacaoEspecial(raw: string): string | null {
  const texto = raw.trim();
  if (!texto || texto === "-" || texto === "*") return null;
  return texto.replace(/^\*\s*/, "").trim() || null;
}

async function findOrCreateTireManufacturer(name: "Bridgestone" | "Firestone"): Promise<number> {
  const existente = await prisma.tireManufacturer.findFirst({ where: { name } });
  if (existente) return existente.id;
  const criado = await prisma.tireManufacturer.create({
    data: {
      name,
      slug: name.toLowerCase(),
      country: "Japão",
      website: name === "Bridgestone" ? "https://www.bridgestone.com.br" : "https://www.firestone.com.br",
      validationStatus: "NECESSITA_VALIDACAO",
      source: FONTE_NOME,
    },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateManufacturerByName(name: string): Promise<number> {
  const existente = await resolveManufacturerId(prisma, name);
  if (existente) return existente.id;
  const criado = await prisma.manufacturer.create({
    data: { name, normalizedName: normalizeLookupKey(name), validationStatus: "NECESSITA_VALIDACAO", source: FONTE_NOME },
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

async function findOrCreateOeCode(vehicleManufacturerId: number, code: string): Promise<void> {
  await prisma.oeCode.upsert({
    where: { vehicleManufacturerId_code: { vehicleManufacturerId, code } },
    create: { vehicleManufacturerId, code, source: FONTE_NOME },
    update: {},
  });
}

async function main() {
  const buffer = fs.readFileSync(`${SOURCE_DIR}/BRIDGESTONE FEV 22.xlsx`);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];

  const bridgestoneId = await findOrCreateTireManufacturer("Bridgestone");
  const firestoneId = await findOrCreateTireManufacturer("Firestone");

  const catalogBs = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId: bridgestoneId, name: "Portfólio OE" } },
    create: { tireManufacturerId: bridgestoneId, name: "Portfólio OE" },
    update: {},
  });
  const catalogFs = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId: firestoneId, name: "Portfólio OE" } },
    create: { tireManufacturerId: firestoneId, name: "Portfólio OE" },
    update: {},
  });

  const importBs = await prisma.manufacturerCatalogImport.create({
    data: { catalogId: catalogBs.id, fileName: "BRIDGESTONE FEV 22.xlsx", fileType: "XLSX", status: "EXECUTANDO", totalRows: 0 },
  });
  const importFs = await prisma.manufacturerCatalogImport.create({
    data: { catalogId: catalogFs.id, fileName: "BRIDGESTONE FEV 22.xlsx", fileType: "XLSX", status: "EXECUTANDO", totalRows: 0 },
  });

  let totalLinhas = 0;
  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;
  let oeCodesCriados = 0;
  const pendentes: string[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const medida = String(row.getCell(2).value ?? "").trim();
    const descricao = String(row.getCell(4).value ?? "").trim();
    const marcacaoEspecial = String(row.getCell(5).value ?? "").trim();
    const runFlatRaw = String(row.getCell(6).value ?? "").trim();
    const marca = String(row.getCell(8).value ?? "").trim();
    const modeloPneu = String(row.getCell(9).value ?? "").trim();
    const equipamentoOriginal = String(row.getCell(10).value ?? "").trim();
    const status = String(row.getCell(11).value ?? "").trim();

    if (!medida || !marca || !modeloPneu) continue;
    if (marca !== "Bridgestone" && marca.toUpperCase() !== "BRIDGESTONE" && marca.toUpperCase() !== "FIRESTONE") continue;

    const tireManufacturerId = marca.toUpperCase() === "BRIDGESTONE" ? bridgestoneId : firestoneId;
    const catalog = marca.toUpperCase() === "BRIDGESTONE" ? catalogBs : catalogFs;
    const catalogImport = marca.toUpperCase() === "BRIDGESTONE" ? importBs : importFs;

    totalLinhas++;
    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: { importId: catalogImport.id, rowNumber: totalLinhas, rawData: JSON.stringify(row.values) },
    });

    const produto = await prisma.manufacturerProduct.create({
      data: {
        catalogId: catalog.id,
        rowId: rowRecord.id,
        medida,
        descricao: descricao || null,
        phaseOut: status === "EM DESCONTINUAÇÃO",
      },
    });

    const veiculos = parseEquipamentoOriginal(equipamentoOriginal);
    const codigoOe = parseMarcacaoEspecial(marcacaoEspecial);

    for (const veiculo of veiculos) {
      const aplicacao = await prisma.manufacturerApplication.create({
        data: { productId: produto.id, vehicleBrand: veiculo.vehicleBrand, vehicleModel: veiculo.vehicleModel },
      });
      await prisma.manufacturerHomologation.create({
        data: { applicationId: aplicacao.id, status: "HOMOLOGADO", homologado: true },
      });
      const manufacturerId = await findOrCreateManufacturerByName(veiculo.vehicleBrand);
      const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, veiculo.vehicleModel);
      await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
      veiculosResolvidos++;

      if (codigoOe) {
        await findOrCreateOeCode(manufacturerId, codigoOe);
        oeCodesCriados++;
      }
    }

    const tamanho = parseTireSize(medida);
    const indice = descricao ? parseTireIndex(descricao) : null;
    const category = CATEGORY_BY_MODEL[modeloPneu.toUpperCase()];
    if (!tamanho || !indice || !category) {
      pneusPendentes++;
      pendentes.push(
        `${marca} ${modeloPneu} — ${medida} (${!tamanho ? "medida não reconhecida" : !indice ? "índice não reconhecido na descrição" : "categoria não confirmada"})`
      );
      continue;
    }

    const runFlat = runFlatRaw.toUpperCase() === "RFT";
    const tireModelId = await findOrCreateTireModelId(tireManufacturerId, modeloPneu, category);
    const existente = await prisma.tire.findUnique({
      where: { tireManufacturerId_model_size: { tireManufacturerId, model: modeloPneu, size: medida } },
      select: { id: true },
    });
    const tire =
      existente ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          tireModelId,
          brand: marca,
          model: modeloPneu,
          size: medida,
          width: tamanho.width,
          profile: tamanho.profile,
          rim: tamanho.rim,
          loadIndex: indice.loadIndex,
          speedIndex: indice.speedIndex,
          runFlat,
          xl: indice.xl,
          seal: indice.seal,
          category,
          validationStatus: "NECESSITA_VALIDACAO",
          source: FONTE_NOME,
        },
        select: { id: true },
      }));

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId: tire.id } });
    await prisma.manufacturerCatalogRow.update({ where: { id: rowRecord.id }, data: { normalized: true } });
    pneusResolvidos++;
  }

  for (const [catalogImport, count] of [
    [importBs, totalLinhas] as const,
    [importFs, totalLinhas] as const,
  ]) {
    await prisma.manufacturerCatalogImport.update({
      where: { id: catalogImport.id },
      data: { status: "CONCLUIDO_COM_ERROS", totalRows: count, finishedAt: new Date() },
    });
  }

  console.log("=== RESUMO ===");
  console.log(
    JSON.stringify(
      { totalLinhas, pneusResolvidos, pneusPendentes, veiculosResolvidos, oeCodesCriados, pendentes: pendentes.slice(0, 60) },
      null,
      2
    )
  );
  console.log(`Total de linhas pendentes: ${pendentes.length}`);
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
