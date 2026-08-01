import "server-only";
import {
  listFabricantes as listFabricantesRepo,
  findFabricanteById,
  findFabricanteByName,
  createFabricante as createFabricanteRepo,
  updateFabricante as updateFabricanteRepo,
  deleteFabricante as deleteFabricanteRepo,
  type FabricanteRecord,
} from "@/repositories/fabricantes";
import { NotFoundError, ConflictError } from "@/lib/errors";
import {
  fabricanteFormSchema,
  type FabricanteFormValues,
  type FabricanteListQuery,
} from "@/lib/validations/fabricante";
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
  registrarAlteracaoManual,
} from "@/services/importBatches";
import type { Fabricante, FabricanteListResponse } from "@/types/fabricante";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";
import {
  DEFAULT_BRAND_POLICY,
  isKnownBrandPolicy,
  type BrandPolicy,
} from "@/lib/constants/brandPolicy";
import { slugify } from "@/lib/masterData/slugify";
import { normalizeLookupKey } from "@/lib/masterData/normalizeName";

function toDTO(record: FabricanteRecord): Fabricante {
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
    confidence: record.confidence,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    tiresCount: record._count.tires,
  };
}

function normalizeInput(input: FabricanteFormValues) {
  return {
    name: input.name,
    country: input.country,
    website: input.website ? input.website : null,
    notes: input.notes ? input.notes : null,
    logoUrl: input.logoUrl ? input.logoUrl : null,
    isActive: input.isActive,
    validationStatus: input.validationStatus ?? "NECESSITA_VALIDACAO",
    source: input.source ? input.source : null,
    confidence: input.confidence ?? null,
  };
}

