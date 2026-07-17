import "server-only";
import type { Media, MediaType } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { EXTENSION_BY_MIME, BUCKET_BY_MEDIA_TYPE, type AcceptedMimeType } from "@/lib/media/constants";
import { buildFileName } from "@/lib/media/naming";
import { sha256OfBuffer } from "@/lib/media/hash";
import type {
  MediaDTO,
  MediaListQuery,
  MediaListResponse,
  RegisterMediaInput,
} from "@/lib/media/types";
import {
  listMedia as listMediaRepo,
  findMediaById,
  createMedia,
  updateMedia,
  deleteMedia as deleteMediaRepo,
  clearOtherPrimaryMedia,
} from "@/repositories/media/media";
import { validarImagem } from "./imageValidator";
import { processarImagem } from "./imageProcessor";
import { gerarThumbnail } from "./thumbnailGenerator";
import { detectarDuplicata } from "./duplicateDetector";
import { resolverContextoDeVinculo } from "./linkResolver";
import { uploadMediaFile, isMediaStorageConfigured } from "@/storage/mediaStorage";

function toDTO(record: Media): MediaDTO {
  return {
    id: record.id,
    type: record.type,
    manufacturerId: record.manufacturerId,
    vehicleId: record.vehicleId,
    tireId: record.tireId,
    wheelId: record.wheelId,
    homologationId: record.homologationId,
    title: record.title,
    description: record.description,
    source: record.source,
    originalUrl: record.originalUrl,
    storageUrl: record.storageUrl,
    thumbnailUrl: record.thumbnailUrl,
    sha256: record.sha256,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    size: record.size,
    isPrimary: record.isPrimary,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function ensureSingleLink(link: {
  manufacturerId?: number | null;
  vehicleId?: number | null;
  tireId?: number | null;
  wheelId?: number | null;
  homologationId?: number | null;
}) {
  const preenchidos = [
    link.manufacturerId,
    link.vehicleId,
    link.tireId,
    link.wheelId,
    link.homologationId,
  ].filter((v) => v != null);

  if (preenchidos.length === 0) {
    throw new ValidationError(
      "Informe ao menos um vínculo: manufacturerId, vehicleId, tireId, wheelId ou homologationId"
    );
  }
}

export async function listarMedia(query: MediaListQuery): Promise<MediaListResponse> {
  const { data, total } = await listMediaRepo(query);
  return {
    data: data.map(toDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function obterMedia(id: number): Promise<MediaDTO> {
  const record = await findMediaById(id);
  if (!record) throw new NotFoundError("Mídia não encontrada");
  return toDTO(record);
}

/**
 * Registra uma mídia PENDENTE a partir só de uma URL de origem — sem
 * baixar nada agora. É o gancho que um crawler de mídia futuro vai usar:
 * ele anota "existe uma foto oficial aqui" e um worker (workers/media)
 * processa depois. Ainda assim passa pelo Duplicate Detector (por URL),
 * porque registrar a mesma URL duas vezes já não deveria acontecer.
 */
export async function registrarMediaPendente(input: RegisterMediaInput): Promise<MediaDTO> {
  ensureSingleLink(input);
  if (!input.originalUrl) {
    throw new ValidationError("originalUrl é obrigatória para registrar mídia pendente");
  }

  await resolverContextoDeVinculo(input.type, input);

  const duplicata = await detectarDuplicata({ originalUrl: input.originalUrl });
  if (duplicata.isDuplicate) {
    throw new ValidationError(
      `Já existe uma mídia registrada para esta URL (id #${duplicata.existing.id})`
    );
  }

  const record = await createMedia({
    type: input.type,
    manufacturerId: input.manufacturerId ?? null,
    vehicleId: input.vehicleId ?? null,
    tireId: input.tireId ?? null,
    wheelId: input.wheelId ?? null,
    homologationId: input.homologationId ?? null,
    title: input.title ?? null,
    description: input.description ?? null,
    source: input.source ?? null,
    originalUrl: input.originalUrl,
    status: "PENDENTE",
  });

  return toDTO(record);
}

export type UploadMediaInput = RegisterMediaInput & {
  buffer: Buffer;
  declaredMimeType: string;
};

/**
 * Upload manual completo (painel administrativo): valida, detecta
 * duplicata, converte (WEBP + variantes), gera miniatura, envia ao
 * Supabase Storage e grava o registro DISPONIVEL. Único caminho que já
 * baixa/processa bytes de verdade hoje — continua sendo uma ação humana
 * explícita (upload), nunca automática.
 */
export async function fazerUploadMedia(input: UploadMediaInput): Promise<MediaDTO> {
  ensureSingleLink(input);

  const validacao = validarImagem(input.buffer, input.declaredMimeType, input.buffer.byteLength);
  if (!validacao.valid) {
    throw new ValidationError(validacao.reason);
  }

  const sha256 = sha256OfBuffer(input.buffer);
  const duplicata = await detectarDuplicata({
    sha256,
    originalUrl: input.originalUrl,
    title: input.title,
  });
  if (duplicata.isDuplicate) {
    throw new ValidationError(
      `Arquivo duplicado (mesmo conteúdo da mídia #${duplicata.existing.id}) — não salvo de novo.`
    );
  }

  const naming = await resolverContextoDeVinculo(input.type, input);
  const processed = await processarImagem(input.buffer, validacao.mimeType);
  const thumbnail = await gerarThumbnail(input.buffer);

  if (!isMediaStorageConfigured()) {
    throw new ValidationError(
      "Supabase Storage não configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY). " +
        "A infraestrutura do Media Manager está pronta, mas o upload real precisa dessas credenciais."
    );
  }

  const bucket = BUCKET_BY_MEDIA_TYPE[input.type];
  const extension = validacao.mimeType === "image/svg+xml"
    ? "svg"
    : "webp";
  const fileId = crypto.randomUUID();
  const fileName = buildFileName(naming, fileId, extension);

  const bytesToStore = validacao.mimeType === "image/svg+xml"
    ? input.buffer
    : (processed.variants.find((v) => v.width === 1280) ?? processed.variants[processed.variants.length - 1])?.buffer ?? input.buffer;

  const mainUpload = await uploadMediaFile(
    bucket,
    fileName,
    bytesToStore,
    validacao.mimeType === "image/svg+xml" ? "image/svg+xml" : "image/webp"
  );

  const thumbFileName = buildFileName(naming, fileId, "webp").replace(/\.webp$/, "-thumb.webp");
  const thumbUpload = await uploadMediaFile("thumbnails", thumbFileName, thumbnail.buffer, "image/webp");

  const record = await createMedia({
    type: input.type,
    manufacturerId: input.manufacturerId ?? null,
    vehicleId: input.vehicleId ?? null,
    tireId: input.tireId ?? null,
    wheelId: input.wheelId ?? null,
    homologationId: input.homologationId ?? null,
    title: input.title ?? null,
    description: input.description ?? null,
    source: input.source ?? null,
    originalUrl: input.originalUrl ?? null,
    storageUrl: mainUpload.publicUrl,
    thumbnailUrl: thumbUpload.publicUrl,
    sha256,
    mimeType: validacao.mimeType,
    width: processed.original.width || thumbnail.width,
    height: processed.original.height || thumbnail.height,
    size: bytesToStore.byteLength,
    isPrimary: input.isPrimary ?? false,
    status: "DISPONIVEL",
  });

  if (record.isPrimary) {
    await clearOtherPrimaryMedia(input, input.type, record.id);
  }

  return toDTO(record);
}

export async function excluirMedia(id: number): Promise<void> {
  const record = await findMediaById(id);
  if (!record) throw new NotFoundError("Mídia não encontrada");
  await deleteMediaRepo(id);
}

/**
 * Regenera a miniatura a partir do arquivo já armazenado (storageUrl) —
 * usado quando THUMBNAIL_WIDTH muda ou a miniatura anterior corrompeu.
 * Só funciona para mídia já DISPONIVEL (com storageUrl).
 */
export async function regenerarThumbnail(id: number): Promise<MediaDTO> {
  const record = await findMediaById(id);
  if (!record) throw new NotFoundError("Mídia não encontrada");
  if (!record.storageUrl) {
    throw new ValidationError("Mídia ainda não tem arquivo armazenado (status != DISPONIVEL)");
  }

  const response = await fetch(record.storageUrl);
  if (!response.ok) {
    throw new ValidationError(
      `Não foi possível reler o arquivo armazenado (HTTP ${response.status})`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const thumbnail = await gerarThumbnail(buffer);
  const fileId = crypto.randomUUID();
  const thumbFileName = `regen-${fileId.slice(0, 8)}-thumb.webp`;
  const thumbUpload = await uploadMediaFile("thumbnails", thumbFileName, thumbnail.buffer, "image/webp");

  const updated = await updateMedia(id, { thumbnailUrl: thumbUpload.publicUrl });
  return toDTO(updated);
}

export function extensaoParaMime(mimeType: string): string | undefined {
  return EXTENSION_BY_MIME[mimeType as AcceptedMimeType];
}

export function tiposValidos(): MediaType[] {
  return ["MANUFACTURER", "VEHICLE", "TIRE", "WHEEL", "DOCUMENT", "LOGO", "THUMBNAIL"];
}
