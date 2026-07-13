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

  const vehicleWhere: Prisma.VehicleVersionWhereInput = {};
  const vehicleModelWhere: Prisma.VehicleModelWhereInput = {};
  if (filtros.fabricante) {
    vehicleModelWhere.manufacturer = { name: filtros.fabricante };
  }
  if (filtros.modelo) {
    vehicleModelWhere.name = filtros.modelo;
  }
  if (Object.keys(vehicleModelWhere).length > 0) {
    vehicleWhere.vehicleModel = vehicleModelWhere;
  }
  if (filtros.ano) {
    const ano = Number(filtros.ano);
    vehicleWhere.yearStart = { lte: ano };
    vehicleWhere.yearEnd = { gte: ano };
  }
  if (filtros.motorizacao) {
    vehicleWhere.engine = { name: filtros.motorizacao };
  }
  if (Object.keys(vehicleWhere).length > 0) {
    where.vehicleVersion = vehicleWhere;
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
    where.tires = { some: { tire: tireWhere } };
  }

  const homologacoes = await prisma.homologation.findMany({
    where,
    include: {
      vehicleVersion: {
        include: {
          vehicleModel: { include: { manufacturer: true } },
          engine: true,
        },
      },
      tires: { include: { tire: { include: { tireManufacturer: true } } } },
    },
    orderBy: [
      { vehicleVersion: { vehicleModel: { manufacturer: { name: "asc" } } } },
      { vehicleVersion: { vehicleModel: { name: "asc" } } },
    ],
  });

  await registrarBusca(filtros, homologacoes.length);

  return homologacoes.flatMap((homologacao) =>
    homologacao.tires.map((tireEntry) => ({
      homologacaoId: homologacao.id,
      homologacaoCodigo: homologacao.code,
      homologacaoAno: homologacao.year,
      veiculoFabricante: homologacao.vehicleVersion.vehicleModel.manufacturer.name,
      veiculoModelo: homologacao.vehicleVersion.vehicleModel.name,
      veiculoAnoInicial: homologacao.vehicleVersion.yearStart,
      veiculoAnoFinal: homologacao.vehicleVersion.yearEnd,
      veiculoMotorizacao: homologacao.vehicleVersion.engine.name,
      pneuTipo: tireEntry.role,
      pneuFabricante: tireEntry.tire.tireManufacturer.name,
      pneuModelo: tireEntry.tire.model,
      pneuMedida: tireEntry.tire.size,
      pneuIndiceCarga: tireEntry.tire.loadIndex,
      pneuIndiceVelocidade: tireEntry.tire.speedIndex,
      pneuRunFlat: tireEntry.tire.runFlat,
      pneuXl: tireEntry.tire.xl,
    }))
  );
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
