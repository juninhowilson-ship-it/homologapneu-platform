import "server-only";
import {
  findMediaBySha256,
  findMediaByLooseCriteria,
} from "@/repositories/media/media";
import type { Media } from "@prisma/client";

export type DuplicateCheckInput = {
  sha256?: string | null;
  originalUrl?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
};

export type DuplicateCheckResult =
  | { isDuplicate: false }
  | { isDuplicate: true; matchedBy: "sha256" | "url" | "nome-dimensoes"; existing: Media };

/**
 * Duplicate Detector (pedido explícito): compara SHA256, Nome, URL e
 * Dimensões contra o que já está salvo. SHA256 é a checagem forte
 * (conteúdo idêntico); nome/URL/dimensões são sinais fracos usados só
 * quando ainda não há o hash (ex.: antes de baixar o arquivo). "Nunca
 * salvar duplicadas": todo caminho de escrita em services/media deve
 * chamar isto antes de persistir.
 */
export async function detectarDuplicata(
  input: DuplicateCheckInput
): Promise<DuplicateCheckResult> {
  if (input.sha256) {
    const [existing] = await findMediaBySha256(input.sha256);
    if (existing) return { isDuplicate: true, matchedBy: "sha256", existing };
  }

  const candidatos = await findMediaByLooseCriteria({
    originalUrl: input.originalUrl,
    title: input.title,
    width: input.width,
    height: input.height,
  });

  if (candidatos.length === 0) return { isDuplicate: false };

  const porUrl = input.originalUrl
    ? candidatos.find((c) => c.originalUrl === input.originalUrl)
    : undefined;
  if (porUrl) return { isDuplicate: true, matchedBy: "url", existing: porUrl };

  const porNomeDimensoes =
    input.title && input.width && input.height
      ? candidatos.find(
          (c) =>
            c.title?.toLowerCase() === input.title?.toLowerCase() &&
            c.width === input.width &&
            c.height === input.height
        )
      : undefined;
  if (porNomeDimensoes) {
    return { isDuplicate: true, matchedBy: "nome-dimensoes", existing: porNomeDimensoes };
  }

  return { isDuplicate: false };
}
