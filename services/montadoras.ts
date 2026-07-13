import "server-only";
import {
  listMontadoras as listMontadorasRepo,
  findMontadoraById,
  findMontadoraByName,
  createMontadora as createMontadoraRepo,
  updateMontadora as updateMontadoraRepo,
  deleteMontadora as deleteMontadoraRepo,
  type MontadoraRecord,
} from "@/repositories/montadoras";
import { NotFoundError, ConflictError } from "@/lib/errors";
import {
  montadoraFormSchema,
  type MontadoraFormValues,
} from "@/lib/validations/montadora";
import { parseBooleanPtBr } from "@/lib/enum-utils";
import { inferFileType } from "@/lib/importer/parseFile";
import type { ImportContexto } from "@/lib/importer/context";
import { diffRecords } from "@/lib/importer/diff";
import { computeImportHash } from "@/lib/importer/hash";
import {
  iniciarLote,
  finalizarLote,
  registrarCriacao,
  registrarAtualizacao,
} from "@/services/importBatches";
import type { Montadora } from "@/types/montadora";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";

function toDTO(record: MontadoraRecord): Montadora {
  return {
    id: record.id,
    name: record.name,
    country: record.country,
    website: record.website,
    notes: record.notes,
    logoUrl: record.logoUrl,
    isActive: record.isActive,
    validationStatus: record.validationStatus,
    source: record.source,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    modelsCount: record._count.models,
  };
}

function normalizeInput(input: MontadoraFormValues) {
  return {
    name: input.name,
    country: input.country ? input.country : null,
    website: input.website ? input.website : null,
    notes: input.notes ? input.notes : null,
    logoUrl: input.logoUrl ? input.logoUrl : null,
    isActive: input.isActive,
    validationStatus: input.validationStatus ?? "NECESSITA_VALIDACAO",
    source: input.source ? input.source : null,
  };
}

export async function listMontadoras(): Promise<Montadora[]> {
  const registros = await listMontadorasRepo();
  return registros.map(toDTO);
}

export async function getMontadora(id: number): Promise<Montadora> {
  const record = await findMontadoraById(id);
  if (!record) {
    throw new NotFoundError("Montadora não encontrada");
  }
  return toDTO(record);
}

export async function createMontadora(
  input: MontadoraFormValues
): Promise<Montadora> {
  const existing = await findMontadoraByName(input.name);
  if (existing) {
    throw new ConflictError("Já existe uma montadora com este nome");
  }

  const record = await createMontadoraRepo(normalizeInput(input));
  return toDTO(record);
}

export async function updateMontadora(
  id: number,
  input: MontadoraFormValues
): Promise<Montadora> {
  const current = await findMontadoraById(id);
  if (!current) {
    throw new NotFoundError("Montadora não encontrada");
  }

  const existing = await findMontadoraByName(input.name, id);
  if (existing) {
    throw new ConflictError("Já existe uma montadora com este nome");
  }

  const record = await updateMontadoraRepo(id, normalizeInput(input));
  return toDTO(record);
}

export async function deleteMontadora(id: number): Promise<void> {
  const current = await findMontadoraById(id);
  if (!current) {
    throw new NotFoundError("Montadora não encontrada");
  }

  if (current._count.models > 0) {
    throw new ConflictError(
      `Não é possível excluir: existem ${current._count.models} modelo(s) associado(s) a esta montadora. Marque-a como inativa em vez de excluir.`
    );
  }

  await deleteMontadoraRepo(id);
}

export async function importMontadoras(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "MONTADORAS",
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
    const label = (record.nome ?? "").trim();

    try {
      const parsed = montadoraFormSchema.safeParse({
        name: record.nome,
        country: record.pais,
        website: record.site,
        notes: record.observacoes,
        logoUrl: record.logo,
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

      const existing = await findMontadoraByName(parsed.data.name);

      if (existing) {
        const current = await getMontadora(existing.id);

        const merged: MontadoraFormValues = {
          ...parsed.data,
          country: parsed.data.country || current.country || "",
          website: parsed.data.website || current.website || "",
          notes: parsed.data.notes || current.notes || "",
          logoUrl: parsed.data.logoUrl || current.logoUrl || "",
        };

        const changes = diffRecords(
          {
            country: current.country,
            website: current.website,
            notes: current.notes,
            isActive: current.isActive,
          },
          {
            country: merged.country || null,
            website: merged.website || null,
            notes: merged.notes || null,
            isActive: merged.isActive,
          }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateMontadora(existing.id, merged);
        if (lote) {
          await registrarAtualizacao(
            "Manufacturer",
            existing.id,
            lote.id,
            contexto?.userId ?? null,
            changes
          );
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const criado = await createMontadora(parsed.data);
        if (lote) {
          await registrarCriacao(
            "Manufacturer",
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
