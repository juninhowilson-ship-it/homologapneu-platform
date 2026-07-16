import "server-only";
import {
  listHomologacoes as listHomologacoesRepo,
  findHomologacaoById,
  findHomologacaoByBusinessKey,
  findVehicleVersionById,
  findVehicleVersionByNaturalKey,
  findTiresByIds,
  findTireByNaturalKey,
  listVehicleOptions as listVehicleOptionsRepo,
  listTireOptions as listTireOptionsRepo,
  createHomologacao as createHomologacaoRepo,
  updateHomologacao as updateHomologacaoRepo,
  deleteHomologacao as deleteHomologacaoRepo,
  addWheelToHomologacao,
  removeWheelFromHomologacao,
  findHomologationWheel,
  findWheelById,
  addPressureSpec,
  removePressureSpec,
  addHomologationDocument,
  removeHomologationDocument,
  type HomologacaoRecord,
  type PressureSpecInput,
  type HomologationDocumentInput,
} from "@/repositories/homologacoes";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import {
  homologacaoFormSchema,
  type HomologacaoFormValues,
  type HomologacaoListQuery,
} from "@/lib/validations/homologacao";
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
import type {
  Homologacao,
  HomologacaoListResponse,
  HomologacaoTireItem,
  HomologacaoWheelItem,
  HomologacaoPressureSpec,
  HomologacaoDocumentItem,
} from "@/types/homologacao";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";

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
    isOE: entry.role === "ORIGINAL",
  }));

  const wheels: HomologacaoWheelItem[] = record.wheels.map((entry) => ({
    id: entry.id,
    wheelId: entry.wheelId,
    role: entry.role,
    width: entry.wheel.width,
    diameter: entry.wheel.diameter,
    offset: entry.wheel.offset,
    boltPattern: entry.wheel.boltPattern,
    hubBore: entry.wheel.hubBore,
    isOE: entry.role === "ORIGINAL",
  }));

  const pressureSpecs: HomologacaoPressureSpec[] = record.pressureSpecs.map((spec) => ({
    id: spec.id,
    emptyFront: spec.emptyFront,
    emptyRear: spec.emptyRear,
    partialLoadFront: spec.partialLoadFront,
    partialLoadRear: spec.partialLoadRear,
    fullLoadFront: spec.fullLoadFront,
    fullLoadRear: spec.fullLoadRear,
    source: spec.source,
    sourceUrl: spec.sourceUrl,
    createdAt: spec.createdAt.toISOString(),
  }));

  const documents: HomologacaoDocumentItem[] = record.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    url: doc.url,
    type: doc.type,
    page: doc.page,
    sha256: doc.sha256,
    manufacturerName: doc.manufacturerName,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  }));

  return {
    id: record.id,
    code: record.code,
    vehicleId: record.vehicleVersionId,
    vehicleLabel: `${record.vehicleVersion.vehicleModel.manufacturer.name} ${record.vehicleVersion.vehicleModel.name} ${record.vehicleVersion.name}`,
    manufacturerName: record.vehicleVersion.vehicleModel.manufacturer.name,
    year: record.year,
    manufactureYear: record.manufactureYear,
    version: record.vehicleVersion.name,
    engine: record.vehicleVersion.engine.name,
    generation: record.vehicleVersion.generation?.name ?? null,
    transmission: record.vehicleVersion.transmission
      ? `${record.vehicleVersion.transmission.type}${record.vehicleVersion.transmission.gears ? ` ${record.vehicleVersion.transmission.gears}v` : ""}`
      : null,
    drivetrain: record.vehicleVersion.drivetrain,
    notes: record.notes,
    validationStatus: record.validationStatus,
    source: record.source,
    validatedBy: record.validatedBy,
    validatedAt: record.validatedAt ? record.validatedAt.toISOString() : null,
    tires,
    originalTire: tires.find((tire) => tire.role === "ORIGINAL") ?? null,
    optionalTires: tires.filter((tire) => tire.role === "OPCIONAL"),
    wheels,
    originalWheel: wheels.find((wheel) => wheel.role === "ORIGINAL") ?? null,
    optionalWheels: wheels.filter((wheel) => wheel.role === "OPCIONAL"),
    pressureSpecs,
    documents,
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
    manufactureYear: input.manufactureYear ?? null,
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
  validadoPor: string | null = null,
  userId: number | null = null
): Promise<Homologacao> {
  await assertVehicleExists(input.vehicleId);
  await assertTiresExist(input);
  await assertNoDuplicate(input);

  const record = await createHomologacaoRepo(
    normalizeInput(input, validadoPor)
  );
  const dto = toDTO(record);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: dto.id,
    action: "CREATE",
    userId,
  });
  return dto;
}

