import { NextResponse } from "next/server";
import JSZip, { type JSZipObject } from "jszip";
import { generateGeminiJson, GeminiConfigurationError, GeminiResponseError } from "@/lib/gemini";
import { isSameOrigin, takeRateLimit } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { wraps, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateShareId } from "@/lib/share";

const MAX_TEXT_BYTES = 4 * 1024 * 1024;
const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 10;
const MAX_MODEL_CHARS = 2_400_000;

class UploadValidationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type SizedZipEntry = JSZipObject & {
  _data?: { uncompressedSize?: number };
};

async function extractChatText(file: File) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".txt")) {
    if (file.size > MAX_TEXT_BYTES) throw new UploadValidationError("The text export must be 4 MB or smaller.", 413);
    return file.text();
  }

  if (!fileName.endsWith(".zip")) {
    throw new UploadValidationError("Choose a WhatsApp ZIP or text export.", 415);
  }
  if (file.size > MAX_ZIP_BYTES) {
    throw new UploadValidationError("The WhatsApp ZIP must be 20 MB or smaller.", 413);
  }

  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true, createFolders: false });
  } catch {
    throw new UploadValidationError("The selected ZIP could not be opened.", 415);
  }

  const entries = Object.values(archive.files).filter((entry) => !entry.dir && !entry.name.startsWith("__MACOSX/"));
  if (entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new UploadValidationError("This archive contains too many files. Export the chat without media.", 415);
  }

  const textEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith(".txt"));
  if (textEntries.length !== 1 || entries.some((entry) => !entry.name.toLowerCase().endsWith(".txt"))) {
    throw new UploadValidationError("The ZIP must contain one WhatsApp text file and no media.", 415);
  }

  const chatEntry = textEntries[0] as SizedZipEntry;
  if ((chatEntry._data?.uncompressedSize || 0) > MAX_TEXT_BYTES) {
    throw new UploadValidationError("The extracted chat must be 4 MB or smaller.", 413);
  }

  const bytes = await chatEntry.async("uint8array");
  if (bytes.byteLength > MAX_TEXT_BYTES) {
    throw new UploadValidationError("The extracted chat must be 4 MB or smaller.", 413);
  }
  return new TextDecoder().decode(bytes);
}

