import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

export type PreferredAIProvider = "auto" | "gemini" | "groq";

interface LiveLLMRequest {
  systemInstruction: string;
  promptText: string;
  useSearchGrounding?: boolean;
  jsonMode?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  preferredProvider?: PreferredAIProvider;
}

interface LiveLLMResult {
  text: string;
  provider: "gemini" | "groq";
  modelUsed: string;
  latencyMs: number;
  sources: { title: string; url: string }[];
  searchQueries: string[];
  usedSearchGrounding: boolean;
}

// Collect all candidate Gemini API keys from environment (supports custom free-tier override keys in Secrets)
function getCandidateGeminiKeys(): string[] {
  const rawKeys = [
    process.env.GEMINI_FREE_API_KEY,
    process.env.CUSTOM_GEMINI_API_KEY,
    process.env.GOOGLE_AI_STUDIO_API_KEY,
    process.env.GEMINI_API_KEY,
  ];
  const validKeys: string[] = [];
  for (const k of rawKeys) {
    const trimmed = (k || "").trim();
    if (
      trimmed &&
      trimmed !== "MY_GEMINI_API_KEY" &&
      !validKeys.includes(trimmed)
    ) {
      validKeys.push(trimmed);
    }
  }
  return validKeys;
}

function getGroqApiKey(): string | null {
  const raw = (process.env.GROQ_API_KEY || "").trim();
  if (raw && raw !== "MY_GROQ_API_KEY") return raw;
  return null;
}

// Track Gemini keys that returned 402 Prepayment Credits Depleted so Auto mode routes directly to Groq
const depletedGeminiKeys402 = new Set<string>();

function is402BillingError(err: any): boolean {
  const str =
    String(err?.message || "") +
    " " +
    String(err?.status || "") +
    " " +
    String(err?.code || "") +
    " " +
    String(err || "");
  return (
    str.includes("402") ||
    str.toLowerCase().includes("prepayment credits are depleted") ||
    str.toLowerCase().includes("billing")
  );
}

function summarizeErrorReason(err: any): string {
  const str =
    String(err?.message || "") +
    " " +
    String(err?.status || "") +
    " " +
    String(err?.code || "") +
    " " +
    String(err || "");

  if (is402BillingError(err)) {
    return "402 Prepayment credits depleted on attached Cloud project key";
  }
  if (
    str.includes("RESOURCE_EXHAUSTED") ||
    str.includes("Quota exceeded") ||
    str.includes("429")
  ) {
    return "429 Rate limit / free-tier quota reached";
  }
  if (
    str.includes("API_KEY_INVALID") ||
    str.includes("401") ||
    str.includes("invalid_api_key")
  ) {
    return "Invalid API key";
  }
  return (err?.message || "Provider request failed").slice(0, 160);
}

const GROQ_PRIMARY_TEXT_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const GROQ_PRIMARY_VISION_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

/**
 * Stage 1: Execute against Google Gemini API with Free-Tier Model Cascade
 * First attempts with Google Search Grounding (if requested), then cascades across
 * gemini-3.8-flash -> gemini-3.1-flash-lite -> gemini-flash-latest without paid grounding tools.
 * Immediately breaks out of the key loop if the key returns a 402 Prepayment Credits Depleted error.
 */
