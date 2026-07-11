import "server-only";
import {
  listVeiculos as listVeiculosRepo,
  findVeiculoById,
  findVeiculoByBusinessKey,
  findManufacturerById,
  listManufacturers as listManufacturersRepo,
  createVeiculo as createVeiculoRepo,
  updateVeiculo as updateVeiculoRepo,
  deleteVeiculo as deleteVeiculoRepo,
  type VeiculoRecord,
} from "@/repositories/veiculos";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import {
  veiculoFormSchema,
  type VeiculoFormValues,
  type VeiculoListQuery,
} from "@/lib/validations/veiculo";
import {
  FUEL_TYPES,
  FUEL_LABELS,
  VEHICLE_CATEGORIES,
  CATEGORY_LABELS,
  VEHICLE_SEGMENTS,
  SEGMENT_LABELS,
  type FuelType,
  type VehicleCategory,
  type VehicleSegment,
} from "@/lib/constants/veiculo";
import { parseCsvRecords } from "@/lib/csv";
import { normalizeToEnum, parseBooleanPtBr } from "@/lib/enum-utils";
import type { Veiculo, VeiculoListResponse } from "@/types/veiculo";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";

function toDTO(record: VeiculoRecord): Veiculo {
  return {
    id: record.id,
    manufacturerId: record.manufacturerId,
    manufacturerName: record.manufacturer.name,
    model: record.model,
    version: record.version,
    yearStart: record.yearStart,
    yearEnd: record.yearEnd,
    engine: record.engine,
    power: record.power,
    fuel: record.fuel as FuelType,
    category: record.category as VehicleCategory,
    segment: record.segment as VehicleSegment | null,
    country: record.country,
    imageUrl: record.imageUrl,
    notes: record.notes,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    homologationsCount: record._count.homologations,
  };
}

function normalizeInput(input: VeiculoFormValues) {
  return {
    manufacturerId: input.manufacturerId,
    model: input.model,
    version: input.version,
    yearStart: input.yearStart,
    yearEnd: input.yearEnd,
    engine: input.engine,
    power: input.power ? input.power : null,
    fuel: input.fuel,
    category: input.category,
    segment: input.segment ? input.segment : null,
    country: input.country ? input.country : null,
    imageUrl: input.imageUrl ? input.imageUrl : null,
    notes: input.notes ? input.notes : null,
    isActive: input.isActive,
  };
}

async function assertManufacturerExists(manufacturerId: number) {
  const manufacturer = await findManufacturerById(manufacturerId);
  if (!manufacturer) {
    throw new ValidationError("Marca selecionada não existe");
  }
}

async function assertNoDuplicate(
  input: VeiculoFormValues,
  excludeId?: number
) {
  const existing = await findVeiculoByBusinessKey(
    input.manufacturerId,
    input.model,
    input.version,
    input.engine,
    excludeId
  );
  if (existing) {
    throw new ConflictError(
      "Já existe um veículo cadastrado com esta marca, modelo, versão e motorização"
    );
  }
}

export async function listVeiculos(
  query: VeiculoListQuery
): Promise<VeiculoListResponse> {
  const { data, total } = await listVeiculosRepo(query);

  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getVeiculo(id: number): Promise<Veiculo> {
  const record = await findVeiculoById(id);
  if (!record) {
    throw new NotFoundError("Veículo não encontrado");
  }
  return toDTO(record);
}

export async function listManufacturers() {
  return listManufacturersRepo();
}

export async function createVeiculo(
  input: VeiculoFormValues
): Promise<Veiculo> {
  await assertManufacturerExists(input.manufacturerId);
  await assertNoDuplicate(input);

  const record = await createVeiculoRepo(normalizeInput(input));
  return toDTO(record);
}

export async function updateVeiculo(
  id: number,
  input: VeiculoFormValues
): Promise<Veiculo> {
  const current = await findVeiculoById(id);
  if (!current) {
    throw new NotFoundError("Veículo não encontrado");
  }

  await assertManufacturerExists(input.manufacturerId);
  await assertNoDuplicate(input, id);

  const record = await updateVeiculoRepo(id, normalizeInput(input));
  return toDTO(record);
}

export async function deleteVeiculo(id: number): Promise<void> {
  const current = await findVeiculoById(id);
  if (!current) {
    throw new NotFoundError("Veículo não encontrado");
  }

  if (current._count.homologations > 0) {
    throw new ConflictError(
      `Não é possível excluir: existem ${current._count.homologations} homologação(ões) associada(s) a este veículo. Marque-o como inativo em vez de excluir.`
    );
  }

  await deleteVeiculoRepo(id);
}

export async function importVeiculosCsv(
  text: string
): Promise<ImportacaoResultado> {
  const records = parseCsvRecords(text);
  const manufacturers = await listManufacturersRepo();
  const manufacturerIdByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id])
  );

  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, record] of records.entries()) {
    const linha = index + 2;
    const label = `${record.marca ?? ""} ${record.modelo ?? ""} ${record.versao ?? ""}`.trim();

    try {
      const manufacturerId = manufacturerIdByName.get(
        (record.marca ?? "").trim().toLowerCase()
      );
      if (!manufacturerId) {
        detalhes.push({
          linha,
          sucesso: false,
          erro: `Marca "${record.marca ?? ""}" não encontrada`,
          rotulo: label,
        });
        continue;
      }

      const fuel = normalizeToEnum(
        record.combustivel ?? "",
        FUEL_TYPES,
        FUEL_LABELS
      );
      const category = normalizeToEnum(
        record.categoria ?? "",
        VEHICLE_CATEGORIES,
        CATEGORY_LABELS
      );
      const segment = record.segmento
        ? normalizeToEnum(record.segmento, VEHICLE_SEGMENTS, SEGMENT_LABELS)
        : null;

      const parsed = veiculoFormSchema.safeParse({
        manufacturerId,
        model: record.modelo,
        version: record.versao,
        yearStart: Number(record.anoInicial),
        yearEnd: Number(record.anoFinal),
        engine: record.motorizacao,
        power: record.potencia,
        fuel: fuel ?? undefined,
        category: category ?? undefined,
        segment: segment ?? undefined,
        country: record.pais,
        notes: record.observacoes,
        isActive: parseBooleanPtBr(record.status, true),
      });

      if (!parsed.success) {
        detalhes.push({
          linha,
          sucesso: false,
          erro: parsed.error.issues.map((issue) => issue.message).join("; "),
          rotulo: label,
        });
        continue;
      }

      await createVeiculo(parsed.data);
      detalhes.push({ linha, sucesso: true, rotulo: label });
    } catch (error) {
      detalhes.push({
        linha,
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        rotulo: label,
      });
    }
  }

  return {
    total: records.length,
    sucesso: detalhes.filter((d) => d.sucesso).length,
    falhas: detalhes.filter((d) => !d.sucesso).length,
    detalhes,
  };
}
