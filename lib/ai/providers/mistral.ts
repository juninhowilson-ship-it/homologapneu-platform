import "server-only";
import { getApiKey, isProviderConfigured } from "../config";
import type { AiProvider } from "./types";

const DEFAULT_MODEL = "mistral-small-latest";

export function buildMistralProvider(): AiProvider | null {
  if (!isProviderConfigured("mistral")) return null;
  const apiKey = getApiKey("mistral")!;
  const model = process.env.MISTRAL_MODEL || DEFAULT_MODEL;

  return {
    id: "mistral",
    label: "Mistral",
    async complete({ system, prompt, maxTokens }) {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
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
        throw new Error(`Mistral API respondeu ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        choices: { message?: { content?: string } }[];
      };
      return data.choices[0]?.message?.content ?? "";
    },
  };
}
