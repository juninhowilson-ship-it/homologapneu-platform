import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findVehicleVersionByNaturalKey,
  findTireByNaturalKey,
  findHomologacaoByVehicleVersion,
  addTireToHomologacao,
  findHomologationTire,
  addWheelToHomologacao,
  findHomologationWheel,
  addPressureSpec,
  addHomologationDocument,
} from "@/repositories/homologacoes";
import {
  findOrCreateVehicleModel,
  findOrCreateVehicleGeneration,
  findOrCreateEngine,
} from "@/repositories/veiculos";
import { findMontadoraByName, createMontadora } from "@/repositories/montadoras";
import { findFabricanteByName, createFabricante } from "@/repositories/fabricantes";
import { createPneu } from "@/repositories/pneus";
import { findRodaByBusinessKey, createRoda } from "@/repositories/rodas";
import { registrarAlteracaoManual } from "@/services/importBatches";
import { diffRecords } from "@/lib/importer/diff";
import type { FuelType, VehicleCategory } from "@/lib/constants/veiculo";
import type { TireCategory } from "@/lib/constants/pneu";
import type { HomologationCandidate, DocumentUpload } from "@prisma/client";

/**
 * PublishApprovedHomologation(): quando um humano aprova uma
 * HomologationCandidate (services/curadoria.ts -> aprovarCandidato,
 * que já cria a HomologationEvidence real via o Motor de Validação
 * existente), este serviço tenta materializar/atualizar o registro
 * estruturado da Base Mestre (Manufacturer -> VehicleModel ->
 * VehicleGeneration -> VehicleVersion -> Homologation -> Tire/Wheel/
 * VehiclePressureSpec/HomologationDocument) — TODOS já existentes,
 * nenhuma tabela nova.
 *
 * Reutiliza exclusivamente helpers já existentes (find-or-create de
 * veículo/motor já usados pela importação de Veículos; find-or-create
 * de roda/pneu já usados pelos respectivos catálogos; os helpers
 * aditivos addTireToHomologacao/addWheelToHomologacao/addPressureSpec/
 * addHomologationDocument já construídos para os sub-recursos de
 * Homologation) — nenhuma lógica de escrita nova é duplicada.
 *
 * NUNCA inventa dados: campos obrigatórios do schema que a extração
 * determinística (lib/curadoria/extrairCandidatos.ts) não descobre no
 * texto real (ex.: combustível do motor, categoria do veículo,
 * categoria do pneu, modelo do pneu, nome da versão) NUNCA recebem um
 * valor padrão/chute — quando um desses falta e não há uma
 * VehicleVersion/Tire já existente para reaproveitar, a publicação
 * dessa peça é pulada (`skipped`) com o motivo exato, para
 * complementação manual pelo catálogo/formulário já existente
 * (mesmo espírito de importModelosVeiculo, que já existe e cria só o
 * VehicleModel quando os dados não bastam para uma VehicleVersion
 * completa).
 */

export type PublishResumo = {
  candidateId: number;
  action: "published" | "updated" | "skipped";
  reason?: string;
  homologationId?: number;
  vehicleVersionCreated: boolean;
  tireCreated: boolean;
  wheelLinked: boolean;
  pressureAdded: boolean;
  documentLinked: boolean;
};

type CandidatoComDocumento = HomologationCandidate & {
  documentUpload: Pick<
    DocumentUpload,
    "id" | "fileName" | "fileHash" | "sourceUrl" | "manufacturerName" | "publishedAt" | "declaredSourceName"
  >;
};

function detectarCombustivel(texto: string | null): FuelType | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  if (/\bel[ée]tric[oa]\b|\bev\b/.test(t)) return "ELETRICO";
  if (/\bh[ií]brid[oa]\b|\bhev\b|\bphev\b/.test(t)) return "HIBRIDO";
  if (/\bdiesel\b/.test(t)) return "DIESEL";
  if (/\bflex\b/.test(t)) return "FLEX";
  if (/\bgasolina\b/.test(t)) return "GASOLINA";
  return null;
}

function detectarCategoriaVeiculo(texto: string | null): VehicleCategory | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  if (/\bpick-?up\b|\bcabine dupla\b/.test(t)) return "PICAPE";
  if (/\bsuv\b/.test(t)) return "SUV";
  if (/\bsed[aã]n\b/.test(t)) return "SEDAN";
  if (/\bhatch\b/.test(t)) return "HATCH";
  if (/\bperua\b|\bstation wagon\b/.test(t)) return "PERUA";
  if (/\bminivan\b/.test(t)) return "MINIVAN";
  if (/\bcoup[eê]\b/.test(t)) return "COUPE";
  return null;
}

