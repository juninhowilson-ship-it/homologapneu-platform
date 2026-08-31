import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Fila de trabalho das homologações, organizada por ano e atacada por
 * prioridade — um ano depois do outro.
 *
 * Dois eixos, porque as duas perguntas são diferentes:
 *
 * 1. ANO DO VEÍCULO (`VehicleVersion.yearEnd`) — quais carros ainda saem de
 *    fábrica naquele ano. É o eixo do backlog: 2026 tem 458 versões e só 52
 *    homologadas, contra 58% de cobertura em 2025.
 *
 * 2. ANO DA HOMOLOGAÇÃO (`Homologation.year`) — quando o documento foi
 *    emitido. Um veículo 2026 cuja única homologação é de 2015 conta como
 *    coberto no eixo 1, mas na prática está defasado. Sem este eixo o
 *    backlog parece menor do que é.
 */

export type ResumoAno = {
  /** Ano do veículo (fim de produção). */
  ano: number;
  versoes: number;
  comHomologacao: number;
  semHomologacao: number;
  /** 0..1 — proporção de versões do ano com homologação confirmada. */
  cobertura: number;
};

export type MarcaPendente = {
  manufacturerId: number;
  marca: string;
  versoes: number;
  semHomologacao: number;
  /** Sinais de "dá para trabalhar isto agora". */
  comFoto: number;
  comCatalogoFabricante: number;
};

export type VersaoPendente = {
  vehicleVersionId: number;
  marca: string;
  modelo: string;
  versao: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  temFoto: boolean;
  /** Existe catálogo de fabricante mencionando este modelo — ponto de partida. */
  temCatalogoFabricante: boolean;
};

export type HomologacaoDefasada = {
  vehicleVersionId: number;
  marca: string;
  modelo: string;
  versao: string;
  anoVeiculo: number;
  /** Ano da homologação mais recente deste veículo. */
  anoHomologacao: number;
  /** Distância em anos entre o veículo e o documento. */
  defasagem: number;
};

/** A partir de quantos anos de distância a homologação vira pendência. */
export const DEFASAGEM_MINIMA = 3;

/**
 * Anos com veículos em produção, do mais recente para o mais antigo — a
 * ordem em que a fila deve ser atacada.
 */
export async function listarAnosPrioritarios(
  anoMinimo: number
): Promise<ResumoAno[]> {
  const linhas = await prisma.$queryRaw<
    { ano: number; versoes: bigint; com_homologacao: bigint }[]
  >`
    SELECT v."yearEnd" AS ano,
           count(*) AS versoes,
           count(*) FILTER (
             WHERE EXISTS (SELECT 1 FROM homologations h
                            WHERE h."vehicleVersionId" = v.id)
           ) AS com_homologacao
      FROM vehicle_versions v
     WHERE v."yearEnd" >= ${anoMinimo}
     GROUP BY v."yearEnd"
     ORDER BY v."yearEnd" DESC
  `;

  return linhas.map((linha) => {
    const versoes = Number(linha.versoes);
    const comHomologacao = Number(linha.com_homologacao);
    return {
      ano: linha.ano,
      versoes,
      comHomologacao,
      semHomologacao: versoes - comHomologacao,
      cobertura: versoes > 0 ? comHomologacao / versoes : 0,
    };
  });
}

/**
 * Marcas do ano ordenadas pelo tamanho do buraco — quem tem mais versões sem
 * homologação aparece primeiro, que é por onde rende mais trabalhar.
 */
