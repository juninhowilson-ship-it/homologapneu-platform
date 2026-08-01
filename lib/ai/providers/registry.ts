import "server-only";
import { getProviderPriority, type AiProviderId } from "../config";
import type { AiProvider } from "./types";
import { buildAnthropicProvider } from "./anthropic";
import { buildOpenAiProvider } from "./openai";
import { buildGeminiProvider } from "./gemini";
import { buildMistralProvider } from "./mistral";
import { buildOpenRouterProvider } from "./openrouter";
import { buildOllamaProvider } from "./ollama";

const BUILDERS: Record<AiProviderId, () => AiProvider | null> = {
  anthropic: buildAnthropicProvider,
  openai: buildOpenAiProvider,
  gemini: buildGeminiProvider,
  mistral: buildMistralProvider,
  openrouter: buildOpenRouterProvider,
  ollama: buildOllamaProvider,
};

/** Lista, na ordem de prioridade configurada, os providers que têm chave/URL
 * definida no ambiente. Vazio quando nenhum está configurado — nesse caso a
 * pipeline segue 100% no modo local (regex/heurística). */
export function listConfiguredProviders(): AiProvider[] {
  return getProviderPriority()
    .map((id) => BUILDERS[id]())
    .filter((provider): provider is AiProvider => provider !== null);
}

/** Primeiro provider configurado na ordem de prioridade, ou null se nenhum
 * estiver configurado (modo 100% local). */
export function getActiveProvider(): AiProvider | null {
  return listConfiguredProviders()[0] ?? null;
}
