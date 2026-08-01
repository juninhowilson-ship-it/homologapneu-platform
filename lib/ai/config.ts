import "server-only";

/// Configuração dos provedores de LLM da IA Engine — todos opcionais. O
/// sistema funciona sem nenhuma chave configurada, caindo para a extração
/// determinística por regex/heurística (lib/ai/document, lib/ai/vehicle,
/// lib/ai/tire). Nenhuma chave é logada ou exposta em resposta de API.
export type AiProviderId =
  | "anthropic"
  | "openai"
  | "gemini"
  | "mistral"
  | "openrouter"
  | "ollama";

const DEFAULT_PRIORITY: AiProviderId[] = [
  "anthropic",
  "openai",
  "gemini",
  "mistral",
  "openrouter",
  "ollama",
];

export function getProviderPriority(): AiProviderId[] {
  const configurado = process.env.AI_PROVIDER_PRIORITY;
  if (!configurado) return DEFAULT_PRIORITY;

  const ids = configurado
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id): id is AiProviderId => DEFAULT_PRIORITY.includes(id as AiProviderId));

  return ids.length > 0 ? ids : DEFAULT_PRIORITY;
}

export function getApiKey(provider: AiProviderId): string | null {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || null;
    case "openai":
      return process.env.OPENAI_API_KEY || null;
    case "gemini":
      return process.env.GOOGLE_API_KEY || null;
    case "mistral":
      return process.env.MISTRAL_API_KEY || null;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY || null;
    case "ollama":
      // Ollama roda localmente sem API key — a URL base é o sinal de que
      // está configurado.
      return process.env.OLLAMA_BASE_URL || null;
  }
}

export function isProviderConfigured(provider: AiProviderId): boolean {
  return getApiKey(provider) !== null;
}

export function isAnyProviderConfigured(): boolean {
  return getProviderPriority().some(isProviderConfigured);
}