async function tryGeminiCascade(
  req: LiveLLMRequest,
  attemptErrors: string[]
): Promise<LiveLLMResult | null> {
  const keys = getCandidateGeminiKeys();
  if (keys.length === 0) {
    return null;
  }

  const startMs = Date.now();
  const freeTierModels = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  for (const apiKey of keys) {
    let keyHit402 = false;
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const contents: any[] = [];
    if (req.imageBase64) {
      contents.push({
        inlineData: {
          mimeType: req.imageMimeType || "image/jpeg",
          data: req.imageBase64.replace(
            /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
            ""
          ),
        },
      });
    }
    contents.push({ text: req.promptText });

    // 1A. If Search Grounding is requested and not JSON mode, attempt grounded call first
    if (req.useSearchGrounding && !req.jsonMode && !req.imageBase64) {
      for (const groundedModel of ["gemini-3.8-flash", "gemini-flash-latest"]) {
        try {
          const response = await ai.models.generateContent({
            model: groundedModel,
            contents: req.promptText,
            config: {
              systemInstruction: req.systemInstruction,
              tools: [{ googleSearch: {} }],
            },
          });

          const text = response.text?.trim();
          if (text) {
            depletedGeminiKeys402.delete(apiKey);
            const candidate = response.candidates?.[0];
            const groundingMetadata = candidate?.groundingMetadata;
            const groundingChunks = groundingMetadata?.groundingChunks || [];
            const webSearchQueries = groundingMetadata?.webSearchQueries || [];

            const sources = groundingChunks
              .filter((chunk: any) => chunk.web?.uri)
              .map((chunk: any) => ({
                title: chunk.web.title || "Regulatory / OEM Source",
                url: chunk.web.uri,
              }));

            return {
              text,
              provider: "gemini",
              modelUsed: `${groundedModel} + Search`,
              latencyMs: Date.now() - startMs,
              sources,
              searchQueries: webSearchQueries,
              usedSearchGrounding: true,
            };
          }
        } catch (err: any) {
          attemptErrors.push(
            `Gemini (${groundedModel} + Search): ${summarizeErrorReason(err)}`
          );
          if (is402BillingError(err)) {
            depletedGeminiKeys402.add(apiKey);
            keyHit402 = true;
            break;
          }
        }
      }
    }

    if (keyHit402) {
      continue;
    }

    // 1B. Free-Tier Direct Generation Cascade (without paid Search Grounding tool)
    for (const modelName of freeTierModels) {
      try {
        const config: Record<string, any> = {
          systemInstruction: req.systemInstruction,
        };
        if (req.jsonMode) {
          config.responseMimeType = "application/json";
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: req.imageBase64 ? contents : req.promptText,
          config,
        });

        const text = response.text?.trim();
        if (text) {
          depletedGeminiKeys402.delete(apiKey);
          return {
            text,
            provider: "gemini",
            modelUsed: modelName,
            latencyMs: Date.now() - startMs,
            sources: [],
            searchQueries: [],
            usedSearchGrounding: false,
          };
        }
      } catch (err: any) {
        attemptErrors.push(
          `Gemini (${modelName}): ${summarizeErrorReason(err)}`
        );
        if (is402BillingError(err)) {
          depletedGeminiKeys402.add(apiKey);
          break;
        }
      }
    }
  }

  return null;
}

/**
 * Dynamically discover active text-generating models on the user's Groq API key
 * if the static list ever changes upstream.
 */
