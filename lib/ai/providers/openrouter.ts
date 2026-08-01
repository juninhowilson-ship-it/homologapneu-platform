import "server-only";
import { getApiKey, isProviderConfigured } from "../config";
import type { AiProvider } from "./types";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

export function buildOpenRouterProvider(): AiProvider | null {
  if (!isProviderConfigured("openrouter")) return null;
  const apiKey = getApiKey("openrouter")!;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  return {
    id: "openrouter",
    label: "OpenRouter",
    async complete({ system, prompt, maxTokens }) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens ?? 1024,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API respondeu ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        choices: { message?: { content?: string } }[];
      };
      return data.choices[0]?.message?.content ?? "";
    },
  };
}