export async function updateHomologacao(
  id: number,
  input: HomologacaoFormValues,
  validadoPor: string | null = null,
  userId: number | null = null
): Promise<Homologacao> {
  const current = await findHomologacaoById(id);
  if (!current) {
    throw new NotFoundError("Homologação não encontrada");
  }

  await assertVehicleExists(input.vehicleId);
  await assertTiresExist(input);
  await assertNoDuplicate(input, id);

  const before = toDTO(current);
  const record = await updateHomologacaoRepo(
    id,
    normalizeInput(input, validadoPor)
  );
  const after = toDTO(record);

  const changes = diffRecords(
    {
      code: before.code,
      year: before.year,
      manufactureYear: before.manufactureYear,
      notes: before.notes,
      validationStatus: before.validationStatus,
      tireOriginalId: before.originalTire?.tireId ?? null,
      optionalTires: JSON.stringify(
        before.optionalTires.map((t) => t.tireId).sort((a, b) => a - b)
      ),
    },
    {
      code: after.code,
      year: after.year,
      manufactureYear: after.manufactureYear,
      notes: after.notes,
      validationStatus: after.validationStatus,
      tireOriginalId: after.originalTire?.tireId ?? null,
      optionalTires: JSON.stringify(
        after.optionalTires.map((t) => t.tireId).sort((a, b) => a - b)
      ),
    }
  );

  if (changes) {
    await registrarAlteracaoManual({
      entity: "Homologation",
      entityId: id,
      action: "UPDATE",
      userId,
      changes,
    });
  }

  return after;
}

export async function deleteHomologacao(
  id: number,
  userId: number | null = null
): Promise<void> {
  const current = await findHomologacaoById(id);
  if (!current) {
    throw new NotFoundError("Homologação não encontrada");
  }

  await deleteHomologacaoRepo(id);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: id,
    action: "DELETE",
    userId,
  });
}

/// Rodas/pressões/documentos são sub-recursos "quando existir" — não
/// fazem parte do formulário obrigatório de criação/edição da
/// homologação (homologacaoFormSchema), para não alterar esse contrato
/// já em uso. Cada função aqui confere que a homologação existe e
/// registra auditoria (AuditLog via registrarAlteracaoManual), igual ao
/// resto do serviço.

async function assertHomologacaoExists(id: number) {
  const current = await findHomologacaoById(id);
  if (!current) throw new NotFoundError("Homologação não encontrada");
}

export async function adicionarRoda(
  homologationId: number,
  wheelId: number,
  role: "ORIGINAL" | "OPCIONAL",
  userId: number | null = null
): Promise<Homologacao> {
  await assertHomologacaoExists(homologationId);
  const wheel = await findWheelById(wheelId);
  if (!wheel) throw new ValidationError("Roda selecionada não existe");

  const existing = await findHomologationWheel(homologationId, wheelId);
  if (existing) throw new ConflictError("Esta roda já está vinculada a esta homologação");

  await addWheelToHomologacao(homologationId, wheelId, role);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: homologationId,
    action: "UPDATE",
    userId,
    changes: { roda: { before: null, after: `${wheel.width}J x ${wheel.diameter} ${wheel.boltPattern} (${role})` } },
  });
  return getHomologacao(homologationId);
}

export async function removerRoda(
  homologationId: number,
  wheelId: number,
  userId: number | null = null
): Promise<Homologacao> {
  await assertHomologacaoExists(homologationId);
  await removeWheelFromHomologacao(homologationId, wheelId);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: homologationId,
    action: "UPDATE",
    userId,
    changes: { roda: { before: `wheelId ${wheelId}`, after: null } },
  });
  return getHomologacao(homologationId);
}

export async function adicionarPressao(
  homologationId: number,
  input: PressureSpecInput,
  userId: number | null = null
): Promise<Homologacao> {
  await assertHomologacaoExists(homologationId);
  await addPressureSpec(homologationId, input);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: homologationId,
    action: "UPDATE",
    userId,
    changes: { pressao: { before: null, after: JSON.stringify(input) } },
  });
  return getHomologacao(homologationId);
}

export async function removerPressao(
  homologationId: number,
  pressureSpecId: number,
  userId: number | null = null
): Promise<Homologacao> {
  await assertHomologacaoExists(homologationId);
  await removePressureSpec(pressureSpecId);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: homologationId,
    action: "UPDATE",
    userId,
    changes: { pressao: { before: `id ${pressureSpecId}`, after: null } },
  });
  return getHomologacao(homologationId);
}

export async function adicionarDocumento(
  homologationId: number,
  input: HomologationDocumentInput,
  userId: number | null = null
): Promise<Homologacao> {
  await assertHomologacaoExists(homologationId);
  if (!input.name.trim() || !input.url.trim()) {
    throw new ValidationError("Nome e URL do documento são obrigatórios");
  }
  await addHomologationDocument(homologationId, input);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: homologationId,
    action: "UPDATE",
    userId,
    changes: { documento: { before: null, after: input.url } },
  });
  return getHomologacao(homologationId);
}

