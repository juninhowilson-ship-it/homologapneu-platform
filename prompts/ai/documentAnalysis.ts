import "server-only";

/// Prompt usado para pedir a um provider de LLM (quando configurado) para
/// reforçar a extração determinística (regex/heurística) — NUNCA a
/// substitui. A saída é tratada só como um "concorda/discorda" que ajusta
/// a confiança (lib/ai/confidence/calculateConfidence.ts); a pipeline
/// nunca grava um campo que só veio do LLM sem também ter vindo da
/// extração local.
export const DOCUMENT_ANALYSIS_SYSTEM_PROMPT = `Você é um assistente de extração de dados técnicos de documentos automotivos (manuais, catálogos, boletins de homologação de pneus).

Regras obrigatórias:
- Use SOMENTE informações literalmente presentes no texto fornecido. Nunca invente, complete ou deduza um dado que não esteja escrito.
- Se um campo não aparecer no texto, retorne null para ele — nunca um valor plausível "chutado".
- Responda em JSON estrito, sem texto fora do JSON, no formato:
{
  "measures": [{"raw": string, "width": number, "profile": number, "rim": number, "loadIndex": string|null, "speedIndex": string|null}],
  "oeCodes": string[],
  "vehicle": {"manufacturer": string|null, "model": string|null, "version": string|null, "year": number|null} | null,
  "confidence": "alta" | "media" | "baixa"
}`;

export function buildDocumentAnalysisPrompt(extractedText: string): string {
  const trecho = extractedText.slice(0, 12000);
  return `Texto extraído do documento:\n\n"""\n${trecho}\n"""\n\nExtraia os dados conforme as regras do sistema.`;
}

export type LlmDocumentAnalysis = {
  measures: { raw: string; width: number; profile: number; rim: number; loadIndex: string | null; speedIndex: string | null }[];
  oeCodes: string[];
  vehicle: { manufacturer: string | null; model: string | null; version: string | null; year: number | null } | null;
  confidence: "alta" | "media" | "baixa";
};

/** Faz o parse defensivo da resposta do LLM — se não vier um JSON válido no
 * formato esperado, retorna null (a pipeline segue só com a extração
 * local, nunca falha por causa de uma resposta malformada do provider). */
export function parseLlmDocumentAnalysis(raw: string): LlmDocumentAnalysis | null {
  try {
    const inicio = raw.indexOf("{");
    const fim = raw.lastIndexOf("}");
    if (inicio === -1 || fim === -1) return null;
    const json = JSON.parse(raw.slice(inicio, fim + 1));
    if (typeof json !== "object" || json === null) return null;
    return json as LlmDocumentAnalysis;
  } catch {
    return null;
  }
}
