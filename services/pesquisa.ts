import "server-only";
import { prisma } from "@/lib/prisma";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import type { ResultadoPesquisa } from "@/types/homologation";
import type { Prisma } from "@prisma/client";

export async function buscarHomologacoes(
  filtros: PesquisaFiltros
): Promise<ResultadoPesquisa[]> {
  const where: Prisma.HomologationWhereInput = {};

  if (filtros.homologacao) {
    where.code = filtros.homologacao;
  }

  const vehicleWhere: Prisma.VehicleWhereInput = {};
  if (filtros.fabricante) {
    vehicleWhere.manufacturer = { name: filtros.fabricante };
  }
  if (filtros.modelo) {
    vehicleWhere.model = filtros.modelo;
  }
  if (filtros.ano) {
    const ano = Number(filtros.ano);
    vehicleWhere.yearStart = { lte: ano };
    vehicleWhere.yearEnd = { gte: ano };
  }
  if (filtros.motorizacao) {
    vehicleWhere.engine = filtros.motorizacao;
  }
  if (Object.keys(vehicleWhere).length > 0) {
    where.vehicle = vehicleWhere;
  }

  const tireWhere: Prisma.TireWhereInput = {};
  if (filtros.medida) {
    tireWhere.size = filtros.medida;
  }
  if (filtros.fabricantePneu) {
    tireWhere.tireManufacturer = { name: filtros.fabricantePneu };
  }
  if (filtros.runFlat) {
    tireWhere.runFlat = filtros.runFlat === "true";
  }
  if (filtros.xl) {
    tireWhere.xl = filtros.xl === "true";
  }
  if (filtros.indiceCarga) {
    tireWhere.loadIndex = filtros.indiceCarga;
  }
  if (filtros.indiceVelocidade) {
    tireWhere.speedIndex = filtros.indiceVelocidade;
  }
  if (filtros.categoria) {
    tireWhere.category = filtros.categoria;
  }
  if (filtros.segmento) {
    tireWhere.segment = filtros.segmento;
  }
  if (Object.keys(tireWhere).length > 0) {
    where.tire = tireWhere;
  }

  const homologacoes = await prisma.homologation.findMany({
    where,
    include: {
      vehicle: { include: { manufacturer: true } },
      tire: { include: { tireManufacturer: true } },
    },
    orderBy: [
      { vehicle: { manufacturer: { name: "asc" } } },
      { vehicle: { model: "asc" } },
    ],
  });

  await registrarBusca(filtros, homologacoes.length);

  return homologacoes.map((homologacao) => ({
    homologacaoId: homologacao.id,
    homologacaoCodigo: homologacao.code,
    homologacaoAno: homologacao.year,
    veiculoFabricante: homologacao.vehicle.manufacturer.name,
    veiculoModelo: homologacao.vehicle.model,
    veiculoAnoInicial: homologacao.vehicle.yearStart,
    veiculoAnoFinal: homologacao.vehicle.yearEnd,
    veiculoMotorizacao: homologacao.vehicle.engine,
    pneuFabricante: homologacao.tire.tireManufacturer.name,
    pneuModelo: homologacao.tire.model,
    pneuMedida: homologacao.tire.size,
    pneuIndiceCarga: homologacao.tire.loadIndex,
    pneuIndiceVelocidade: homologacao.tire.speedIndex,
    pneuRunFlat: homologacao.tire.runFlat,
    pneuXl: homologacao.tire.xl,
  }));
}

const ROTULOS_FILTRO: Record<string, string> = {
  fabricante: "Fabricante",
  modelo: "Modelo",
  ano: "Ano",
  motorizacao: "Motorização",
  medida: "Medida",
  homologacao: "Homologação",
  fabricantePneu: "Fabricante do Pneu",
  runFlat: "Run Flat",
  xl: "XL",
  indiceCarga: "Índice de Carga",
  indiceVelocidade: "Índice de Velocidade",
  categoria: "Categoria",
  segmento: "Segmento",
};

async function registrarBusca(filtros: PesquisaFiltros, resultCount: number) {
  const partes = Object.entries(filtros)
    .filter(([, valor]) => Boolean(valor))
    .map(([chave, valor]) => `${ROTULOS_FILTRO[chave] ?? chave}: ${valor}`);

  const resumo = partes.length > 0 ? partes.join(" · ") : "Pesquisa sem filtros";

  await prisma.searchLog.create({
    data: {
      resumo,
      veiculoBusca: filtros.modelo ?? filtros.fabricante ?? null,
      pneuBusca: filtros.medida ?? filtros.fabricantePneu ?? null,
      resultCount,
    },
  });
}
