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
  findVehicleModelByName,
  findOrCreateVehicleModel,
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
  DRIVETRAIN_TYPES,
  DRIVETRAIN_LABELS,
  type FuelType,
  type VehicleCategory,
  type VehicleSegment,
  type DrivetrainType,
} from "@/lib/constants/veiculo";
import { normalizeToEnum, parseBooleanPtBr } from "@/lib/enum-utils";
import { inferFileType } from "@/lib/importer/parseFile";
import type { ImportContexto } from "@/lib/importer/context";
import { diffRecords } from "@/lib/importer/diff";
import { computeImportHash } from "@/lib/importer/hash";
import {
  iniciarLote,
  finalizarLote,
  registrarCriacao,
  registrarAtualizacao,
  registrarAlteracaoManual,
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
    internalCode: record.internalCode,
    yearStart: record.yearStart,
    yearEnd: record.yearEnd,
    manufactureYearStart: record.manufactureYearStart,
    manufactureYearEnd: record.manufactureYearEnd,
    engine: record.engine.name,
    power: record.engine.power,
    torque: record.engine.torque,
    fuel: record.engine.fuel as FuelType,
    category: record.category as VehicleCategory,
    regulatoryCategory: record.regulatoryCategory,
    segment: record.segment as VehicleSegment | null,
    platformName: record.platform?.name ?? null,
    drivetrain: record.drivetrain as DrivetrainType | null,
    doors: record.doors,
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
    internalCode: input.internalCode ? input.internalCode : null,
    yearStart: input.yearStart,
    yearEnd: input.yearEnd,
    manufactureYearStart: input.manufactureYearStart ?? null,
    manufactureYearEnd: input.manufactureYearEnd ?? null,
    engine: input.engine,
    power: input.power ? input.power : null,
    torque: input.torque ? input.torque : null,
    fuel: input.fuel,
    category: input.category,
    regulatoryCategory: input.regulatoryCategory ? input.regulatoryCategory : null,
    segment: input.segment ? input.segment : null,
    platformName: input.platformName ? input.platformName : null,
    drivetrain: input.drivetrain ? input.drivetrain : undefined,
    doors: input.doors ?? null,
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
  validadoPor: string | null = null,
  userId: number | null = null
): Promise<Veiculo> {
  await assertManufacturerExists(input.manufacturerId);
  await assertNoDuplicate(input);

  const record = await createVeiculoRepo(normalizeInput(input, validadoPor));
  const dto = toDTO(record);
  await registrarAlteracaoManual({
    entity: "VehicleVersion",
    entityId: dto.id,
    action: "CREATE",
    userId,
  });
  return dto;
}

export async function updateVeiculo(
  id: number,
  input: VeiculoFormValues,
  validadoPor: string | null = null,
  userId: number | null = null
): Promise<Veiculo> {
  const current = await findVeiculoById(id);
  if (!current) {
    throw new NotFoundError("Veículo não encontrado");
  }

  await assertManufacturerExists(input.manufacturerId);
  await assertNoDuplicate(input, id);

  const before = toDTO(current);
  const record = await updateVeiculoRepo(id, normalizeInput(input, validadoPor));
  const after = toDTO(record);

  const changes = diffRecords(
    {
      model: before.model,
      version: before.version,
      internalCode: before.internalCode,
      yearStart: before.yearStart,
      yearEnd: before.yearEnd,
      manufactureYearStart: before.manufactureYearStart,
      manufactureYearEnd: before.manufactureYearEnd,
      engine: before.engine,
      power: before.power,
      torque: before.torque,
      fuel: before.fuel,
      category: before.category,
      regulatoryCategory: before.regulatoryCategory,
      segment: before.segment,
      platformName: before.platformName,
      drivetrain: before.drivetrain,
      doors: before.doors,
      country: before.country,
      notes: before.notes,
      isActive: before.isActive,
      validationStatus: before.validationStatus,
    },
    {
      model: after.model,
      version: after.version,
      internalCode: after.internalCode,
      yearStart: after.yearStart,
      yearEnd: after.yearEnd,
      manufactureYearStart: after.manufactureYearStart,
      manufactureYearEnd: after.manufactureYearEnd,
      engine: after.engine,
      power: after.power,
      torque: after.torque,
      fuel: after.fuel,
      category: after.category,
      regulatoryCategory: after.regulatoryCategory,
      segment: after.segment,
      platformName: after.platformName,
      drivetrain: after.drivetrain,
      doors: after.doors,
      country: after.country,
      notes: after.notes,
      isActive: after.isActive,
      validationStatus: after.validationStatus,
    }
  );

  if (changes) {
    await registrarAlteracaoManual({
      entity: "VehicleVersion",
      entityId: id,
      action: "UPDATE",
      userId,
      changes,
    });
  }

  return after;
}

