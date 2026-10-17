import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy init Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Utility to detect 402 / RESOURCE_EXHAUSTED credit depletion without noisy stderr logging
function isCreditsExhausted(err: any): boolean {
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
    str.includes("RESOURCE_EXHAUSTED") ||
    str.includes("prepayment credits are depleted") ||
    str.includes("Quota exceeded")
  );
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-3.8-flash",
  });
});

// Endpoint 1: Incident Extractor
app.post("/api/gemini/extract", async (req, res) => {
  try {
    const { narrative, measurements, imageBase64, imageMimeType } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "No GEMINI_API_KEY configured. Fallback sample will be used.",
      });
    }

    const systemInstruction =
      "You are an expert aerospace maintenance data extractor for EngineIQ. " +
      "Extract structured fields from an engine incident report. Return only JSON matching the schema. " +
      "Do not judge severity or airworthiness. If a value isn't stated in the narrative or measurements, use null and list it in missingInfo. " +
      "Never decide whether a measurement is within limits, and never state an engine is fit to fly or airworthy. " +
      "Allowed part identifiers are: fan_case, fan_blades, fan_drive_gear, lpc, hpc, combustor, hpt, lpt, exhaust, oil_system, or engine.";

    const promptText = `Extract structured incident data from this aircraft engine report:
Narrative: "${narrative || ""}"
Reported measurements: ${JSON.stringify(measurements || {})}

JSON schema requirements:
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

    const contents: any[] = [];
    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: imageMimeType || "image/jpeg",
          data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ""),
        },
      });
    }
    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json({ data: parsed, isOfflineSample: false });
  } catch (err: any) {
    if (isCreditsExhausted(err)) {
      console.warn("[Gemini API] Prepayment credits depleted for extract, using offline fallback.");
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "CREDITS_DEPLETED",
        data: null,
      });
    }
    console.error("Gemini extract error:", err);
    res.status(500).json({
      error: "EXTRACTION_FAILED",
      message: err.message || "Failed to extract incident data",
    });
  }
});

// Endpoint 2: Explainer
app.post("/api/gemini/explain", async (req, res) => {
  try {
    const { findings, rulesResults, overallLevel, snippets, eventType } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "No GEMINI_API_KEY configured. Fallback sample will be used.",
      });
    }

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

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: promptText,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text, isOfflineSample: false });
  } catch (err: any) {
    if (isCreditsExhausted(err)) {
      console.warn("[Gemini API] Prepayment credits depleted for explain, using offline fallback.");
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "CREDITS_DEPLETED",
        text: null,
      });
    }
    console.error("Gemini explain error:", err);
    res.status(500).json({
      error: "EXPLANATION_FAILED",
      message: err.message || "Failed to generate explanation",
    });
  }
});

// Endpoint 3: Part Assistant with Live Google Search Grounding
app.post("/api/gemini/part-ask", async (req, res) => {
  try {
    const { partData, question, snippets } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "No GEMINI_API_KEY configured. Fallback sample will be used.",
      });
    }

    const systemInstruction =
      "You are an expert aerospace propulsion copilot for EngineIQ and IndiGo Airlines engineering. " +
      "Answer questions about this specific aircraft engine component using the provided part specifications, local maintenance manual snippets, and live Google Search grounding. " +
      "Use Google Search to retrieve live FAA Airworthiness Directives (ADs), EASA Emergency Directives, DGCA regulations, and Pratt & Whitney PW1100G-JM Service Bulletins (SBs). " +
      "Prioritize OEM bulletins, FAA ADs, and PW1100G service updates. " +
      "When citing local AMM/FCOM documentation, use square brackets like [DEMO-AMM-72-01]. " +
      "When citing live regulatory or OEM documents, cite their official reference number (e.g. [FAA AD 2024-001] or [PW1100G-JM-72-0123]). " +
      "Provide a clear, structured, technical response with key findings, mandatory inspection intervals, and practical engineering guidance. " +
      "Never declare an engine or part airworthy or fit to fly. Always conclude with: 'Certifying engineer sign-off strictly required.'";

    const promptText = `Component Details (PW1100G-JM Architecture):
${JSON.stringify(partData, null, 2)}