export async function listarMarcasPendentes(
  ano: number
): Promise<MarcaPendente[]> {
  const linhas = await prisma.$queryRaw<
    {
      manufacturer_id: number;
      marca: string;
      versoes: bigint;
      sem_homologacao: bigint;
      com_foto: bigint;
      com_catalogo: bigint;
    }[]
  >`
    SELECT f.id AS manufacturer_id,
           f.name AS marca,
           count(*) AS versoes,
           count(*) FILTER (
             WHERE NOT EXISTS (SELECT 1 FROM homologations h
                                WHERE h."vehicleVersionId" = v.id)
           ) AS sem_homologacao,
           count(*) FILTER (
             WHERE NOT EXISTS (SELECT 1 FROM homologations h
                                WHERE h."vehicleVersionId" = v.id)
               AND EXISTS (SELECT 1 FROM vehicle_images i
                            WHERE i."vehicleVersionId" = v.id)
           ) AS com_foto,
           count(*) FILTER (
             WHERE NOT EXISTS (SELECT 1 FROM homologations h
                                WHERE h."vehicleVersionId" = v.id)
               AND EXISTS (SELECT 1 FROM manufacturer_applications a
                            WHERE a."vehicleModelId" = v."vehicleModelId")
           ) AS com_catalogo
      FROM vehicle_versions v
      JOIN vehicle_models m ON m.id = v."vehicleModelId"
      JOIN manufacturers f ON f.id = m."manufacturerId"
     WHERE v."yearEnd" = ${ano}
     GROUP BY f.id, f.name
    HAVING count(*) FILTER (
             WHERE NOT EXISTS (SELECT 1 FROM homologations h
                                WHERE h."vehicleVersionId" = v.id)
           ) > 0
     ORDER BY sem_homologacao DESC, f.name ASC
  `;

  return linhas.map((linha) => ({
    manufacturerId: linha.manufacturer_id,
    marca: linha.marca,
    versoes: Number(linha.versoes),
    semHomologacao: Number(linha.sem_homologacao),
    comFoto: Number(linha.com_foto),
    comCatalogoFabricante: Number(linha.com_catalogo),
  }));
}

/** Versões sem homologação de uma marca no ano — a lista que se trabalha. */
export async function listarVersoesPendentes(
  ano: number,
  manufacturerId: number
): Promise<VersaoPendente[]> {
  const versoes = await prisma.vehicleVersion.findMany({
    where: {
      yearEnd: ano,
      homologations: { none: {} },
      vehicleModel: { manufacturerId },
    },
    select: {
      id: true,
      name: true,
      yearStart: true,
      yearEnd: true,
      engine: { select: { name: true } },
      vehicleModel: {
        select: {
          id: true,
          name: true,
          manufacturer: { select: { name: true } },
        },
      },
      images: { select: { id: true }, take: 1 },
    },
    orderBy: [{ vehicleModel: { name: "asc" } }, { name: "asc" }],
  });

  // Uma consulta só para todos os modelos da página, em vez de uma por versão.
  const modelos = [...new Set(versoes.map((v) => v.vehicleModel.id))];
  const comCatalogo = new Set(
    (
      await prisma.manufacturerApplication.findMany({
        where: { vehicleModelId: { in: modelos } },
        select: { vehicleModelId: true },
        distinct: ["vehicleModelId"],
      })
    ).map((a) => a.vehicleModelId!)
  );

  return versoes.map((v) => ({
    vehicleVersionId: v.id,
    marca: v.vehicleModel.manufacturer.name,
    modelo: v.vehicleModel.name,
    versao: v.name,
    motor: v.engine.name,
    anoInicial: v.yearStart,
    anoFinal: v.yearEnd,
    temFoto: v.images.length > 0,
    temCatalogoFabricante: comCatalogo.has(v.vehicleModel.id),
  }));
}

/**
 * Segundo eixo: veículos do ano que TÊM homologação, mas cujo documento mais
 * recente é antigo demais. Contam como cobertos na estatística e não estão.
 */
export async function listarHomologacoesDefasadas(
  ano: number
): Promise<HomologacaoDefasada[]> {
  const linhas = await prisma.$queryRaw<
    {
      vehicle_version_id: number;
      marca: string;
      modelo: string;
      versao: string;
      ano_veiculo: number;
      ano_homologacao: number;
    }[]
  >`
    SELECT v.id AS vehicle_version_id,
           f.name AS marca,
           m.name AS modelo,
           v.name AS versao,
           v."yearEnd" AS ano_veiculo,
           max(h.year) AS ano_homologacao
      FROM vehicle_versions v
      JOIN vehicle_models m ON m.id = v."vehicleModelId"
      JOIN manufacturers f ON f.id = m."manufacturerId"
      JOIN homologations h ON h."vehicleVersionId" = v.id
     WHERE v."yearEnd" = ${ano}
     GROUP BY v.id, f.name, m.name, v.name, v."yearEnd"
    HAVING v."yearEnd" - max(h.year) >= ${DEFASAGEM_MINIMA}
     ORDER BY max(h.year) ASC
  `;

  return linhas.map((linha) => ({
    vehicleVersionId: linha.vehicle_version_id,
    marca: linha.marca,
    modelo: linha.modelo,
    versao: linha.versao,
    anoVeiculo: linha.ano_veiculo,
    anoHomologacao: linha.ano_homologacao,
    defasagem: linha.ano_veiculo - linha.ano_homologacao,
  }));
}
