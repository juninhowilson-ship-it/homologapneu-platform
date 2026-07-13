import "server-only";
import {
  listHomologacoes as listHomologacoesRepo,
  findHomologacaoById,
  findHomologacaoByBusinessKey,
  findVehicleVersionById,
  findTiresByIds,
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
  HomologacaoTireItem,
} from "@/types/homologacao";

function toDTO(record: HomologacaoRecord): Homologacao {
  const tires: HomologacaoTireItem[] = record.tires.map((entry) => ({
    id: entry.id,
    tireId: entry.tireId,
    role: entry.role,
    tireLabel: `${entry.tire.tireManufacturer.name} ${entry.tire.model} ${entry.tire.size}`,
    tireManufacturerName: entry.tire.tireManufacturer.name,
    size: entry.tire.size,
    runFlat: entry.tire.runFlat,
    xl: entry.tire.xl,
  }));

  return {
    id: record.id,
    code: record.code,
    vehicleId: record.vehicleVersionId,
    vehicleLabel: `${record.vehicleVersion.vehicleModel.manufacturer.name} ${record.vehicleVersion.vehicleModel.name} ${record.vehicleVersion.name}`,
    manufacturerName: record.vehicleVersion.vehicleModel.manufacturer.name,
    year: record.year,
    version: record.vehicleVersion.name,
    engine: record.vehicleVersion.engine.name,
    notes: record.notes,
    validationStatus: record.validationStatus,
    source: record.source,
    validatedBy: record.validatedBy,
    validatedAt: record.validatedAt ? record.validatedAt.toISOString() : null,
    tires,
    originalTire: tires.find((tire) => tire.role === "ORIGINAL") ?? null,
    optionalTires: tires.filter((tire) => tire.role === "OPCIONAL"),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function normalizeInput(
  input: HomologacaoFormValues,
  validadoPor: string | null
) {
  const optionalIds = Array.from(new Set(input.tireOptionalIds));
  const validationStatus = input.validationStatus ?? "NECESSITA_VALIDACAO";

  return {
    vehicleVersionId: input.vehicleId,
    code: input.code,
    year: input.year,
    notes: input.notes ? input.notes : null,
    validationStatus,
    source: input.source ? input.source : null,
    validatedBy: validationStatus === "VALIDADO" ? validadoPor : null,
    validatedAt: validationStatus === "VALIDADO" ? new Date() : null,
    tires: [
      { tireId: input.tireOriginalId, role: "ORIGINAL" as const },
      ...optionalIds.map((tireId) => ({
        tireId,
        role: "OPCIONAL" as const,
      })),
    ],
  };
}

async function assertVehicleExists(vehicleId: number) {
  const vehicle = await findVehicleVersionById(vehicleId);
  if (!vehicle) {
    throw new ValidationError("Veículo selecionado não existe");
  }
}

async function assertTiresExist(input: HomologacaoFormValues) {
  const ids = Array.from(
    new Set([input.tireOriginalId, ...input.tireOptionalIds])
  );
  const tires = await findTiresByIds(ids);
  if (tires.length !== ids.length) {
    throw new ValidationError("Um ou mais pneus selecionados não existem");
  }
}

async function assertNoDuplicate(
  input: HomologacaoFormValues,
  excludeId?: number
) {
  const existing = await findHomologacaoByBusinessKey(
    input.vehicleId,
    input.code,
    excludeId
  );
  if (existing) {
    throw new ConflictError(
      "Já existe uma homologação com este veículo e código"
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
  input: HomologacaoFormValues,
  validadoPor: string | null = null
): Promise<Homologacao> {
  await assertVehicleExists(input.vehicleId);
  await assertTiresExist(input);
  await assertNoDuplicate(input);

  const record = await createHomologacaoRepo(
    normalizeInput(input, validadoPor)
  );
  return toDTO(record);
}

export async function updateHomologacao(
  id: number,
  input: HomologacaoFormValues,
  validadoPor: string | null = null
): Promise<Homologacao> {
  const current = await findHomologacaoById(id);
  if (!current) {
    throw new NotFoundError("Homologação não encontrada");
  }

  await assertVehicleExists(input.vehicleId);
  await assertTiresExist(input);
  await assertNoDuplicate(input, id);

  const record = await updateHomologacaoRepo(
    id,
    normalizeInput(input, validadoPor)
  );
  return toDTO(record);
}

export async function deleteHomologacao(id: number): Promise<void> {
  const current = await findHomologacaoById(id);
  if (!current) {
    throw new NotFoundError("Homologação não encontrada");
  }

  await deleteHomologacaoRepo(id);
}
