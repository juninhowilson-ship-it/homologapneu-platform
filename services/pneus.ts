import "server-only";
import {
  listPneus as listPneusRepo,
  findPneuById,
  findPneuByBusinessKey,
  findPneuByEan,
  findTireManufacturerById,
  findOrCreateTireFamily,
  findOrCreateTechnology,
  findOrCreateTireModel,
  findTireManufacturerByName,
  syncTireTechnologies,
  findTechnologyByName,
  updateTechnologyDescription,
  findOeCode,
  findOrCreateOeCode,
  updateOeCodeDescription,
  listTireManufacturers as listTireManufacturersRepo,
  createPneu as createPneuRepo,
  updatePneu as updatePneuRepo,
  deletePneu as deletePneuRepo,
  type PneuRecord,
} from "@/repositories/pneus";
import { resolveManufacturerId } from "@/lib/masterData/resolveManufacturer";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import {
  pneuFormSchema,
  type PneuFormValues,
  type PneuListQuery,
} from "@/lib/validations/pneu";
import {
  TIRE_CATEGORIES,
  TIRE_CATEGORY_LABELS,
  TIRE_SEGMENTS,
  TIRE_SEGMENT_LABELS,
  type TireCategory,
  type TireSegment,
} from "@/lib/constants/pneu";
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
import type { Pneu, PneuListResponse } from "@/types/pneu";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";

function toDTO(record: PneuRecord): Pneu {
  return {
    id: record.id,
    tireManufacturerId: record.tireManufacturerId,
    tireManufacturerName: record.tireManufacturer.name,
    brand: record.brand,
    model: record.model,
    family: record.tireFamily?.name ?? null,
    size: record.size,
    width: record.width,
    profile: record.profile,
    rim: record.rim,
    loadIndex: record.loadIndex,
    speedIndex: record.speedIndex,
    runFlat: record.runFlat,
    xl: record.xl,
    seal: record.seal,
    tubeless: record.tubeless,
    type: record.type,
    category: record.category as TireCategory,
    segment: record.segment as TireSegment | null,
    ean: record.ean,
    description: record.description,
    imageUrl: record.imageUrl,
    isActive: record.isActive,
    validationStatus: record.validationStatus,
    source: record.source,
    validatedBy: record.validatedBy,
    validatedAt: record.validatedAt ? record.validatedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    homologationsCount: record._count.homologationTires,
    technologies: record.technologies.map((t) => t.technology.name),
  };
}

async function applyTechnologies(
  tireId: number,
  technologyNames: string[] | undefined,
  source: string | null
): Promise<void> {
  if (technologyNames === undefined) return;

  const ids = await Promise.all(
    technologyNames.map((name) => findOrCreateTechnology(name, source))
  );
  await syncTireTechnologies(tireId, Array.from(new Set(ids)));
}

async function normalizeInput(
  input: PneuFormValues,
  validadoPor: string | null
) {
  const tireFamilyId = input.family
    ? await findOrCreateTireFamily(input.tireManufacturerId, input.family)
    : undefined;
  const validationStatus = input.validationStatus ?? "NECESSITA_VALIDACAO";

  return {
    tireManufacturerId: input.tireManufacturerId,
    tireFamilyId,
    brand: input.brand,
    model: input.model,
    size: `${input.width}/${input.profile}R${input.rim}`,
    width: input.width,
    profile: input.profile,
    rim: input.rim,
    loadIndex: input.loadIndex,
    speedIndex: input.speedIndex,
    runFlat: input.runFlat,
    xl: input.xl,
    seal: input.seal,
    tubeless: input.tubeless,
    type: input.type,
    category: input.category,
    segment: input.segment ? input.segment : null,
    ean: input.ean ? input.ean : null,
    description: input.description ? input.description : null,
    imageUrl: input.imageUrl ? input.imageUrl : null,
    isActive: input.isActive,
    validationStatus,
    source: input.source ? input.source : null,
    validatedBy: validationStatus === "VALIDADO" ? validadoPor : null,
    validatedAt: validationStatus === "VALIDADO" ? new Date() : null,
  };
}

