import "server-only";
import { prisma } from "@/lib/prisma";

export type PneuSugestao = {
  id: number;
  marca: string;
  modelo: string;
  medida: string;
};

export type PneuComparacao = {
  id: number;
  marca: string;
  fabricante: string;
  modelo: string;
  medida: string;
  largura: number;
  perfil: number;
  aro: number;
  indiceCarga: string;
  cargaMaximaKg: number | null;
  indiceVelocidade: string;
  velocidadeMaximaKmh: number | null;
  construcao: string;
  categoria: string;
  segmento: string | null;
  temporada: string | null;
  runFlat: boolean;
  xl: boolean;
  seal: boolean;
  tubeless: boolean;
  tecnologias: string[];
};

const MAX_COMPARACAO = 3;

export async function buscarPneusParaComparar(
  texto: string
): Promise<PneuSugestao[]> {
  const q = texto.trim();
  if (!q) return [];

  const pneus = await prisma.tire.findMany({
    where: {
      deletedAt: null,
      OR: [
        { size: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ brand: "asc" }, { model: "asc" }, { size: "asc" }],
    take: 15,
    select: { id: true, brand: true, model: true, size: true },
  });

  return pneus.map((p) => ({
    id: p.id,
    marca: p.brand,
    modelo: p.model,
    medida: p.size,
  }));
}

export async function compararPneus(ids: number[]): Promise<PneuComparacao[]> {
  const unicos = Array.from(new Set(ids)).slice(0, MAX_COMPARACAO);
  if (unicos.length === 0) return [];

  const pneus = await prisma.tire.findMany({
    where: { id: { in: unicos }, deletedAt: null },
    include: {
      tireManufacturer: { select: { name: true } },
      loadIndexRef: true,
      speedIndexRef: true,
      technologies: { include: { technology: { select: { name: true } } } },
    },
  });

  // Preserva a ordem pedida pelo usuário
  const porId = new Map(pneus.map((p) => [p.id, p]));

  return unicos
    .map((id) => porId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      marca: p.brand,
      fabricante: p.tireManufacturer.name,
      modelo: p.model,
      medida: p.size,
      largura: p.width,
      perfil: p.profile,
      aro: p.rim,
      indiceCarga: p.loadIndex,
      cargaMaximaKg: p.loadIndexRef?.maxLoadKg ?? null,
      indiceVelocidade: p.speedIndex,
      velocidadeMaximaKmh: p.speedIndexRef?.maxSpeedKmh ?? null,
      construcao: p.type,
      categoria: p.category,
      segmento: p.segment,
      temporada: p.season,
      runFlat: p.runFlat,
      xl: p.xl,
      seal: p.seal,
      tubeless: p.tubeless,
      tecnologias: p.technologies.map((t) => t.technology.name),
    }));
}