export async function listFabricantes(
  query: FabricanteListQuery
): Promise<FabricanteListResponse> {
  const { data, total } = await listFabricantesRepo(query);

  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getFabricante(id: number): Promise<Fabricante> {
  const record = await findFabricanteById(id);

  if (!record) {
    throw new NotFoundError("Fabricante não encontrado");
  }

  return toDTO(record);
}

export async function createFabricante(
  input: FabricanteFormValues,
  userId: number | null = null
): Promise<Fabricante> {
  const existing = await findFabricanteByName(input.name);
  if (existing) {
    throw new ConflictError("Já existe um fabricante com este nome");
  }

  const record = await createFabricanteRepo(normalizeInput(input));
  const dto = toDTO(record);
  await registrarAlteracaoManual({
    entity: "TireManufacturer",
    entityId: dto.id,
    action: "CREATE",
    userId,
  });
  return dto;
}

export async function updateFabricante(
  id: number,
  input: FabricanteFormValues,
  userId: number | null = null
): Promise<Fabricante> {
  const current = await findFabricanteById(id);
  if (!current) {
    throw new NotFoundError("Fabricante não encontrado");
  }

  const existing = await findFabricanteByName(input.name, id);
  if (existing) {
    throw new ConflictError("Já existe um fabricante com este nome");
  }

  const before = toDTO(current);
  const record = await updateFabricanteRepo(id, normalizeInput(input));
  const after = toDTO(record);

  const changes = diffRecords(
    {
      name: before.name,
      country: before.country,
      website: before.website,
      notes: before.notes,
      isActive: before.isActive,
      validationStatus: before.validationStatus,
    },
    {
      name: after.name,
      country: after.country,
      website: after.website,
      notes: after.notes,
      isActive: after.isActive,
      validationStatus: after.validationStatus,
    }
  );

  if (changes) {
    await registrarAlteracaoManual({
      entity: "TireManufacturer",
      entityId: id,
      action: "UPDATE",
      userId,
      changes,
    });
  }

  return after;
}

export async function deleteFabricante(
  id: number,
  userId: number | null = null
): Promise<void> {
  const current = await findFabricanteById(id);
  if (!current) {
    throw new NotFoundError("Fabricante não encontrado");
  }

  if (current._count.tires > 0) {
    throw new ConflictError(
      `Não é possível excluir: existem ${current._count.tires} pneu(s) associado(s) a este fabricante. Marque-o como inativo em vez de excluir.`
    );
  }

  await deleteFabricanteRepo(id);
  await registrarAlteracaoManual({
    entity: "TireManufacturer",
    entityId: id,
    action: "DELETE",
    userId,
  });
}

/**
 * Aplica slug/brandPolicy/researchStatus após o create/update via
 * fabricanteFormSchema (que não conhece esses 3 campos — são específicos
 * do Master Data Layer/database/import/brands, não do formulário manual
 * de cadastro). Coluna brandPolicy do CSV é opcional; valor desconhecido
 * ou ausente cai no default.
 */
async function aplicarPoliticaDeMarca(
  id: number,
  nome: string,
  brandPolicyRaw: string | undefined
): Promise<void> {
  const brandPolicy: BrandPolicy =
    brandPolicyRaw && isKnownBrandPolicy(brandPolicyRaw.trim().toUpperCase())
      ? (brandPolicyRaw.trim().toUpperCase() as BrandPolicy)
      : DEFAULT_BRAND_POLICY;
  const researchStatus = brandPolicy === "APPLICATION_ONLY" ? "COMPLETED" : "PENDING";

  await updateFabricanteRepo(id, {
    slug: slugify(nome),
    brandPolicy,
    researchStatus,
  });
}

export async function importFabricantes(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "FABRICANTES_PNEUS",
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
      const parsed = fabricanteFormSchema.safeParse({
        name: record.nome,
        country: record.pais,
        website: record.site,
        notes: record.observacoes,
        logoUrl: record.logo,
        isActive: parseBooleanPtBr(record.status, true),
        validationStatus: "NECESSITA_VALIDACAO",
        source: contexto ? `Importação: ${contexto.fileName}` : "",
        confidence: record.confianca ? Number(record.confianca) : null,
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

      const existing = await findFabricanteByName(parsed.data.name);

      if (existing) {
        const current = await getFabricante(existing.id);

        const merged: FabricanteFormValues = {
          ...parsed.data,
          // country: só preenche se hoje estiver vazio — nunca sobrescreve
          // um valor já registrado (regra explícita: "atualizar apenas os
          // campos vazios"), distinto do fallback de website/notes/logoUrl
          // abaixo (que prioriza o valor novo do CSV quando informado).
          country: current.country || parsed.data.country || "",
          website: parsed.data.website || current.website || "",
          notes: parsed.data.notes || current.notes || "",
          logoUrl: parsed.data.logoUrl || current.logoUrl || "",
          confidence: parsed.data.confidence ?? current.confidence,
        };

        const changes = diffRecords(
          {
            country: current.country,
            website: current.website,
            notes: current.notes,
            isActive: current.isActive,
            confidence: current.confidence,
          },
          {
            country: merged.country,
            website: merged.website || null,
            notes: merged.notes || null,
            isActive: merged.isActive,
            confidence: merged.confidence ?? null,
          }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateFabricante(existing.id, merged);
        await aplicarPoliticaDeMarca(existing.id, parsed.data.name, record.brandPolicy ?? record.politica);
        if (lote) {
          await registrarAtualizacao(
            "TireManufacturer",
            existing.id,
            lote.id,
            contexto?.userId ?? null,
            changes
          );
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const criado = await createFabricante(parsed.data);
        await aplicarPoliticaDeMarca(criado.id, parsed.data.name, record.brandPolicy ?? record.politica);
        if (lote) {
          await registrarCriacao(
            "TireManufacturer",
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
 * Exceções de política por marca — chave normalizada (case/acento-
 * insensível, via normalizeLookupKey) para não depender da grafia exata
 * na lista de entrada. Pedido explícito do usuário (2026-07-22): fora
 * desta lista, toda marca recebe DEFAULT_BRAND_POLICY
 * (APPLICATION_ONLY). Para acrescentar uma exceção nova: só editar este
 * objeto — nenhuma migração de banco é necessária (brandPolicy é TEXT
 * livre, ver lib/constants/brandPolicy.ts).
 */
const BRAND_POLICY_EXCEPTIONS: Record<string, BrandPolicy> = {
  [normalizeLookupKey("Linglong")]: "OEM_AND_APPLICATION",
  [normalizeLookupKey("Toyo")]: "OEM_AND_APPLICATION",
  [normalizeLookupKey("Maxxis")]: "OEM_AND_APPLICATION",
};

/**
 * Importa uma lista simples de nomes de marca (distinto de
 * importFabricantes: aquele lê um CSV com colunas já preenchidas —
 * país/site/logo/etc.; este recebe só nomes e DERIVA slug/política/status
 * pelas regras de negócio abaixo). Reaproveita o mesmo repositório
 * (findFabricanteByName/createFabricante/updateFabricante) e o mesmo
 * rastro de auditoria (ImportBatch/AuditLog) de importFabricantes — não
 * duplica a camada de dados, só o ponto de entrada, que tem forma de
 * input e regra de derivação diferentes.
 *
 * Idempotente: reexecutar com a mesma lista atualiza slug/política/status
 * das marcas já existentes (nunca cria duplicata — TireManufacturer.name
 * é @unique) e não recria as que já foram encontradas por nome exato.
 *
 * Nunca cria nenhuma linha em Homologation/ManufacturerHomologation —
 * essa regra é garantida estruturalmente: esta função só escreve em
 * TireManufacturer, para qualquer política.
 */
export async function importarMarcasPorNome(
  nomes: string[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();
  const nomesLimpos = [...new Set(nomes.map((n) => n.trim()).filter(Boolean))];

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "FABRICANTES_PNEUS",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(nomesLimpos.map((nome) => ({ nome }))),
      })
    : null;

  let criados = 0;
  let atualizados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, nome] of nomesLimpos.entries()) {
    const linha = index + 2;

    try {
      const chave = normalizeLookupKey(nome);
      const brandPolicy = BRAND_POLICY_EXCEPTIONS[chave] ?? DEFAULT_BRAND_POLICY;
      // COMPLETED só para APPLICATION_ONLY: marcas com OEM_AND_APPLICATION
      // ainda precisam de pesquisa de homologação OEM além da aplicação
      // comercial, então a pesquisa não está completa por definição.
      const researchStatus = brandPolicy === "APPLICATION_ONLY" ? "COMPLETED" : "PENDING";
      const slug = slugify(nome);

      const existing = await findFabricanteByName(nome);

      if (existing) {
        const current = await findFabricanteById(existing.id);
        if (!current) throw new Error("Fabricante não encontrado após find-or-create");

        const changes = diffRecords(
          { slug: current.slug, brandPolicy: current.brandPolicy, researchStatus: current.researchStatus },
          { slug, brandPolicy, researchStatus }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: nome });
          continue;
        }

        await updateFabricanteRepo(existing.id, { slug, brandPolicy, researchStatus });
        if (lote) {
          await registrarAtualizacao("TireManufacturer", existing.id, lote.id, contexto?.userId ?? null, changes);
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: nome });
      } else {
        const criado = await createFabricanteRepo({
          name: nome,
          slug,
          brandPolicy,
          researchStatus,
          isActive: true,
          validationStatus: "NECESSITA_VALIDACAO",
          source: contexto ? `Importação: ${contexto.fileName}` : "Lista de marcas",
        });
        if (lote) {
          await registrarCriacao("TireManufacturer", criado.id, lote.id, contexto?.userId ?? null);
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
  const sucesso = criados + atualizados;

  if (lote) {
    await finalizarLote(lote.id, {
      totalRows: nomesLimpos.length,
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
    total: nomesLimpos.length,
    sucesso,
    criados,
    atualizados,
    duplicados,
    falhas,
    detalhes,
  };
}