async function discoverGroqModels(groqKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${groqKey}` },
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const list: any[] = Array.isArray(data?.data) ? data.data : [];
    return list
      .filter((m) => {
        const id = String(m?.id || "");
        const outputs: string[] = Array.isArray(m?.output_modalities)
          ? m.output_modalities
          : ["text"];
        const isGuardOrSpeech =
          id.includes("guard") ||
          id.includes("safeguard") ||
          id.includes("whisper") ||
          id.includes("orpheus");
        return outputs.includes("text") && !isGuardOrSpeech;
      })
      .map((m) => String(m.id));
  } catch {
    return [];
  }
}

/**
 * Stage 2: Execute against Groq LPU API (https://api.groq.com/openai/v1/chat/completions)
 * Cascades across openai/gpt-oss-120b -> qwen/qwen3.8-27b -> openai/gpt-oss-20b
 * (and uses qwen/qwen3.8-27b first for multimodal Borescope vision requests).
 */
async function tryGroqCascade(
  req: LiveLLMRequest,
  attemptErrors: string[]
): Promise<LiveLLMResult | null> {
  const groqKey = getGroqApiKey();
  if (!groqKey) {
    return null;
  }

  const startMs = Date.now();
  const baseModels = req.imageBase64
    ? [...GROQ_PRIMARY_VISION_MODELS]
    : [...GROQ_PRIMARY_TEXT_MODELS];

  // Try base models first; if all fail, dynamically query /openai/v1/models for any new model IDs
  const triedModels = new Set<string>();

  const runGroqModel = async (
    modelName: string
  ): Promise<LiveLLMResult | null> => {
    triedModels.add(modelName);
    const isVisionCapable = modelName.includes("qwen");
    const systemPrompt =
      req.jsonMode &&
      !req.systemInstruction.toLowerCase().includes("json") &&
      !req.promptText.toLowerCase().includes("json")
        ? `${req.systemInstruction}\nRespond strictly with a valid JSON object.`
        : req.systemInstruction;

    const userContent: any =
      req.imageBase64 && isVisionCapable
        ? [
            { type: "text", text: req.promptText },
            {
              type: "image_url",
              image_url: {
                url: req.imageBase64.startsWith("data:")
                  ? req.imageBase64
                  : `data:${req.imageMimeType || "image/jpeg"};base64,${req.imageBase64}`,
              },
            },
          ]
        : req.promptText;

    const bodyPayload: Record<string, any> = {
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.25,
      max_tokens: 2048,
    };

    if (req.jsonMode) {
      bodyPayload.response_format = { type: "json_object" };
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 140)}`);
    }

    const json: any = await response.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    if (text) {
      return {
        text,
        provider: "groq",
        modelUsed: modelName,
        latencyMs: Date.now() - startMs,
        sources: [],
        searchQueries: [],
        usedSearchGrounding: false,
      };
    }
    return null;
  };

  for (const modelName of baseModels) {
    try {
      const res = await runGroqModel(modelName);
      if (res) return res;
    } catch (err: any) {
      attemptErrors.push(`Groq (${modelName}): ${summarizeErrorReason(err)}`);
    }
  }

  // Dynamic fallback if catalog changed
  const discovered = await discoverGroqModels(groqKey);
  for (const modelName of discovered) {
    if (triedModels.has(modelName)) continue;
    try {
      const res = await runGroqModel(modelName);
      if (res) return res;
    } catch (err: any) {
      attemptErrors.push(`Groq (${modelName}): ${summarizeErrorReason(err)}`);
    }
  }

  return null;
}

/**
 * Unified Multi-Provider Live LLM Router
 * Respects preferredProvider ('auto' | 'gemini' | 'groq') with automatic cross-provider failover
 * and 402 billing circuit-breaker so Auto mode routes immediately to Groq when Gemini is out of credits.
 */
async function executeLiveLLM(req: LiveLLMRequest): Promise<{
  result: LiveLLMResult | null;
  hasAnyLiveKey: boolean;
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  attemptErrors: string[];
}> {
  const geminiKeys = getCandidateGeminiKeys();
  const groqKey = getGroqApiKey();
  const hasGeminiKey = geminiKeys.length > 0;
  const hasGroqKey = Boolean(groqKey);
  const hasAnyLiveKey = hasGeminiKey || hasGroqKey;
  const attemptErrors: string[] = [];

  if (!hasAnyLiveKey) {
    return {
      result: null,
      hasAnyLiveKey: false,
      hasGeminiKey: false,
      hasGroqKey: false,
      attemptErrors: ["Neither GEMINI_API_KEY nor GROQ_API_KEY is configured."],
    };
  }

  const pref = req.preferredProvider || "auto";

  // Check if all configured Gemini keys have already tripped the 402 billing circuit-breaker
  const allGeminiKeysDepleted402 =
    hasGeminiKey && geminiKeys.every((k) => depletedGeminiKeys402.has(k));

  // Route to Groq first if user selected Groq OR if Auto mode sees Gemini is 402 credit-depleted
  if (pref === "groq" || (pref === "auto" && allGeminiKeysDepleted402 && hasGroqKey)) {
    const groqRes = await tryGroqCascade(req, attemptErrors);
    if (groqRes) {
      return {
        result: groqRes,
        hasAnyLiveKey,
        hasGeminiKey,
        hasGroqKey,
        attemptErrors,
      };
    }
    if (!hasGroqKey && pref === "groq") {
      attemptErrors.push(
        "Groq selected, but GROQ_API_KEY is not set in Settings > Secrets. Attempting Gemini failover..."
      );
    }
    const geminiFallback = await tryGeminiCascade(req, attemptErrors);
    return {
      result: geminiFallback,
      hasAnyLiveKey,
      hasGeminiKey,
      hasGroqKey,
      attemptErrors,
    };
  }

  // Otherwise ('gemini' or initial 'auto' before 402 is detected): Try Gemini first, then immediate failover to Groq
  const geminiRes = await tryGeminiCascade(req, attemptErrors);
  if (geminiRes) {
    return {
      result: geminiRes,
      hasAnyLiveKey,
      hasGeminiKey,
      hasGroqKey,
      attemptErrors,
    };
  }

  const groqFallback = await tryGroqCascade(req, attemptErrors);
  if (!hasGroqKey && !groqFallback) {
    attemptErrors.push(
      "Groq failover skipped (GROQ_API_KEY not configured in Settings > Secrets)."
    );
  }

  return {
    result: groqFallback,
    hasAnyLiveKey,
    hasGeminiKey,
    hasGroqKey,
    attemptErrors,
  };
}

