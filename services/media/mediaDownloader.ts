import "server-only";
import { sha256OfBuffer } from "@/lib/media/hash";
import { validarImagem } from "./imageValidator";

export type DownloadedImage = {
  buffer: Buffer;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
};

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
];

function isPrivateOrLocalHostname(hostname: string): boolean {
  return PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * MediaDownloader (pedido explícito): baixar, validar, renomear (feito por
 * quem chama, via lib/media/naming.ts), converter (ImageProcessor) e
 * armazenar (storage/mediaStorage.ts).
 *
 * NÃO é chamado automaticamente por nada hoje (nenhum cron/crawler aciona
 * isto) — existe pronto para quando um crawler de mídia futuro precisar
 * baixar de uma fonte oficial. Só aceita http(s) e recusa hosts privados/
 * locais (mesma mitigação de SSRF documentada no relatório de auditoria
 * de segurança para lib/storage/logoRehost.ts, agora aplicada aqui desde
 * o início em vez de deixada como dívida).
 */
export async function baixarImagem(sourceUrl: string): Promise<DownloadedImage> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error(`URL inválida: "${sourceUrl}"`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Protocolo não permitido: "${url.protocol}"`);
  }
  if (isPrivateOrLocalHostname(url.hostname)) {
    throw new Error(`Host não permitido: "${url.hostname}"`);
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "HomologaPneu-MediaManager/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem (${sourceUrl}): HTTP ${response.status}`);
  }

  const declaredMimeType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const resultado = validarImagem(buffer, declaredMimeType, buffer.byteLength);
  if (!resultado.valid) {
    throw new Error(`Imagem de "${sourceUrl}" reprovada na validação: ${resultado.reason}`);
  }

  return {
    buffer,
    mimeType: resultado.mimeType,
    sha256: sha256OfBuffer(buffer),
    sizeBytes: buffer.byteLength,
  };
}