function detectarCategoriaPneu(texto: string | null): TireCategory | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  if (/\bcaminhonete\b|\bpick-?up\b/.test(t)) return "CAMINHONETE";
  if (/\bsuv\b/.test(t)) return "SUV";
  if (/\binverno\b|\bwinter\b|\bneve\b/.test(t)) return "INVERNO";
  if (/\besportivo\b/.test(t)) return "ESPORTIVO";
  if (/\bcomercial\b/.test(t)) return "COMERCIAL";
  return null; // "Passeio" é o mais comum na prática, mas nunca assumido por padrão.
}

/** Roda no formato "6.5J x 16" / "6,5Jx16" + furação tipo "5x114.3",
 * quando ambos os padrões reais aparecerem no texto — nunca combina
 * fragmentos de janelas diferentes nem completa o que não está escrito. */
function tentarExtrairRoda(texto: string | null): { width: number; diameter: number; boltPattern: string } | null {
  if (!texto) return null;
  const medida = texto.match(/(\d+(?:[.,]\d)?)\s*J?\s*[xX]\s*(\d{2})\b/);
  const furacao = texto.match(/\b(\d)\s*[xX]\s*(\d{3}(?:[.,]\d)?)\b/);
  if (!medida || !furacao) return null;
  return {
    width: Number(medida[1].replace(",", ".")),
    diameter: Number(medida[2]),
    boltPattern: `${furacao[1]}x${furacao[2].replace(",", ".")}`,
  };
}

function parseTireSize(size: string): { width: number; profile: number; rim: number } | null {
  const m = size.match(/^(\d{3})\/(\d{2})R(\d{2})$/i);
  if (!m) return null;
  return { width: Number(m[1]), profile: Number(m[2]), rim: Number(m[3]) };
}

async function resolverManufacturer(nome: string): Promise<number> {
  const existente = await findMontadoraByName(nome);
  if (existente) return existente.id;
  const criado = await createMontadora({ name: nome, validationStatus: "NECESSITA_VALIDACAO" });
  return criado.id;
}

async function resolverTireManufacturer(nome: string): Promise<number> {
  const existente = await findFabricanteByName(nome);
  if (existente) return existente.id;
  const criado = await createFabricante({ name: nome, country: "Não informado", validationStatus: "NECESSITA_VALIDACAO" });
  return criado.id;
}

type ResolucaoVeiculo = { vehicleVersionId: number; criado: boolean } | null;

async function resolverVehicleVersion(candidato: CandidatoComDocumento): Promise<ResolucaoVeiculo> {
  const { vehicleManufacturerName, vehicleModel, vehicleVersion, yearStart, yearEnd } = candidato;
  if (!vehicleManufacturerName || !vehicleModel) return null;

  if (vehicleVersion) {
    const existente = await findVehicleVersionByNaturalKey(vehicleManufacturerName, vehicleModel, vehicleVersion);
    if (existente) return { vehicleVersionId: existente.id, criado: false };
  }

  // Criar uma VehicleVersion nova exige nome de versão, ano e os dois
  // enums obrigatórios do schema (combustível do motor, categoria da
  // carroceria) — sem os quatro ao mesmo tempo, não há como criar sem
  // inventar; a peça de veículo desta publicação fica pulada.
  if (!vehicleVersion || !yearStart) return null;
  const fuel = detectarCombustivel(candidato.rawSnippet);
  const category = detectarCategoriaVeiculo(candidato.rawSnippet);
  if (!fuel || !category) return null;

  const manufacturerId = await resolverManufacturer(vehicleManufacturerName);
  const vehicleModelId = await findOrCreateVehicleModel(manufacturerId, vehicleModel);
  const generationName = yearEnd && yearEnd !== yearStart ? `${yearStart}-${yearEnd}` : String(yearStart);
  const generationId = await findOrCreateVehicleGeneration(vehicleModelId, generationName, yearStart, yearEnd);
  const engineId = await findOrCreateEngine(candidato.engine ?? vehicleVersion, fuel, null, null);

  const criado = await prisma.vehicleVersion.create({
    data: {
      vehicleModelId,
      generationId,
      engineId,
      name: vehicleVersion,
      yearStart,
      yearEnd: yearEnd ?? yearStart,
      category,
      validationStatus: "NECESSITA_VALIDACAO",
      source: candidato.documentUpload.declaredSourceName,
    },
    select: { id: true },
  });

  await registrarAlteracaoManual({
    entity: "VehicleVersion",
    entityId: criado.id,
    action: "CREATE",
    userId: null,
    changes: { origem: { before: null, after: `Publicação automática do candidato #${candidato.id}` } },
  });

  return { vehicleVersionId: criado.id, criado: true };
}

