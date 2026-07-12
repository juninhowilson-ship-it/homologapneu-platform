import "server-only";
import {
  listPneus as listPneusRepo,
  findPneuById,
  findPneuByBusinessKey,
  findPneuByEan,
  findTireManufacturerById,
  listTireManufacturers as listTireManufacturersRepo,
  createPneu as createPneuRepo,
  updatePneu as updatePneuRepo,
  deletePneu as deletePneuRepo,
  type PneuRecord,
} from "@/repositories/pneus";
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
    category: record.category as TireCategory,
    segment: record.segment as TireSegment | null,
    ean: record.ean,
    description: record.description,
    imageUrl: record.imageUrl,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    homologationsCount: record._count.homologationTires,
  };
}

function normalizeInput(input: PneuFormValues) {
  return {
    tireManufacturerId: input.tireManufacturerId,
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
    category: input.category,
    segment: input.segment ? input.segment : null,
    ean: input.ean ? input.ean : null,
    description: input.description ? input.description : null,
    imageUrl: input.imageUrl ? input.imageUrl : null,
    isActive: input.isActive,
  };
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

export async function createPneu(input: PneuFormValues): Promise<Pneu> {
  await assertTireManufacturerExists(input.tireManufacturerId);
  await assertNoDuplicate(input);

  const record = await createPneuRepo(normalizeInput(input));
  return toDTO(record);
}

export async function updatePneu(
  id: number,
  input: PneuFormValues
): Promise<Pneu> {
  const current = await findPneuById(id);
  if (!current) {
    throw new NotFoundError("Pneu não encontrado");
  }

  await assertTireManufacturerExists(input.tireManufacturerId);
  await assertNoDuplicate(input, id);

  const record = await updatePneuRepo(id, normalizeInput(input));
  return toDTO(record);
}

export async function deletePneu(id: number): Promise<void> {
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
}

export async function importPneus(
  rows: Record<string, string>[]
): Promise<ImportacaoResultado> {
  const manufacturers = await listTireManufacturersRepo();
  const manufacturerIdByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id])
  );

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
          sucesso: false,
          erro: `Fabricante "${record.fabricante ?? ""}" não encontrado`,
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

      await createPneu(parsed.data);
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
    total: rows.length,
    sucesso: detalhes.filter((d) => d.sucesso).length,
    falhas: detalhes.filter((d) => !d.sucesso).length,
    detalhes,
  };
}