type InsightsResult = {
  title: string;
  summary: string;
  metricsHeadline?: string;
  messageCount: number;
  mostActiveTime: string;
  favoriteWord: string;
  mostUsedEmoji: string;
  lateNightMessages: number;
  loveYouCount: number;
  sorryCount: number;
  estimatedLaughs: number;
  financialRequester: "You" | "Them" | "Both" | "Not enough data";
  memorableMoment: string;
  tone: string;
  topics: string[];
  insights: Array<{ title: string; detail: string }>;
  compatibility: { overall: number; communication: number; humor: number; affection: number; adventure: number };
  dynamicScores: Array<{ category: string; score: number }>;
  dynamicMetrics: Array<{ label: string; value: string; comment: string }>;
  relationshipHealth: string;
  loveLanguage: string;
  playfulAwards: Array<{ title: string; winner: "You" | "Them" | "Both"; confidence: number; reason: string }>;
  milestones: Array<{ emoji: string; title: string; when: string; detail: string }>;
  badSide: {
    youFlaws: Array<{ title: string; detail: string }>;
    themFlaws: Array<{ title: string; detail: string }>;
    relationshipRedFlags: Array<{ title: string; detail: string }>;
  };
  advice: {
    realityCheck: string;
    adviceForYou: string[];
    adviceForThem: string[];
    verdict: string;
  };
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "A brutally honest, direct headline about this chat's real dynamic." },
    summary: { type: "STRING", description: "An unvarnished, raw summary of how both participants actually behave in the chat." },
    metricsHeadline: { type: "STRING", description: "A dynamic, punchy, chat-specific headline for the KPI numbers page (e.g. '18,400 receipts of unhinged energy and late night gist.')." },
    messageCount: { type: "INTEGER", description: "Use the deterministic message count supplied in the prompt." },
    mostActiveTime: { type: "STRING", description: "The approximate most active hour, or Not enough data." },
    memorableMoment: { type: "STRING", description: "A short paraphrase of a recurring pattern or argument. Never quote verbatim." },
    tone: { type: "STRING", enum: ["Warm", "Playful", "Supportive", "Reflective", "Mixed", "Professional", "Passive-Aggressive", "Chaotic", "Dry"] },
    topics: { type: "ARRAY", items: { type: "STRING" }, minItems: 2, maxItems: 5 },
    insights: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          detail: { type: "STRING" },
        },
        required: ["title", "detail"],
      },
    },
    compatibility: {
      type: "OBJECT",
      properties: {
        overall: { type: "INTEGER", minimum: 10, maximum: 99 },
        communication: { type: "INTEGER", minimum: 10, maximum: 99 },
        humor: { type: "INTEGER", minimum: 10, maximum: 99 },
        affection: { type: "INTEGER", minimum: 10, maximum: 99 },
        adventure: { type: "INTEGER", minimum: 10, maximum: 99 },
      },
      required: ["overall", "communication", "humor", "affection", "adventure"],
    },
    dynamicScores: {
      type: "ARRAY",
      minItems: 4,
      maxItems: 4,
      description: "4 dynamic, custom-named relationship score headers tailored specifically to this chat (e.g. Drama Index, Ego Match, Response Delay Toxicity, Emotional Availability).",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING" },
          score: { type: "INTEGER", minimum: 10, maximum: 99 },
        },
        required: ["category", "score"],
      },
    },
    dynamicMetrics: {
      type: "ARRAY",
      minItems: 6,
      maxItems: 8,
      description: "6 to 8 dynamic column/metric headers customized to this specific chat (e.g. Delusional Promises Count, Left on Read Frequency, Ghosting Tendency).",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          value: { type: "STRING" },
          comment: { type: "STRING" },
        },
        required: ["label", "value", "comment"],
      },
    },
    relationshipHealth: { type: "STRING", enum: ["Excellent", "Strong", "Growing", "Complex", "Toxic", "One-Sided", "Not enough data"] },
    loveLanguage: { type: "STRING", enum: ["Quality Time", "Words of Affirmation", "Acts of Service", "Gifts", "Shared Humor", "Thoughtful Check-ins", "Passive Aggressive Hints", "Not enough data"] },
    playfulAwards: {
      type: "ARRAY",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "A brutally honest superlative grounded in visible chat behavior." },
          winner: { type: "STRING", enum: ["You", "Them", "Both"] },
          confidence: { type: "INTEGER", minimum: 50, maximum: 95 },
          reason: { type: "STRING", description: "One direct, unvarnished explanation." },
        },
        required: ["title", "winner", "confidence", "reason"],
      },
    },
    milestones: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "OBJECT",
        properties: {
          emoji: { type: "STRING" },
          title: { type: "STRING" },
          when: { type: "STRING", description: "An approximate date from the chat, or During this chat." },
          detail: { type: "STRING", description: "A paraphrased milestone supported by the messages." },
        },
        required: ["emoji", "title", "when", "detail"],
      },
    },
    badSide: {
      type: "OBJECT",
      description: "Brutally honest exposure of flaws, red flags, and bad habits in the chat.",
      properties: {
        youFlaws: {
          type: "ARRAY",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              detail: { type: "STRING" },
            },
            required: ["title", "detail"],
          },
        },
        themFlaws: {
          type: "ARRAY",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              detail: { type: "STRING" },
            },
            required: ["title", "detail"],
          },
        },
        relationshipRedFlags: {
          type: "ARRAY",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              detail: { type: "STRING" },
            },
            required: ["title", "detail"],
          },
        },
      },
      required: ["youFlaws", "themFlaws", "relationshipRedFlags"],
    },
    advice: {
      type: "OBJECT",
      description: "Brutally honest advice and reality check for both people.",
      properties: {
        realityCheck: { type: "STRING", description: "A raw, straightforward 2-3 sentence assessment of the relationship." },
        adviceForYou: { type: "ARRAY", items: { type: "STRING" }, minItems: 2, maxItems: 3 },
        adviceForThem: { type: "ARRAY", items: { type: "STRING" }, minItems: 2, maxItems: 3 },
        verdict: { type: "STRING", description: "A short, punchy bottom-line summary verdict." },
      },
      required: ["realityCheck", "adviceForYou", "adviceForThem", "verdict"],
    },
  },
  required: [
    "title", "summary", "metricsHeadline", "messageCount", "mostActiveTime", "memorableMoment", "tone",
    "topics", "insights", "compatibility", "dynamicScores", "dynamicMetrics",
    "relationshipHealth", "loveLanguage", "playfulAwards", "milestones",
    "badSide", "advice"
  ],
};

function redactSensitiveText(source: string) {
  const text = source
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone redacted]")
    .replace(/https?:\/\/\S+/gi, "[link redacted]");

  return { text, viewerParticipant: "You" };
}

