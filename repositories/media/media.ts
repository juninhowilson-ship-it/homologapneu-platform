import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, Media, MediaType, MediaStatus } from "@prisma/client";
import type { MediaListQuery } from "@/lib/media/types";

export type MediaCreateInput = {
  type: MediaType;
  manufacturerId?: number | null;
  vehicleId?: number | null;
  tireId?: number | null;
  wheelId?: number | null;
  homologationId?: number | null;
  title?: string | null;
  description?: string | null;
  source?: string | null;
  originalUrl?: string | null;
  storageUrl?: string | null;
  thumbnailUrl?: string | null;
  sha256?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  isPrimary?: boolean;
  status?: MediaStatus;
};

export type MediaUpdateInput = Partial<MediaCreateInput>;

function buildWhere(query: MediaListQuery): Prisma.MediaWhereInput {
  const where: Prisma.MediaWhereInput = {};

  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.manufacturerId) where.manufacturerId = query.manufacturerId;
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.tireId) where.tireId = query.tireId;
  if (query.wheelId) where.wheelId = query.wheelId;
  if (query.homologationId) where.homologationId = query.homologationId;

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { source: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listMedia(
  query: MediaListQuery
): Promise<{ data: Media[]; total: number }> {
  if (query.onlyDuplicates) {
    return listDuplicateMedia(query);
  }

  const where = buildWhere(query);

  const [data, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.media.count({ where }),
  ]);

  return { data, total };
}

/** Mídias cujo sha256 aparece em mais de uma linha (candidatas duplicadas
 * já persistidas — não deveria acontecer se o Duplicate Detector for
 * sempre chamado antes de salvar, mas serve de auditoria/painel "Duplicadas"). */
async function listDuplicateMedia(
  query: MediaListQuery
): Promise<{ data: Media[]; total: number }> {
  const grupos = await prisma.media.groupBy({
    by: ["sha256"],
    where: { sha256: { not: null } },
    _count: { sha256: true },
    having: { sha256: { _count: { gt: 1 } } },
  });

  const hashes = grupos.map((g) => g.sha256).filter((h): h is string => h !== null);
  if (hashes.length === 0) return { data: [], total: 0 };

  const where: Prisma.MediaWhereInput = { ...buildWhere(query), sha256: { in: hashes } };

  const [data, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: [{ sha256: "asc" }, { createdAt: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.media.count({ where }),
  ]);

  return { data, total };
}

export async function findMediaById(id: number): Promise<Media | null> {
  return prisma.media.findUnique({ where: { id } });
}

export async function findMediaBySha256(sha256: string): Promise<Media[]> {
  return prisma.media.findMany({ where: { sha256 } });
}

/** Candidatos a duplicata por critério "fraco" (nome/URL/dimensões) —
 * usado pelo Duplicate Detector quando ainda não há sha256 (ex.: antes de
 * baixar, só com originalUrl) ou como segunda camada de checagem. */
export async function findMediaByLooseCriteria(params: {
  originalUrl?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}): Promise<Media[]> {
  const or: Prisma.MediaWhereInput[] = [];

  if (params.originalUrl) or.push({ originalUrl: params.originalUrl });
  if (params.title) or.push({ title: { equals: params.title, mode: "insensitive" } });
  if (params.width && params.height) {
    or.push({ width: params.width, height: params.height });
  }

  if (or.length === 0) return [];

  return prisma.media.findMany({ where: { OR: or } });
}

export async function createMedia(input: MediaCreateInput): Promise<Media> {
  return prisma.media.create({ data: input });
}

export async function updateMedia(id: number, input: MediaUpdateInput): Promise<Media> {
  return prisma.media.update({ where: { id }, data: input });
}

export async function deleteMedia(id: number): Promise<void> {
  await prisma.media.delete({ where: { id } });
}

/** Zera isPrimary de todas as outras mídias do mesmo vínculo+tipo, para
 * garantir no máximo uma capa (ver comentário isPrimary no schema). */
export async function clearOtherPrimaryMedia(
  scope: {
    manufacturerId?: number | null;
    vehicleId?: number | null;
    tireId?: number | null;
    wheelId?: number | null;
  },
  type: MediaType,
  exceptId: number
): Promise<void> {
  const where: Prisma.MediaWhereInput = {
    type,
    isPrimary: true,
    id: { not: exceptId },
  };

  if (scope.manufacturerId) where.manufacturerId = scope.manufacturerId;
  if (scope.vehicleId) where.vehicleId = scope.vehicleId;
  if (scope.tireId) where.tireId = scope.tireId;
  if (scope.wheelId) where.wheelId = scope.wheelId;

  await prisma.media.updateMany({ where, data: { isPrimary: false } });
}

export type MediaCounters = {
  total: number;
  porStatus: Record<string, number>;
  porTipo: Record<string, number>;
};

export async function contarMedia(): Promise<MediaCounters> {
  const [total, porStatusRaw, porTipoRaw] = await Promise.all([
    prisma.media.count(),
    prisma.media.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.media.groupBy({ by: ["type"], _count: { type: true } }),
  ]);

  return {
    total,
    porStatus: Object.fromEntries(porStatusRaw.map((r) => [r.status, r._count.status])),
    porTipo: Object.fromEntries(porTipoRaw.map((r) => [r.type, r._count.type])),
  };
}