function buildLiveFailureResponse(
  attemptErrors: string[],
  hasGeminiKey: boolean,
  hasGroqKey: boolean
) {
  const uniqueSummary = Array.from(new Set(attemptErrors)).join(" · ");
  return {
    isOfflineSample: false,
    liveError: true,
    errorType: "LIVE_PROVIDERS_FAILED",
    hasGeminiKey,
    hasGroqKey,
    attemptErrors,
    message:
      `All configured live AI attempts failed (${uniqueSummary}). ` +
      `To get real live LLM answers right now, open the AI Studio Settings > Secrets panel and set either a free GROQ_API_KEY (from console.groq.com) or a free Google AI Studio GEMINI_API_KEY (from aistudio.google.com).`,
  };
}

// Health check & Provider Discovery
app.get("/api/health", (_req, res) => {
  const geminiKeys = getCandidateGeminiKeys();
  const hasGeminiKey = geminiKeys.length > 0;
  const hasGroqKey = Boolean(getGroqApiKey());
  const geminiDepleted402 =
    hasGeminiKey && geminiKeys.every((k) => depletedGeminiKeys402.has(k));
  res.json({
    status: "ok",
    hasApiKey: hasGeminiKey || hasGroqKey,
    hasGeminiKey,
    hasGroqKey,
    hasAnyLiveKey: hasGeminiKey || hasGroqKey,
    geminiDepleted402,
    activeProviders: [
      ...(hasGeminiKey && !geminiDepleted402 ? ["gemini"] : []),
      ...(hasGroqKey ? ["groq"] : []),
    ],
    models: {
      gemini: [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ],
      groq: GROQ_PRIMARY_TEXT_MODELS,
    },
    rbacEnforced: true,
    firebaseDatabaseId:
      "ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b",
  });
});

// CAR-145 / Part-145 RBAC Policy Endpoint
app.get("/api/rbac/policy", (_req, res) => {
  res.json({
    standard: "DGCA CAR-145 / EASA Part-145 MRO Access Control",
    benchmarks: ["Swiss-AS AMOS", "Airbus Skywise", "Lufthansa Technik AVIATAR"],
    tiers: {
      Supervisor: {
        scope: "Full Fleet (8 Flights, 16 Engines, All Stations)",
        canAssignEngineers: true,
        canWriteAllTails: true,
      },
      Engineer: {
        scope: "Assigned Aircraft Tails & Flights Only",
        canAssignEngineers: false,
        canWriteAssignedTails: true,
      },
      Trainee: {
        scope: "Isolated Personal Sandbox Container",
        canAssignEngineers: false,
        canWriteLiveFleet: false,
      },
    },
  });
});

