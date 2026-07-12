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
    include: { tires: true, vehicle: { include: { manufacturer: true } } },
  });

  for (const h of homologations) {
    if (h.tires.length === 0) {
      findings.push({
        categoria: "Dado órfão",
        severidade: "erro",
        descricao: `Homologação #${h.id} (${h.vehicle.manufacturer.name} ${h.vehicle.model} ${h.vehicle.version}) não possui nenhum pneu vinculado.`,
        corrigidoAutomaticamente: false,
      });
      continue;
    }

    const originais = h.tires.filter((t) => t.role === "ORIGINAL");

    if (originais.length === 0) {
      findings.push({
        categoria: "Homologação inconsistente",
        severidade: "erro",
        descricao: `Homologação #${h.id} (${h.vehicle.manufacturer.name} ${h.vehicle.model}) não possui pneu ORIGINAL definido. Requer correção manual.`,
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

    const [min, max] = RIM_RANGE_BY_CATEGORY[h.vehicle.category] ?? [13, 22];
    for (const entry of h.tires) {
      const tire = tires.find((t) => t.id === entry.tireId);
      if (tire && (tire.rim < min || tire.rim > max)) {
        findings.push({
          categoria: "Pneu incompatível",
          severidade: "erro",
          descricao: `Homologação #${h.id} (${h.vehicle.model}, categoria ${h.vehicle.category}) usa pneu aro ${tire.rim}, fora da faixa plausível ${min}-${max} para essa categoria.`,
          corrigidoAutomaticamente: false,
        });
      }
    }
  }

  return findings;
}

async function auditarVersoesDuplicadas(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const vehicles = await prisma.vehicle.findMany({
    include: { manufacturer: true },
  });

  const porChave = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const chave = `${v.manufacturerId}|${v.model.trim().toLowerCase()}|${v.version.trim().toLowerCase()}`;
    const lista = porChave.get(chave) ?? [];
    lista.push(v);
    porChave.set(chave, lista);
  }

  for (const lista of porChave.values()) {
    if (lista.length > 1) {
      findings.push({
        categoria: "Versão duplicada",
        severidade: "aviso",
        descricao: `${lista.length} cadastros para "${lista[0].manufacturer.name} ${lista[0].model} ${lista[0].version}" com motorizações diferentes (${lista.map((v) => v.engine).join(", ")}). Verifique se é intencional.`,
        corrigidoAutomaticamente: false,
      });
    }
  }

  return findings;
}

export async function executarAuditoria(): Promise<AuditFinding[]> {
  const [medidas, homologacoes, versoes] = await Promise.all([
    auditarMedidasDePneu(),
    auditarHomologacoes(),
    auditarVersoesDuplicadas(),
  ]);

  return [...medidas, ...homologacoes, ...versoes];
}
