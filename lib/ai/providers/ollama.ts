import "server-only";
import { getApiKey, isProviderConfigured } from "../config";
import type { AiProvider } from "./types";

const DEFAULT_MODEL = "llama3";

export function buildOllamaProvider(): AiProvider | null {
  if (!isProviderConfigured("ollama")) return null;
  const baseUrl = getApiKey("ollama")!.replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

  return {
    id: "ollama",
    label: "Ollama (local)",
    async complete({ system, prompt }) {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          system,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama respondeu ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as { response?: string };
      return data.response ?? "";
    },
  };
}