// Endpoint 1: Incident Extractor (Gemini Free-Tier + Groq JSON Failover)
app.post("/api/gemini/extract", async (req, res) => {
  try {
    const {
      narrative,
      measurements,
      imageBase64,
      imageMimeType,
      preferredProvider,
    } = req.body;

    const systemInstruction =
      "You are an expert aerospace maintenance data extractor for EngineIQ. " +
      "Extract structured fields from an engine incident report. Return ONLY valid JSON matching the schema. " +
      "Do not judge severity or airworthiness. If a value isn't stated in the narrative or measurements, use null and list it in missingInfo. " +
      "Never decide whether a measurement is within limits, and never state an engine is fit to fly or airworthy. " +
      "Allowed part identifiers are: fan_case, fan_blades, fan_drive_gear, lpc, hpc, combustor, hpt, lpt, exhaust, oil_system, or engine.";

    const promptText = `Extract structured incident data from this aircraft engine report:
Narrative: "${narrative || ""}"
Reported measurements: ${JSON.stringify(measurements || {})}

Return ONLY valid JSON matching this exact schema:
{
  "eventType": "bird_strike" | "fod" | "oil_leak" | "vibration" | "hot_section" | "other",
  "enginePosition": "No.1" | "No.2" | "unspecified",
  "summary": string,
  "findings": [
    {
      "part": "fan_blades" | "fan_case" | "fan_drive_gear" | "lpc" | "hpc" | "combustor" | "hpt" | "lpt" | "exhaust" | "oil_system" | "engine",
      "damageType": "leading_edge_nick" | "crack" | "tip_curl" | "dent" | "blade_nick" | "coating_loss" | "leak" | "vibration" | "other",
      "zone": string,
      "measurement": { "value": number, "unit": string } | null,
      "isAiSuggested": boolean,
      "aiNotes": string
    }
  ],
  "missingInfo": [string]
}`;

    const outcome = await executeLiveLLM({
      systemInstruction,
      promptText,
      jsonMode: true,
      imageBase64,
      imageMimeType,
      preferredProvider,
    });

    if (!outcome.hasAnyLiveKey) {
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "NO_API_KEYS_CONFIGURED",
        data: null,
      });
    }

    if (!outcome.result) {
      return res
        .status(200)
        .json(
          buildLiveFailureResponse(
            outcome.attemptErrors,
            outcome.hasGeminiKey,
            outcome.hasGroqKey
          )
        );
    }

    const cleaned = outcome.result.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    res.json({
      data: parsed,
      provider: outcome.result.provider,
      modelUsed: outcome.result.modelUsed,
      latencyMs: outcome.result.latencyMs,
      isOfflineSample: false,
    });
  } catch (err: any) {
    console.error("Extract endpoint error:", err);
    res.status(500).json({
      error: "EXTRACTION_FAILED",
      message: err.message || "Failed to extract incident data",
    });
  }
});

// Endpoint 2: Explainer (Gemini Free-Tier + Groq Failover)
app.post("/api/gemini/explain", async (req, res) => {
  try {
    const {
      findings,
      rulesResults,
      overallLevel,
      snippets,
      eventType,
      preferredProvider,
    } = req.body;

    const systemInstruction =
      "You explain maintenance decision-support results to a maintenance engineer. " +
      "Use ONLY the provided findings, rules-engine results, and document snippets. " +
      "Never change or contradict the rules-engine result. " +
      "Never state that an engine is fit to fly or airworthy. " +
      "Cite every claim with the document IDs in square brackets (e.g. [DEMO-AMM-72-01]). " +
      "End with: 'Certifying engineer sign-off required.'";

    const promptText = `Explain the following engine maintenance findings and limits check:
Event Type: ${eventType}
Overall Recommended Action Level: L${overallLevel}
Findings: ${JSON.stringify(findings, null, 2)}
Deterministic Rules Engine Results: ${JSON.stringify(rulesResults, null, 2)}
Retrieved Reference Snippets: ${JSON.stringify(snippets, null, 2)}

Provide:
1. A concise plain-language summary of what was found and how the limit bands classify it.
2. A bulleted next-steps checklist (repeat-inspection interval, borescope needed or not, who to escalate to, what to record).
3. Draft tech-log text (2-3 sentences concise).
Ensure EVERY claim cites the matching document ID like [DEMO-AMM-72-01] or [DEMO-POL-01]. End strictly with: "Certifying engineer sign-off required."`;

    const outcome = await executeLiveLLM({
      systemInstruction,
      promptText,
      preferredProvider,
    });

    if (!outcome.hasAnyLiveKey) {
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "NO_API_KEYS_CONFIGURED",
        text: null,
      });
    }

    if (!outcome.result) {
      return res
        .status(200)
        .json(
          buildLiveFailureResponse(
            outcome.attemptErrors,
            outcome.hasGeminiKey,
            outcome.hasGroqKey
          )
        );
    }

    res.json({
      text: outcome.result.text,
      provider: outcome.result.provider,
      modelUsed: outcome.result.modelUsed,
      latencyMs: outcome.result.latencyMs,
      isOfflineSample: false,
    });
  } catch (err: any) {
    console.error("Explain endpoint error:", err);
    res.status(500).json({
      error: "EXPLANATION_FAILED",
      message: err.message || "Failed to generate explanation",
    });
  }
});

