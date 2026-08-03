type JsonSchema = Record<string, unknown>;

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

export class GeminiConfigurationError extends Error {}
export class GeminiResponseError extends Error {}

function resolveGeminiEndpoint(model: string) {
  const configured = process.env.GEMINI_API_URL?.trim();
  if (!configured) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new GeminiConfigurationError("GEMINI_API_URL is invalid.");
  }

  if (url.protocol !== "https:" || url.hostname !== "generativelanguage.googleapis.com") {
    throw new GeminiConfigurationError("GEMINI_API_URL must use the official Google Gemini API host.");
  }

  if (url.pathname.endsWith(":generateContent")) return url.toString();

  let base = url.toString().replace(/\/+$/, "");
  if (url.pathname === "/") base += "/v1beta";
  return `${base}${url.pathname.endsWith("/models") ? "" : "/models"}/${encodeURIComponent(model)}:generateContent`;
}

import { env } from "cloudflare:workers";

function getApiKey(): string | undefined {
  let workerEnv: Record<string, string | undefined> = {};
  try {
    workerEnv = (env as unknown as Record<string, string | undefined>) || {};
  } catch {
    /* fallback when not in workers context */
  }
  return (
    workerEnv.GEMINI_API_KEY?.trim() ||
    workerEnv.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim()
  );
}

function getModel(): string {
  let workerEnv: Record<string, string | undefined> = {};
  try {
    workerEnv = (env as unknown as Record<string, string | undefined>) || {};
  } catch {
    /* fallback when not in workers context */
  }
  return (
    workerEnv.GEMINI_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

export async function generateGeminiJson<T>({
  prompt,
  systemInstruction,
  schema,
  maxOutputTokens = 2048,
}: {
  prompt: string;
  systemInstruction: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
}): Promise<T> {
  const apiKey = getApiKey();
  const model = getModel();

  if (!apiKey) throw new GeminiConfigurationError("A Gemini API key is not configured.");
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new GeminiConfigurationError("GEMINI_MODEL is invalid.");

  const endpoint = resolveGeminiEndpoint(model);

  const response = await fetch(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    console.error("Gemini API error:", response.status, JSON.stringify(payload));
    throw new GeminiResponseError(payload.error?.message || `Gemini request failed (${response.status}).`);
  }
  if (payload.promptFeedback?.blockReason) throw new GeminiResponseError("Gemini blocked this request for safety reasons.");

  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new GeminiResponseError(`Gemini returned no usable response (${candidate?.finishReason || "unknown"}).`);

  try {
    let cleaned = text;
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    // Fix trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned) as T;
  } catch {
    console.error("Gemini raw text (first 500 chars):", text.slice(0, 500));
    console.error("Gemini raw text (last 200 chars):", text.slice(-200));
    throw new GeminiResponseError("Gemini returned malformed structured output.");
  }
}
