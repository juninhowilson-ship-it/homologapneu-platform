import "server-only";
import { prisma } from "@/lib/prisma";
import type { OpcoesFiltroPesquisa } from "@/types/homologation";

export async function listarOpcoesFiltro(): Promise<OpcoesFiltroPesquisa> {
  const [
    manufacturers,
    vehicleModels,
    vehicleYearRanges,
    vehicleEngines,
    tireSizes,
    homologationCodes,
    tireManufacturers,
    loadIndexes,
    speedIndexes,
  ] = await Promise.all([
    prisma.manufacturer.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      select: { model: true },
      distinct: ["model"],
      orderBy: { model: "asc" },
    }),
    prisma.vehicle.findMany({
      select: { yearStart: true, yearEnd: true },
    }),
    prisma.vehicle.findMany({
      select: { engine: true },
      distinct: ["engine"],
      orderBy: { engine: "asc" },
    }),
    prisma.tire.findMany({
      select: { size: true },
      distinct: ["size"],
      orderBy: { size: "asc" },
    }),
    prisma.homologation.findMany({
      select: { code: true },
      distinct: ["code"],
      orderBy: { code: "asc" },
    }),
    prisma.tireManufacturer.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tire.findMany({
      select: { loadIndex: true },
      distinct: ["loadIndex"],
    }),
    prisma.tire.findMany({
      select: { speedIndex: true },
      distinct: ["speedIndex"],
      orderBy: { speedIndex: "asc" },
    }),
  ]);

  const anosCobertos = new Set<number>();
  for (const range of vehicleYearRanges) {
    for (let ano = range.yearStart; ano <= range.yearEnd; ano++) {
      anosCobertos.add(ano);
    }
  }

  return {
    fabricantes: manufacturers.map((m) => m.name),
    modelos: vehicleModels.map((v) => v.model),
    anos: Array.from(anosCobertos).sort((a, b) => b - a),
    motorizacoes: vehicleEngines.map((v) => v.engine),
    medidas: tireSizes.map((t) => t.size),
    homologacoes: homologationCodes.map((h) => h.code),
    fabricantesPneu: tireManufacturers.map((tm) => tm.name),
    indicesCarga: loadIndexes
      .map((t) => t.loadIndex)
      .sort((a, b) => Number(a) - Number(b)),
    indicesVelocidade: speedIndexes.map((t) => t.speedIndex),
  };
}