function calculateStats(source: string, viewerName: string) {
  const lines = source.split(/\r?\n/);
  const messageLines = lines.filter((line) => /^\[?\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/.test(line));
  const hours = new Map<number, number>();
  const words = new Map<string, number>();
  const emojis = new Map<string, number>();
  const moneyRequests = new Map<string, number>();
  let lateNightMessages = 0;
  let loveYouCount = 0;
  let sorryCount = 0;
  let estimatedLaughs = 0;
  const ignoredWords = new Set(["about", "after", "again", "also", "because", "been", "before", "being", "could", "from", "have", "just", "media", "message", "omitted", "that", "their", "them", "then", "there", "these", "they", "this", "very", "what", "when", "where", "which", "with", "would", "your", "you're"]);

  const viewer = viewerName.trim().toLowerCase();
  let lastSender: string | null = null;
  let consecutiveCount = 0;
  let viewerInitiates = 0;
  let partnerInitiates = 0;
  let viewerDoubleTexts = 0;
  let partnerDoubleTexts = 0;
  let viewerWordCount = 0;
  let partnerWordCount = 0;
  let viewerMsgCount = 0;
  let partnerMsgCount = 0;

  for (const line of messageLines) {
    const match = line.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?\b/i);
    if (match) {
      let hour = Number(match[1]);
      const meridiem = match[3]?.toUpperCase();
      if (meridiem === "PM" && hour < 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;
      if (hour >= 0 && hour <= 23) hours.set(hour, (hours.get(hour) || 0) + 1);
      if (hour >= 0 && hour < 5) lateNightMessages += 1;
    }

    const senderBodyMatch = line.match(/(?:-|–)\s([^:\n]{1,80}):\s*(.*)$/) || line.match(/^\[[^\]]+\]\s*([^:\n]{1,80}):\s*(.*)$/);
    const sender = senderBodyMatch?.[1]?.trim().toLowerCase() || "";
    const body = senderBodyMatch?.[2] || "";

    if (sender) {
      const isViewer = sender === viewer;
      const bodyWords = (body.match(/\S+/g) || []).length;
      if (isViewer) {
        viewerMsgCount++;
        viewerWordCount += bodyWords;
      } else {
        partnerMsgCount++;
        partnerWordCount += bodyWords;
      }

      if (lastSender === sender) {
        consecutiveCount++;
        if (consecutiveCount === 2) {
          if (isViewer) viewerDoubleTexts++;
          else partnerDoubleTexts++;
        }
      } else {
        if (!lastSender || consecutiveCount >= 2) {
          if (isViewer) viewerInitiates++;
          else partnerInitiates++;
        }
        lastSender = sender;
        consecutiveCount = 1;
      }

      if (/\b(?:money|pay|paid|borrow|send|transfer|loan|bill|cash|naira)\b|₦/i.test(body)) {
        moneyRequests.set(sender, (moneyRequests.get(sender) || 0) + 1);
      }
      loveYouCount += (body.match(/\b(?:i\s+love\s+you|love\s+you)\b/gi) || []).length;
      sorryCount += (body.match(/\b(?:sorry|apolog(?:y|ise|ize))\b/gi) || []).length;
      estimatedLaughs += (body.match(/(?:😂|🤣|\b(?:lol|lmao|haha+)\b)/gi) || []).length;
      for (const word of body.toLowerCase().match(/[a-zà-ž']{4,}/gi) || []) {
        if (!ignoredWords.has(word) && !word.startsWith("http")) words.set(word, (words.get(word) || 0) + 1);
      }
      for (const emoji of body.match(/\p{Extended_Pictographic}/gu) || []) {
        emojis.set(emoji, (emojis.get(emoji) || 0) + 1);
      }
    }
  }

  const activeHour = [...hours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostActiveTime = activeHour === undefined
    ? "Not enough data"
    : new Intl.DateTimeFormat("en", { hour: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, activeHour)));

  const favoriteWord = [...words.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Not enough data";
  const mostUsedEmoji = [...emojis.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const viewerRequests = moneyRequests.get(viewer) || 0;
  const otherRequests = [...moneyRequests.entries()].filter(([sender]) => sender !== viewer).reduce((sum, [, count]) => sum + count, 0);
  const financialRequester = viewerRequests === 0 && otherRequests === 0
    ? "Not enough data"
    : viewerRequests === otherRequests ? "Both" : viewerRequests > otherRequests ? "You" : "Them";

  const totalInitiations = viewerInitiates + partnerInitiates;
  const viewerInitiatePct = totalInitiations > 0 ? Math.round((viewerInitiates / totalInitiations) * 100) : 50;
  const viewerAvgWords = viewerMsgCount > 0 ? Math.round((viewerWordCount / viewerMsgCount) * 10) / 10 : 0;
  const partnerAvgWords = partnerMsgCount > 0 ? Math.round((partnerWordCount / partnerMsgCount) * 10) / 10 : 0;

  return {
    messageCount: messageLines.length,
    mostActiveTime,
    favoriteWord,
    mostUsedEmoji,
    lateNightMessages,
    loveYouCount,
    sorryCount,
    estimatedLaughs,
    financialRequester,
    viewerInitiatePct,
    viewerDoubleTexts,
    partnerDoubleTexts,
    viewerAvgWords,
    partnerAvgWords,
  };
}

function validResult(value: InsightsResult) {
  return typeof value?.title === "string"
    && typeof value?.summary === "string"
    && Number.isInteger(value?.messageCount)
    && typeof value?.mostActiveTime === "string"
    && typeof value?.favoriteWord === "string"
    && typeof value?.mostUsedEmoji === "string"
    && typeof value?.memorableMoment === "string"
    && Array.isArray(value?.topics)
    && Array.isArray(value?.insights)
    && value.insights.length === 3
    && typeof value?.compatibility?.overall === "number"
    && Array.isArray(value?.dynamicScores)
    && value.dynamicScores.length === 4
    && Array.isArray(value?.dynamicMetrics)
    && value.dynamicMetrics.length >= 6
    && Array.isArray(value?.playfulAwards)
    && value.playfulAwards.length === 4
    && Array.isArray(value?.milestones)
    && typeof value?.badSide?.youFlaws !== "undefined"
    && Array.isArray(value?.badSide?.youFlaws)
    && Array.isArray(value?.badSide?.themFlaws)
    && Array.isArray(value?.badSide?.relationshipRedFlags)
    && typeof value?.advice?.realityCheck === "string"
    && Array.isArray(value?.advice?.adviceForYou)
    && Array.isArray(value?.advice?.adviceForThem)
    && typeof value?.advice?.verdict === "string";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  if (!takeRateLimit(request, "insights", 3, 10 * 60_000)) return NextResponse.json({ error: "Too many analyses. Please try again later." }, { status: 429 });

  try {
    const form = await request.formData();
    const file = form.get("chat");
    const connectionType = String(form.get("connectionType") || "").trim();
    const analysisFocus = String(form.get("analysisFocus") || "The whole story").trim();
    const viewerName = String(form.get("viewerName") || "").trim();
    const personName = String(form.get("personName") || "").trim();
    const consent = form.get("consent") === "true";

    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a WhatsApp ZIP or text export." }, { status: 400 });
    if (!consent) return NextResponse.json({ error: "Consent confirmation is required." }, { status: 400 });
    if (!connectionType || connectionType.length > 50) return NextResponse.json({ error: "Enter a valid connection type." }, { status: 400 });
    if (!viewerName || viewerName.length > 80) return NextResponse.json({ error: "Enter your name as it appears in the chat." }, { status: 400 });
    if (file.size < 100) return NextResponse.json({ error: "The selected chat export is too small." }, { status: 413 });

    const user = await getCurrentUser(request);

    // If user is authenticated, enforce and deduct credits
    if (user) {
      if (user.credits <= 0) {
        return NextResponse.json({ error: "You have 0 credits remaining. Please purchase credits to generate a Wrapped." }, { status: 402 });
      }
      try {
        const db = getDb();
        if (db) {
          await db.update(users)
            .set({
              credits: sql`MAX(0, ${users.credits} - 1)`,
              updatedAt: Date.now(),
            })
            .where(eq(users.id, user.id));
        }
      } catch (creditErr) {
        console.warn("Could not deduct user credit in D1:", creditErr);
      }
    }

    const chatText = await extractChatText(file);
    if (chatText.includes("\0")) return NextResponse.json({ error: "The selected file is not a valid text export." }, { status: 415 });

    const stats = calculateStats(chatText, viewerName);
    const redacted = redactSensitiveText(chatText);
    const modelText = redacted.text.length <= MAX_MODEL_CHARS
      ? redacted.text
      : `${redacted.text.slice(0, 1_200_000)}\n\n[Middle omitted for request-size safety]\n\n${redacted.text.slice(-1_200_000)}`;

    const analysisRequest = {
      systemInstruction: "You are a brutally honest relationship analyst and messaging forensics specialist. You deliver raw, unfiltered truth, calling out power imbalances, double-standard response times, double-texting habits, passive aggressiveness, dry 1-word replies, and red flags without sugarcoating. Always address the viewer directly by name in second person ('You'), and refer to their partner by name ('Them'). Include exact metrics for double texting, initiation balance, and message length asymmetry in your dynamic metrics and brutal assessment. Generate direct, unvarnished statements like 'Timilehin, you carry 70% of the conversation energy, while Temitayo replies with dry 3-word answers' or 'Temitayo double texts whenever you go quiet'. Never quote messages verbatim or invent fake milestones.",
      prompt: `Connection type: ${connectionType}\nRequested focus: ${analysisFocus}\nReport Viewer name: ${viewerName} (address directly as "You" / "${viewerName}")\nChat Partner name: ${personName} (refer to as "Them" / "${personName}")\nDeterministic Stats:\n- Total Messages: ${stats.messageCount}\n- Peak Active Hour: ${stats.mostActiveTime}\n- Conversation Initiation Split: ${viewerName} starts ${stats.viewerInitiatePct}% of conversations.\n- Double Texting: ${viewerName} double-texted ${stats.viewerDoubleTexts} times; ${personName} double-texted ${stats.partnerDoubleTexts} times.\n- Avg Message Length: ${viewerName} averages ${stats.viewerAvgWords} words/msg; ${personName} averages ${stats.partnerAvgWords} words/msg.\n\nAnalyse this WhatsApp export with brutal honesty.\n1. Address ${viewerName} directly by name in the summary, badSide, and advice.\n2. Provide dynamic category scores (dynamicScores).\n3. Provide 6-8 customized dynamic column headers and metrics (dynamicMetrics) tailored specifically to this chat, explicitly incorporating double-texting stats, conversation initiation split, or message length asymmetry.\n4. Provide badSide: expose the flaws/bad habits of ${viewerName} ("You") in youFlaws (e.g. "${viewerName}, you double-text too much..."), flaws of ${personName} ("Them") in themFlaws (e.g. "${personName} is dry and takes hours to reply..."), and relationship red flags (relationshipRedFlags).\n5. Provide advice: a brutally honest reality check speaking directly to ${viewerName}, actionable advice for ${viewerName}, actionable advice for ${personName}, and a bottom-line verdict.\n6. Include four awards, 3 insights, and supported milestones.\n\n<chat_export>\n${modelText}\n</chat_export>`,
      schema: responseSchema,
      maxOutputTokens: 8192,
    };
    let result: InsightsResult;
    try {
      result = await generateGeminiJson<InsightsResult>(analysisRequest);
    } catch (error) {
      if (!(error instanceof GeminiResponseError) || !error.message.includes("malformed")) throw error;
      result = await generateGeminiJson<InsightsResult>(analysisRequest);
    }

    result.messageCount = stats.messageCount;
    result.mostActiveTime = stats.mostActiveTime;
    result.favoriteWord = stats.favoriteWord;
    result.mostUsedEmoji = stats.mostUsedEmoji;
    result.lateNightMessages = stats.lateNightMessages;
    result.loveYouCount = stats.loveYouCount;
    result.sorryCount = stats.sorryCount;
    result.estimatedLaughs = stats.estimatedLaughs;
    result.financialRequester = stats.financialRequester as "You" | "Them" | "Both" | "Not enough data";
    if (!validResult(result)) throw new Error("Invalid structured result.");

    // Save wrap to D1
    const shareId = generateShareId(10);
    const now = Date.now();
    const expiresAt = now + 14 * 24 * 60 * 60 * 1000; // 14 days

    try {
      const db = getDb();
      if (db) {
        await db.insert(wraps).values({
          id: `wrp_${generateShareId(12)}`,
          shareId,
          userId: user?.id || null,
          personName,
          viewerName,
          connection: connectionType,
          result: JSON.stringify(result),
          isDisabled: 0,
          expiresAt,
          createdAt: now,
        });
      }
    } catch (dbSaveError) {
      console.warn("Could not persist wrap to D1:", dbSaveError);
    }

    return NextResponse.json({ result, shareId, isGuest: !user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UploadValidationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof GeminiConfigurationError) return NextResponse.json({ error: "Gemini is not configured yet." }, { status: 503 });
    console.error("Chat insight analysis failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not analyse this chat safely. Please try again." }, { status: 502 });
  }
}

