import "server-only";
import { prisma } from "@/lib/prisma";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import type { ResultadoPesquisa } from "@/types/homologation";
import type { Prisma } from "@prisma/client";

const RESULTADO_INCLUDE = {
  vehicleVersion: {
    include: {
      vehicleModel: { include: { manufacturer: true } },
      engine: true,
      images: true,
    },
  },
  tires: { include: { tire: { include: { tireManufacturer: true } } } },
  pressureSpecs: { orderBy: { createdAt: "asc" as const }, take: 1 },
  documents: { orderBy: { createdAt: "asc" as const }, take: 1 },
} satisfies Prisma.HomologationDefaultArgs["include"];

type HomologacaoComRelacoes = Prisma.HomologationGetPayload<{
  include: typeof RESULTADO_INCLUDE;
}>;

function mapParaResultados(
  homologacoes: HomologacaoComRelacoes[]
): ResultadoPesquisa[] {
  return homologacoes.flatMap((homologacao) => {
    const pressao = homologacao.pressureSpecs[0] ?? null;
    const documento = homologacao.documents[0] ?? null;
    const imagem =
      homologacao.vehicleVersion.images.find((img) => img.type === "PRINCIPAL") ??
      homologacao.vehicleVersion.images[0] ??
      null;

    return homologacao.tires.map((tireEntry) => ({
      homologacaoId: homologacao.id,
      homologacaoCodigo: homologacao.code,
      homologacaoAno: homologacao.year,
      homologacaoAtualizadoEm: homologacao.updatedAt.toISOString(),
      homologacaoConfiabilidade: homologacao.validationStatus,
      homologacaoDocumentoNome: documento?.name ?? null,
      homologacaoDocumentoUrl: documento?.url ?? null,
      veiculoId: homologacao.vehicleVersion.id,
      veiculoImagemUrl: imagem?.url ?? null,
      veiculoFabricante: homologacao.vehicleVersion.vehicleModel.manufacturer.name,
      veiculoModelo: homologacao.vehicleVersion.vehicleModel.name,
      veiculoVersao: homologacao.vehicleVersion.name,
      veiculoAnoInicial: homologacao.vehicleVersion.yearStart,
      veiculoAnoFinal: homologacao.vehicleVersion.yearEnd,
      veiculoMotorizacao: homologacao.vehicleVersion.engine.name,
      pneuTipo: tireEntry.role,
      pneuFabricante: tireEntry.tire.tireManufacturer.name,
      pneuModelo: tireEntry.tire.model,
      pneuMedida: tireEntry.tire.size,
      pneuIndiceCarga: tireEntry.tire.loadIndex,
      pneuIndiceVelocidade: tireEntry.tire.speedIndex,
      pneuRunFlat: tireEntry.tire.runFlat,
      pneuXl: tireEntry.tire.xl,
      pressaoDianteira: pressao?.emptyFront ?? null,
      pressaoTraseira: pressao?.emptyRear ?? null,
    }));
  });
}

export async function buscarHomologacoes(
  filtros: PesquisaFiltros
): Promise<ResultadoPesquisa[]> {
  const where: Prisma.HomologationWhereInput = {};

  if (filtros.homologacao) {
    where.code = filtros.homologacao;
  }

  const vehicleWhere: Prisma.VehicleVersionWhereInput = {};
  const vehicleModelWhere: Prisma.VehicleModelWhereInput = {};
  if (filtros.fabricante) {
    vehicleModelWhere.manufacturer = { name: filtros.fabricante };
  }
  if (filtros.modelo) {
    vehicleModelWhere.name = filtros.modelo;
  }
  if (Object.keys(vehicleModelWhere).length > 0) {
    vehicleWhere.vehicleModel = vehicleModelWhere;
  }
  if (filtros.ano) {
    const ano = Number(filtros.ano);
    vehicleWhere.yearStart = { lte: ano };
    vehicleWhere.yearEnd = { gte: ano };
  }
  if (filtros.motorizacao) {
    vehicleWhere.engine = { name: filtros.motorizacao };
  }
  if (Object.keys(vehicleWhere).length > 0) {
    where.vehicleVersion = vehicleWhere;
  }

  const tireWhere: Prisma.TireWhereInput = {};
  if (filtros.medida) {
    tireWhere.size = filtros.medida;
  }
  if (filtros.fabricantePneu) {
    tireWhere.tireManufacturer = { name: filtros.fabricantePneu };
  }
  if (filtros.runFlat) {
    tireWhere.runFlat = filtros.runFlat === "true";
  }
  if (filtros.xl) {
    tireWhere.xl = filtros.xl === "true";
  }
  if (filtros.indiceCarga) {
    tireWhere.loadIndex = filtros.indiceCarga;
  }
  if (filtros.indiceVelocidade) {
    tireWhere.speedIndex = filtros.indiceVelocidade;
  }
  if (filtros.categoria) {
    tireWhere.category = filtros.categoria;
  }
  if (filtros.segmento) {
    tireWhere.segment = filtros.segmento;
  }
  if (Object.keys(tireWhere).length > 0) {
    where.tires = { some: { tire: tireWhere } };
  }

  const homologacoes = await prisma.homologation.findMany({
    where,
    include: RESULTADO_INCLUDE,
    orderBy: [
      { vehicleVersion: { vehicleModel: { manufacturer: { name: "asc" } } } },
      { vehicleVersion: { vehicleModel: { name: "asc" } } },
    ],
  });

  await registrarBusca(filtros, homologacoes.length);

  return mapParaResultados(homologacoes);
}

