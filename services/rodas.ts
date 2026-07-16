import "server-only";
import {
  listRodas as listRodasRepo,
  findRodaById,
  findRodaByBusinessKey,
  createRoda as createRodaRepo,
  updateRoda as updateRodaRepo,
  deleteRoda as deleteRodaRepo,
  type RodaRecord,
} from "@/repositories/rodas";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { rodaFormSchema, type RodaFormValues, type RodaListQuery } from "@/lib/validations/roda";
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
import type { Roda, RodaListResponse } from "@/types/roda";
import type { ImportacaoResultado, ImportacaoLinhaResultado } from "@/types/importacao";

function toDTO(record: RodaRecord): Roda {
  return {
    id: record.id,
    width: record.width,
    diameter: record.diameter,
    offset: record.offset,
    boltPattern: record.boltPattern,
    hubBore: record.hubBore,
    validationStatus: record.validationStatus,
    source: record.source,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    homologationsCount: record._count.homologationWheels,
  };
}

function normalizeInput(input: RodaFormValues) {
  return {
    width: input.width,
    diameter: input.diameter,
    offset: input.offset ?? null,
    boltPattern: input.boltPattern,
    hubBore: input.hubBore ?? null,
    validationStatus: input.validationStatus ?? "NECESSITA_VALIDACAO",
    source: input.source ? input.source : null,
  };
}

async function assertNoDuplicate(input: RodaFormValues, excludeId?: number) {
  const existing = await findRodaByBusinessKey(
    input.width,
    input.diameter,
    input.offset ?? null,
    input.boltPattern,
    excludeId
  );
  if (existing) {
    throw new ConflictError(
      "Já existe uma roda cadastrada com esta largura, diâmetro, offset e furação"
    );
  }
}

export async function listRodas(query: RodaListQuery): Promise<RodaListResponse> {
  const { data, total } = await listRodasRepo(query);
  return { data: data.map(toDTO), total, page: query.page, pageSize: query.pageSize };
}

export async function getRoda(id: number): Promise<Roda> {
  const record = await findRodaById(id);
  if (!record) throw new NotFoundError("Roda não encontrada");
  return toDTO(record);
}

export async function createRoda(
  input: RodaFormValues,
  userId: number | null = null
): Promise<Roda> {
  await assertNoDuplicate(input);
  const record = await createRodaRepo(normalizeInput(input));
  const dto = toDTO(record);
  await registrarAlteracaoManual({ entity: "Wheel", entityId: dto.id, action: "CREATE", userId });
  return dto;
}

export async function updateRoda(
  id: number,
  input: RodaFormValues,
  userId: number | null = null
): Promise<Roda> {
  const current = await findRodaById(id);
  if (!current) throw new NotFoundError("Roda não encontrada");
  await assertNoDuplicate(input, id);

  const before = toDTO(current);
  const record = await updateRodaRepo(id, normalizeInput(input));
  const after = toDTO(record);

  const changes = diffRecords(
    {
      width: before.width,
      diameter: before.diameter,
      offset: before.offset,
      boltPattern: before.boltPattern,
      hubBore: before.hubBore,
      validationStatus: before.validationStatus,
    },
    {
      width: after.width,
      diameter: after.diameter,
      offset: after.offset,
      boltPattern: after.boltPattern,
      hubBore: after.hubBore,
      validationStatus: after.validationStatus,
    }
  );

  if (changes) {
    await registrarAlteracaoManual({ entity: "Wheel", entityId: id, action: "UPDATE", userId, changes });
  }

  return after;
}

export async function deleteRoda(id: number, userId: number | null = null): Promise<void> {
  const current = await findRodaById(id);
  if (!current) throw new NotFoundError("Roda não encontrada");
  if (current._count.homologationWheels > 0) {
    throw new ConflictError(
      `Não é possível excluir: existem ${current._count.homologationWheels} homologação(ões) associada(s) a esta roda.`
    );
  }
  await deleteRodaRepo(id);
  await registrarAlteracaoManual({ entity: "Wheel", entityId: id, action: "DELETE", userId });
}

export async function importRodas(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "RODAS",
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
    const label = `${record.largura ?? ""}/R${record.diametro ?? ""} ${record.furacao ?? ""}`.trim();

    try {
      const parsed = rodaFormSchema.safeParse({
        width: Number(record.largura),
        diameter: Number(record.diametro),
        offset: record.offset ? Number(record.offset) : null,
        boltPattern: record.furacao,
        hubBore: record.cubo ? Number(record.cubo) : null,
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

      const existing = await findRodaByBusinessKey(
        parsed.data.width,
        parsed.data.diameter,
        parsed.data.offset ?? null,
        parsed.data.boltPattern
      );

      if (existing) {
        const current = await getRoda(existing.id);
        const merged: RodaFormValues = {
          ...parsed.data,
          hubBore: parsed.data.hubBore ?? current.hubBore,
        };

        const changes = diffRecords(
          { hubBore: current.hubBore, validationStatus: current.validationStatus },
          { hubBore: merged.hubBore ?? null, validationStatus: merged.validationStatus }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateRoda(existing.id, merged);
        if (lote) {
          await registrarAtualizacao("Wheel", existing.id, lote.id, contexto?.userId ?? null, changes);
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const criado = await createRoda(parsed.data);
        if (lote) {
          await registrarCriacao("Wheel", criado.id, lote.id, contexto?.userId ?? null);
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

  return { total: rows.length, sucesso, criados, atualizados, duplicados, falhas, detalhes };
}