// Endpoint 3: Part Assistant with Live Google Search Grounding + Free-Tier/Groq Failover
app.post("/api/gemini/part-ask", async (req, res) => {
  try {
    const { partData, question, snippets, preferredProvider } = req.body;

    const systemInstruction =
      "You are an expert aerospace propulsion copilot for EngineIQ and IndiGo Airlines engineering. " +
      "Answer questions about this specific aircraft engine component using the provided part specifications, local maintenance manual snippets, and regulatory knowledge (FAA Airworthiness Directives, EASA Emergency Directives, DGCA regulations, and Pratt & Whitney PW1100G-JM Service Bulletins). " +
      "When citing local AMM/FCOM documentation, use square brackets like [DEMO-AMM-72-01]. " +
      "When citing regulatory or OEM documents, cite their official reference number (e.g. [FAA AD 2024-0014] or [SB PW1100G-JM-72-0123]). " +
      "Provide a clear, structured, technical response with key findings, mandatory inspection intervals, and practical engineering guidance tailored directly to the engineer's exact question. " +
      "Never declare an engine or part airworthy or fit to fly. Always conclude with: 'Certifying engineer sign-off strictly required.'";

    const promptText = `Component Details (PW1100G-JM Architecture):
${JSON.stringify(partData, null, 2)}

Local AMM Document Snippets:
${JSON.stringify(snippets, null, 2)}

Engineer Question:
"${question}"

Answer the engineer's specific question directly with accurate technical details, AMM tolerances, and applicable PW1100G-JM directives.`;

    const outcome = await executeLiveLLM({
      systemInstruction,
      promptText,
      useSearchGrounding: true,
      preferredProvider,
    });

    if (!outcome.hasAnyLiveKey) {
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "NO_API_KEYS_CONFIGURED",
        message: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.",
      });
    }

    if (!outcome.result) {
      return res
        .status(200)
        .json(
          buildLiveFailureResponse(
            outcome.attemptErrors,
            outcome.hasGeminiKey,
            outcome.hasGroqKey
          )
        );
    }

    res.json({
      text: outcome.result.text,
      provider: outcome.result.provider,
      modelUsed: outcome.result.modelUsed,
      latencyMs: outcome.result.latencyMs,
      sources: outcome.result.sources,
      searchQueries: outcome.result.searchQueries,
      isOfflineSample: false,
    });
  } catch (err: any) {
    console.error("Part-ask endpoint error:", err);
    res.status(500).json({
      error: "PART_QA_FAILED",
      message: err.message || "Failed to answer part question",
    });
  }
});

