import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  BuscaPorMedida,
  FabricantePneuNaMedida,
  MedidaResumo,
} from "@/types/medida";

/**
 * Busca reversa: MEDIDA é a unidade principal. A partir de uma medida,
 * navega Fabricantes de pneu -> Modelos -> Veículos compatíveis ->
 * Versões -> Homologações — sempre separando o que já é uma Homologação
 * CONFIRMADA (tabela Homologation, dado real e já validado no fluxo
 * existente) do que é uma aplicação CANDIDATA ainda em consolidação por
 * evidências (TireVehicleApplication). Nunca funde as duas coisas.
 */

function normalizarMedida(valor: string): string {
  return valor.trim().toUpperCase().replace(/\s+/g, "");
}

export async function listarMedidas(): Promise<MedidaResumo[]> {
  const tires = await prisma.tire.findMany({
    select: {
      size: true,
      homologationTires: {
        select: {
          homologation: { select: { id: true, vehicleVersionId: true } },
        },
      },
    },
  });

  const porMedida = new Map<
    string,
    { pneus: Set<string>; veiculos: Set<number>; homologacoes: Set<number> }
  >();

  for (const tire of tires) {
    const chave = tire.size;
    if (!porMedida.has(chave)) {
      porMedida.set(chave, { pneus: new Set(), veiculos: new Set(), homologacoes: new Set() });
    }
    const grupo = porMedida.get(chave)!;
    grupo.pneus.add(chave);
    for (const ht of tire.homologationTires) {
      grupo.homologacoes.add(ht.homologation.id);
      grupo.veiculos.add(ht.homologation.vehicleVersionId);
    }
  }

  // Reconta pneus corretamente (o Set acima só marcava presença da medida).
  const contagemPneus = new Map<string, number>();
  for (const tire of tires) {
    contagemPneus.set(tire.size, (contagemPneus.get(tire.size) ?? 0) + 1);
  }

  return Array.from(porMedida.entries())
    .map(([medida, grupo]) => ({
      medida,
      totalPneus: contagemPneus.get(medida) ?? 0,
      totalVeiculos: grupo.veiculos.size,
      totalHomologacoes: grupo.homologacoes.size,
    }))
    .sort((a, b) => b.totalHomologacoes - a.totalHomologacoes || a.medida.localeCompare(b.medida));
}

export async function buscarPorMedida(medidaBruta: string): Promise<BuscaPorMedida> {
  const medida = normalizarMedida(medidaBruta);

  const pneus = await prisma.tire.findMany({
    where: { size: medida },
    include: {
      tireManufacturer: { select: { id: true, name: true } },
      homologationTires: {
        include: {
          homologation: {
            include: {
              vehicleVersion: {
                include: {
                  vehicleModel: { include: { manufacturer: true } },
                  engine: true,
                  transmission: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ tireManufacturer: { name: "asc" } }, { model: "asc" }],
  });

  const fabricantesMap = new Map<number, FabricantePneuNaMedida>();

  for (const pneu of pneus) {
    if (!fabricantesMap.has(pneu.tireManufacturer.id)) {
      fabricantesMap.set(pneu.tireManufacturer.id, {
        fabricanteId: pneu.tireManufacturer.id,
        fabricante: pneu.tireManufacturer.name,
        modelos: [],
      });
    }

    const veiculosPorVersao = new Map<
      number,
      FabricantePneuNaMedida["modelos"][number]["veiculosCompativeis"][number]
    >();

    for (const ht of pneu.homologationTires) {
      const versao = ht.homologation.vehicleVersion;
      if (!veiculosPorVersao.has(versao.id)) {
        veiculosPorVersao.set(versao.id, {
          vehicleVersionId: versao.id,
          fabricante: versao.vehicleModel.manufacturer.name,
          modelo: versao.vehicleModel.name,
          versao: versao.name,
          anoInicial: versao.yearStart,
          anoFinal: versao.yearEnd,
          motor: versao.engine.name,
          combustivel: versao.engine.fuel,
          transmissao: versao.transmission?.type ?? null,
          tracao: versao.drivetrain,
          categoria: versao.category,
          homologacoesConfirmadas: [],
        });
      }
      veiculosPorVersao.get(versao.id)!.homologacoesConfirmadas.push({
        homologacaoId: ht.homologation.id,
        codigo: ht.homologation.code,
        ano: ht.homologation.year,
        status: ht.homologation.validationStatus,
        papel: ht.role,
        fonte: ht.homologation.source,
        validadoPor: ht.homologation.validatedBy,
        validadoEm: ht.homologation.validatedAt?.toISOString() ?? null,
      });
    }

    fabricantesMap.get(pneu.tireManufacturer.id)!.modelos.push({
      tireId: pneu.id,
      modelo: pneu.model,
      ean: pneu.ean,
      indiceCarga: pneu.loadIndex,
      indiceVelocidade: pneu.speedIndex,
      runFlat: pneu.runFlat,
      xl: pneu.xl,
      veiculosCompativeis: Array.from(veiculosPorVersao.values()),
    });
  }

  const candidatas = await prisma.tireVehicleApplication.findMany({
    where: { tireSize: medida },
    orderBy: { confidence: "desc" },
  });

  const totalVeiculos = new Set(
    Array.from(fabricantesMap.values()).flatMap((f) =>
      f.modelos.flatMap((m) => m.veiculosCompativeis.map((v) => v.vehicleVersionId))
    )
  ).size;
  const totalHomologacoesConfirmadas = Array.from(fabricantesMap.values()).reduce(
    (soma, f) =>
      soma +
      f.modelos.reduce(
        (s2, m) =>
          s2 + m.veiculosCompativeis.reduce((s3, v) => s3 + v.homologacoesConfirmadas.length, 0),
        0
      ),
    0
  );

  return {
    medida,
    fabricantesPneus: Array.from(fabricantesMap.values()),
    aplicacoesCandidatas: candidatas.map((c) => ({
      applicationId: c.id,
      tireManufacturerName: c.tireManufacturerName,
      tireModel: c.tireModel,
      vehicleManufacturerName: c.vehicleManufacturerName,
      vehicleModel: c.vehicleModel,
      vehicleVersion: c.vehicleVersion,
      yearStart: c.yearStart,
      yearEnd: c.yearEnd,
      status: c.status,
      confidence: c.confidence,
      evidenceCount: c.evidenceCount,
    })),
    totalPneus: pneus.length,
    totalVeiculos,
    totalHomologacoesConfirmadas,
  };
}
