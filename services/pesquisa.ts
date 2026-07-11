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
    vehicleWhere.year = Number(filtros.ano);
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

  return homologacoes.map((homologacao) => ({
    homologacaoId: homologacao.id,
    homologacaoCodigo: homologacao.code,
    veiculoFabricante: homologacao.vehicle.manufacturer.name,
    veiculoModelo: homologacao.vehicle.model,
    veiculoAno: homologacao.vehicle.year,
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
