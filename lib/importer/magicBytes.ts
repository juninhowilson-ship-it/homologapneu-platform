/**
 * Validação do CONTEÚDO real do arquivo pelos primeiros bytes (magic
 * numbers), não só pela extensão do nome — inferFileType() (parseFile.ts)
 * só olha o nome; alguém podia enviar qualquer coisa com nome
 * "manual.pdf". Aqui confirmamos que o binário realmente bate com o tipo
 * declarado antes de subir pro Storage/gravar no banco.
 */

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // "%PDF"
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04" — XLSX/ODS são ZIP por dentro

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

/** Heurística leve para texto (CSV/XML/JSON): sem byte nulo nos primeiros
 * KB — arquivo binário disfarçado de texto quase sempre tem \x00 cedo. */
function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
  return !sample.includes(0);
}

export type DeclaredFileKind = "PDF" | "XLSX" | "ODS" | "CSV" | "JSON" | "XML";

/** Retorna null quando o conteúdo bate com o tipo declarado, ou uma
 * mensagem explicando a divergência (para o chamador decidir: rejeitar,
 * ou aceitar sinalizado — decisão de negócio, não desta função). */
export function checkMagicBytes(bytes: Uint8Array, declared: DeclaredFileKind): string | null {
  switch (declared) {
    case "PDF":
      if (!startsWith(bytes, PDF_SIGNATURE)) {
        return `Arquivo declarado como PDF mas não começa com a assinatura "%PDF" — conteúdo real não confere.`;
      }
      return null;
    case "XLSX":
    case "ODS":
      if (!startsWith(bytes, ZIP_SIGNATURE)) {
        return `Arquivo declarado como ${declared} mas não começa com a assinatura ZIP ("PK\\x03\\x04") — conteúdo real não confere.`;
      }
      return null;
    case "CSV":
    case "JSON":
    case "XML":
      if (!looksLikeText(bytes)) {
        return `Arquivo declarado como ${declared} mas parece binário (byte nulo encontrado no início) — conteúdo real não confere.`;
      }
      return null;
    default:
      return null;
  }
}
