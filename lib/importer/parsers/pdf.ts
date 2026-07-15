import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isPdftotextAvailable } from "@/lib/importer/connectors/pbeClient";
import type { ParsedFile } from "./types";

const execFileAsync = promisify(execFile);

/**
 * Extração real de texto de PDF via `pdftotext` (poppler/xpdf) — completa
 * o stub que já existia no pipeline de importação. Cada linha não-vazia
 * extraída vira uma linha com uma única coluna "texto": o PDF de um
 * documento técnico real (manual, catálogo, boletim) não tem uma
 * estrutura de colunas genérica e previsível, então normalizar tudo para
 * texto puro por linha é o que não arrisca inventar uma coluna que a
 * fonte não tem — a extração de campos específicos (medida, veículo
 * etc.) acontece depois, em lib/curadoria/extrairCandidatos.ts.
 *
 * Se o PDF não tiver texto extraível (documento escaneado/imagem), a
 * função falha com uma mensagem clara em vez de silenciar o problema:
 * OCR de página escaneada exigiria renderizar a página como imagem
 * (pdftoppm/poppler), que não está disponível neste ambiente.
 */
export async function parsePdfFile(buffer: ArrayBuffer): Promise<ParsedFile> {
  if (!isPdftotextAvailable()) {
    throw new Error(
      "Extração de PDF indisponível: o binário `pdftotext` (poppler/xpdf) não foi encontrado neste ambiente."
    );
  }

  const path = join(tmpdir(), `curadoria-upload-${Date.now()}.pdf`);
  await writeFile(path, new Uint8Array(buffer));

  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", path, "-"],
      { maxBuffer: 1024 * 1024 * 50 }
    );

    const linhas = stdout
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);

    if (linhas.length === 0) {
      throw new Error(
        "PDF sem texto extraível — provavelmente um documento escaneado (imagem). OCR de página escaneada requer renderizar a página como imagem (pdftoppm/poppler), indisponível neste ambiente."
      );
    }

    return {
      headers: ["texto"],
      rows: linhas.map((texto) => ({ texto })),
    };
  } finally {
    await unlink(path).catch(() => undefined);
  }
}