type ResolucaoPneu = { tireId: number; criado: boolean } | null;

async function resolverTire(candidato: CandidatoComDocumento): Promise<ResolucaoPneu> {
  const { tireManufacturerName, tireModel, tireSize } = candidato;
  if (!tireManufacturerName || !tireModel || !tireSize) return null;

  const existente = await findTireByNaturalKey(tireManufacturerName, tireModel, tireSize);
  if (existente) return { tireId: existente.id, criado: false };

  const category = detectarCategoriaPneu(candidato.rawSnippet);
  const medida = parseTireSize(tireSize);
  if (!category || !medida || !candidato.loadIndex || !candidato.speedIndex) return null;

  const tireManufacturerId = await resolverTireManufacturer(tireManufacturerName);
  const criado = await createPneu({
    tireManufacturerId,
    brand: tireManufacturerName,
    model: tireModel,
    size: tireSize,
    width: medida.width,
    profile: medida.profile,
    rim: medida.rim,
    loadIndex: candidato.loadIndex,
    speedIndex: candidato.speedIndex,
    runFlat: candidato.runFlat ?? false,
    xl: candidato.xl ?? false,
    category,
    validationStatus: "NECESSITA_VALIDACAO",
    source: candidato.documentUpload.declaredSourceName,
  });

  await registrarAlteracaoManual({
    entity: "Tire",
    entityId: criado.id,
    action: "CREATE",
    userId: null,
    changes: { origem: { before: null, after: `Publicação automática do candidato #${candidato.id}` } },
  });

  return { tireId: criado.id, criado: true };
}

/** Roda "quando existir" na fonte — hoje extrairCandidatos() não
 * preenche wheelSize (o extrator ainda não tem esse regex), então este
 * ramo fica pronto para quando a extração cobrir isso, sem exigir
 * mudança aqui. */
async function resolverEVincularWheel(homologationId: number, candidato: CandidatoComDocumento): Promise<boolean> {
  const roda = tentarExtrairRoda(candidato.wheelSize);
  if (!roda) return false;

  const existente = await findRodaByBusinessKey(roda.width, roda.diameter, null, roda.boltPattern);
  const wheelId = existente
    ? existente.id
    : (
        await createRoda({
          width: roda.width,
          diameter: roda.diameter,
          boltPattern: roda.boltPattern,
          validationStatus: "NECESSITA_VALIDACAO",
          source: candidato.documentUpload.declaredSourceName,
        })
      ).id;

  const jaVinculada = await findHomologationWheel(homologationId, wheelId);
  if (jaVinculada) return false;

  await addWheelToHomologacao(homologationId, wheelId, "ORIGINAL");
  return true;
}

async function resolverEAdicionarPressao(homologationId: number, candidato: CandidatoComDocumento): Promise<boolean> {
  if (!candidato.frontTirePressure && !candidato.rearTirePressure) return false;

  await addPressureSpec(homologationId, {
    emptyFront: candidato.frontTirePressure,
    emptyRear: candidato.rearTirePressure,
    source: candidato.documentUpload.declaredSourceName,
    sourceUrl: candidato.documentUpload.sourceUrl,
  });
  return true;
}

async function vincularDocumento(homologationId: number, candidato: CandidatoComDocumento): Promise<boolean> {
  const doc = candidato.documentUpload;
  const jaVinculado = await prisma.homologationDocument.findFirst({
    where: { homologationId, sha256: doc.fileHash },
    select: { id: true },
  });
  if (jaVinculado) return false;

  await addHomologationDocument(homologationId, {
    name: doc.fileName,
    url: doc.sourceUrl ?? `upload:${doc.id}:${doc.fileName}`,
    type: "MANUAL",
    sha256: doc.fileHash,
    manufacturerName: doc.manufacturerName,
    publishedAt: doc.publishedAt,
  });
  return true;
}

