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
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

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
  if (!response.ok) throw new GeminiResponseError(payload.error?.message || `Gemini request failed (${response.status}).`);
  if (payload.promptFeedback?.blockReason) throw new GeminiResponseError("Gemini blocked this request for safety reasons.");

  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new GeminiResponseError(`Gemini returned no usable response (${candidate?.finishReason || "unknown"}).`);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiResponseError("Gemini returned malformed structured output.");
  }
}
