import "server-only";
import { prisma } from "@/lib/prisma";

export type AuditFinding = {
  categoria: string;
  severidade: "erro" | "aviso";
  descricao: string;
  corrigidoAutomaticamente: boolean;
};

const RIM_RANGE_BY_CATEGORY: Record<string, [number, number]> = {
  HATCH: [13, 18],
  SEDAN: [14, 19],
  SUV: [15, 21],
  PICAPE: [15, 22],
  PERUA: [14, 19],
  MINIVAN: [14, 18],
  COUPE: [16, 21],
};

async function auditarMedidasDePneu(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const tires = await prisma.tire.findMany();

  for (const tire of tires) {
    const medidaEsperada = `${tire.width}/${tire.profile}R${tire.rim}`;
    if (tire.size !== medidaEsperada) {
      await prisma.tire.update({
        where: { id: tire.id },
        data: { size: medidaEsperada },
      });
      findings.push({
        categoria: "Medida incorreta",
        severidade: "erro",
        descricao: `Pneu #${tire.id} (${tire.brand} ${tire.model}) tinha medida "${tire.size}" divergente de largura/perfil/aro; corrigida para "${medidaEsperada}".`,
        corrigidoAutomaticamente: true,
      });
    }
  }

  return findings;
}

async function auditarHomologacoes(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const tires = await prisma.tire.findMany();
  const homologations = await prisma.homologation.findMany({
    include: {
      tires: true,
      vehicleVersion: {
        include: { vehicleModel: { include: { manufacturer: true } } },
      },
    },
  });

  for (const h of homologations) {
    const veiculoLabel = `${h.vehicleVersion.vehicleModel.manufacturer.name} ${h.vehicleVersion.vehicleModel.name} ${h.vehicleVersion.name}`;

    if (h.tires.length === 0) {
      findings.push({
        categoria: "Dado órfão",
        severidade: "erro",
        descricao: `Homologação #${h.id} (${veiculoLabel}) não possui nenhum pneu vinculado.`,
        corrigidoAutomaticamente: false,
      });
      continue;
    }

    const originais = h.tires.filter((t) => t.role === "ORIGINAL");

    if (originais.length === 0) {
      findings.push({
        categoria: "Homologação inconsistente",
        severidade: "erro",
        descricao: `Homologação #${h.id} (${veiculoLabel}) não possui pneu ORIGINAL definido. Requer correção manual.`,
        corrigidoAutomaticamente: false,
      });
    } else if (originais.length > 1) {
      for (const extra of originais.slice(1)) {
        await prisma.homologationTire.update({
          where: { id: extra.id },
          data: { role: "OPCIONAL" },
        });
      }
      findings.push({
        categoria: "Homologação inconsistente",
        severidade: "erro",
        descricao: `Homologação #${h.id} tinha ${originais.length} pneus marcados como ORIGINAL; mantido o primeiro, os demais foram convertidos para OPCIONAL.`,
        corrigidoAutomaticamente: true,
      });
    }

    const [min, max] =
      RIM_RANGE_BY_CATEGORY[h.vehicleVersion.category] ?? [13, 22];
    for (const entry of h.tires) {
      const tire = tires.find((t) => t.id === entry.tireId);
      if (tire && (tire.rim < min || tire.rim > max)) {
        findings.push({
          categoria: "Pneu incompatível",
          severidade: "erro",
          descricao: `Homologação #${h.id} (${h.vehicleVersion.vehicleModel.name}, categoria ${h.vehicleVersion.category}) usa pneu aro ${tire.rim}, fora da faixa plausível ${min}-${max} para essa categoria.`,
          corrigidoAutomaticamente: false,
        });
      }
    }
  }

  return findings;
}

async function auditarVersoesDuplicadas(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const versions = await prisma.vehicleVersion.findMany({
    include: {
      vehicleModel: { include: { manufacturer: true } },
      engine: true,
    },
  });

  const porChave = new Map<string, typeof versions>();
  for (const v of versions) {
    const chave = `${v.vehicleModelId}|${v.name.trim().toLowerCase()}`;
    const lista = porChave.get(chave) ?? [];
    lista.push(v);
    porChave.set(chave, lista);
  }

  for (const lista of porChave.values()) {
    if (lista.length > 1) {
      findings.push({
        categoria: "Versão duplicada",
        severidade: "aviso",
        descricao: `${lista.length} cadastros para "${lista[0].vehicleModel.manufacturer.name} ${lista[0].vehicleModel.name} ${lista[0].name}" com motorizações diferentes (${lista.map((v) => v.engine.name).join(", ")}). Verifique se é intencional.`,
        corrigidoAutomaticamente: false,
      });
    }
  }

  return findings;
}

async function auditarDadosNecessitandoValidacao(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  const [veiculos, pneus, homologacoes] = await Promise.all([
    prisma.vehicleVersion.count({
      where: { validationStatus: "NECESSITA_VALIDACAO" },
    }),
    prisma.tire.count({ where: { validationStatus: "NECESSITA_VALIDACAO" } }),
    prisma.homologation.count({
      where: { validationStatus: "NECESSITA_VALIDACAO" },
    }),
  ]);

  const total = veiculos + pneus + homologacoes;
  if (total > 0) {
    findings.push({
      categoria: "Necessita Validação",
      severidade: "aviso",
      descricao: `${total} registro(s) aguardando validação: ${veiculos} veículo(s), ${pneus} pneu(s), ${homologacoes} homologação(ões). Revise em cada cadastro e marque como Validado quando confirmado.`,
      corrigidoAutomaticamente: false,
    });
  }

  return findings;
}

export async function executarAuditoria(): Promise<AuditFinding[]> {
  const [medidas, homologacoes, versoes, necessitandoValidacao] =
    await Promise.all([
      auditarMedidasDePneu(),
      auditarHomologacoes(),
      auditarVersoesDuplicadas(),
      auditarDadosNecessitandoValidacao(),
    ]);

  return [...medidas, ...homologacoes, ...versoes, ...necessitandoValidacao];
}

export type LogAuditoria = {
  id: number;
  entity: string;
  entityId: number;
  action: string;
  userName: string | null;
  importBatchId: number | null;
  changes: string | null;
  createdAt: string;
};

/**
 * Leitura paginada, somente-consulta, da trilha de auditoria (AuditLog) já
 * gravada pelos serviços existentes (registrarCriacao/registrarAtualizacao/
 * registrarAlteracaoManual). Não escreve nada no banco.
 */
export async function listarAuditLogs(params: {
  page: number;
  pageSize: number;
  entity?: string;
}): Promise<{ data: LogAuditoria[]; total: number }> {
  const where = params.entity ? { entity: params.entity } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id,
      entity: log.entity,
      entityId: log.entityId,
      action: log.action,
      userName: log.user?.name ?? null,
      importBatchId: log.importBatchId,
      changes: log.changes,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
  };
}
