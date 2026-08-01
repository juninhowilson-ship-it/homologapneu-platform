import "server-only";

export type ConfidenceInput = {
  /** Quantas vezes o mesmo dado (medida, veículo, código OE) apareceu no
   * texto do documento — repetição dentro da própria fonte, não entre
   * documentos diferentes. */
  evidenceCount: number;
  /** Já existe cadastrado no Banco Mestre (Manufacturer/VehicleVersion/Tire) —
   * reforça a confiança porque cruza com um dado já validado por um humano. */
  matchedInDatabase: boolean;
  /** Resultado do provider de LLM, quando configurado: true = concordou com
   * a extração determinística, false = discordou, null = nenhum provider
   * configurado (a extração seguiu 100% local). */
  llmAgreement: boolean | null;
  /** Sem conflito detectado (lib/ai/conflicts/detectConflicts.ts) para este
   * mesmo achado. */
  consistent: boolean;
};

/** Confiança 0-100 de uma sugestão gerada pela IA. Pesos fixos e
 * documentados (não é um score aprendido) — cada fator soma/subtrai um
 * valor fixo, sempre a partir de uma base neutra de 40. */
export function calculateConfidence(input: ConfidenceInput): number {
  let score = 40;

  score += Math.min(input.evidenceCount, 5) * 6; // até +30
  score += input.matchedInDatabase ? 20 : 0;

  if (input.llmAgreement === true) score += 15;
  else if (input.llmAgreement === false) score -= 20;

  score += input.consistent ? 0 : -25;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function classifyConfidence(score: number): "ALTA_CONFIANCA" | "BAIXA_CONFIANCA" {
  return score >= 70 ? "ALTA_CONFIANCA" : "BAIXA_CONFIANCA";
}