/**
 * Busca livre (campo único da Home/Pesquisa pública): combina texto contra
 * fabricante, modelo, versão, motorização, medida do pneu e código de
 * homologação — sem exigir que o usuário saiba em qual campo o termo cai.
 */
export async function buscarLivre(texto: string): Promise<ResultadoPesquisa[]> {
  const termo = texto.trim();
  if (!termo) return [];

  const where: Prisma.HomologationWhereInput = {
    OR: [
      { code: { contains: termo, mode: "insensitive" } },
      { vehicleVersion: { name: { contains: termo, mode: "insensitive" } } },
      {
        vehicleVersion: {
          vehicleModel: { name: { contains: termo, mode: "insensitive" } },
        },
      },
      {
        vehicleVersion: {
          vehicleModel: {
            manufacturer: { name: { contains: termo, mode: "insensitive" } },
          },
        },
      },
      { vehicleVersion: { engine: { name: { contains: termo, mode: "insensitive" } } } },
      { tires: { some: { tire: { size: { contains: termo, mode: "insensitive" } } } } },
      {
        tires: {
          some: {
            tire: {
              tireManufacturer: { name: { contains: termo, mode: "insensitive" } },
            },
          },
        },
      },
    ],
  };

  const homologacoes = await prisma.homologation.findMany({
    where,
    include: RESULTADO_INCLUDE,
    orderBy: [
      { vehicleVersion: { vehicleModel: { manufacturer: { name: "asc" } } } },
      { vehicleVersion: { vehicleModel: { name: "asc" } } },
    ],
    take: 100,
  });

  await registrarBusca({}, homologacoes.length, termo);

  return mapParaResultados(homologacoes);
}

const ROTULOS_FILTRO: Record<string, string> = {
  fabricante: "Fabricante",
  modelo: "Modelo",
  ano: "Ano",
  motorizacao: "Motorização",
  medida: "Medida",
  homologacao: "Homologação",
  fabricantePneu: "Fabricante do Pneu",
  runFlat: "Run Flat",
  xl: "XL",
  indiceCarga: "Índice de Carga",
  indiceVelocidade: "Índice de Velocidade",
  categoria: "Categoria",
  segmento: "Segmento",
};

async function registrarBusca(
  filtros: PesquisaFiltros,
  resultCount: number,
  textoLivre?: string
) {
  const partes = Object.entries(filtros)
    .filter(([, valor]) => Boolean(valor))
    .map(([chave, valor]) => `${ROTULOS_FILTRO[chave] ?? chave}: ${valor}`);

  const resumo = textoLivre
    ? `Busca livre: ${textoLivre}`
    : partes.length > 0
      ? partes.join(" · ")
      : "Pesquisa sem filtros";

  await prisma.searchLog.create({
    data: {
      resumo,
      veiculoBusca: textoLivre ?? filtros.modelo ?? filtros.fabricante ?? null,
      pneuBusca: textoLivre ?? filtros.medida ?? filtros.fabricantePneu ?? null,
      resultCount,
    },
  });
}