export async function deleteVeiculo(
  id: number,
  userId: number | null = null
): Promise<void> {
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
  await registrarAlteracaoManual({
    entity: "VehicleVersion",
    entityId: id,
    action: "DELETE",
    userId,
  });
}

export async function importVeiculos(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "VEICULOS",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(rows),
      })
    : null;

  const manufacturers = await listManufacturersRepo();
  const manufacturerIdByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id])
  );

  let criados = 0;
  let atualizados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, record] of rows.entries()) {
    const linha = index + 2;
    const label = `${record.marca ?? ""} ${record.modelo ?? ""} ${record.versao ?? ""}`.trim();

    try {
      const manufacturerId = manufacturerIdByName.get(
        (record.marca ?? "").trim().toLowerCase()
      );
      if (!manufacturerId) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Marca "${record.marca ?? ""}" não encontrada. Importe as montadoras antes dos veículos.`,
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
      const drivetrain = record.tracao
        ? normalizeToEnum(record.tracao, DRIVETRAIN_TYPES, DRIVETRAIN_LABELS)
        : null;

      const parsed = veiculoFormSchema.safeParse({
        manufacturerId,
        model: record.modelo,
        version: record.versao,
        internalCode: record.codigoInterno,
        yearStart: Number(record.anoInicial),
        yearEnd: Number(record.anoFinal),
        manufactureYearStart: record.anoFabricacaoInicial
          ? Number(record.anoFabricacaoInicial)
          : null,
        manufactureYearEnd: record.anoFabricacaoFinal
          ? Number(record.anoFabricacaoFinal)
          : null,
        engine: record.motorizacao,
        power: record.potencia,
        torque: record.torque,
        fuel: fuel ?? undefined,
        category: category ?? undefined,
        regulatoryCategory: record.categoriaRegulatoria,
        segment: segment ?? undefined,
        platformName: record.plataforma,
        drivetrain: drivetrain ?? undefined,
        doors: record.portas ? Number(record.portas) : null,
        country: record.pais,
        notes: record.observacoes,
        isActive: parseBooleanPtBr(record.status, true),
        validationStatus: "NECESSITA_VALIDACAO",
        source: contexto ? `Importação: ${contexto.fileName}` : "",
      });

      if (!parsed.success) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: parsed.error.issues.map((issue) => issue.message).join("; "),
          rotulo: label,
        });
        continue;
      }

      const existing = await findVeiculoByBusinessKey(
        manufacturerId,
        parsed.data.model,
        parsed.data.version,
        parsed.data.engine,
        parsed.data.fuel,
        parsed.data.power ? parsed.data.power : null
      );

      if (existing) {
        const current = await getVeiculo(existing.id);

        const merged: VeiculoFormValues = {
          ...parsed.data,
          internalCode: parsed.data.internalCode || current.internalCode || "",
          manufactureYearStart:
            parsed.data.manufactureYearStart ?? current.manufactureYearStart,
          manufactureYearEnd:
            parsed.data.manufactureYearEnd ?? current.manufactureYearEnd,
          power: parsed.data.power || current.power || "",
          torque: parsed.data.torque || current.torque || "",
          regulatoryCategory:
            parsed.data.regulatoryCategory || current.regulatoryCategory || "",
          country: parsed.data.country || current.country || "",
          segment: parsed.data.segment || current.segment || "",
          platformName: parsed.data.platformName || current.platformName || "",
          drivetrain: parsed.data.drivetrain || current.drivetrain || "",
          doors: parsed.data.doors ?? current.doors,
          notes: parsed.data.notes || current.notes || "",
          imageUrl: current.imageUrl || "",
        };

        const changes = diffRecords(
          {
            internalCode: current.internalCode,
            yearStart: current.yearStart,
            yearEnd: current.yearEnd,
            manufactureYearStart: current.manufactureYearStart,
            manufactureYearEnd: current.manufactureYearEnd,
            power: current.power,
            torque: current.torque,
            category: current.category,
            regulatoryCategory: current.regulatoryCategory,
            segment: current.segment,
            platformName: current.platformName,
            drivetrain: current.drivetrain,
            doors: current.doors,
            country: current.country,
            notes: current.notes,
            isActive: current.isActive,
          },
          {
            internalCode: merged.internalCode || null,
            yearStart: merged.yearStart,
            yearEnd: merged.yearEnd,
            manufactureYearStart: merged.manufactureYearStart ?? null,
            manufactureYearEnd: merged.manufactureYearEnd ?? null,
            power: merged.power || null,
            torque: merged.torque || null,
            category: merged.category,
            regulatoryCategory: merged.regulatoryCategory || null,
            segment: merged.segment || null,
            platformName: merged.platformName || null,
            drivetrain: merged.drivetrain || null,
            doors: merged.doors ?? null,
            country: merged.country || null,
            notes: merged.notes || null,
            isActive: merged.isActive,
          }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateVeiculo(existing.id, merged);
        if (lote) {
          await registrarAtualizacao(
            "VehicleVersion",
            existing.id,
            lote.id,
            contexto?.userId ?? null,
            changes
          );
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const criado = await createVeiculo(parsed.data);
        if (lote) {
          await registrarCriacao(
            "VehicleVersion",
            criado.id,
            lote.id,
            contexto?.userId ?? null
          );
        }
        criados++;
        detalhes.push({ linha, status: "criado", sucesso: true, rotulo: label });
      }
    } catch (error) {
      detalhes.push({
        linha,
        status: "erro",
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        rotulo: label,
      });
    }
  }

  const falhas = detalhes.filter((d) => d.status === "erro").length;
  const sucesso = criados + atualizados;

  if (lote) {
    await finalizarLote(lote.id, {
      totalRows: rows.length,
      importedCount: criados,
      updatedCount: atualizados,
      duplicateCount: duplicados,
      errorCount: falhas,
      durationMs: Date.now() - inicio,
      erros: detalhes
        .filter((d) => d.status === "erro")
        .map((d) => ({
          rowNumber: d.linha,
          message: d.erro ?? "Erro desconhecido",
          rawData: d.rotulo ? JSON.stringify({ rotulo: d.rotulo }) : null,
        })),
    });
  }

  return {
    total: rows.length,
    sucesso,
    criados,
    atualizados,
    duplicados,
    falhas,
    detalhes,
  };
}

/**
 * Importa apenas Modelos (VehicleModel), sem criar VehicleVersion. Usado
 * por fontes que só confirmam quais modelos existem por marca (ex.: FIPE),
 * sem fornecer motor/categoria/carroceria — criar uma versão completa a
 * partir disso exigiria inventar dados. Modelo não tem campos além do
 * nome, então não há conceito de "atualizado": ou já existe (duplicado)
 * ou é criado.
 */
export async function importModelosVeiculo(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "VEICULOS",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(rows),
      })
    : null;

  const manufacturers = await listManufacturersRepo();
  const manufacturerIdByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id])
  );

  let criados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, record] of rows.entries()) {
    const linha = index + 2;
    const label = `${record.marca ?? ""} ${record.modelo ?? ""}`.trim();

    try {
      const manufacturerId = manufacturerIdByName.get(
        (record.marca ?? "").trim().toLowerCase()
      );
      const modelo = (record.modelo ?? "").trim();

      if (!manufacturerId) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Marca "${record.marca ?? ""}" não encontrada. Importe as montadoras antes dos modelos.`,
          rotulo: label,
        });
        continue;
      }

      if (!modelo) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: "Nome do modelo vazio",
          rotulo: label,
        });
        continue;
      }

      const existing = await findVehicleModelByName(manufacturerId, modelo);
      if (existing) {
        duplicados++;
        detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
        continue;
      }

      const modelId = await findOrCreateVehicleModel(manufacturerId, modelo);
      if (lote) {
        await registrarCriacao("VehicleModel", modelId, lote.id, contexto?.userId ?? null);
      }
      criados++;
      detalhes.push({ linha, status: "criado", sucesso: true, rotulo: label });
    } catch (error) {
      detalhes.push({
        linha,
        status: "erro",
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        rotulo: label,
      });
    }
  }

  const falhas = detalhes.filter((d) => d.status === "erro").length;
  const sucesso = criados;

  if (lote) {
    await finalizarLote(lote.id, {
      totalRows: rows.length,
      importedCount: criados,
      updatedCount: 0,
      duplicateCount: duplicados,
      errorCount: falhas,
      durationMs: Date.now() - inicio,
      erros: detalhes
        .filter((d) => d.status === "erro")
        .map((d) => ({
          rowNumber: d.linha,
          message: d.erro ?? "Erro desconhecido",
          rawData: d.rotulo ? JSON.stringify({ rotulo: d.rotulo }) : null,
        })),
    });
  }

  return {
    total: rows.length,
    sucesso,
    criados,
    atualizados: 0,
    duplicados,
    falhas,
    detalhes,
  };
}
