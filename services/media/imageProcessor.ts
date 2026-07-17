import "server-only";
import sharp from "sharp";
import { IMAGE_VARIANT_WIDTHS, WEBP_QUALITY, type ImageVariantWidth } from "@/lib/media/constants";

export type ProcessedVariant = {
  width: ImageVariantWidth;
  buffer: Buffer;
  height: number;
  sizeBytes: number;
};

export type ProcessedImage = {
  /** Metadados da imagem original recebida, antes de qualquer conversão. */
  original: { width: number; height: number; format: string | undefined };
  /** true quando a imagem foi convertida para WEBP (SVG nunca é — ver nota
   * abaixo). */
  converted: boolean;
  /** Variantes 320/640/1280px em WEBP — vazio para SVG. */
  variants: ProcessedVariant[];
};

/**
 * ImageProcessor (pedido explícito): converte automaticamente para WEBP e
 * gera as variantes 320/640/1280px.
 *
 * Exceção deliberada: SVG (vetor) nunca é rasterizado — transformar um
 * logo vetorial em WEBP de largura fixa jogaria fora exatamente a
 * vantagem de usar SVG (escalar sem perda). SVG é validado e armazenado
 * como está; as demais variantes ficam vazias para esse caso.
 */
export async function processarImagem(
  buffer: Buffer,
  mimeType: string
): Promise<ProcessedImage> {
  if (mimeType === "image/svg+xml") {
    return {
      original: { width: 0, height: 0, format: "svg" },
      converted: false,
      variants: [],
    };
  }

  const source = sharp(buffer, { failOn: "error" });
  const metadata = await source.metadata();

  const variants: ProcessedVariant[] = [];
  for (const width of IMAGE_VARIANT_WIDTHS) {
    const resized = sharp(buffer).rotate().resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    });
    const webpBuffer = await resized.webp({ quality: WEBP_QUALITY }).toBuffer();
    const info = await sharp(webpBuffer).metadata();
    variants.push({
      width,
      buffer: webpBuffer,
      height: info.height ?? 0,
      sizeBytes: webpBuffer.byteLength,
    });
  }

  return {
    original: {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format: metadata.format,
    },
    converted: true,
    variants,
  };
}
