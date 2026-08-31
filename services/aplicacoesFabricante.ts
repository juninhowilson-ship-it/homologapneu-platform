import "server-only";
import { prisma } from "@/lib/prisma";
import { ANO_MINIMO_PADRAO } from "@/lib/medida";

/**
 * O que o catálogo do FABRICANTE DO PNEU declara para o modelo do veículo.
 *
 * Isto NUNCA é homologação. Uma Homologation do HomologaPneu identifica
 * versão, motor e ano; o catálogo do fabricante diz apenas "este pneu serve
 * no Corolla" — sem distinguir geração. Por isso vive em serviço próprio,
 * nunca vira Homologation (ver services/manufacturerCatalogPromotion.ts) e a
 * UI rotula a origem de forma explícita.
 *
 * ## O filtro de geração, e por que ele é obrigatório
 *
 * O catálogo é por NOME DE MODELO, e nome de modelo atravessa gerações. O
 * catálogo Pirelli lista 175/65R14 e 185/70R14 para "COROLLA" — medidas de
 * Corolla dos anos 1990. Exibir isso na ficha de um Corolla Altis Híbrido
 * 2023, que calça 205/55R16, seria uma recomendação perigosa.
 *
 * Filtrar por "medida que algum veículo 2020+ usa" NÃO resolve: 175/65R14 é
 * medida legítima de hatch atual, então passaria do mesmo jeito.
 *
 * A âncora que funciona é POR MODELO: só entra a medida que aparece em
 * homologação confirmada de outra versão 2020+ do MESMO modelo. No Corolla
 * isso deixa 205/55R16, 215/50R17 e 225/45R17 e descarta 14" e 15".
 *
 * A consequência aceita é cobertura menor: modelo sem nenhuma homologação
 * confirmada não tem âncora e não exibe nada. Preferimos não mostrar a
 * mostrar medida de outra geração.
 */

export type PneuDeclarado = {
  tireId: number;
  marca: string;
  modelo: string;
  medida: string;
  especificacao: string;
  /** Classificação declarada pelo próprio fabricante no catálogo. */
  status: "HOMOLOGADO" | "APLICACAO" | "SUBSTITUTO" | "PHASE_OUT" | "SEM_STATUS";
  /** Nome do catálogo de origem (ex.: "Portfólio OE"). */
  catalogo: string;
  /** O catálogo marcou o produto como saindo de linha. */
  foraDeLinha: boolean;
};

export type AplicacoesDeclaradas = {
  /** Modelo ao qual a declaração se refere — é esse o nível do dado. */
  modeloVeiculo: string;
  medidas: { medida: string; pneus: PneuDeclarado[] }[];
};

type Linha = {
  tireId: number;
  marca: string;
  modelo: string;
  medida: string;
  loadIndex: string;
  speedIndex: string;
  xl: boolean;
  runFlat: boolean;
  seal: boolean;
  status: PneuDeclarado["status"] | null;
  catalogo: string;
  foraDeLinha: boolean;
};

/** Ordem de utilidade para quem atende no balcão. */
const PESO_STATUS: Record<PneuDeclarado["status"], number> = {
  HOMOLOGADO: 0,
  APLICACAO: 1,
  SUBSTITUTO: 2,
  SEM_STATUS: 3,
  PHASE_OUT: 4,
};

function montarEspecificacao(linha: Linha): string {
  return [
    `${linha.loadIndex}${linha.speedIndex}`,
    linha.xl ? "XL" : null,
    linha.runFlat ? "Run Flat" : null,
    linha.seal ? "Seal" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Devolve null quando o veículo já tem homologação confirmada — dado
 * confirmado vence declaração de catálogo, e misturar os dois na mesma tela
 * apagaria justamente a diferença que importa.
 */
export async function obterAplicacoesDeclaradas(
  vehicleVersionId: number
): Promise<AplicacoesDeclaradas | null> {
  const versao = await prisma.vehicleVersion.findUnique({
    where: { id: vehicleVersionId },
    select: {
      vehicleModelId: true,
      vehicleModel: { select: { name: true } },
      _count: { select: { homologations: true } },
    },
  });

  if (!versao || versao._count.homologations > 0) return null;

  const linhas = await prisma.$queryRaw<Linha[]>`
    WITH ancora AS (
      -- Medidas confirmadas em outra versão 2020+ do mesmo modelo.
      SELECT DISTINCT busca_medida_chave(t.size) AS chave
        FROM homologations h
        JOIN vehicle_versions v
          ON v.id = h."vehicleVersionId"
         AND v."vehicleModelId" = ${versao.vehicleModelId}
         AND v."yearEnd" >= ${ANO_MINIMO_PADRAO}
        JOIN homologation_tires ht ON ht."homologationId" = h.id
        JOIN tires t ON t.id = ht."tireId" AND t."deletedAt" IS NULL
       WHERE busca_medida_chave(t.size) IS NOT NULL
    )
    SELECT DISTINCT
           t.id            AS "tireId",
           tm.name         AS marca,
           t.model         AS modelo,
           t.size          AS medida,
           t."loadIndex"   AS "loadIndex",
           t."speedIndex"  AS "speedIndex",
           t.xl            AS xl,
           t."runFlat"     AS "runFlat",
           t.seal          AS seal,
           mh.status::text AS status,
           c.name          AS catalogo,
           p."phaseOut"    AS "foraDeLinha"
      FROM manufacturer_applications a
      JOIN manufacturer_products p ON p.id = a."productId" AND p."tireId" IS NOT NULL
      JOIN manufacturer_catalogs c ON c.id = p."catalogId"
      JOIN tires t ON t.id = p."tireId" AND t."deletedAt" IS NULL
      JOIN tire_manufacturers tm ON tm.id = t."tireManufacturerId"
      JOIN ancora ON ancora.chave = busca_medida_chave(t.size)
      LEFT JOIN manufacturer_homologations mh ON mh."applicationId" = a.id
     WHERE a."vehicleModelId" = ${versao.vehicleModelId}
  `;

  if (linhas.length === 0) return null;

  const porMedida = new Map<string, PneuDeclarado[]>();
  for (const linha of linhas) {
    const pneu: PneuDeclarado = {
      tireId: linha.tireId,
      marca: linha.marca,
      modelo: linha.modelo,
      medida: linha.medida,
      especificacao: montarEspecificacao(linha),
      status: linha.status ?? "SEM_STATUS",
      catalogo: linha.catalogo,
      foraDeLinha: linha.foraDeLinha,
    };
    const lista = porMedida.get(linha.medida) ?? [];
    lista.push(pneu);
    porMedida.set(linha.medida, lista);
  }

  const medidas = [...porMedida.entries()]
    .map(([medida, pneus]) => ({
      medida,
      pneus: pneus.sort(
        (a, b) =>
          PESO_STATUS[a.status] - PESO_STATUS[b.status] ||
          a.marca.localeCompare(b.marca)
      ),
    }))
    .sort((a, b) => a.medida.localeCompare(b.medida));

  return { modeloVeiculo: versao.vehicleModel.name, medidas };
}
