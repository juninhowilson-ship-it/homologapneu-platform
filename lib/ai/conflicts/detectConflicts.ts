import "server-only";
import { prisma } from "@/lib/prisma";
import type { AiConflictSeverity, AiConflictType } from "@prisma/client";
import type { ExtractedMeasure } from "@/lib/ai/document/extractMeasures";
import type { ExtractedPressure } from "@/lib/ai/document/extractPressure";
import type { RecognizedVehicle } from "@/lib/ai/vehicle/recognize";
import type { RecognizedTire } from "@/lib/ai/tire/recognize";
import { extractPressures } from "@/lib/ai/document/extractPressure";

export type DetectedConflict = {
  type: AiConflictType;
  severity: AiConflictSeverity;
  description: string;
};

const YEAR_REGEX = /\b(19|20)\d{2}\b/g;

/** Todas as checagens abaixo comparam o que foi extraído do documento com o
 * que já existe no Banco Mestre (leitura apenas — nunca grava/altera) ou com
 * outras sugestões da IA já pendentes. Nenhuma delas infere um conflito sem
 * um dado real dos dois lados para comparar. */
export async function detectConflicts(context: {
  jobId: number;
  fileHash: string;
  text: string;
  measures: ExtractedMeasure[];
  pressures: ExtractedPressure[];
  oeCodes: string[];
  vehicles: RecognizedVehicle[];
  tires: RecognizedTire[];
}): Promise<DetectedConflict[]> {
  const conflitos: DetectedConflict[] = [];

  conflitos.push(...(await detectMeasureConflicts(context.vehicles, context.measures)));
  conflitos.push(...(await detectPressureConflicts(context.vehicles, context.pressures)));
  conflitos.push(...(await detectVersionIncompatibility(context.vehicles, context.text)));
  conflitos.push(...(await detectDuplicateOeCodes(context.jobId, context.oeCodes)));
  conflitos.push(...(await detectOldDocument(context.jobId, context.fileHash)));
  conflitos.push(...detectManufacturerMismatch(context.tires));

  return conflitos;
}

async function detectMeasureConflicts(
  vehicles: RecognizedVehicle[],
  measures: ExtractedMeasure[]
): Promise<DetectedConflict[]> {
  const conflitos: DetectedConflict[] = [];
  const versionIds = [...new Set(vehicles.map((v) => v.versionId).filter((id): id is number => id !== null))];
  if (versionIds.length === 0 || measures.length === 0) return conflitos;

  const homologacoes = await prisma.homologation.findMany({
    where: { vehicleVersionId: { in: versionIds } },
    select: {
      vehicleVersionId: true,
      tires: {
        where: { role: "ORIGINAL" },
        select: { tire: { select: { width: true, profile: true, rim: true, size: true } } },
      },
    },
  });

  for (const homologacao of homologacoes) {
    for (const registro of homologacao.tires) {
      const existente = registro.tire;
      const divergente = measures.find(
        (m) =>
          m.width !== existente.width || m.profile !== existente.profile || m.rim !== existente.rim
      );
      if (divergente) {
        conflitos.push({
          type: "MEDIDA_DIFERENTE",
          severity: "ALTA",
          description: `Documento indica medida ${divergente.raw}, mas o Banco Mestre já tem ${existente.size} homologada (original) para esta versão de veículo.`,
        });
      }
    }
  }

  return conflitos;
}

async function detectPressureConflicts(
  vehicles: RecognizedVehicle[],
  pressures: ExtractedPressure[]
): Promise<DetectedConflict[]> {
  const conflitos: DetectedConflict[] = [];
  const psiExtraidas = pressures.filter((p) => p.unit === "psi").map((p) => p.value);
  const versionIds = [...new Set(vehicles.map((v) => v.versionId).filter((id): id is number => id !== null))];
  if (versionIds.length === 0 || psiExtraidas.length === 0) return conflitos;

  const homologacoes = await prisma.homologation.findMany({
    where: { vehicleVersionId: { in: versionIds } },
    select: { pressureSpecs: { select: { emptyFront: true, emptyRear: true } } },
  });

  for (const homologacao of homologacoes) {
    for (const spec of homologacao.pressureSpecs) {
      for (const campo of [spec.emptyFront, spec.emptyRear]) {
        if (!campo) continue;
        const existentePsi = extractPressures(campo).find((p) => p.unit === "psi")?.value;
        if (existentePsi === undefined) continue;
        const divergente = psiExtraidas.find((v) => Math.abs(v - existentePsi) / existentePsi > 0.15);
        if (divergente !== undefined) {
          conflitos.push({
            type: "PRESSAO_CONFLITANTE",
            severity: "MEDIA",
            description: `Documento indica pressão de ${divergente} psi, divergente da pressão já cadastrada (${existentePsi} psi) para esta versão de veículo.`,
          });
        }
      }
    }
  }

  return conflitos;
}

