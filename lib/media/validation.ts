import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  type AcceptedMimeType,
} from "./constants";

export type ImageValidationResult =
  | { valid: true; mimeType: AcceptedMimeType }
  | { valid: false; reason: string };

const MAGIC_BYTES: { mimeType: AcceptedMimeType; check: (buf: Buffer) => boolean }[] = [
  { mimeType: "image/png", check: (buf) => buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/jpeg", check: (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff },
  {
    mimeType: "image/webp",
    check: (buf) =>
      buf.length > 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/**
 * Aceita somente PNG/JPG/JPEG/WEBP/SVG (pedido explícito). Ignora
 * BMP/GIF/TIFF mesmo que o cliente declare um Content-Type aceito —
 * confere os magic bytes reais do arquivo, não só a extensão/MIME
 * declarados (mesmo cuidado de defesa em profundidade já aplicado em
 * lib/upload.ts, agora reforçado com checagem de conteúdo).
 */
export function validateImageBuffer(
  buffer: Buffer,
  declaredMimeType: string,
  sizeBytes: number
): ImageValidationResult {
  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      reason: `Arquivo maior que ${Math.round(MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)}MB`,
    };
  }

  const declared = declaredMimeType.toLowerCase().trim();
  if (!ACCEPTED_MIME_TYPES.includes(declared as AcceptedMimeType)) {
    return {
      valid: false,
      reason: `Formato "${declaredMimeType}" não suportado. Use PNG, JPG, JPEG, WEBP ou SVG.`,
    };
  }

  if (declared === "image/svg+xml") {
    const head = buffer.subarray(0, 2000).toString("utf8").trimStart().toLowerCase();
    if (!head.includes("<svg") && !head.includes("<?xml")) {
      return { valid: false, reason: "Arquivo não é um SVG válido" };
    }
    return { valid: true, mimeType: "image/svg+xml" };
  }

  const match = MAGIC_BYTES.find((entry) => entry.check(buffer));
  if (!match) {
    return {
      valid: false,
      reason: "O conteúdo do arquivo não corresponde a PNG, JPG/JPEG ou WEBP válido",
    };
  }
  if (match.mimeType !== declared) {
    return {
      valid: false,
      reason: `Conteúdo do arquivo é ${match.mimeType}, mas foi declarado como ${declared}`,
    };
  }

  return { valid: true, mimeType: match.mimeType };
}
