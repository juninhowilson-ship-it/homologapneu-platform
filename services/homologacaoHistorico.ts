import "server-only";
import { prisma } from "@/lib/prisma";
import { getHomologacao } from "@/services/homologacoes";
import type { Homologacao } from "@/types/homologacao";
import type { AplicacaoCandidata } from "@/types/medida";

export type EventoHistorico = {
  id: number;
  acao: string;
  quem: string | null;
  quando: string;
  mudancas: string | null;
  loteId: number | null;
};

export type HistoricoHomologacao = {
  homologacao: Homologacao;
  eventos: EventoHistorico[];
  evidenciasRelacionadas: AplicacaoCandidata[];
};

/**
 * "Histórico da Homologação": mostra exatamente quais eventos de auditoria
 * (quem, quando, o quê) construíram este registro, e — quando existir —
 * quais evidências independentes (fabricante/montadora/manual/OE/
 * marketplace) sustentam a mesma aplicação pneu↔veículo. O cruzamento com
 * evidências é por correspondência de nome (best-effort, nunca inventa uma
 * relação que a evidência não confirme por si só).
 */
export async function buscarHistoricoHomologacao(id: number): Promise<HistoricoHomologacao> {
  const homologacao = await getHomologacao(id);

  const logs = await prisma.auditLog.findMany({
    where: { entity: "Homologation", entityId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const eventos: EventoHistorico[] = logs.map((log) => ({
    id: log.id,
    acao: log.action,
    quem: log.user?.name ?? null,
    quando: log.createdAt.toISOString(),
    mudancas: log.changes,
    loteId: log.importBatchId,
  }));

  const veiculo = await prisma.vehicleVersion.findUnique({
    where: { id: homologacao.vehicleId },
    select: { name: true, vehicleModel: { select: { name: true, manufacturer: { select: { name: true } } } } },
  });

  const evidenciasRelacionadas = veiculo
    ? await prisma.tireVehicleApplication.findMany({
        where: {
          vehicleManufacturerName: { equals: veiculo.vehicleModel.manufacturer.name, mode: "insensitive" },
          vehicleModel: { equals: veiculo.vehicleModel.name, mode: "insensitive" },
          vehicleVersion: { equals: veiculo.name, mode: "insensitive" },
        },
        orderBy: { confidence: "desc" },
      })
    : [];

  return {
    homologacao,
    eventos,
    evidenciasRelacionadas: evidenciasRelacionadas.map((c) => ({
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
  };
}
