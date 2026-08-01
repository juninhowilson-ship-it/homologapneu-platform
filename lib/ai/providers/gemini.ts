import "server-only";
import { getApiKey, isProviderConfigured } from "../config";
import type { AiProvider } from "./types";

const DEFAULT_MODEL = "gemini-1.5-flash";

export function buildGeminiProvider(): AiProvider | null {
  if (!isProviderConfigured("gemini")) return null;
  const apiKey = getApiKey("gemini")!;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  return {
    id: "gemini",
    label: "Google Gemini",
    async complete({ system, prompt, maxTokens }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens ?? 1024 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API respondeu ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    },
  };
}
