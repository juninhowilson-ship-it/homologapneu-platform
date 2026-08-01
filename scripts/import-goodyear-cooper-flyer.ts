import "dotenv/config";
import { PrismaClient, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";
import { parseTireSize } from "../lib/importer/manufacturerCatalog/tireSpec";

/**
 * Importa as 6 combinações reais do panfleto "GOODYER 2026.jpeg" (revenda
 * Sópneus, revendedor oficial Goodyear) — transcrito visualmente (não é
 * planilha), cada linha conferida com o usuário antes de gravar. Mesma
 * regra combinada das outras marcas: cadastra Montadora+Modelo+Pneu reais,
 * nunca cria Homologation real (falta motor/ano/versão).
 *
 * Fonte é um panfleto de revendedor terceiro, não a Goodyear/Cooper
 * diretamente — por isso sourceType usado na promoção (fase seguinte) deve
 * ser DISTRIBUIDOR_OFICIAL, não FABRICANTE_PNEU.
 *
 * Duas linhas do pneu "COOPER EVOLUTION CTT" são da marca Cooper Tire
 * (hoje parte do grupo Goodyear, mas marca comercial própria e distinta —
 * mesmo padrão já usado para Bridgestone/Firestone), não Goodyear.
 *
 * Linha "GELLY / FORD" (erro de digitação de "GEELY") citava só as marcas,
 * sem nome de modelo — diferente de todas as outras linhas do panfleto,
 * que nomeiam o modelo. Sem conseguir identificar os modelos exatos só
 * pela imagem, o pneu é cadastrado mas SEM vínculo de veículo (usuário
 * não confirmou os modelos quando perguntado).
 *
 * "Rampage" confirmado pelo usuário como RAM Rampage.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FONTE_NOME = "Goodyear/Cooper — Panfleto Revendedor Sópneus (GOODYER 2026.jpeg)";

type Linha = {
  tireManufacturer: "Goodyear" | "Cooper";
  tireModel: string;
  medida: string;
  indiceTexto: string;
  veiculos: { vehicleBrand: string; vehicleModel: string }[];
};

const LINHAS: Linha[] = [
  {
    tireManufacturer: "Goodyear",
    tireModel: "Wrangler Territory HT",
    medida: "235/45R19",
    indiceTexto: "95V",
    veiculos: [{ vehicleBrand: "Volkswagen", vehicleModel: "Taos" }],
  },
  {
    tireManufacturer: "Goodyear",
    tireModel: "EfficientGrip SUV",
    medida: "235/55R18",
    indiceTexto: "104V XL",
    veiculos: [
      { vehicleBrand: "Volkswagen", vehicleModel: "Tiguan" },
      { vehicleBrand: "Caoa Chery", vehicleModel: "Tiggo 8" },
      { vehicleBrand: "Jeep", vehicleModel: "Commander" },
    ],
  },
  {
    tireManufacturer: "Cooper",
    tireModel: "Evolution CTT",
    medida: "235/55R18",
    indiceTexto: "100V SL",
    veiculos: [{ vehicleBrand: "Caoa Chery", vehicleModel: "Tiggo 8" }],
  },
  {
    tireManufacturer: "Goodyear",
    tireModel: "EfficientGrip Perf SUV",
    medida: "235/50R19",
    indiceTexto: "99V",
    veiculos: [], // "Gelly/Ford" sem modelo identificável — ver comentário no topo
  },
  {
    tireManufacturer: "Goodyear",
    tireModel: "EfficientGrip SUV",
    medida: "235/55R19",
    indiceTexto: "105V XL",
    veiculos: [
      { vehicleBrand: "GWM", vehicleModel: "H6" },
      { vehicleBrand: "RAM", vehicleModel: "Rampage" },
      { vehicleBrand: "Chevrolet", vehicleModel: "Equinox" },
    ],
  },
  {
    tireManufacturer: "Cooper",
    tireModel: "Evolution CTT",
    medida: "235/55R19",
    indiceTexto: "105H XL",
    veiculos: [{ vehicleBrand: "GWM", vehicleModel: "H6" }],
  },
];

const CATEGORY: TireCategory = "SUV"; // todas as linhas: nome comercial do próprio pneu já diz "SUV" (Wrangler Territory HT, EfficientGrip SUV/Perf SUV, Cooper Evolution CTT — linha crossover/SUV).

function parseIndice(texto: string): { loadIndex: string; speedIndex: string; xl: boolean } | null {
  const match = texto.match(/(\d{2,3})([A-Z])/);
  if (!match) return null;
  return { loadIndex: match[1], speedIndex: match[2], xl: /\bXL\b/i.test(texto) };
}

async function findOrCreateTireManufacturer(name: "Goodyear" | "Cooper"): Promise<number> {
  const existente = await prisma.tireManufacturer.findFirst({ where: { name } });
  if (existente) return existente.id;
  const criado = await prisma.tireManufacturer.create({
    data: {
      name,
      slug: name.toLowerCase(),
      country: "Estados Unidos",
      website: name === "Goodyear" ? "https://www.goodyear.com.br" : "https://www.coopertire.com",
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

async function main() {
  const goodyearId = await findOrCreateTireManufacturer("Goodyear");
  const cooperId = await findOrCreateTireManufacturer("Cooper");

  const catalogGy = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId: goodyearId, name: "Panfleto Revendedor" } },
    create: { tireManufacturerId: goodyearId, name: "Panfleto Revendedor" },
    update: {},
  });
  const catalogCp = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId: cooperId, name: "Panfleto Revendedor" } },
    create: { tireManufacturerId: cooperId, name: "Panfleto Revendedor" },
    update: {},
  });
  const importGy = await prisma.manufacturerCatalogImport.create({
    data: { catalogId: catalogGy.id, fileName: "GOODYER 2026.jpeg", fileType: "PDF", status: "EXECUTANDO", totalRows: 0 },
  });
  const importCp = await prisma.manufacturerCatalogImport.create({
    data: { catalogId: catalogCp.id, fileName: "GOODYER 2026.jpeg", fileType: "PDF", status: "EXECUTANDO", totalRows: 0 },
  });

  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;

  for (const [index, linha] of LINHAS.entries()) {
    const tireManufacturerId = linha.tireManufacturer === "Goodyear" ? goodyearId : cooperId;
    const catalog = linha.tireManufacturer === "Goodyear" ? catalogGy : catalogCp;
    const catalogImport = linha.tireManufacturer === "Goodyear" ? importGy : importCp;

    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: { importId: catalogImport.id, rowNumber: index + 1, rawData: JSON.stringify(linha) },
    });
    const produto = await prisma.manufacturerProduct.create({
      data: {
        catalogId: catalog.id,
        rowId: rowRecord.id,
        medida: linha.medida,
        descricao: `${linha.medida} ${linha.indiceTexto} ${linha.tireModel}`,
      },
    });

    for (const veiculo of linha.veiculos) {
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
    }

    const tamanho = parseTireSize(linha.medida);
    const indice = parseIndice(linha.indiceTexto);
    if (!tamanho || !indice) {
      pneusPendentes++;
      continue;
    }

    const tireModelId = await findOrCreateTireModelId(tireManufacturerId, linha.tireModel, CATEGORY);
    const existente = await prisma.tire.findUnique({
      where: { tireManufacturerId_model_size: { tireManufacturerId, model: linha.tireModel, size: linha.medida } },
      select: { id: true },
    });
    const tire =
      existente ??
      (await prisma.tire.create({
        data: {
          tireManufacturerId,
          tireModelId,
          brand: linha.tireManufacturer,
          model: linha.tireModel,
          size: linha.medida,
          width: tamanho.width,
          profile: tamanho.profile,
          rim: tamanho.rim,
          loadIndex: indice.loadIndex,
          speedIndex: indice.speedIndex,
          xl: indice.xl,
          runFlat: false,
          seal: false,
          category: CATEGORY,
          validationStatus: "NECESSITA_VALIDACAO",
          source: FONTE_NOME,
        },
        select: { id: true },
      }));

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId: tire.id } });
    await prisma.manufacturerCatalogRow.update({ where: { id: rowRecord.id }, data: { normalized: true } });
    pneusResolvidos++;
  }

  for (const catalogImport of [importGy, importCp]) {
    await prisma.manufacturerCatalogImport.update({
      where: { id: catalogImport.id },
      data: { status: "CONCLUIDO", totalRows: LINHAS.length, finishedAt: new Date() },
    });
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({ totalLinhas: LINHAS.length, pneusResolvidos, pneusPendentes, veiculosResolvidos }, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
