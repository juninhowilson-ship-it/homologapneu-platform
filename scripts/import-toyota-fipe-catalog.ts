import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, writeFileSync } from "node:fs";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";

/**
 * Normaliza os 221 VehicleModel "sujos" (nome = modelo+versão inteiro,
 * vindos do conector fipe-modelos-veiculo) em VehicleModel (nome real do
 * nameplate) + VehicleVersion (o resto do texto), usando os dados reais já
 * levantados da API da FIPE (ano/combustível — ver
 * scratchpad/fipe-final-plan.json). category fica NAO_CONFIRMADO —
 * carroceria não é informada pela FIPE nem por nenhuma fonte oficial
 * checada ainda, nunca aproximada por conhecimento geral (regra explícita
 * do usuário). Nenhuma linha antiga é apagada: as 217 que viram uma nova
 * VehicleModel+VehicleVersion recebem soft delete (deletedAt), preservando
 * o registro original e todo o histórico.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type PlanRow = {
  id: number;
  name: string;
  base: string;
  version: string;
  fuel: "GASOLINA" | "DIESEL" | "FLEX" | "HIBRIDO";
  fuelRaw: string;
  yearStart: number;
  yearEnd: number;
  isActive: boolean;
  matched: boolean;
  fipeCodigo: number;
};

function detectTransmission(text: string): "AUTOMATICA" | "MANUAL" | null {
  if (/\baut\.?\b/i.test(text)) return "AUTOMATICA";
  if (/\bmec\.?\b/i.test(text)) return "MANUAL";
  return null;
}

function detectDrivetrain(text: string): "INTEGRAL" | null {
  return /4x4/i.test(text) ? "INTEGRAL" : null;
}

/** Extrai um nome de motor a partir do texto real da versão, removendo só
 * os tokens de câmbio/tração/combustível já capturados em campos próprios
 * — nunca inventa um valor novo; se nada sobrar, usa o próprio combustível
 * real como nome (nunca deixa o campo obrigatório vazio). */
function deriveEngineName(version: string, fuelRaw: string): string {
  let s = version;
  s = s.replace(/\(?\bh[ií]brido\)?/gi, "");
  s = s.replace(/\bflex\b/gi, "");
  s = s.replace(/\bdiesel\b/gi, "");
  s = s.replace(/\bgasolina\b/gi, "");
  s = s.replace(/\b4x4\b|\b4x2\b/gi, "");
  s = s.replace(/\baut\.?\b/gi, "");
  s = s.replace(/\bmec\.?\b/gi, "");
  s = s.replace(/\s{2,}/g, " ").trim().replace(/^[/\s-]+|[/\s-]+$/g, "");
  return s || fuelRaw;
}

async function findOrCreateVehicleModel(manufacturerId: number, name: string): Promise<number> {
  return findOrCreateVehicleModelId(prisma, manufacturerId, name);
}

