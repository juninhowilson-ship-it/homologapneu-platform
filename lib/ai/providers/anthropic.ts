import "server-only";
import { getApiKey, isProviderConfigured } from "../config";
import type { AiProvider } from "./types";

const DEFAULT_MODEL = "claude-sonnet-5";

export function buildAnthropicProvider(): AiProvider | null {
  if (!isProviderConfigured("anthropic")) return null;
  const apiKey = getApiKey("anthropic")!;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  return {
    id: "anthropic",
    label: "Anthropic Claude",
    async complete({ system, prompt, maxTokens }) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system,
          max_tokens: maxTokens ?? 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API respondeu ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        content: { type: string; text?: string }[];
      };
      return data.content.find((bloco) => bloco.type === "text")?.text ?? "";
    },
  };
}