// Endpoint 4: Training Feedback (Gemini Free-Tier + Groq Failover)
app.post("/api/gemini/training-feedback", async (req, res) => {
  try {
    const {
      scenario,
      traineeParts,
      traineeLevel,
      traineeReasoning,
      score,
      preferredProvider,
    } = req.body;

    const systemInstruction =
      "You are an aerospace maintenance instructor evaluating a trainee's assessment of an engine incident. " +
      "Compare the trainee's selected parts, decision level, and reasoning against the ground-truth scenario. " +
      "Cite relevant document IDs (e.g. [DEMO-AMM-72-01], [DEMO-PRC-05-10]). " +
      "Do NOT change the correct answer. Be constructive, rigorous, and cite OEM guidelines. " +
      "Remind them that certifying engineer sign-off is always required.";

    const promptText = `Scenario: ${JSON.stringify(scenario, null, 2)}
Trainee Selection:
- Selected Parts: ${JSON.stringify(traineeParts)}
- Selected Decision Level: L${traineeLevel}
- Trainee Reasoning: "${traineeReasoning || "None provided"}"
Deterministic Scoring: ${JSON.stringify(score, null, 2)}

Provide structured, cited feedback for the trainee explaining why specific adjacent parts must be inspected according to procedures.`;

    const outcome = await executeLiveLLM({
      systemInstruction,
      promptText,
      preferredProvider,
    });

    if (!outcome.hasAnyLiveKey) {
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "NO_API_KEYS_CONFIGURED",
        text: null,
      });
    }

    if (!outcome.result) {
      return res
        .status(200)
        .json(
          buildLiveFailureResponse(
            outcome.attemptErrors,
            outcome.hasGeminiKey,
            outcome.hasGroqKey
          )
        );
    }

    res.json({
      text: outcome.result.text,
      provider: outcome.result.provider,
      modelUsed: outcome.result.modelUsed,
      latencyMs: outcome.result.latencyMs,
      isOfflineSample: false,
    });
  } catch (err: any) {
    console.error("Training-feedback endpoint error:", err);
    res.status(500).json({
      error: "TRAINING_FEEDBACK_FAILED",
      message: err.message || "Failed to generate training feedback",
    });
  }
});

// Endpoint 5: Search Grounded Intelligence (Gemini Search Grounding + Free-Tier/Groq Failover)
app.post("/api/gemini/search-grounded-intel", async (req, res) => {
  try {
    const { query, context, preferredProvider } = req.body;

    const systemInstruction =
      "You are an expert aerospace maintenance and airworthiness intelligence assistant for EngineIQ and IndiGo Airlines engineering. " +
      "Provide authoritative, up-to-date information on FAA Airworthiness Directives (ADs), EASA Emergency ADs, DGCA India regulatory notices, Pratt & Whitney PW1100G-JM Service Bulletins (SBs), and OEM propulsion engineering updates. " +
      "Provide factual, technical answers with clear bullet points, referencing relevant AD numbers, service bulletins, and inspection thresholds. " +
      "Always conclude with: 'Certifying engineer sign-off required prior to operational aircraft release.'";

    const promptText = `User Query: "${query || "Latest PW1100G airworthiness directives"}"
Aviation Context: ${context ? JSON.stringify(context) : "Airbus A320neo / A321neo with Pratt & Whitney GTF PW1100G-JM engines (IndiGo Fleet)"}

Provide the latest authoritative airworthiness regulations, OEM service bulletins, and operational procedures relevant to this query.`;

    const outcome = await executeLiveLLM({
      systemInstruction,
      promptText,
      useSearchGrounding: true,
      preferredProvider,
    });

    if (!outcome.hasAnyLiveKey) {
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "NO_API_KEYS_CONFIGURED",
        message: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.",
      });
    }

    if (!outcome.result) {
      return res
        .status(200)
        .json(
          buildLiveFailureResponse(
            outcome.attemptErrors,
            outcome.hasGeminiKey,
            outcome.hasGroqKey
          )
        );
    }

    res.json({
      text: outcome.result.text,
      provider: outcome.result.provider,
      modelUsed: outcome.result.modelUsed,
      latencyMs: outcome.result.latencyMs,
      sources: outcome.result.sources,
      searchQueries: outcome.result.searchQueries,
      isOfflineSample: false,
    });
  } catch (err: any) {
    console.error("Search-grounded-intel endpoint error:", err);
    res.status(500).json({
      error: "SEARCH_GROUNDING_FAILED",
      message: err.message || "Failed to retrieve search-grounded intelligence",
    });
  }
});

