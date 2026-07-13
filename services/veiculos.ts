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
import {
  iniciarLote,
  finalizarLote,
  registrarCriacao,
} from "@/services/importBatches";
import type { Veiculo, VeiculoListResponse } from "@/types/veiculo";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";

function toDTO(record: VeiculoRecord): Veiculo {
  return {
    id: record.id,
    manufacturerId: record.vehicleModel.manufacturerId,
    manufacturerName: record.vehicleModel.manufacturer.name,
    model: record.vehicleModel.name,
    version: record.name,
    yearStart: record.yearStart,
    yearEnd: record.yearEnd,
    engine: record.engine.name,
    power: record.engine.power,
    fuel: record.engine.fuel as FuelType,
    category: record.category as VehicleCategory,
    segment: record.segment as VehicleSegment | null,
    country: record.country,
    imageUrl: record.images.find((img) => img.type === "PRINCIPAL")?.url ?? null,
    notes: record.notes,
    isActive: record.isActive,
    validationStatus: record.validationStatus,
    source: record.source,
    validatedBy: record.validatedBy,
    validatedAt: record.validatedAt ? record.validatedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    homologationsCount: record._count.homologations,
  };
}

function normalizeInput(
  input: VeiculoFormValues,
  validadoPor: string | null
) {
  const validationStatus = input.validationStatus ?? "NECESSITA_VALIDACAO";

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
    validationStatus,
    source: input.source ? input.source : null,
    validatedBy: validationStatus === "VALIDADO" ? validadoPor : null,
    validatedAt: validationStatus === "VALIDADO" ? new Date() : null,
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
    input.fuel,
    input.power ? input.power : null,
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
  input: VeiculoFormValues,
  validadoPor: string | null = null
): Promise<Veiculo> {
  await assertManufacturerExists(input.manufacturerId);
  await assertNoDuplicate(input);

  const record = await createVeiculoRepo(normalizeInput(input, validadoPor));
  return toDTO(record);
}

export async function updateVeiculo(
  id: number,
  input: VeiculoFormValues,
  validadoPor: string | null = null
): Promise<Veiculo> {
  const current = await findVeiculoById(id);
  if (!current) {
    throw new NotFoundError("Veículo não encontrado");
  }

  await assertManufacturerExists(input.manufacturerId);
  await assertNoDuplicate(input, id);

  const record = await updateVeiculoRepo(id, normalizeInput(input, validadoPor));
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
  text: string,
  contexto?: { fileName: string; userId: number | null }
): Promise<ImportacaoResultado> {
  const inicio = Date.now();
  const records = parseCsvRecords(text);

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: "CSV",
        entity: "VEICULOS",
        userId: contexto.userId,
      })
    : null;

  const manufacturers = await listManufacturersRepo();
  const manufacturerIdByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id])
  );
  let duplicidades = 0;

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
        validationStatus: "NECESSITA_VALIDACAO",
        source: contexto ? `Importação: ${contexto.fileName}` : "",
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

      const criado = await createVeiculo(parsed.data);
      if (lote) {
        await registrarCriacao(
          "VehicleVersion",
          criado.id,
          lote.id,
          contexto?.userId ?? null
        );
      }
      detalhes.push({ linha, sucesso: true, rotulo: label });
    } catch (error) {
      const duplicidade = error instanceof ConflictError;
      detalhes.push({
        linha,
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        rotulo: label,
      });
      if (duplicidade) duplicidades++;
    }
  }

  const sucesso = detalhes.filter((d) => d.sucesso).length;
  const falhas = detalhes.filter((d) => !d.sucesso).length;

  if (lote) {
    await finalizarLote(lote.id, {
      totalRows: records.length,
      importedCount: sucesso,
      duplicateCount: duplicidades,
      errorCount: falhas,
      durationMs: Date.now() - inicio,
      erros: detalhes
        .filter((d) => !d.sucesso)
        .map((d) => ({
          rowNumber: d.linha,
          message: d.erro ?? "Erro desconhecido",
          rawData: d.rotulo ? JSON.stringify({ rotulo: d.rotulo }) : null,
        })),
    });
  }

  return {
    total: records.length,
    sucesso,
    falhas,
    detalhes,
  };
}