Local AMM Document Snippets:
${JSON.stringify(snippets, null, 2)}

Engineer Question:
"${question}"

Retrieve live, up-to-date FAA/EASA Airworthiness Directives, Pratt & Whitney GTF bulletins, and relevant service alerts via Google Search. Provide a structured, highly factual engineering answer.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: promptText,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];

    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || "Regulatory / OEM Document",
        url: chunk.web.uri,
      }));

    res.json({
      text: response.text,
      sources,
      searchQueries: webSearchQueries,
      isOfflineSample: false,
    });
  } catch (err: any) {
    if (isCreditsExhausted(err)) {
      console.warn("[Gemini API] Prepayment credits depleted for part-ask, using dynamic on-wing fallback.");
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "CREDITS_DEPLETED",
        message:
          "Gemini API prepayment credits are depleted on the attached Google Cloud project. To re-enable live Google Search Grounding, renew credits or link an active project in AI Studio.",
      });
    }

    console.error("Gemini part-ask error:", err);
    res.status(500).json({
      error: "PART_QA_FAILED",
      message: err.message || "Failed to answer part question",
    });
  }
});

// Endpoint 4: Training Feedback
app.post("/api/gemini/training-feedback", async (req, res) => {
  try {
    const { scenario, traineeParts, traineeLevel, traineeReasoning, score } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "No GEMINI_API_KEY configured. Fallback sample will be used.",
      });
    }

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

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: promptText,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text, isOfflineSample: false });
  } catch (err: any) {
    if (isCreditsExhausted(err)) {
      console.warn("[Gemini API] Prepayment credits depleted for training-feedback, using offline fallback.");
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "CREDITS_DEPLETED",
        text: null,
      });
    }
    console.error("Gemini training feedback error:", err);
    res.status(500).json({
      error: "TRAINING_FEEDBACK_FAILED",
      message: err.message || "Failed to generate training feedback",
    });
  }
});

// Endpoint 5: Search Grounded Intelligence (FAA/EASA ADs, OEM Bulletins, Live Propulsion Regulatory Data via Google Search)
app.post("/api/gemini/search-grounded-intel", async (req, res) => {
  try {
    const { query, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "No GEMINI_API_KEY configured. Fallback sample will be used.",
      });
    }

    const systemInstruction =
      "You are an expert aerospace maintenance and airworthiness intelligence assistant for EngineIQ and IndiGo Airlines engineering. " +
      "Use Google Search to retrieve the latest, up-to-date FAA Airworthiness Directives (ADs), EASA Emergency ADs, DGCA India regulatory notices, Pratt & Whitney PW1100G-JM Service Bulletins (SBs), and OEM propulsion engineering updates. " +
      "Provide factual, technical answers with clear bullet points. When citing search findings, reference the relevant AD numbers, dates, and sources. " +
      "Always conclude with: 'Certifying engineer sign-off required prior to operational aircraft release.'";

    const promptText = `User Query: "${query || "Latest PW1100G airworthiness directives"}"
Aviation Context: ${context ? JSON.stringify(context) : "Airbus A320neo / A321neo with Pratt & Whitney GTF PW1100G-JM engines (IndiGo Fleet)"}

Retrieve the latest authoritative airworthiness regulations, OEM service bulletins, or operational procedures relevant to this propulsion system.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: promptText,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];

    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || "Regulatory Source",
        url: chunk.web.uri,
      }));

    res.json({
      text: response.text || "No response generated.",
      sources,
      searchQueries: webSearchQueries,
      isOfflineSample: false,
    });
  } catch (err: any) {
    if (isCreditsExhausted(err)) {
      console.warn("[Gemini API] Prepayment credits depleted for search-grounded-intel, using offline fallback.");
      return res.status(200).json({
        isOfflineSample: true,
        errorType: "CREDITS_DEPLETED",
        message:
          "Gemini API prepayment credits are depleted on the attached Google Cloud project.",
      });
    }

    console.error("Gemini search-grounded-intel error:", err);
    res.status(500).json({
      error: "SEARCH_GROUNDING_FAILED",
      message: err.message || "Failed to retrieve search-grounded intelligence",
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EngineIQ server running on http://localhost:${PORT}`);
  });
}

startServer();