export async function removerDocumento(
  homologationId: number,
  documentId: number,
  userId: number | null = null
): Promise<Homologacao> {
  await assertHomologacaoExists(homologationId);
  await removeHomologationDocument(documentId);
  await registrarAlteracaoManual({
    entity: "Homologation",
    entityId: homologationId,
    action: "UPDATE",
    userId,
    changes: { documento: { before: `id ${documentId}`, after: null } },
  });
  return getHomologacao(homologationId);
}

function parseOptionalTiresField(
  raw: string
): { manufacturer: string; model: string; size: string }[] {
  if (!raw.trim()) return [];

  return raw
    .split(";")
    .map((group) => group.trim())
    .filter(Boolean)
    .map((group) => {
      const [manufacturer, model, size] = group.split("|").map((p) => p.trim());
      return { manufacturer: manufacturer ?? "", model: model ?? "", size: size ?? "" };
    })
    .filter((g) => g.manufacturer && g.model && g.size);
}

export async function importHomologacoes(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "HOMOLOGACOES",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(rows),
      })
    : null;

  let criados = 0;
  let atualizados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, record] of rows.entries()) {
    const linha = index + 2;
    const label = `${record.marca ?? ""} ${record.modelo ?? ""} ${record.versao ?? ""} - ${record.codigo ?? ""}`.trim();

    try {
      const vehicle = await findVehicleVersionByNaturalKey(
        record.marca ?? "",
        record.modelo ?? "",
        record.versao ?? ""
      );
      if (!vehicle) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Veículo "${record.marca ?? ""} ${record.modelo ?? ""} ${record.versao ?? ""}" não encontrado. Importe os veículos antes das homologações.`,
          rotulo: label,
        });
        continue;
      }

      const originalTire = await findTireByNaturalKey(
        record.pneuOriginalFabricante ?? "",
        record.pneuOriginalModelo ?? "",
        record.pneuOriginalMedida ?? ""
      );
      if (!originalTire) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Pneu original "${record.pneuOriginalFabricante ?? ""} ${record.pneuOriginalModelo ?? ""} ${record.pneuOriginalMedida ?? ""}" não encontrado. Importe os pneus antes das homologações.`,
          rotulo: label,
        });
        continue;
      }

      const optionalGroups = parseOptionalTiresField(record.pneusOpcionais ?? "");
      const optionalTireIds: number[] = [];
      let optionalError: string | null = null;

      for (const group of optionalGroups) {
        const tire = await findTireByNaturalKey(
          group.manufacturer,
          group.model,
          group.size
        );
        if (!tire) {
          optionalError = `Pneu opcional "${group.manufacturer} ${group.model} ${group.size}" não encontrado`;
          break;
        }
        optionalTireIds.push(tire.id);
      }

      if (optionalError) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: optionalError,
          rotulo: label,
        });
        continue;
      }

      const parsed = homologacaoFormSchema.safeParse({
        vehicleId: vehicle.id,
        code: record.codigo,
        year: Number(record.anoModelo),
        manufactureYear: record.anoFabricacao ? Number(record.anoFabricacao) : null,
        tireOriginalId: originalTire.id,
        tireOptionalIds: optionalTireIds,
        notes: record.observacoes,
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

      const existing = await findHomologacaoByBusinessKey(
        vehicle.id,
        parsed.data.code
      );

      if (existing) {
        const current = await getHomologacao(existing.id);

        const merged: HomologacaoFormValues = {
          ...parsed.data,
          manufactureYear: parsed.data.manufactureYear ?? current.manufactureYear,
          notes: parsed.data.notes || current.notes || "",
        };

        const currentOptionalIds = current.optionalTires
          .map((t) => t.tireId)
          .sort((a, b) => a - b);
        const nextOptionalIds = [...merged.tireOptionalIds].sort((a, b) => a - b);

        const changes = diffRecords(
          {
            year: current.year,
            manufactureYear: current.manufactureYear,
            notes: current.notes,
            tireOriginalId: current.originalTire?.tireId ?? null,
            optionalTires: JSON.stringify(currentOptionalIds),
          },
          {
            year: merged.year,
            manufactureYear: merged.manufactureYear ?? null,
            notes: merged.notes || null,
            tireOriginalId: merged.tireOriginalId,
            optionalTires: JSON.stringify(nextOptionalIds),
          }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateHomologacao(existing.id, merged);
        if (lote) {
          await registrarAtualizacao(
            "Homologation",
            existing.id,
            lote.id,
            contexto?.userId ?? null,
            changes
          );
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const criado = await createHomologacao(parsed.data);
        if (lote) {
          await registrarCriacao(
            "Homologation",
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
