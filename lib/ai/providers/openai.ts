import "server-only";
import { getApiKey, isProviderConfigured } from "../config";
import type { AiProvider } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";

export function buildOpenAiProvider(): AiProvider | null {
  if (!isProviderConfigured("openai")) return null;
  const apiKey = getApiKey("openai")!;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  return {
    id: "openai",
    label: "OpenAI",
    async complete({ system, prompt, maxTokens }) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        throw new Error(`OpenAI API respondeu ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        choices: { message?: { content?: string } }[];
      };
      return data.choices[0]?.message?.content ?? "";
    },
  };
}
