import "server-only";
import {
  findCountryByIsoCode,
  createCountry,
  updateCountry,
  findMarketByCode,
  createMarket,
  updateMarket,
} from "@/repositories/paises";
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
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";

/**
 * Importa países (Country) a partir de linhas CSV/XLSX — colunas
 * isoCode/nome/regiao (ver database/import/countries/). Idempotente via
 * Country.isoCode @unique.
 */
export async function importarPaises(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "PAISES",
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
    const isoCode = (record.isoCode ?? "").trim().toUpperCase();
    const nome = (record.nome ?? "").trim();
    const regiao = (record.regiao ?? "").trim() || null;
    const label = nome || isoCode;

    try {
      if (!isoCode || !nome) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: "isoCode e nome são obrigatórios",
          rotulo: label,
        });
        continue;
      }

      const existing = await findCountryByIsoCode(isoCode);

      if (existing) {
        const changes = diffRecords(
          { name: existing.name, region: existing.region },
          { name: nome, region: regiao }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateCountry(existing.id, { name: nome, region: regiao });
        if (lote) {
          await registrarAtualizacao("Country", existing.id, lote.id, contexto?.userId ?? null, changes);
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const created = await createCountry({ isoCode, name: nome, region: regiao });
        if (lote) {
          await registrarCriacao("Country", created.id, lote.id, contexto?.userId ?? null);
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

/**
 * Importa Market (mercado comercial onde uma homologação vale — ex.:
 * "BR", "MERCOSUL") a partir de linhas CSV/XLSX — colunas
 * codigo/nome/pais (pais é o isoCode de um Country já cadastrado;
 * opcional — mercado supranacional não tem país único). Idempotente via
 * Market.code @unique. Mesmo padrão exato de importarPaises.
 */
export async function importarMercados(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "MERCADOS",
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
    const codigo = (record.codigo ?? "").trim().toUpperCase();
    const nome = (record.nome ?? "").trim();
    const paisIso = (record.pais ?? "").trim().toUpperCase();
    const label = nome || codigo;

    try {
      if (!codigo || !nome) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: "codigo e nome são obrigatórios",
          rotulo: label,
        });
        continue;
      }

      let countryId: number | null = null;
      if (paisIso) {
        const country = await findCountryByIsoCode(paisIso);
        if (!country) {
          detalhes.push({
            linha,
            status: "erro",
            sucesso: false,
            erro: `País "${paisIso}" não encontrado — importe em countries/ antes (ou deixe a coluna pais vazia para mercado supranacional)`,
            rotulo: label,
          });
          continue;
        }
        countryId = country.id;
      }

      const existing = await findMarketByCode(codigo);

      if (existing) {
        const changes = diffRecords(
          { name: existing.name, countryId: existing.countryId },
          { name: nome, countryId: countryId ?? existing.countryId }
        );

        if (!changes) {
          duplicados++;
          detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
          continue;
        }

        await updateMarket(existing.id, { name: nome, countryId: countryId ?? existing.countryId });
        if (lote) {
          await registrarAtualizacao("Market", existing.id, lote.id, contexto?.userId ?? null, changes);
        }
        atualizados++;
        detalhes.push({ linha, status: "atualizado", sucesso: true, rotulo: label });
      } else {
        const created = await createMarket({ code: codigo, name: nome, countryId });
        if (lote) {
          await registrarCriacao("Market", created.id, lote.id, contexto?.userId ?? null);
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
