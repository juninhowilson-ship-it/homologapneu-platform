import "server-only";
import sharp from "sharp";
import { THUMBNAIL_WIDTH, WEBP_QUALITY } from "@/lib/media/constants";

export type GeneratedThumbnail = {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
};

/**
 * Thumbnail Generator (pedido explícito): gera miniatura automaticamente.
 * Sempre um WEBP raster de THUMBNAIL_WIDTH (320px), mesmo para SVG — a
 * miniatura é um artefato derivado só para preview rápido em grid, então
 * rasterizar aqui não tem o mesmo problema de rasterizar o arquivo
 * "mestre" (ver nota em imageProcessor.ts).
 */
export async function gerarThumbnail(buffer: Buffer): Promise<GeneratedThumbnail> {
  const webpBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const info = await sharp(webpBuffer).metadata();

  return {
    buffer: webpBuffer,
    width: info.width ?? THUMBNAIL_WIDTH,
    height: info.height ?? 0,
    sizeBytes: webpBuffer.byteLength,
  };
}
