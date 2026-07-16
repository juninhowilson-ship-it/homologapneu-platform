import "server-only";
import { prisma } from "@/lib/prisma";
import { getVeiculo } from "@/services/veiculos";
import { listHomologacoes } from "@/services/homologacoes";
import type { Veiculo } from "@/types/veiculo";
import type { Homologacao } from "@/types/homologacao";

export type VersaoIrma = {
  id: number;
  name: string;
  yearStart: number;
  yearEnd: number;
  engineName: string;
  imageUrl: string | null;
};

export type EventoTimelineVeiculo = {
  id: number;
  acao: string;
  quem: string | null;
  quando: string;
  mudancas: string | null;
};

export type DocumentoVeiculo = {
  id: number;
  name: string;
  url: string;
  type: string | null;
  createdAt: string;
};

export type FichaVeiculo = {
  veiculo: Veiculo;
  versoesIrmas: VersaoIrma[];
  homologacoes: Homologacao[];
  medidas: string[];
  documentos: DocumentoVeiculo[];
  timeline: EventoTimelineVeiculo[];
};

/**
 * Ficha consolidada do veículo (versões da mesma família, medidas
 * homologadas, documentos e linha do tempo de auditoria) usada pela página
 * interna /veiculo/[id] — requer sessão autenticada (ver proxy.ts).
 */
export async function obterFichaVeiculo(id: number): Promise<FichaVeiculo | null> {
  const versaoBase = await prisma.vehicleVersion.findUnique({
    where: { id },
    select: { vehicleModelId: true },
  });

  if (!versaoBase) return null;

  const [veiculo, irmas, { data: homologacoes }, documentos, logs] =
    await Promise.all([
      getVeiculo(id),
      prisma.vehicleVersion.findMany({
        where: { vehicleModelId: versaoBase.vehicleModelId },
        include: { engine: true, images: true },
        orderBy: [{ yearStart: "desc" }],
      }),
      listHomologacoes({
        vehicleId: id,
        page: 1,
        pageSize: 50,
        sortBy: "year",
        sortDir: "desc",
      }),
      prisma.vehicleDocument.findMany({
        where: { vehicleVersionId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { entity: "VehicleVersion", entityId: id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const medidas = Array.from(
    new Set(homologacoes.flatMap((h) => h.tires.map((t) => t.size)))
  ).sort();

  return {
    veiculo,
    versoesIrmas: irmas.map((v) => ({
      id: v.id,
      name: v.name,
      yearStart: v.yearStart,
      yearEnd: v.yearEnd,
      engineName: v.engine.name,
      imageUrl:
        v.images.find((img) => img.type === "PRINCIPAL")?.url ??
        v.images[0]?.url ??
        null,
    })),
    homologacoes,
    medidas,
    documentos: documentos.map((doc) => ({
      id: doc.id,
      name: doc.name,
      url: doc.url,
      type: doc.type,
      createdAt: doc.createdAt.toISOString(),
    })),
    timeline: logs.map((log) => ({
      id: log.id,
      acao: log.action,
      quem: log.user?.name ?? null,
      quando: log.createdAt.toISOString(),
      mudancas: log.changes,
    })),
  };
}
