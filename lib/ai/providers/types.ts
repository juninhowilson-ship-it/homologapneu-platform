import "server-only";
import type { AiProviderId } from "../config";

export type AiCompletionInput = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

export type AiProvider = {
  id: AiProviderId;
  label: string;
  /** Chama a API do provider e devolve o texto bruto da resposta (sem
   * parsing de JSON — quem chama decide como interpretar). Lança erro se a
   * chamada falhar; nunca inventa uma resposta de fallback. */
  complete(input: AiCompletionInput): Promise<string>;
};