function parseTechnologiesField(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  return Array.from(
    new Set(
      raw
        .split(/[;,]/)
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
}

async function assertTireManufacturerExists(tireManufacturerId: number) {
  const manufacturer = await findTireManufacturerById(tireManufacturerId);
  if (!manufacturer) {
    throw new ValidationError("Fabricante selecionado não existe");
  }
}

async function assertNoDuplicate(input: PneuFormValues, excludeId?: number) {
  const size = `${input.width}/${input.profile}R${input.rim}`;
  const existing = await findPneuByBusinessKey(
    input.tireManufacturerId,
    input.model,
    size,
    excludeId
  );
  if (existing) {
    throw new ConflictError(
      "Já existe um pneu cadastrado com este fabricante, modelo e medida"
    );
  }

  if (input.ean) {
    const existingEan = await findPneuByEan(input.ean, excludeId);
    if (existingEan) {
      throw new ConflictError("Já existe um pneu cadastrado com este EAN");
    }
  }
}

export async function listPneus(
  query: PneuListQuery
): Promise<PneuListResponse> {
  const { data, total } = await listPneusRepo(query);

  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getPneu(id: number): Promise<Pneu> {
  const record = await findPneuById(id);
  if (!record) {
    throw new NotFoundError("Pneu não encontrado");
  }
  return toDTO(record);
}

export async function listTireManufacturers() {
  return listTireManufacturersRepo();
}

export async function createPneu(
  input: PneuFormValues,
  validadoPor: string | null = null,
  userId: number | null = null,
  technologyNames?: string[]
): Promise<Pneu> {
  await assertTireManufacturerExists(input.tireManufacturerId);
  await assertNoDuplicate(input);

  const normalized = await normalizeInput(input, validadoPor);
  const record = await createPneuRepo(normalized);
  await applyTechnologies(record.id, technologyNames, normalized.source);
  const dto = toDTO((await findPneuById(record.id)) ?? record);
  await registrarAlteracaoManual({
    entity: "Tire",
    entityId: dto.id,
    action: "CREATE",
    userId,
  });
  return dto;
}

export async function updatePneu(
  id: number,
  input: PneuFormValues,
  validadoPor: string | null = null,
  userId: number | null = null,
  technologyNames?: string[]
): Promise<Pneu> {
  const current = await findPneuById(id);
  if (!current) {
    throw new NotFoundError("Pneu não encontrado");
  }

  await assertTireManufacturerExists(input.tireManufacturerId);
  await assertNoDuplicate(input, id);

  const before = toDTO(current);
  const normalized = await normalizeInput(input, validadoPor);
  await updatePneuRepo(id, normalized);
  await applyTechnologies(id, technologyNames, normalized.source);
  const after = toDTO((await findPneuById(id)) as PneuRecord);

  const changes = diffRecords(
    {
      brand: before.brand,
      model: before.model,
      family: before.family,
      size: before.size,
      loadIndex: before.loadIndex,
      speedIndex: before.speedIndex,
      runFlat: before.runFlat,
      xl: before.xl,
      seal: before.seal,
      tubeless: before.tubeless,
      category: before.category,
      segment: before.segment,
      isActive: before.isActive,
      validationStatus: before.validationStatus,
      technologies: JSON.stringify([...before.technologies].sort()),
    },
    {
      brand: after.brand,
      model: after.model,
      family: after.family,
      size: after.size,
      loadIndex: after.loadIndex,
      speedIndex: after.speedIndex,
      runFlat: after.runFlat,
      xl: after.xl,
      seal: after.seal,
      tubeless: after.tubeless,
      category: after.category,
      segment: after.segment,
      isActive: after.isActive,
      validationStatus: after.validationStatus,
      technologies: JSON.stringify([...after.technologies].sort()),
    }
  );

  if (changes) {
    await registrarAlteracaoManual({
      entity: "Tire",
      entityId: id,
      action: "UPDATE",
      userId,
      changes,
    });
  }

  return after;
}

export async function deletePneu(
  id: number,
  userId: number | null = null
): Promise<void> {
  const current = await findPneuById(id);
  if (!current) {
    throw new NotFoundError("Pneu não encontrado");
  }

  if (current._count.homologationTires > 0) {
    throw new ConflictError(
      `Não é possível excluir: existem ${current._count.homologationTires} homologação(ões) associada(s) a este pneu. Marque-o como inativo em vez de excluir.`
    );
  }

  await deletePneuRepo(id);
  await registrarAlteracaoManual({
    entity: "Tire",
    entityId: id,
    action: "DELETE",
    userId,
  });
}

export async function importPneus(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "PNEUS",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(rows),
      })
    : null;

  const manufacturers = await listTireManufacturersRepo();
  const manufacturerIdByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id])
  );

  let criados = 0;
  let atualizados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, record] of rows.entries()) {
    const linha = index + 2;
    const label = `${record.fabricante ?? ""} ${record.marca ?? ""} ${record.modelo ?? ""}`.trim();

    try {
      const tireManufacturerId = manufacturerIdByName.get(
        (record.fabricante ?? "").trim().toLowerCase()
      );
      if (!tireManufacturerId) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Fabricante "${record.fabricante ?? ""}" não encontrado. Importe os fabricantes antes dos pneus.`,
          rotulo: label,
        });
        continue;
      }

      const category = normalizeToEnum(
        record.categoria ?? "",
        TIRE_CATEGORIES,
        TIRE_CATEGORY_LABELS
      );
      const segment = record.segmento
        ? normalizeToEnum(record.segmento, TIRE_SEGMENTS, TIRE_SEGMENT_LABELS)
        : null;

      const parsed = pneuFormSchema.safeParse({
        tireManufacturerId,
        brand: record.marca || record.fabricante,
        model: record.modelo,
        family: record.familia,
        width: Number(record.largura),
        profile: Number(record.perfil),
        rim: Number(record.aro),
        loadIndex: record.indiceCarga,
        speedIndex: record.indiceVelocidade,
        runFlat: parseBooleanPtBr(record.runFlat, false),
        xl: parseBooleanPtBr(record.xl, false),
        seal: parseBooleanPtBr(record.seal, false),
        tubeless: parseBooleanPtBr(record.tubeless, true),
        category: category ?? undefined,
        segment: segment ?? undefined,
        ean: record.ean,
        description: record.descricao,
        isActive: parseBooleanPtBr(record.status, true),
        type: "RADIAL",
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

      const size = `${parsed.data.width}/${parsed.data.profile}R${parsed.data.rim}`;
      const technologyNames = parseTechnologiesField(record.tecnologias);
      const existing = await findPneuByBusinessKey(
        tireManufacturerId,
        parsed.data.model,
        size
      );

      if (existing) {
        const current = await getPneu(existing.id);

        const merged: PneuFormValues = {
          ...parsed.data,
          family: parsed.data.family || current.family || "",
          ean: parsed.data.ean || current.ean || "",
          description: parsed.data.description || current.description || "",
          imageUrl: current.imageUrl || "",
        };

        const nextTechnologies = technologyNames ?? current.technologies;

        const changes = diffRecords(
          {
            loadIndex: current.loadIndex,
            speedIndex: current.speedIndex,
            runFlat: current.runFlat,
            xl: current.xl,
            seal: current.seal,
            tubeless: current.tubeless,
            category: current.category,
            segment: current.segment,
            ean: current.ean,
            description: current.description,
            isActive: current.isActive,
            technologies: JSON.stringify([...current.technologies].sort()),
          },
          {
            loadIndex: merged.loadIndex,
            speedIndex: merged.speedIndex,
            runFlat: merged.runFlat,
            xl: merged.xl,
            seal: merged.seal,
            tubeless: merged.tubeless,
            category: merged.category,
            segment: merged.segment || null,
            ean: merged.ean || null,
            description: merged.description || null,
            isActive: merged.isActive,
            technologies: JSON.stringify([...nextTechnologies].sort()),
          }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updatePneu(existing.id, merged, null, null, technologyNames);
        if (lote) {
          await registrarAtualizacao(
            "Tire",
            existing.id,
            lote.id,
            contexto?.userId ?? null,
            changes
          );
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const criado = await createPneu(parsed.data, null, null, technologyNames);
        if (lote) {
          await registrarCriacao("Tire", criado.id, lote.id, contexto?.userId ?? null);
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

export type ModeloParaImportar = { nome: string; fabricante: string };

/**
 * Importa uma lista de modelos/linhas de pneu (TireModel — ex.: "Primacy
 * 5"), cada um já com o nome do fabricante ao qual pertence. Distinto de
 * importPneus (que importa Tire, o SKU com medida/índices/categoria já
 * definidos): este só cadastra a linha do produto, sem nenhuma medida —
 * TireModel não exige nenhum dado que não foi dado (nome + fabricante).
 *
 * Idempotente: TireModel.@@unique([tireManufacturerId, name]) garante
 * nunca duplicar; reexecutar a mesma lista não cria nada novo.
 */
export async function importarModelosPorNome(
  modelos: ModeloParaImportar[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "PNEUS",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(modelos),
      })
    : null;

  let criados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, item] of modelos.entries()) {
    const linha = index + 2;
    const nome = item.nome.trim();
    const fabricante = item.fabricante.trim();
    const label = `${fabricante} ${nome}`.trim();

    try {
      if (!nome || !fabricante) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: "Nome do modelo e fabricante são obrigatórios",
          rotulo: label,
        });
        continue;
      }

      const manufacturer = await findTireManufacturerByName(fabricante);
      if (!manufacturer) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Fabricante "${fabricante}" não encontrado — cadastre-o antes de importar seus modelos`,
          rotulo: label,
        });
        continue;
      }

      const { id: tireModelId, created } = await findOrCreateTireModel(manufacturer.id, nome);

      if (lote) {
        if (created) {
          await registrarCriacao("TireModel", tireModelId, lote.id, contexto?.userId ?? null);
        }
      }

      if (created) {
        criados++;
        detalhes.push({ linha, status: "criado", sucesso: true, rotulo: label });
      } else {
        duplicados++;
        detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
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
  const sucesso = criados;

  if (lote) {
    await finalizarLote(lote.id, {
      totalRows: modelos.length,
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
    total: modelos.length,
    sucesso,
    criados,
    atualizados: 0,
    duplicados,
    falhas,
    detalhes,
  };
}

/**
 * Importa Technology (tecnologias de pneu, ex.: "Seal Inside",
 * "ContiSilent" — nunca códigos OEM, ver Technology/OeCode). Colunas:
 * nome, descricao. Idempotente via Technology.name @unique.
 */
export async function importarTecnologias(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "TECNOLOGIAS",
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
    const nome = (record.nome ?? "").trim();
    const descricao = (record.descricao ?? "").trim() || null;

    try {
      if (!nome) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: "Nome é obrigatório",
          rotulo: nome,
        });
        continue;
      }

      const existing = await findTechnologyByName(nome);

      if (existing) {
        const changes = diffRecords(
          { description: existing.description },
          { description: descricao }
        );
        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: nome });
          continue;
        }
        await updateTechnologyDescription(existing.id, descricao);
        if (lote) {
          await registrarAtualizacao("Technology", existing.id, lote.id, contexto?.userId ?? null, changes);
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: nome });
      } else {
        const created = await prisma.technology.create({
          data: { name: nome, description: descricao },
          select: { id: true },
        });
        if (lote) {
          await registrarCriacao("Technology", created.id, lote.id, contexto?.userId ?? null);
        }
        criados++;
        detalhes.push({ linha, status: "criado", sucesso: true, rotulo: nome });
      }
    } catch (error) {
      detalhes.push({
        linha,
        status: "erro",
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        rotulo: nome,
      });
    }
  }

  const falhas = detalhes.filter((d) => d.status === "erro").length;

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
    sucesso: criados + atualizados,
    criados,
    atualizados,
    duplicados,
    falhas,
    detalhes,
  };
}

