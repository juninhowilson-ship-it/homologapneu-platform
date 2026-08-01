import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";

/**
 * Importa as 9 combinações reais do panfleto "Original de Fábrica 1.pdf"
 * (revenda Trevilub, "Caderno de Ofertas" Michelin) — transcrito
 * visualmente (não é planilha), cada linha conferida com o usuário antes
 * de gravar. Mesma regra combinada das outras marcas: cadastra
 * Montadora+Modelo+Pneu reais, nunca cria Homologation real (falta
 * motor/ano/versão).
 *
 * Este panfleto NÃO informa índice de carga/velocidade em nenhuma linha
 * (só aro+medida+modelo do pneu) — diferente do panfleto Goodyear/Sópneus.
 * Por isso NENHUMA linha vira Tire real aqui (schema exige loadIndex/
 * speedIndex reais, nunca inventados) — só o vínculo real
 * veículo+modelo-de-pneu+medida fica registrado na camada bruta
 * (ManufacturerProduct/Application), disponível para completar depois se
 * o índice for confirmado por outra fonte.
 *
 * Duas linhas têm um carro "extra" sem logo próprio ao lado (Hyundai HB20
 * junto de Peugeot/Citroën no aro 16 195/55R16; Ford EcoSport junto da
 * Chery no aro 17 205/50R17) — usuário confirmou incluir os dois como
 * aplicação real.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FONTE_NOME = "Michelin — Panfleto Revendedor Trevilub (Original de Fábrica 1.pdf)";

type Linha = {
  tireModel: string;
  medida: string;
  veiculos: { vehicleBrand: string; vehicleModel: string }[];
};

const LINHAS: Linha[] = [
  {
    tireModel: "Primacy 4",
    medida: "185/60R15",
    veiculos: [
      { vehicleBrand: "Hyundai", vehicleModel: "HB20 Sedan" },
      { vehicleBrand: "Hyundai", vehicleModel: "HB20" },
    ],
  },
  {
    tireModel: "Energy XM2+",
    medida: "185/65R15",
    veiculos: [{ vehicleBrand: "Renault", vehicleModel: "Logan" }],
  },
  {
    tireModel: "Primacy 4",
    medida: "195/55R16",
    veiculos: [
      { vehicleBrand: "Peugeot", vehicleModel: "208" },
      { vehicleBrand: "Citroën", vehicleModel: "C3" },
      { vehicleBrand: "Citroën", vehicleModel: "C3 Picasso" },
      { vehicleBrand: "Hyundai", vehicleModel: "HB20" }, // confirmado pelo usuário (sem logo próprio no panfleto)
    ],
  },
  {
    tireModel: "XM2",
    medida: "195/60R15",
    veiculos: [
      { vehicleBrand: "Peugeot", vehicleModel: "208" },
      { vehicleBrand: "Citroën", vehicleModel: "C3" },
      { vehicleBrand: "Citroën", vehicleModel: "C3 Picasso" },
    ],
  },
  {
    tireModel: "Primacy 4",
    medida: "195/65R15",
    veiculos: [
      { vehicleBrand: "Chevrolet", vehicleModel: "Onix Activ" },
      { vehicleBrand: "Chevrolet", vehicleModel: "Spin" },
      { vehicleBrand: "Chevrolet", vehicleModel: "Cobalt" },
    ],
  },
  {
    tireModel: "LTX Force",
    medida: "195/60R16",
    veiculos: [{ vehicleBrand: "Hyundai", vehicleModel: "HB20X" }],
  },
  {
    tireModel: "Agilis 3",
    medida: "205/75R16C",
    veiculos: [{ vehicleBrand: "Mercedes-Benz", vehicleModel: "Sprinter" }],
  },
  {
    tireModel: "Pilot Sport 3",
    medida: "205/45R17",
    veiculos: [
      { vehicleBrand: "Peugeot", vehicleModel: "208" },
      { vehicleBrand: "Renault", vehicleModel: "Sandero RS" },
    ],
  },
  {
    tireModel: "Primacy 4",
    medida: "205/50R17",
    veiculos: [
      { vehicleBrand: "Caoa Chery", vehicleModel: "Arrizo 6" },
      { vehicleBrand: "Caoa Chery", vehicleModel: "Arrizo 5" },
      { vehicleBrand: "Ford", vehicleModel: "EcoSport" }, // confirmado pelo usuário (sem logo próprio no panfleto)
    ],
  },
];

async function findOrCreateManufacturerByName(name: string): Promise<number> {
  const existente = await resolveManufacturerId(prisma, name);
  if (existente) return existente.id;
  const criado = await prisma.manufacturer.create({
    data: { name, normalizedName: normalizeLookupKey(name), validationStatus: "NECESSITA_VALIDACAO", source: FONTE_NOME },
    select: { id: true },
  });
  return criado.id;
}

async function main() {
  const michelin = await prisma.tireManufacturer.findFirst({ where: { name: "Michelin" } });
  if (!michelin) throw new Error('TireManufacturer "Michelin" não encontrado');

  const catalog = await prisma.manufacturerCatalog.upsert({
    where: { tireManufacturerId_name: { tireManufacturerId: michelin.id, name: "Panfleto Revendedor" } },
    create: { tireManufacturerId: michelin.id, name: "Panfleto Revendedor" },
    update: {},
  });
  const catalogImport = await prisma.manufacturerCatalogImport.create({
    data: { catalogId: catalog.id, fileName: "Original de Fábrica 1.pdf", fileType: "PDF", status: "EXECUTANDO", totalRows: 0 },
  });

  let veiculosResolvidos = 0;

  for (const [index, linha] of LINHAS.entries()) {
    const rowRecord = await prisma.manufacturerCatalogRow.create({
      data: { importId: catalogImport.id, rowNumber: index + 1, rawData: JSON.stringify(linha) },
    });
    const produto = await prisma.manufacturerProduct.create({
      data: {
        catalogId: catalog.id,
        rowId: rowRecord.id,
        medida: linha.medida,
        descricao: `${linha.medida} ${linha.tireModel} (sem índice de carga/velocidade na fonte)`,
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
    // Nenhuma linha vira Tire real: sem índice de carga/velocidade na fonte
    // (ver comentário no topo do arquivo) — fica pendente por completo.
  }

  await prisma.manufacturerCatalogImport.update({
    where: { id: catalogImport.id },
    data: { status: "CONCLUIDO_COM_ERROS", totalRows: LINHAS.length, processedRows: 0, errorRows: LINHAS.length, finishedAt: new Date() },
  });

  console.log("=== RESUMO ===");
  console.log(
    JSON.stringify(
      { totalLinhas: LINHAS.length, pneusResolvidos: 0, pneusPendentes: LINHAS.length, veiculosResolvidos },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
