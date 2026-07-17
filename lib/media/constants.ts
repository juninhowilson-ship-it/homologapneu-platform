import type { MediaType } from "@prisma/client";

/**
 * Formatos aceitos pelo Image Validator. BMP/GIF/TIFF são recusados de
 * propósito (pedido explícito) — GIF em especial porque este sistema não
 * lida com animação, e BMP/TIFF por serem formatos não-web sem benefício
 * de compressão.
 */
export const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export const REJECTED_EXTENSIONS = ["bmp", "gif", "tif", "tiff"] as const;

export const EXTENSION_BY_MIME: Record<AcceptedMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** Limite de tamanho por upload — mais generoso que lib/upload.ts (2MB)
 * porque fotos de veículo em alta resolução costumam passar disso; o
 * ImageProcessor reduz para os tamanhos-alvo depois. */
export const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

/** Larguras-alvo geradas pelo ImageProcessor, em pixels. */
export const IMAGE_VARIANT_WIDTHS = [320, 640, 1280] as const;
export type ImageVariantWidth = (typeof IMAGE_VARIANT_WIDTHS)[number];

export const THUMBNAIL_WIDTH: ImageVariantWidth = 320;

export const WEBP_QUALITY = 82;

/** Um bucket do Supabase Storage por tipo de mídia — ver storage/buckets.ts. */
export const BUCKET_BY_MEDIA_TYPE: Record<MediaType, string> = {
  MANUFACTURER: "manufacturers",
  VEHICLE: "vehicles",
  TIRE: "tires",
  WHEEL: "wheels",
  DOCUMENT: "documents",
  LOGO: "manufacturers",
  THUMBNAIL: "thumbnails",
};

export const MEDIA_ALL_BUCKETS = [
  "manufacturers",
  "vehicles",
  "tires",
  "wheels",
  "documents",
  "thumbnails",
] as const;
