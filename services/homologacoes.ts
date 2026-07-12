import "server-only";
import {
  listHomologacoes as listHomologacoesRepo,
  findHomologacaoById,
  findHomologacaoByBusinessKey,
  findVehicleById,
  findTireById,
  listVehicleOptions as listVehicleOptionsRepo,
  listTireOptions as listTireOptionsRepo,
  createHomologacao as createHomologacaoRepo,
  updateHomologacao as updateHomologacaoRepo,
  deleteHomologacao as deleteHomologacaoRepo,
  type HomologacaoRecord,
} from "@/repositories/homologacoes";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import type {
  HomologacaoFormValues,
  HomologacaoListQuery,
} from "@/lib/validations/homologacao";
import type {
  Homologacao,
  HomologacaoListResponse,
} from "@/types/homologacao";

function toDTO(record: HomologacaoRecord): Homologacao {
  return {
    id: record.id,
    code: record.code,
    vehicleId: record.vehicleId,
    vehicleLabel: `${record.vehicle.manufacturer.name} ${record.vehicle.model} ${record.vehicle.version}`,
    manufacturerName: record.vehicle.manufacturer.name,
    tireId: record.tireId,
    tireLabel: `${record.tire.tireManufacturer.name} ${record.tire.model} ${record.tire.size}`,
    tireManufacturerName: record.tire.tireManufacturer.name,
    year: record.year,
    version: record.version,
    engine: record.engine,
    originalSize: record.originalSize,
    optionalSize: record.optionalSize,
    runFlat: record.runFlat,
    xl: record.xl,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function normalizeInput(input: HomologacaoFormValues) {
  return {
    vehicleId: input.vehicleId,
    tireId: input.tireId,
    code: input.code,
    year: input.year,
    version: input.version,
    engine: input.engine,
    originalSize: input.originalSize,
    optionalSize: input.optionalSize ? input.optionalSize : null,
    runFlat: input.runFlat,
    xl: input.xl,
    notes: input.notes ? input.notes : null,
  };
}

async function assertVehicleExists(vehicleId: number) {
  const vehicle = await findVehicleById(vehicleId);
  if (!vehicle) {
    throw new ValidationError("Veículo selecionado não existe");
  }
}

async function assertTireExists(tireId: number) {
  const tire = await findTireById(tireId);
  if (!tire) {
    throw new ValidationError("Pneu selecionado não existe");
  }
}

async function assertNoDuplicate(
  input: HomologacaoFormValues,
  excludeId?: number
) {
  const existing = await findHomologacaoByBusinessKey(
    input.vehicleId,
    input.tireId,
    input.code,
    excludeId
  );
  if (existing) {
    throw new ConflictError(
      "Já existe uma homologação com este veículo, pneu e código"
    );
  }
}

export async function listHomologacoes(
  query: HomologacaoListQuery
): Promise<HomologacaoListResponse> {
  const { data, total } = await listHomologacoesRepo(query);

  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getHomologacao(id: number): Promise<Homologacao> {
  const record = await findHomologacaoById(id);
  if (!record) {
    throw new NotFoundError("Homologação não encontrada");
  }
  return toDTO(record);
}

export async function listOpcoes() {
  const [vehicles, tires] = await Promise.all([
    listVehicleOptionsRepo(),
    listTireOptionsRepo(),
  ]);

  return {
    veiculos: vehicles.map((v) => ({
      id: v.id,
      label: `${v.manufacturer.name} ${v.model} ${v.version} (${v.yearStart}-${v.yearEnd})`,
      version: v.version,
      engine: v.engine,
      yearStart: v.yearStart,
      yearEnd: v.yearEnd,
    })),
    pneus: tires.map((t) => ({
      id: t.id,
      label: `${t.tireManufacturer.name} ${t.model} ${t.size}`,
      size: t.size,
      runFlat: t.runFlat,
      xl: t.xl,
    })),
  };
}

export async function createHomologacao(
  input: HomologacaoFormValues
): Promise<Homologacao> {
  await assertVehicleExists(input.vehicleId);
  await assertTireExists(input.tireId);
  await assertNoDuplicate(input);

  const record = await createHomologacaoRepo(normalizeInput(input));
  return toDTO(record);
}

export async function updateHomologacao(
  id: number,
  input: HomologacaoFormValues
): Promise<Homologacao> {
  const current = await findHomologacaoById(id);
  if (!current) {
    throw new NotFoundError("Homologação não encontrada");
  }

  await assertVehicleExists(input.vehicleId);
  await assertTireExists(input.tireId);
  await assertNoDuplicate(input, id);

  const record = await updateHomologacaoRepo(id, normalizeInput(input));
  return toDTO(record);
}

export async function deleteHomologacao(id: number): Promise<void> {
  const current = await findHomologacaoById(id);
  if (!current) {
    throw new NotFoundError("Homologação não encontrada");
  }

  await deleteHomologacaoRepo(id);
}