/**
 * Importa OeCode (código OE declarado pela montadora, ex.: "MO", "AO",
 * "N0" — nunca confundir com Technology). Colunas: montadora, codigo,
 * descricao. Resolve a montadora pelo mesmo mecanismo do domínio de
 * veículos (normalizedName + SearchAlias) — nunca cria a montadora, só
 * resolve uma já existente. Idempotente via
 * OeCode.@@unique([vehicleManufacturerId, code]).
 */
export async function importarOeCodes(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "CODIGOS_OE",
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
    const montadora = (record.montadora ?? "").trim();
    const codigo = (record.codigo ?? "").trim();
    const descricao = (record.descricao ?? "").trim() || null;
    const label = `${montadora} ${codigo}`.trim();

    try {
      if (!montadora || !codigo) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: "montadora e codigo são obrigatórios",
          rotulo: label,
        });
        continue;
      }

      const manufacturer = await resolveManufacturerId(prisma, montadora);
      if (!manufacturer) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Montadora "${montadora}" não encontrada — cadastre-a antes de importar seus códigos OE`,
          rotulo: label,
        });
        continue;
      }

      const existing = await findOeCode(manufacturer.id, codigo);

      if (existing) {
        const changes = diffRecords(
          { description: existing.description },
          { description: descricao }
        );
        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }
        await updateOeCodeDescription(existing.id, descricao);
        if (lote) {
          await registrarAtualizacao("OeCode", existing.id, lote.id, contexto?.userId ?? null, changes);
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const id = await findOrCreateOeCode(manufacturer.id, codigo, contexto ? `Importação: ${contexto.fileName}` : null);
        if (descricao) await updateOeCodeDescription(id, descricao);
        if (lote) {
          await registrarCriacao("OeCode", id, lote.id, contexto?.userId ?? null);
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
    sucesso: criados + atualizados,
    criados,
    atualizados,
    duplicados,
    falhas,
    detalhes,
  };
}