// Endpoint 6: Multi-Turn Conversational Fleet, AMM & Regulatory AI Copilot (Gemini Free Tier + Groq Failover)
app.post("/api/gemini/copilot-chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
      fleetSnapshot,
      activeContext,
      snippets = [],
      preferredProvider,
    } = req.body;

    const systemInstruction =
      "You are the EngineIQ Unified MRO & Propulsion AI Copilot for IndiGo Airlines engineering (Airbus A320neo / A321neo with Pratt & Whitney PW1100G-JM Geared Turbofan engines). " +
      "You answer the engineer's specific question directly, dynamically, and conversationally across three integrated domains:\n" +
      "1. LIVE FLEET & FLIGHT STATUS: Use the provided Live Fleet Snapshot (8 flights, 16 engines, open Red/Amber cases, LLP cycle margins, CRS dispatch releases, and CAR-145 RBAC engineer assignments) to give exact, real-time answers.\n" +
      "2. AMM TROUBLESHOOTING & REPAIR LIMITS: Use the provided AMM/FCOM/Policy reference snippets to explain damage limits, boroblend thresholds, torque procedures, and inspection intervals. Cite local documents in square brackets like [DEMO-AMM-72-01], [DEMO-AMM-72-02], [DEMO-AMM-79-01], [DEMO-FCOM-70-01], [DEMO-PRC-05-10], or [DEMO-POL-01].\n" +
      "3. LIVE REGULATORY & OEM DIRECTIVES: Reference authoritative FAA Airworthiness Directives (ADs), EASA Emergency ADs, DGCA notices, and Pratt & Whitney Service Bulletins when relevant.\n" +
      "Answer the exact question asked rather than dumping generic lists unless requested. Keep responses structured, technical, and scannable with bullet points and exact numbers. Never declare an aircraft or engine fit to fly without human certification. Always conclude with: 'Certifying engineer sign-off strictly required.'";

    const historyText =
      Array.isArray(history) && history.length > 0
        ? history
            .slice(-6)
            .map(
              (turn: any) =>
                `${turn.role === "user" ? "Engineer" : "Copilot"}: ${turn.content}`
            )
            .join("\n\n")
        : "No prior turns.";

    const promptText = `Active Screen / Context Scope:
${JSON.stringify(activeContext || {}, null, 2)}

Live IndiGo PW1100G-JM Fleet Telemetry, Open Cases, CRS & RBAC Snapshot:
${JSON.stringify(fleetSnapshot || {}, null, 2)}

Retrieved AMM / FCOM / Company Manual Snippets:
${JSON.stringify(snippets, null, 2)}

Recent Multi-Turn Conversation History:
${historyText}

Current Engineer Question:
"${message}"

Provide a direct, technically accurate response grounded in the live fleet state, AMM manual snippets, and regulatory intelligence.`;

    const outcome = await executeLiveLLM({
      systemInstruction,
      promptText,
      useSearchGrounding: true,
      preferredProvider,
    });

    if (!outcome.hasAnyLiveKey) {
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "NO_API_KEYS_CONFIGURED",
        message:
          "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured. Using offline knowledge synthesizer.",
      });
    }

    if (!outcome.result) {
      return res
        .status(200)
        .json(
          buildLiveFailureResponse(
            outcome.attemptErrors,
            outcome.hasGeminiKey,
            outcome.hasGroqKey
          )
        );
    }

    res.json({
      text: outcome.result.text,
      provider: outcome.result.provider,
      modelUsed: outcome.result.modelUsed,
      latencyMs: outcome.result.latencyMs,
      sources: outcome.result.sources,
      searchQueries: outcome.result.searchQueries,
      isOfflineSample: false,
    });
  } catch (err: any) {
    console.error("Copilot-chat endpoint error:", err);
    res.status(500).json({
      error: "COPILOT_CHAT_FAILED",
      message: err.message || "Failed to generate copilot chat response",
    });
  }
});

// Mount Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EngineIQ server running on http://localhost:${PORT}`);
  });
}

startServer();
