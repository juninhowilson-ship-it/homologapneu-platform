import type { MediaType, MediaStatus } from "@prisma/client";

export type MediaDTO = {
  id: number;
  type: MediaType;
  manufacturerId: number | null;
  vehicleId: number | null;
  tireId: number | null;
  wheelId: number | null;
  homologationId: number | null;
  title: string | null;
  description: string | null;
  source: string | null;
  originalUrl: string | null;
  storageUrl: string | null;
  thumbnailUrl: string | null;
  sha256: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  isPrimary: boolean;
  status: MediaStatus;
  createdAt: string;
  updatedAt: string;
};

export type MediaListResponse = {
  data: MediaDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export type MediaListQuery = {
  type?: MediaType;
  status?: MediaStatus;
  manufacturerId?: number;
  vehicleId?: number;
  tireId?: number;
  wheelId?: number;
  homologationId?: number;
  /** Busca por título/descrição/fonte. */
  q?: string;
  /** Filtro "Duplicadas": mídias cujo sha256 aparece em mais de uma linha. */
  onlyDuplicates?: boolean;
  page: number;
  pageSize: number;
};

/** Contexto de vínculo — usado pelo relacionamento automático e pela
 * geração de nome de arquivo (ver lib/media/naming.ts). */
export type MediaLinkContext = {
  manufacturerId?: number | null;
  vehicleId?: number | null;
  tireId?: number | null;
  wheelId?: number | null;
  homologationId?: number | null;
};

export type RegisterMediaInput = MediaLinkContext & {
  type: MediaType;
  title?: string | null;
  description?: string | null;
  source?: string | null;
  originalUrl?: string | null;
  isPrimary?: boolean;
};

export type StoredVariant = {
  width: number;
  url: string;
  sizeBytes: number;
};