async function findOrCreateEngine(name: string, fuel: PlanRow["fuel"]): Promise<number> {
  const existing = await prisma.engine.findFirst({ where: { name, fuel, power: null }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.engine.create({
    data: { name, fuel, power: null, turbo: /turbo/i.test(name) },
    select: { id: true },
  });
  return created.id;
}

async function findOrCreateTransmission(type: "AUTOMATICA" | "MANUAL"): Promise<number> {
  const existing = await prisma.transmission.findFirst({ where: { type, gears: null, description: null }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.transmission.create({ data: { type, gears: null, description: null }, select: { id: true } });
  return created.id;
}

async function main() {
  const plan: PlanRow[] = JSON.parse(
    readFileSync(
      "C:/Users/Wilson/AppData/Local/Temp/claude/c--Projetos-homologapneu/dbd8da0b-35be-436a-959e-d86a58f38b07/scratchpad/fipe-final-plan.json",
      "utf8"
    )
  );

  const toyota = await prisma.manufacturer.findFirst({ where: { name: "Toyota" } });
  if (!toyota) throw new Error("Manufacturer Toyota não encontrado");

  const baseModelIdCache = new Map<string, number>();
  type LogEntry =
    | { oldModelId: number; name: string; base: string; baseModelId: number; versionId: number; versionName: string; status: "OK" }
    | { oldModelId: number; name: string; status: "ERRO"; error: string };
  const log: LogEntry[] = [];
  let modelsCreated = 0;
  let modelsReused = 0;
  let versionsCreated = 0;
  let versionsReused = 0;
  let oldModelsSoftDeleted = 0;
  let errors = 0;

  for (const row of plan) {
    try {
      let baseModelId: number;
      if (baseModelIdCache.has(row.base)) {
        baseModelId = baseModelIdCache.get(row.base)!;
      } else {
        const before = await prisma.vehicleModel.findFirst({ where: { manufacturerId: toyota.id, name: row.base }, select: { id: true } });
        baseModelId = await findOrCreateVehicleModel(toyota.id, row.base);
        if (before) modelsReused++; else modelsCreated++;
        baseModelIdCache.set(row.base, baseModelId);
      }

      const versionName = row.version || row.name; // 2 casos sem sufixo (Paseo, Supra)
      const engineName = deriveEngineName(row.version, row.fuelRaw);
      const engineId = await findOrCreateEngine(engineName, row.fuel);

      const transmissionType = detectTransmission(row.name);
      const transmissionId = transmissionType ? await findOrCreateTransmission(transmissionType) : null;
      const drivetrain = detectDrivetrain(row.name);

      const source = `FIPE (parallelum.com.br) — código ${row.fipeCodigo}, tabela de referência 335 (julho/2026), modelo original: "${row.name}"`;

      let versionId: number;
      const existingVersion = await prisma.vehicleVersion.findFirst({
        where: { vehicleModelId: baseModelId, name: versionName, engineId },
        select: { id: true },
      });
      if (existingVersion) {
        versionId = existingVersion.id;
        versionsReused++;
      } else {
        const created = await prisma.vehicleVersion.create({
          data: {
            vehicleModelId: baseModelId,
            engineId,
            transmissionId,
            name: versionName,
            yearStart: row.yearStart,
            yearEnd: row.yearEnd,
            category: "NAO_CONFIRMADO",
            drivetrain,
            country: "Brasil",
            notes: "Carroceria não confirmada por nenhuma fonte ainda (FIPE não informa) — aguardando documentação oficial ou outra fonte confiável.",
            isActive: row.isActive,
            validationStatus: "NECESSITA_VALIDACAO",
            source,
            confidence: 55,
          },
          select: { id: true },
        });
        versionId = created.id;
        versionsCreated++;

        await prisma.auditLog.create({
          data: {
            entity: "VehicleVersion",
            entityId: versionId,
            action: "CREATE",
            changes: JSON.stringify({ origem: "normalização FIPE", vehicleModelOriginalId: row.id, base: row.base, version: versionName, fipeCodigo: row.fipeCodigo }),
          },
        });
      }

      // Soft delete do registro antigo "sujo" — nunca apagado, só marcado.
      // (plan só contém os 221 registros a normalizar; os 4 já corretos
      // nunca entraram nesta lista, ver scratchpad/fipe-survey.ts)
      const oldModel = await prisma.vehicleModel.findUnique({ where: { id: row.id }, select: { deletedAt: true } });
      if (oldModel && !oldModel.deletedAt) {
        await prisma.vehicleModel.update({
          where: { id: row.id },
          data: {
            deletedAt: new Date(),
            notes: `Migrado em ${new Date().toISOString().slice(0, 10)}: normalizado para VehicleModel "${row.base}" (id ${baseModelId}) + VehicleVersion "${versionName}" (id ${versionId}). Registro original preservado (soft delete), nunca apagado.`,
          },
        });
        oldModelsSoftDeleted++;
        await prisma.auditLog.create({
          data: {
            entity: "VehicleModel",
            entityId: row.id,
            action: "UPDATE",
            changes: JSON.stringify({ acao: "soft-delete pos-normalizacao", novoModeloId: baseModelId, novaVersaoId: versionId }),
          },
        });
      }

      log.push({ oldModelId: row.id, name: row.name, base: row.base, baseModelId, versionId, versionName, status: "OK" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors++;
      log.push({ oldModelId: row.id, name: row.name, status: "ERRO", error: message });
      console.log(`[${row.id}] ERRO: ${message}`);
    }
  }

  const logPath = `C:/Users/Wilson/AppData/Local/Temp/claude/c--Projetos-homologapneu/dbd8da0b-35be-436a-959e-d86a58f38b07/scratchpad/toyota-fipe-import-log-${Date.now()}.json`;
  writeFileSync(logPath, JSON.stringify(log, null, 1));

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({ modelsCreated, modelsReused, versionsCreated, versionsReused, oldModelsSoftDeleted, errors, logPath }, null, 2));
}

main()
  .catch((e) => { console.error("Falha geral:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
