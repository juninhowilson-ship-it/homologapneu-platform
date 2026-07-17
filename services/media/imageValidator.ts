import "server-only";
import { validateImageBuffer, type ImageValidationResult } from "@/lib/media/validation";

/**
 * Image Validator (pedido explícito): aceita somente PNG/JPG/JPEG/WEBP/SVG,
 * ignora BMP/GIF/TIFF. Lógica pura em lib/media/validation.ts; este módulo
 * é o ponto de entrada do serviço (mantém o nome pedido na spec).
 */
export function validarImagem(
  buffer: Buffer,
  declaredMimeType: string,
  sizeBytes: number
): ImageValidationResult {
  return validateImageBuffer(buffer, declaredMimeType, sizeBytes);
}
