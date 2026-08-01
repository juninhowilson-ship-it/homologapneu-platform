import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveManufacturerId } from "@/lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "@/lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "@/lib/masterData/normalizeName";
import { resolvePirelliTireModel } from "@/lib/importer/manufacturerCatalog/mappings/pirelliTireModels";
import { parseTireSize, parseTireIndex } from "@/lib/importer/manufacturerCatalog/tireSpec";
import { registrarEvidencia } from "@/services/homologationEvidence";

/**
 * Promove produtos/aplicações já gravados na camada de Catálogo de
 * Fabricante (ManufacturerProduct/Application) para a Base Mestre real —
 * SEMPRE por resolução determinística (dicionário confirmado de modelo de
 * pneu + find-or-create de Manufacturer/VehicleModel), NUNCA inventando
 * dado ausente. Duas garantias estruturais deliberadas (decisão do
 * usuário):
 *
 * 1. Nunca cria Homologation real — essa exige uma VehicleVersion com
 *    Engine/combustível/ano, que o catálogo do fabricante não informa.
 *    Marcar homologado=true aqui só resolve Tire+VehicleModel; a
 *    Homologation em si fica pendente de pesquisa humana (ver
 *    listarPendenciasHomologacao).
 * 2. Nunca infere aplicação de OUTRAS marcas de pneu pela mesma medida —
 *    o schema já documenta esse princípio em TireEquivalence ("nunca
 *    inferido automaticamente"); só registra o que o PRÓPRIO fabricante
 *    (aqui, Pirelli) declarou.
 */

const FONTE_NOME = "Pirelli — Tabela de Aplicação e Homologação (Abril 2026)";
const FONTE_URL = "arquivo-local:Pirelli-Tabela-Aplicacao-Homologacao-Abril-2026";
const FONTE_DATA = new Date("2026-04-01T00:00:00.000Z");

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

async function findOrCreateTireModelId(
  tireManufacturerId: number,
  name: string,
  category: import("@prisma/client").TireCategory
): Promise<number> {
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

async function findOrCreateTireId(params: {
  tireManufacturerId: number;
  tireModelId: number;
  tireModelName: string;
  size: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: string;
  speedIndex: string;
  xl: boolean;
  runFlat: boolean;
  seal: boolean;
  category: import("@prisma/client").TireCategory;
}): Promise<number> {
  // @@unique([tireManufacturerId, model, size]) — só existe um Tire por
  // combinação de fabricante+modelo+medida; variações de índice/XL do
  // mesmo modelo+medida reaproveitam o mesmo registro (o primeiro
  // catálogo a resolver essa combinação define os índices gravados).
  const existente = await prisma.tire.findUnique({
    where: {
      tireManufacturerId_model_size: {
        tireManufacturerId: params.tireManufacturerId,
        model: params.tireModelName,
        size: params.size,
      },
    },
    select: { id: true },
  });
  if (existente) return existente.id;

  const criado = await prisma.tire.create({
    data: {
      tireManufacturerId: params.tireManufacturerId,
      tireModelId: params.tireModelId,
      brand: "Pirelli",
      model: params.tireModelName,
      size: params.size,
      width: params.width,
      profile: params.profile,
      rim: params.rim,
      loadIndex: params.loadIndex,
      speedIndex: params.speedIndex,
      xl: params.xl,
      runFlat: params.runFlat,
      seal: params.seal,
      category: params.category,
      validationStatus: "NECESSITA_VALIDACAO",
      source: FONTE_NOME,
    },
    select: { id: true },
  });
  return criado.id;
}

export type PromocaoResumo = {
  produtosProcessados: number;
  pneusResolvidos: number;
  pneusPendentes: number;
  aplicacoesProcessadas: number;
  veiculosResolvidos: number;
  evidenciasCriadas: number;
  evidenciasDuplicadas: number;
};

export async function promoverCatalogoPirelli(): Promise<PromocaoResumo> {
  const fabricante = await prisma.tireManufacturer.findFirst({ where: { name: "Pirelli" } });
  if (!fabricante) throw new Error('TireManufacturer "Pirelli" não encontrado');

  const produtos = await prisma.manufacturerProduct.findMany({
    where: { catalogId: { in: (await prisma.manufacturerCatalog.findMany({ where: { tireManufacturerId: fabricante.id }, select: { id: true } })).map((c) => c.id) }, tireId: null },
    include: { applications: { include: { homologations: true } } },
  });

  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;
  let aplicacoesProcessadas = 0;
  let evidenciasCriadas = 0;
  let evidenciasDuplicadas = 0;

  for (const produto of produtos) {
    if (!produto.descricao || !produto.medida) {
      pneusPendentes++;
      continue;
    }

    const modeloInfo = resolvePirelliTireModel(produto.descricao);
    const tamanho = parseTireSize(produto.medida);
    const indice = parseTireIndex(produto.descricao);

    if (!modeloInfo || !tamanho || !indice) {
      pneusPendentes++;
      continue;
    }

    const tireModelId = await findOrCreateTireModelId(fabricante.id, modeloInfo.tireModelName, modeloInfo.category);
    const tireId = await findOrCreateTireId({
      tireManufacturerId: fabricante.id,
      tireModelId,
      tireModelName: modeloInfo.tireModelName,
      size: produto.medida,
      ...tamanho,
      ...indice,
      category: modeloInfo.category,
    });

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId } });
    pneusResolvidos++;

    for (const aplicacao of produto.applications) {
      aplicacoesProcessadas++;

      let vehicleModelId = aplicacao.vehicleModelId;
      if (!vehicleModelId) {
        const manufacturerId = await findOrCreateManufacturerByName(aplicacao.vehicleBrand);
        vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, aplicacao.vehicleModel);
        await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
        veiculosResolvidos++;
      }

      const homologado = aplicacao.homologations.some((h) => h.homologado === true);
      if (homologado) continue; // fica pendente de pesquisa de motor/ano/versão — nunca vira Homologation aqui

      const resultado = await registrarEvidencia({
        tireManufacturerName: "Pirelli",
        tireModel: modeloInfo.tireModelName,
        tireSize: produto.medida,
        vehicleManufacturerName: aplicacao.vehicleBrand,
        vehicleModel: aplicacao.vehicleModel,
        vehicleVersion: null,
        yearStart: null,
        yearEnd: null,
        sourceUrl: FONTE_URL,
        sourceName: FONTE_NOME,
        sourceType: "FABRICANTE_PNEU",
        collectedAt: FONTE_DATA,
      });

      if (resultado.duplicada) evidenciasDuplicadas++;
      else evidenciasCriadas++;
    }
  }

  return {
    produtosProcessados: produtos.length,
    pneusResolvidos,
    pneusPendentes,
    aplicacoesProcessadas,
    veiculosResolvidos,
    evidenciasCriadas,
    evidenciasDuplicadas,
  };
}
