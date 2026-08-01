import "dotenv/config";
import { PrismaClient, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";
import { parseTireSize, parseTireIndex } from "../lib/importer/manufacturerCatalog/tireSpec";

/**
 * Importa o catálogo real "GITI OEM.pdf" ("Pneus Originais de Fábrica") —
 * ao contrário do catálogo da Pirelli, aqui NÃO existe distinção
 * homologado/aplicação: o documento inteiro já declara que toda linha é
 * equipamento original de fábrica. Segue a mesma regra combinada para a
 * Pirelli: cadastra Montadora+Modelo+Pneu reais na Base Mestre, mas NUNCA
 * cria Homologation real (exige VehicleVersion com Engine/combustível/
 * ano, que este catálogo não informa) — fica marcado como pendente de
 * pesquisa via ManufacturerHomologation (camada de catálogo).
 *
 * Nomes de modelo de pneu já vêm limpos da fonte ("GitiComfort F22",
 * "GitiXross HT71") — sem código a decifrar, ao contrário da Pirelli.
 * Categoria (TireCategory) pesquisada em fontes confiáveis antes de
 * cadastrar qualquer TireModel (giti.com, lam.giti.com, GT Radial,
 * retailers) — nunca adivinhada.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FONTE_NOME = "Giti — Pneus Originais de Fábrica (catálogo OEM)";

type Row = { marca: string; modelo: string; tamanho: string; pneu: string };

const ROWS: Row[] = [
  { marca: "BYD", modelo: "FRIGATE 05", tamanho: "215/55R17 94V", pneu: "GitiComfort F22" },
  { marca: "BYD", modelo: "FRIGATE 05", tamanho: "225/60R16 98V", pneu: "GitiComfort F22" },
  { marca: "BYD", modelo: "HAN", tamanho: "245/45R19 98V", pneu: "GitiControl P10" },
  { marca: "BYD", modelo: "QIN PLUS (KING)", tamanho: "215/55R17 94V", pneu: "GitiComfort F22" },
  { marca: "BYD", modelo: "QIN PLUS (KING)", tamanho: "225/60R16 98V", pneu: "GitiComfort F22" },
  { marca: "BYD", modelo: "SEAL", tamanho: "225/50R18 95V", pneu: "GitiComfort 225 V1" },
  { marca: "BYD", modelo: "SHARK", tamanho: "265/65R18 114T", pneu: "GitiXross HT71" },
  { marca: "BYD", modelo: "SONG PLUS", tamanho: "235/50R19 99V", pneu: "GitiComfort 225 V1" },
  { marca: "BYD", modelo: "SONG PRO", tamanho: "225/60R18 100H", pneu: "GitiComfort F50" },

  { marca: "CHERY", modelo: "ARRIZO 6", tamanho: "205/50R17 93V XL", pneu: "GitiComfort F22" },

  { marca: "CHEVROLET", modelo: "CAPTIVA", tamanho: "215/55R18 95V", pneu: "GitiComfort F50" },
  { marca: "CHEVROLET", modelo: "GROOVE", tamanho: "205/60R16 92V", pneu: "GitiComfort 228v1" },

  { marca: "FORD", modelo: "FORD TERRITORY", tamanho: "235/55R18 100V", pneu: "GitiComfort F50+" },

  { marca: "FOTON", modelo: "AUMARK", tamanho: "205/75R16 10PR", pneu: "GitiVan 600V1" },
  { marca: "FOTON", modelo: "AUMARK", tamanho: "205/75R17.5 14PR", pneu: "GAR820" },
  { marca: "FOTON", modelo: "AUMARK", tamanho: "215/75R17.5 14PR", pneu: "GAR820" },
  { marca: "FOTON", modelo: "AUMARK", tamanho: "235/75R17.5 14PR", pneu: "GAR820" },
  { marca: "FOTON", modelo: "AUMARK", tamanho: "7.00R16LT 12PR", pneu: "PAL528" },

  { marca: "GAC MOTOR", modelo: "EMKOO", tamanho: "235/55R19 101V", pneu: "GitiComfort 225 V1" },
  { marca: "GAC MOTOR", modelo: "EMPOW", tamanho: "225/45R18 95V XL", pneu: "GitiComfort F22" },
  { marca: "GAC MOTOR", modelo: "GS3", tamanho: "215/55R18 95H", pneu: "GitiComfort F50" },
  { marca: "GAC MOTOR", modelo: "GS4", tamanho: "225/55R18 98V", pneu: "GitiComfort F50" },
  { marca: "GAC MOTOR", modelo: "GS4", tamanho: "225/60R17 99H", pneu: "GitiComfort F50" },
  { marca: "GAC MOTOR", modelo: "GS4 PLUS", tamanho: "235/50R19 99V", pneu: "GitiComfort F50" },

  { marca: "GWM", modelo: "HAVAL DARGO", tamanho: "235/60R19 107H XL", pneu: "GitiComfort F50" },
  { marca: "GWM", modelo: "HAVAL DARGO", tamanho: "235/65R18 106V", pneu: "GitiComfort F50" },
  { marca: "GWM", modelo: "HAVAL H3", tamanho: "225/60R18 100H", pneu: "GitiComfort F50" },
  { marca: "GWM", modelo: "ORA 3", tamanho: "215/50R18 96V XL", pneu: "GitiComfort 225 V1" },

  { marca: "JAC", modelo: "E40X / E-JS4", tamanho: "225/45R18 95V XL", pneu: "GitiComfort F22" },
  { marca: "JAC", modelo: "E-J7", tamanho: "215/55R17 94V", pneu: "GitiComfort F22" },
  { marca: "JAC", modelo: "E-JS1", tamanho: "165/65R14 79T", pneu: "GitiComfort 220" },
  { marca: "JAC", modelo: "HUNTER", tamanho: "265/60R18 110H", pneu: "Giti4×4 HT152" },
  { marca: "JAC", modelo: "JS3", tamanho: "205/55R16 94V XL", pneu: "GitiComfort 221 V1" },
  { marca: "JAC", modelo: "T8 PRO", tamanho: "265/60R18 110S", pneu: "Giti4x4 AT70" },
  { marca: "JAC", modelo: "X4", tamanho: "215/50R17 95V XL", pneu: "GitiComfort F22" },

  { marca: "JMC", modelo: "DADAO", tamanho: "265/65R17 112T", pneu: "GitiXross HT71" },

  { marca: "MG", modelo: "MG3", tamanho: "185/65R15 88H", pneu: "GitiComfort 228" },
  { marca: "MG", modelo: "MG3", tamanho: "185/70R14 88H", pneu: "Champiro 728" },
  { marca: "MG", modelo: "MG3", tamanho: "195/55R16 91H XL", pneu: "GitiComfort 228" },

  { marca: "PEUGEOT", modelo: "NEW 2008", tamanho: "215/60R17 96H", pneu: "FE2" },
  { marca: "PEUGEOT", modelo: "NEW 3008", tamanho: "225/55R19 103V", pneu: "GitiXross HT71" },

  { marca: "VOLKSWAGEN", modelo: "POLO", tamanho: "195/55R16 91V XL", pneu: "GitiComfort 228" },

  { marca: "VWCO", modelo: "DELIVERY", tamanho: "215/75R17.5 14PR", pneu: "GAR820" },
  { marca: "VWCO", modelo: "DELIVERY", tamanho: "235/75R17.5 14PR", pneu: "GAR820" },
];

/** Pesquisado em fontes confiáveis (giti.com, lam.giti.com, GT Radial,
 * retailers) antes de cadastrar — ver comentário no topo do arquivo. */
const CATEGORY_BY_MODEL: Record<string, TireCategory> = {
  "GitiComfort F22": "PASSEIO",
  "GitiComfort F50": "PASSEIO",
  "GitiComfort F50+": "PASSEIO",
  "GitiComfort 225 V1": "PASSEIO",
  "GitiComfort 228": "PASSEIO",
  "GitiComfort 228v1": "PASSEIO",
  "GitiComfort 220": "PASSEIO",
  "GitiComfort 221 V1": "PASSEIO",
  "GitiControl P10": "ESPORTIVO",
  "GitiXross HT71": "SUV",
  "GitiVan 600V1": "COMERCIAL",
  "Giti4×4 HT152": "SUV",
  "Giti4x4 AT70": "SUV",
  "GAR820": "COMERCIAL",
  // Sem confirmação direta em fonte — inferido pelo contexto (mesma linha
  // FOTON Aumark/caminhão do GAR820, tamanho de pneu de carga "7.00R16LT
  // 12PR"), não uma adivinhação sem base.
  "PAL528": "COMERCIAL",
  FE2: "SUV",
  "Champiro 728": "PASSEIO",
};

function splitSizeAndIndex(tamanho: string): { medida: string; indiceTexto: string } {
  const [medida, ...resto] = tamanho.split(" ");
  return { medida, indiceTexto: resto.join(" ") };
}

async function findOrCreateManufacturerByName(name: string): Promise<number> {
  const existente = await resolveManufacturerId(prisma, name);
  if (existente) return existente.id;

  const criado = await prisma.manufacturer.create({
    data: {
      name,
      normalizedName: normalizeLookupKey(name),
      validationStatus: "NECESSITA_VALIDACAO",
      source: FONTE_NOME,
    },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateTireManufacturerGiti(): Promise<number> {
  const existente = await prisma.tireManufacturer.findFirst({ where: { name: "Giti" } });
  if (existente) return existente.id;

  const criado = await prisma.tireManufacturer.create({
    data: {
      name: "Giti",
      slug: "giti",
      country: "Cingapura",
      website: "https://www.giti.com",
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

  const criado = await prisma.tireModel.create({
    data: { tireManufacturerId, name, category },
    select: { id: true },
  });
  return criado.id;
}

async function main() {
  const tireManufacturerId = await findOrCreateTireManufacturerGiti();

  const catalog = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId, name: "Pneus Originais de Fábrica" } },
    create: { tireManufacturerId, name: "Pneus Originais de Fábrica" },
    update: {},
  });

  const catalogImport = await prisma.manufacturerCatalogImport.create({
    data: {
      catalogId: catalog.id,
      fileName: "GITI OEM.pdf",
      fileType: "PDF",
      status: "EXECUTANDO",
      totalRows: ROWS.length,
    },
  });

  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;
  const pendentes: string[] = [];

  for (const [index, row] of ROWS.entries()) {
    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: { importId: catalogImport.id, rowNumber: index + 1, rawData: JSON.stringify(row) },
    });

    const category = CATEGORY_BY_MODEL[row.pneu];
    const { medida, indiceTexto } = splitSizeAndIndex(row.tamanho);
    const tamanhoParsed = parseTireSize(medida);
    const indiceParsed = parseTireIndex(indiceTexto || row.tamanho);

    const produto = await prisma.manufacturerProduct.create({
      data: {
        catalogId: catalog.id,
        rowId: rowRecord.id,
        medida,
        descricao: `${row.tamanho} ${row.pneu}`,
      },
    });

    const aplicacao = await prisma.manufacturerApplication.create({
      data: { productId: produto.id, vehicleBrand: row.marca, vehicleModel: row.modelo },
    });

    await prisma.manufacturerHomologation.create({
      data: { applicationId: aplicacao.id, status: "HOMOLOGADO", homologado: true },
    });

    // Veículo: sempre resolvível (não depende do dicionário de pneu).
    const manufacturerId = await findOrCreateManufacturerByName(row.marca);
    const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, row.modelo);
    await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
    veiculosResolvidos++;

    if (!category || !tamanhoParsed || !indiceParsed) {
      pneusPendentes++;
      pendentes.push(`${row.marca} ${row.modelo} — ${row.tamanho} ${row.pneu}`);
      continue;
    }

    const tireModelId = await findOrCreateTireModelId(tireManufacturerId, row.pneu, category);
    const existente = await prisma.tire.findUnique({
      where: { tireManufacturerId_model_size: { tireManufacturerId, model: row.pneu, size: medida } },
      select: { id: true },
    });
    const tire =
      existente ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          tireModelId,
          brand: "Giti",
          model: row.pneu,
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

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId: tire.id } });
    await prisma.manufacturerCatalogRow.update({ where: { id: rowRecord.id }, data: { normalized: true } });
    pneusResolvidos++;
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
  console.log(JSON.stringify({ total: ROWS.length, pneusResolvidos, pneusPendentes, veiculosResolvidos, pendentes }, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