/** Compara anos citados no texto (padrão \d{4}, ex.: "modelo 2019") com o
 * intervalo yearStart/yearEnd cadastrado para a versão reconhecida — só
 * conflita quando NENHUM dos anos citados cai dentro do intervalo, para não
 * marcar falso positivo por causa de um ano fora de contexto (ex.: data de
 * publicação do próprio documento). */
async function detectVersionIncompatibility(
  vehicles: RecognizedVehicle[],
  text: string
): Promise<DetectedConflict[]> {
  const conflitos: DetectedConflict[] = [];
  const anos = [...new Set([...text.matchAll(YEAR_REGEX)].map((m) => Number(m[0])))];
  const versionIds = [...new Set(vehicles.map((v) => v.versionId).filter((id): id is number => id !== null))];
  if (anos.length === 0 || versionIds.length === 0) return conflitos;

  const versoes = await prisma.vehicleVersion.findMany({
    where: { id: { in: versionIds } },
    select: { id: true, name: true, yearStart: true, yearEnd: true },
  });

  for (const versao of versoes) {
    const dentroDoIntervalo = anos.some((ano) => ano >= versao.yearStart && ano <= versao.yearEnd);
    if (!dentroDoIntervalo) {
      conflitos.push({
        type: "VERSAO_INCOMPATIVEL",
        severity: "MEDIA",
        description: `Documento cita ano(s) ${anos.join(", ")}, fora do intervalo cadastrado (${versao.yearStart}-${versao.yearEnd}) para a versão "${versao.name}".`,
      });
    }
  }

  return conflitos;
}

async function detectDuplicateOeCodes(jobId: number, oeCodes: string[]): Promise<DetectedConflict[]> {
  const conflitos: DetectedConflict[] = [];
  if (oeCodes.length === 0) return conflitos;

  for (const codigo of oeCodes) {
    const existente = await prisma.aiSuggestion.findFirst({
      where: {
        jobId: { not: jobId },
        payload: { contains: codigo },
        status: { in: ["PENDENTE", "ALTA_CONFIANCA", "BAIXA_CONFIANCA"] },
      },
      select: { id: true, jobId: true },
    });
    if (existente) {
      conflitos.push({
        type: "CODIGO_OE_DUPLICADO",
        severity: "MEDIA",
        description: `Código OE "${codigo}" também aparece em outra sugestão pendente (job #${existente.jobId}) — possível duplicidade entre documentos.`,
      });
    }
  }

  return conflitos;
}

async function detectOldDocument(jobId: number, fileHash: string): Promise<DetectedConflict[]> {
  const anterior = await prisma.aiJob.findFirst({
    where: { fileHash, id: { not: jobId }, status: "CONCLUIDO" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  if (!anterior) return [];

  return [
    {
      type: "DOCUMENTO_ANTIGO",
      severity: "BAIXA",
      description: `Mesmo arquivo (hash idêntico) já foi processado no job #${anterior.id} em ${anterior.createdAt.toISOString()}.`,
    },
  ];
}

function detectManufacturerMismatch(tires: RecognizedTire[]): DetectedConflict[] {
  const conflitos: DetectedConflict[] = [];
  const porMedida = new Map<string, Set<string>>();

  for (const tire of tires) {
    if (!tire.tireManufacturerName) continue;
    const set = porMedida.get(tire.measure.raw) ?? new Set<string>();
    set.add(tire.tireManufacturerName);
    porMedida.set(tire.measure.raw, set);
  }

  for (const [medida, fabricantes] of porMedida) {
    if (fabricantes.size > 1) {
      conflitos.push({
        type: "FABRICANTE_DIFERENTE",
        severity: "BAIXA",
        description: `Medida ${medida} aparece associada a mais de um fabricante de pneu no mesmo documento (${[...fabricantes].join(", ")}).`,
      });
    }
  }

  return conflitos;
}
