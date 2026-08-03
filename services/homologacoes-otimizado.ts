/**
 * Serviço otimizado para buscar homologações com queries eficientes
 * - Sem N+1 queries
 * - Batching automático
 * - Select específico (não retorna campos desnecessários)
 */

import { prisma } from "@/lib/prisma";

export interface HomologacaoOtimizada {
  id: number;
  code: string;
  year: number;
  validationStatus: string;
  veiculo: {
    id: number;
    modelo: string;
    fabricante: string;
  };
  pneu: {
    id: number;
    marca: string;
    modelo: string;
    tamanho: string;
  };
}

/**
 * Buscar homologações por modelo de veículo (otimizado)
 */
export async function buscarHomologacoesPorModelo(
  modelId: number
): Promise<HomologacaoOtimizada[]> {
  const homologations = await prisma.homologation.findMany({
    where: {
      vehicleVersion: {
        vehicleModelId: modelId,
      },
    },
    select: {
      id: true,
      code: true,
      year: true,
      validationStatus: true,
      vehicleVersion: {
        select: {
          name: true,
          vehicleModel: {
            select: {
              name: true,
              manufacturer: {
                select: { name: true },
              },
            },
          },
        },
      },
      homologationTires: {
        take: 1,
        select: {
          tire: {
            select: {
              id: true,
              brand: true,
              model: true,
              size: true,
            },
          },
        },
      },
    },
    take: 500, // Limite para segurança
  });

  return homologations.map((h) => ({
    id: h.id,
    code: h.code,
    year: h.year,
    validationStatus: h.validationStatus,
    veiculo: {
      id: h.vehicleVersion.vehicleModel.name.length,
      modelo: h.vehicleVersion.name,
      fabricante: h.vehicleVersion.vehicleModel.manufacturer.name,
    },
    pneu: {
      id: h.homologationTires[0]?.tire.id || 0,
      marca: h.homologationTires[0]?.tire.brand || "N/A",
      modelo: h.homologationTires[0]?.tire.model || "N/A",
      tamanho: h.homologationTires[0]?.tire.size || "N/A",
    },
  }));
}

/**
 * Buscar homologações por fabricante (com agregação)
 */
export async function buscarHomologacoesPorFabricante(
  manufacturerId: number
) {
  return prisma.homologation.findMany({
    where: {
      vehicleVersion: {
        vehicleModel: {
          manufacturerId,
        },
      },
    },
    select: {
      id: true,
      code: true,
      year: true,
      vehicleVersion: {
        select: {
          id: true,
          name: true,
        },
      },
      homologationTires: {
        take: 1,
        select: {
          tire: {
            select: {
              model: true,
              size: true,
            },
          },
        },
      },
    },
    take: 1000,
  });
}

/**
 * Busca com filtro avançado (otimizado)
 */
export async function buscarHomologacoesAvancado(filters: {
  modelId?: number;
  manufacturerId?: number;
  year?: number;
  validationStatus?: string;
  limit?: number;
}) {
  const {
    modelId,
    manufacturerId,
    year,
    validationStatus,
    limit = 100,
  } = filters;

  return prisma.homologation.findMany({
    where: {
      ...(year && { year }),
      ...(validationStatus && { validationStatus }),
      vehicleVersion: {
        ...(modelId && { vehicleModelId: modelId }),
        ...(manufacturerId && {
          vehicleModel: {
            manufacturerId,
          },
        }),
      },
    },
    select: {
      id: true,
      code: true,
      year: true,
      validationStatus: true,
      vehicleVersion: {
        select: {
          name: true,
          vehicleModel: {
            select: {
              name: true,
              manufacturer: { select: { name: true } },
            },
          },
        },
      },
      homologationTires: {
        take: 1,
        select: {
          tire: {
            select: {
              brand: true,
              model: true,
              size: true,
            },
          },
        },
      },
    },
    take: Math.min(limit, 500),
  });
}