/**
 * Publica (ou atualiza) a Homologation da Base Mestre para um candidato
 * já APROVADO. Nunca lança por falta de dado — a aprovação da evidência
 * (registrarEvidencia, já concluída antes de chamar esta função)
 * continua válida mesmo que a peça estrutural não possa ser
 * materializada; o resultado descreve exatamente o que foi feito e,
 * quando pulado, por quê.
 */
export async function publishApprovedHomologation(
  candidato: CandidatoComDocumento,
  userId: number | null
): Promise<PublishResumo> {
  const base: Omit<PublishResumo, "action" | "reason"> = {
    candidateId: candidato.id,
    vehicleVersionCreated: false,
    tireCreated: false,
    wheelLinked: false,
    pressureAdded: false,
    documentLinked: false,
  };

  if (candidato.status !== "APROVADA") {
    return { ...base, action: "skipped", reason: "Candidato não está aprovado." };
  }

  const veiculo = await resolverVehicleVersion(candidato);
  if (!veiculo) {
    return {
      ...base,
      action: "skipped",
      reason:
        "Versão do veículo não encontrada e não há dados suficientes (nome da versão, ano, combustível, categoria) para criar uma nova sem inventar — complete manualmente pelo cadastro de Veículos.",
    };
  }

  const pneu = await resolverTire(candidato);
  if (!pneu) {
    return {
      ...base,
      action: "skipped",
      homologationId: undefined,
      vehicleVersionCreated: veiculo.criado,
      reason:
        "Pneu não encontrado e não há dados suficientes (modelo do pneu, categoria, índices) para criar um novo sem inventar — complete manualmente pelo cadastro de Pneus.",
    };
  }

  const existente = await findHomologacaoByVehicleVersion(veiculo.vehicleVersionId);
  let homologationId: number;
  let action: "published" | "updated";

  if (existente) {
    homologationId = existente.id;
    action = "updated";
    const mudancas = diffRecords(
      { source: existente.source, notes: existente.notes },
      {
        source: existente.source ?? candidato.documentUpload.declaredSourceName,
        notes: candidato.observations ?? existente.notes,
      }
    );
    if (mudancas) {
      await prisma.homologation.update({
        where: { id: homologationId },
        data: {
          source: existente.source ?? candidato.documentUpload.declaredSourceName,
          notes: candidato.observations ?? existente.notes,
        },
      });
      await registrarAlteracaoManual({
        entity: "Homologation",
        entityId: homologationId,
        action: "UPDATE",
        userId,
        changes: mudancas,
      });
    }
  } else {
    if (!candidato.yearStart) {
      return {
        ...base,
        vehicleVersionCreated: veiculo.criado,
        tireCreated: pneu.criado,
        action: "skipped",
        reason: "Ano modelo não identificado no documento — obrigatório para criar a Homologation, não inventado.",
      };
    }
    const criada = await prisma.homologation.create({
      data: {
        vehicleVersionId: veiculo.vehicleVersionId,
        code: `CAND${candidato.id}`,
        year: candidato.yearStart,
        manufactureYear: null,
        notes: candidato.observations,
        validationStatus: "NECESSITA_VALIDACAO",
        source: candidato.documentUpload.declaredSourceName,
      },
      select: { id: true },
    });
    homologationId = criada.id;
    action = "published";
    await registrarAlteracaoManual({
      entity: "Homologation",
      entityId: homologationId,
      action: "CREATE",
      userId,
      changes: { origem: { before: null, after: `Publicação automática do candidato #${candidato.id}` } },
    });
  }

  const pneuJaVinculado = await findHomologationTire(homologationId, pneu.tireId);
  if (!pneuJaVinculado) {
    await addTireToHomologacao(homologationId, pneu.tireId, "ORIGINAL");
  }

  const wheelLinked = await resolverEVincularWheel(homologationId, candidato);
  const pressureAdded = await resolverEAdicionarPressao(homologationId, candidato);
  const documentLinked = await vincularDocumento(homologationId, candidato);

  return {
    ...base,
    action,
    homologationId,
    vehicleVersionCreated: veiculo.criado,
    tireCreated: pneu.criado,
    wheelLinked,
    pressureAdded,
    documentLinked,
  };
}
