import { ExtractedIncident, IncidentFinding, IncidentMeasurementInput, LimitsCheckResultRow, ActionLevel, DocSnippet, EnginePartData } from "../types";
import { DUMMY_SCENARIOS } from "../data/scenarios";

export type AIProviderPreference = "auto" | "gemini" | "groq";

export interface AIHealthStatus {
  hasApiKey: boolean;
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  hasAnyLiveKey: boolean;
  activeProviders: string[];
  models?: {
    gemini: string[];
    groq: string[];
  };
}

export interface GeminiExtractResponse {
  data: ExtractedIncident;
  isOfflineSample: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
  liveError?: boolean;
  notes?: string;
}

export interface GeminiExplainResponse {
  text: string;
  isOfflineSample: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
  liveError?: boolean;
}

export interface GeminiPartAskResponse {
  text: string;
  sources?: GroundedSource[];
  searchQueries?: string[];
  isOfflineSample: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
  liveError?: boolean;
  attemptErrors?: string[];
  errorType?: "CREDITS_DEPLETED" | "NO_API_KEYS_CONFIGURED" | "LIVE_PROVIDERS_FAILED" | "NETWORK_ERROR";
  errorMessage?: string;
}

export interface GeminiTrainingResponse {
  text: string;
  isOfflineSample: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
}

export interface GroundedSource {
  title: string;
  url: string;
}

export interface GeminiSearchGroundingResponse {
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
  isOfflineSample: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
  liveError?: boolean;
  errorMessage?: string;
  attemptErrors?: string[];
}

export interface CopilotSuggestedAction {
  label: string;
  type: "open_engine" | "open_part" | "open_flight" | "open_incident" | "open_citation";
  engineId?: string;
  partId?: string;
  flightNumber?: string;
  docId?: string;
}

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  contextLabel?: string;
  sources?: GroundedSource[];
  searchQueries?: string[];
  suggestedActions?: CopilotSuggestedAction[];
  isOfflineSample?: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
  liveError?: boolean;
  errorMessage?: string;
  attemptErrors?: string[];
  retryPrompt?: string;
}

export interface CopilotFleetSnapshot {
  flights: {
    flightNumber: string;
    aircraftTail: string;
    aircraftType: string;
    origin: string;
    destination: string;
    gate: string;
    flightStatus: string;
    statusLabel: string;
    crewReportSummary: string;
    crsSigned: boolean;
    crsRef?: string;
    engine1Id: string;
    engine1Status: string;
    engine1CSN: number;
    engine2Id: string;
    engine2Status: string;
    engine2CSN: number;
  }[];
  openCases: {
    id: string;
    engineId: string;
    tailNumber: string;
    enginePosition: string;
    eventType: string;
    overallLevel: number;
    summary: string;
    partsAffected: string[];
  }[];
  roster: {
    name: string;
    role: string;
    badge: string;
    homeBase: string;
    assignedFlightNumbers: string[];
    assignedTailNumbers: string[];
  }[];
}

/**
 * Robust timeout fetch helper
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Fetch server AI provider key availability (/api/health)
 */
export async function fetchAIHealthStatus(): Promise<AIHealthStatus> {
  try {
    const res = await fetchWithTimeout("/api/health", { method: "GET" }, 5000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      hasApiKey: Boolean(json.hasApiKey),
      hasGeminiKey: Boolean(json.hasGeminiKey),
      hasGroqKey: Boolean(json.hasGroqKey),
      hasAnyLiveKey: Boolean(json.hasAnyLiveKey),
      activeProviders: Array.isArray(json.activeProviders) ? json.activeProviders : [],
      models: json.models,
    };
  } catch {
    return {
      hasApiKey: false,
      hasGeminiKey: false,
      hasGroqKey: false,
      hasAnyLiveKey: false,
      activeProviders: [],
    };
  }
}

/**
 * 1. EXTRACTOR: Extracts structured incident fields
 */
export async function extractIncidentData(
  narrative: string,
  measurements: IncidentMeasurementInput,
  image?: { base64: string; mimeType: string },
  preferredProvider: AIProviderPreference = "auto"
): Promise<GeminiExtractResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        narrative,
        measurements,
        imageBase64: image?.base64,
        imageMimeType: image?.mimeType,
        preferredProvider,
      }),
    }, 20000);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const json = await res.json();
    if (json.data && Array.isArray(json.data.findings)) {
      return {
        data: json.data,
        isOfflineSample: Boolean(json.isOfflineSample),
        provider: json.provider || "gemini",
        modelUsed: json.modelUsed,
        latencyMs: json.latencyMs,
      };
    }

    if (json.errorType === "NO_API_KEYS_CONFIGURED") {
      return {
        data: getOfflineExtractionFallback(narrative, measurements, Boolean(image)),
        isOfflineSample: true,
        provider: "offline",
        notes: "Neither GEMINI_API_KEY nor GROQ_API_KEY configured. Loaded offline synthesizer extraction.",
      };
    }

    return {
      data: getOfflineExtractionFallback(narrative, measurements, Boolean(image)),
      isOfflineSample: true,
      liveError: true,
      notes: json.message || "Live AI extraction failed across configured providers.",
    };
  } catch (err: any) {
    console.warn("Extraction error:", err);
    return {
      data: getOfflineExtractionFallback(narrative, measurements, Boolean(image)),
      isOfflineSample: true,
      liveError: true,
      notes: err?.message || "Server unreachable.",
    };
  }
}

/**
 * 2. EXPLAINER: Generates plain-language explanation and next steps
 */
export async function generateIncidentExplanation(params: {
  eventType: string;
  overallLevel: ActionLevel;
  findings: IncidentFinding[];
  rulesResults: LimitsCheckResultRow[];
  snippets: DocSnippet[];
  preferredProvider?: AIProviderPreference;
}): Promise<GeminiExplainResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }, 20000);

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    if (json.text) {
      return {
        text: json.text,
        isOfflineSample: Boolean(json.isOfflineSample),
        provider: json.provider || "gemini",
        modelUsed: json.modelUsed,
        latencyMs: json.latencyMs,
      };
    }
    if (json.errorType === "NO_API_KEYS_CONFIGURED") {
      return {
        text: getOfflineExplanationFallback(params),
        isOfflineSample: true,
        provider: "offline",
      };
    }
    return {
      text: `Live AI Provider Error: ${json.message || "All configured live providers failed."}\n\n---\n${getOfflineExplanationFallback(params)}`,
      isOfflineSample: false,
      liveError: true,
    };
  } catch (err) {
    console.warn("Explanation error:", err);
    return {
      text: getOfflineExplanationFallback(params),
      isOfflineSample: true,
    };
  }
}

/**
 * 3. PART ASSISTANT: Q&A on specific part (Google Gemini Free Tier + Groq Failover)
 * Only uses offline synthesizer if BOTH Gemini and Groq keys are missing.
 */
export async function askAboutPart(
  partData: EnginePartData,
  question: string,
  snippets: DocSnippet[],
  preferredProvider: AIProviderPreference = "auto"
): Promise<GeminiPartAskResponse> {
  try {
    const res = await fetchWithTimeout(
      "/api/gemini/part-ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partData, question, snippets, preferredProvider }),
      },
      22000
    );

    const json = await res.json().catch(() => null);

    // Only use offline synthesizer if BOTH Gemini and Groq keys are missing
    if (json?.errorType === "NO_API_KEYS_CONFIGURED") {
      const fallback = getOfflinePartAskFallback(partData, question, snippets);
      return {
        text: fallback.text,
        sources: fallback.sources,
        searchQueries: fallback.searchQueries,
        isOfflineSample: true,
        provider: "offline",
        errorType: "NO_API_KEYS_CONFIGURED",
        errorMessage: json.message,
      };
    }

    // If keys exist on server, but all live attempts failed, surface clear live error instead of silent canned data
    if (json?.liveError || json?.errorType === "LIVE_PROVIDERS_FAILED") {
      return {
        text: "",
        sources: [],
        searchQueries: [],
        isOfflineSample: false,
        liveError: true,
        attemptErrors: json.attemptErrors || [],
        errorType: "LIVE_PROVIDERS_FAILED",
        errorMessage:
          json.message ||
          "All live AI providers failed. Add a free GROQ_API_KEY or GEMINI_API_KEY in Settings > Secrets.",
      };
    }

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    if (json?.text) {
      return {
        text: json.text,
        sources: json.sources || [],
        searchQueries: json.searchQueries || [],
        isOfflineSample: Boolean(json.isOfflineSample),
        provider: json.provider || "gemini",
        modelUsed: json.modelUsed,
        latencyMs: json.latencyMs,
      };
    }
    throw new Error("No text in part Q&A response");
  } catch (err: any) {
    return {
      text: "",
      sources: [],
      searchQueries: [],
      isOfflineSample: false,
      liveError: true,
      errorType: "NETWORK_ERROR",
      errorMessage: err.message || "Failed to reach live AI backend",
    };
  }
}

/**
 * 4. TRAINING FEEDBACK
 */
export async function getTrainingFeedback(params: {
  scenario: any;
  traineeParts: string[];
  traineeLevel: number;
  traineeReasoning: string;
  score: any;
  preferredProvider?: AIProviderPreference;
}): Promise<GeminiTrainingResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/training-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }, 20000);

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    if (json.text) {
      return {
        text: json.text,
        isOfflineSample: Boolean(json.isOfflineSample),
        provider: json.provider || "gemini",
        modelUsed: json.modelUsed,
        latencyMs: json.latencyMs,
      };
    }
    return {
      text: getOfflineTrainingFeedbackFallback(params),
      isOfflineSample: true,
    };
  } catch (err) {
    console.warn("Training feedback error:", err);
    return {
      text: getOfflineTrainingFeedbackFallback(params),
      isOfflineSample: true,
    };
  }
}

/**
 * 5. SEARCH GROUNDING: Query up-to-date FAA/EASA ADs and OEM SBs (Gemini Free Tier + Groq Failover)
 */
export async function searchGroundedIntel(
  query: string,
  context?: any,
  preferredProvider: AIProviderPreference = "auto"
): Promise<GeminiSearchGroundingResponse> {
  try {
    const res = await fetchWithTimeout(
      "/api/gemini/search-grounded-intel",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context, preferredProvider }),
      },
      22000
    );

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();

    if (json.errorType === "NO_API_KEYS_CONFIGURED") {
      return getOfflineSearchGroundingFallback(query);
    }

    if (json.liveError || json.errorType === "LIVE_PROVIDERS_FAILED") {
      return {
        text: "",
        sources: [],
        searchQueries: [],
        isOfflineSample: false,
        liveError: true,
        errorMessage: json.message,
        attemptErrors: json.attemptErrors || [],
      };
    }

    return {
      text: json.text,
      sources: json.sources || [],
      searchQueries: json.searchQueries || [],
      isOfflineSample: Boolean(json.isOfflineSample),
      provider: json.provider || "gemini",
      modelUsed: json.modelUsed,
      latencyMs: json.latencyMs,
    };
  } catch (err: any) {
    return {
      text: "",
      sources: [],
      searchQueries: [],
      isOfflineSample: false,
      liveError: true,
      errorMessage: err?.message || "Failed to reach live AI backend.",
    };
  }
}

/**
 * 6. UNIFIED MULTI-TURN AI COPILOT CHAT:
 * Combines live fleet/flight telemetry, AMM manuals, RBAC roster, and Multi-Provider Live AI (Gemini Free Tier + Groq)
 * Enforces strict policy: Only uses offline synthesizer if BOTH Gemini and Groq keys are missing.
 */
export async function askCopilotChat(params: {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  fleetSnapshot: CopilotFleetSnapshot;
  activeContext: {
    scope: "fleet" | "flight" | "engine" | "part";
    label: string;
    flightNumber?: string;
    tailNumber?: string;
    engineId?: string;
    partId?: string;
    partName?: string;
    userRole?: string;
    userName?: string;
  };
  snippets: DocSnippet[];
  preferredProvider?: AIProviderPreference;
}): Promise<{
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
  suggestedActions: CopilotSuggestedAction[];
  isOfflineSample: boolean;
  provider?: "gemini" | "groq" | "offline";
  modelUsed?: string;
  latencyMs?: number;
  liveError?: boolean;
  errorMessage?: string;
  attemptErrors?: string[];
}> {
  try {
    const res = await fetchWithTimeout(
      "/api/gemini/copilot-chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
      25000
    );

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();

    // Confirmed Decision 2: Only use offline synthesizer if BOTH Gemini and Groq keys are missing
    if (json.errorType === "NO_API_KEYS_CONFIGURED") {
      const offline = getOfflineCopilotChatFallback(params);
      return {
        ...offline,
        provider: "offline",
        modelUsed: "Offline Synthesizer (No API Keys Set)",
      };
    }

    // If a key is configured but all live providers failed, return explicit liveError instead of canned data
    if (json.liveError || json.errorType === "LIVE_PROVIDERS_FAILED" || !json.text) {
      return {
        text: "",
        sources: [],
        searchQueries: [],
        suggestedActions: [],
        isOfflineSample: false,
        liveError: true,
        errorMessage:
          json.message ||
          "All live AI providers failed. Please configure a free GROQ_API_KEY or GEMINI_API_KEY in Settings > Secrets.",
        attemptErrors: json.attemptErrors || [],
      };
    }

    const suggestedActions = deriveSuggestedActionsFromAnswer(
      params.message + " " + json.text,
      params.fleetSnapshot,
      params.activeContext
    );

    return {
      text: json.text,
      sources: json.sources || [],
      searchQueries: json.searchQueries || [],
      suggestedActions,
      isOfflineSample: Boolean(json.isOfflineSample),
      provider: json.provider || "gemini",
      modelUsed: json.modelUsed,
      latencyMs: json.latencyMs,
    };
  } catch (err: any) {
    return {
      text: "",
      sources: [],
      searchQueries: [],
      suggestedActions: [],
      isOfflineSample: false,
      liveError: true,
      errorMessage: err?.message || "Network error while contacting live AI backend.",
    };
  }
}

// ----------------------------------------------------
// Deterministic Fallback Sample Generators
// ----------------------------------------------------

function getOfflineSearchGroundingFallback(query: string): GeminiSearchGroundingResponse {
  const q = (query || "").toLowerCase();
  
  if (q.includes("powder") || q.includes("hpc") || q.includes("disk") || q.includes("metallurgy")) {
    return {
      text: `### FAA & EASA Airworthiness Directives Summary: PW1100G-JM Powder Metal Disks
      
**Applicable Directives:** FAA AD 2024-0014 / EASA Emergency AD 2023-0211-E
**Engine Family:** Pratt & Whitney PW1100G-JM (Airbus A320neo / A321neo fleet)

1. **Mandatory Ultrasonic Inspection (USI):**
   - Requires accelerated repetitive ultrasonic inspections of High Pressure Compressor (HPC) 7th and 8th stage integrally bladed rotors (IBRs) and High Pressure Turbine (HPT) 1st & 2nd stage disks manufactured from contaminated powdered metal.
   - Initial threshold: Between 2,800 and 3,800 flight cycles depending on batch metallurgy serial numbers.

2. **Fleet Grounding & Removal Schedules:**
   - Disks exceeding flight cycle thresholds without completed USI must be removed from wing prior to further flight.
   - Non-destructive inspection (NDI) must be performed at certified OEM overhaul base (IndiGo Delhi / Singapore Pratt & Whitney Eagle Services Asia).

3. **IndiGo Airlines Operating Impact:**
   - Active aircraft engine rotation schedule and spares pooling activated across DEL, BOM, BLR hubs.
   - Certifying engineer sign-off required prior to operational release.`,
      sources: [
        { title: "FAA Airworthiness Directive 2024-0014 - Pratt & Whitney Engines", url: "https://rgl.faa.gov/Regulatory_and_Guidance_Library/rgad.nsf" },
        { title: "EASA Safety Publications Tool - AD 2023-0211-E", url: "https://ad.easa.europa.eu/" },
        { title: "Pratt & Whitney GTF Powder Metal Fleet Management Update", url: "https://prattwhitney.com/" },
      ],
      searchQueries: [
        "FAA AD PW1100G powder metal disk inspection 2024",
        "EASA emergency airworthiness directive PW1100G HPC turbine",
        "Pratt Whitney service bulletin A320neo powder metallurgy",
      ],
      isOfflineSample: true,
    };
  }

  if (q.includes("bird") || q.includes("fan") || q.includes("blade") || q.includes("fod")) {
    return {
      text: `### Live OEM & Regulatory Dispatch Notice: PW1100G Fan Blade Damage & Bird Strike Limits
      
**Governing Documents:** FAA Special Airworthiness Information Bulletin (SAIB) & Pratt & Whitney AMM 72-31-00
**Fleet Applicability:** IndiGo Airbus A320neo / A321neo PW1100G-JM

1. **Immediate Post-Bird Strike Protocol:**
   - Borescope inspection of all 20 hybrid titanium fan blades and fan case abradable acoustic liners within 1 flight cycle of reported bird strike.
   - Check fan blade leading edge: Maximum permissible leading edge nick depth without repair is **0.050 in (1.27 mm)** in Zone A. Nicks between 0.050 in and 0.125 in require blend repair per AMM 72-31-02 before further revenue flight.

2. **Fan Drive Gear System (FDGS) Torque & Vibration Verification:**
   - If bird remains enter core flow or LP compressor, perform oil scavenge magnetic chip detector (MCD) inspection and FDGS oil filter differential pressure check.
   - Dual-channel vibration telemetry review via EngineIQ dashboard before dispatch.

3. **Regulatory Sign-off:**
   - DGCA India CAR Section 2 Series E requires CRS (Certificate of Release to Service) entry with blend dimensions and remaining thickness measurement.
   - Certifying engineer sign-off required prior to operational release.`,
      sources: [
        { title: "FAA Special Airworthiness Information Bulletin - Turbine Engine Ingestion", url: "https://www.faa.gov/aircraft/safety/alerts/saib/" },
        { title: "Pratt & Whitney PW1100G Aircraft Maintenance Manual (AMM 72-31-00)", url: "https://prattwhitney.com/" },
        { title: "DGCA India CAR Section 2 - Airworthiness Certification Requirements", url: "https://www.dgca.gov.in/" },
      ],
      searchQueries: [
        "PW1100G bird strike inspection blend limits AMM",
        "FAA fan blade nick limits Pratt Whitney GTF",
        "DGCA India A320neo bird ingestion maintenance directive",
      ],
      isOfflineSample: true,
    };
  }

  return {
    text: `### Up-to-Date Airworthiness & OEM Intelligence: Pratt & Whitney PW1100G-JM

**Fleet:** IndiGo Airlines Airbus A320neo / A321neo GTF Propulsion
**Regulatory Bodies:** FAA / EASA / DGCA India

1. **Current Regulatory Directives:**
   - All line operations must comply with latest Pratt & Whitney Service Bulletins (SB 72-00-0016 and SB 72-00-0021) for active oil scavenge monitoring and vibration thresholds.
   - Turnaround station engineers must verify magnetic chip detector (MCD) cleanliness and review tech logbook pilot reports for anomalous N1/N2 vibration spikes.

2. **Life-Limited Parts (LLP) Tracking:**
   - Strict adherence to FAA AD cycle limits on high-pressure compressor (HPC) and high-pressure turbine (HPT) components.
   - Worst-part LLP cycle threshold enforced at 18,000 cycles.

3. **Compliance Requirement:**
   - Certifying engineer sign-off required prior to operational release.`,
    sources: [
      { title: "FAA Regulatory and Guidance Library - Airworthiness Directives", url: "https://rgl.faa.gov/" },
      { title: "EASA Safety Publications Portal", url: "https://ad.easa.europa.eu/" },
      { title: "DGCA India Civil Aviation Requirements (CAR)", url: "https://www.dgca.gov.in/" },
    ],
    searchQueries: [
      `PW1100G airworthiness directives ${query}`,
      "A320neo Pratt Whitney GTF maintenance bulletins",
    ],
    isOfflineSample: true,
  };
}

function getOfflineExtractionFallback(
  narrative: string,
  measurements: IncidentMeasurementInput,
  hasImage: boolean
): ExtractedIncident {
  const lower = (narrative || "").toLowerCase();

  // Try matching one of the 6 dummy scenarios
  for (const s of DUMMY_SCENARIOS) {
    if (lower.includes(s.id.toLowerCase()) || lower.includes(s.title.toLowerCase().substring(0, 10))) {
      return scenarioToExtractedIncident(s, hasImage);
    }
  }

  // Detect event type
  let eventType: ExtractedIncident["eventType"] = "other";
  if (lower.includes("bird")) eventType = "bird_strike";
  else if (lower.includes("fod") || lower.includes("stone") || lower.includes("debris")) eventType = "fod";
  else if (lower.includes("oil") || lower.includes("leak")) eventType = "oil_leak";
  else if (lower.includes("vibrat")) eventType = "vibration";
  else if (lower.includes("coating") || lower.includes("turbine") || lower.includes("tbc")) eventType = "hot_section";

  const enginePosition: ExtractedIncident["enginePosition"] = lower.includes("no. 1") || lower.includes("no.1")
    ? "No.1"
    : lower.includes("no. 2") || lower.includes("no.2")
    ? "No.2"
    : "unspecified";

  const findings: IncidentFinding[] = [];
  const missingInfo: string[] = [];

  if (measurements.damageDepthMm !== undefined && measurements.damageDepthMm !== null) {
    findings.push({
      id: "f-depth-1",
      part: eventType === "bird_strike" ? "fan_blades" : eventType === "fod" ? "hpc" : "fan_case",
      damageType: eventType === "bird_strike" ? "leading_edge_nick" : "blade_nick",
      zone: "Zone 102",
      measurement: { value: measurements.damageDepthMm, unit: "depth_mm" },
      isAiSuggested: hasImage,
      aiNotes: hasImage ? "AI-suggested damage measurement from photograph; needs engineer confirmation" : undefined,
    });
  }

  if (measurements.crackLengthMm !== undefined && measurements.crackLengthMm !== null && measurements.crackLengthMm > 0) {
    findings.push({
      id: "f-crack-1",
      part: "fan_blades",
      damageType: "crack",
      zone: "Zone 102",
      measurement: { value: measurements.crackLengthMm, unit: "length_mm" },
      isAiSuggested: hasImage,
      aiNotes: hasImage ? "AI-suggested crack boundary from visual artifact; needs physical dye penetrant check" : undefined,
    });
  }

  if (measurements.vibrationN1 !== undefined && measurements.vibrationN1 !== null && measurements.vibrationN1 > 0) {
    findings.push({
      id: "f-vib-1",
      part: "engine",
      damageType: "vibration",
      zone: "Rotor Spool",
      measurement: { value: measurements.vibrationN1, unit: "n1_units" },
    });
  }

  if (measurements.oilLeakDropsMin !== undefined && measurements.oilLeakDropsMin !== null && measurements.oilLeakDropsMin > 0) {
    findings.push({
      id: "f-leak-1",
      part: "oil_system",
      damageType: "leak",
      zone: "Zone 104",
      measurement: { value: measurements.oilLeakDropsMin, unit: "drops_per_min" },
    });
  }

  if (measurements.coatingLossPct !== undefined && measurements.coatingLossPct !== null && measurements.coatingLossPct > 0) {
    findings.push({
      id: "f-coat-1",
      part: "hpt",
      damageType: "coating_loss",
      zone: "Zone 302",
      measurement: { value: measurements.coatingLossPct, unit: "percent_area" },
    });
  }

  if (findings.length === 0) {
    missingInfo.push("No quantitative dimensional measurements found in report narrative.");
  }

  return {
    eventType,
    enginePosition,
    summary: narrative.slice(0, 160) + (narrative.length > 160 ? "..." : ""),
    findings,
    missingInfo,
  };
}

function scenarioToExtractedIncident(s: any, hasImage: boolean): ExtractedIncident {
  const findings: IncidentFinding[] = [];
  const m = s.measurements;

  if (s.id === "S1") {
    findings.push({
      id: "s1-f1",
      part: "fan_blades",
      damageType: "leading_edge_nick",
      zone: "Zone 102 - Fan Blade #14",
      measurement: { value: m.damageDepthMm ?? 1.9, unit: "depth_mm" },
      isAiSuggested: hasImage,
      aiNotes: hasImage ? "AI-suggested blade nick depth; needs engineer confirmation" : undefined,
    });
    findings.push({
      id: "s1-f2",
      part: "fan_blades",
      damageType: "tip_curl",
      zone: "Zone 102 - Blade Tip",
      measurement: { value: 2.0, unit: "length_mm" },
    });
    findings.push({
      id: "s1-f3",
      part: "engine",
      damageType: "vibration",
      zone: "N1 Rotor Spool",
      measurement: { value: m.vibrationN1 ?? 2.2, unit: "n1_units" },
    });
  } else if (s.id === "S2") {
    findings.push({
      id: "s2-f1",
      part: "fan_blades",
      damageType: "crack",
      zone: "Zone 102 - Fan Blade #8",
      measurement: { value: m.crackLengthMm ?? 12.0, unit: "length_mm" },
      isAiSuggested: hasImage,
      aiNotes: hasImage ? "AI-suggested crack boundary from photo; needs engineer confirmation" : undefined,
    });
    findings.push({
      id: "s2-f2",
      part: "fan_case",
      damageType: "dent",
      zone: "Zone 101 - Acoustic Liner",
      measurement: { value: m.damageDepthMm ?? 4.0, unit: "depth_mm" },
    });
    findings.push({
      id: "s2-f3",
      part: "engine",
      damageType: "vibration",
      zone: "N1 Rotor Spool",
      measurement: { value: m.vibrationN1 ?? 4.8, unit: "n1_units" },
    });
  } else if (s.id === "S3") {
    findings.push({
      id: "s3-f1",
      part: "hpc",
      damageType: "blade_nick",
      zone: "Zone 202 - Stage 1 Rotor",
      measurement: { value: m.damageDepthMm ?? 0.8, unit: "depth_mm" },
    });
  } else if (s.id === "S4") {
    findings.push({
      id: "s4-f1",
      part: "oil_system",
      damageType: "leak",
      zone: "Zone 104 - Gearbox Scavenge Pad",
      measurement: { value: m.oilLeakDropsMin ?? 3.5, unit: "drops_per_min" },
    });
  } else if (s.id === "S5") {
    findings.push({
      id: "s5-f1",
      part: "engine",
      damageType: "vibration",
      zone: "N1 Low-Pressure Spool",
      measurement: { value: m.vibrationN1 ?? 3.1, unit: "n1_units" },
    });
  } else if (s.id === "S6") {
    findings.push({
      id: "s6-f1",
      part: "hpt",
      damageType: "coating_loss",
      zone: "Zone 302 - Stage 1 Blade Airfoil",
      measurement: { value: m.coatingLossPct ?? 18.0, unit: "percent_area" },
    });
  }

  return {
    eventType: s.eventType,
    enginePosition: s.enginePosition,
    summary: s.narrative,
    findings,
    missingInfo: [],
  };
}

function getOfflineExplanationFallback(params: {
  eventType: string;
  overallLevel: ActionLevel;
  findings: IncidentFinding[];
  rulesResults: LimitsCheckResultRow[];
  snippets: DocSnippet[];
}): string {
  const levelStr = `Level ${params.overallLevel}`;
  const rowsSummary = params.rulesResults
    .map((r) => `• ${r.component} (${r.damageType}): measured ${r.measured} -> classified as ${r.limitBandApplied} [${r.sourceDocId}]`)
    .join("\n");

  const procedureDoc = params.snippets.find((s) => s.id.startsWith("DEMO-PRC") || s.id.startsWith("DEMO-AMM"))?.id || "DEMO-AMM-72-01";

  let nextSteps = "";
  if (params.overallLevel === 0) {
    nextSteps = `1. Record observation and physical dimensions in aircraft technical logbook [DEMO-POL-02].\n2. Release aircraft without special operating restriction [${procedureDoc}].\n3. Perform visual walk-around verification at next scheduled transit stop.`;
  } else if (params.overallLevel === 1) {
    nextSteps = `1. Log repetitive inspection interval in tech logbook (25 to 50 flight cycles) [${procedureDoc}].\n2. Perform tap test / visual inspection at designated interval [DEMO-AMM-72-02].\n3. Flight crew to record vibration trend baseline [DEMO-AMM-77-01].`;
  } else if (params.overallLevel === 2) {
    nextSteps = `1. Conduct detailed video borescope inspection of all adjacent blade roots and casing liners [${procedureDoc}].\n2. Carry out approved on-wing boroblend repair within maximum chord loss tolerances [DEMO-AMM-72-01].\n3. Verify magnetic chip detectors and fluid scavenge filters [DEMO-AMM-79-01].`;
  } else if (params.overallLevel === 3) {
    nextSteps = `1. Ground engine pending structural engineering disposition [DEMO-POL-01].\n2. Compile calibrated depth optical photos, flight data vibration traces, and borescope videos [DEMO-POL-01].\n3. Submit engineering escalation package to OEM Technical Support [DEMO-POL-01].`;
  } else {
    nextSteps = `1. Remove engine from aircraft wing for depot teardown and shop overhaul [DEMO-AMM-72-01].\n2. Quarantine affected rotating hardware and preserve for root-cause metallurgical evaluation [DEMO-AMM-72-04].\n3. Complete mandatory safety logbook entries and notify maintenance control [DEMO-POL-02].`;
  }

  return `### Maintenance Decision-Support Assessment

**Governing Determination:** The deterministic rules engine classifies this event at **${levelStr}** based on direct limit band application.

**Findings & Criteria Breakdown:**
${rowsSummary}

**Required Engineering Next Steps:**
${nextSteps}

**Technical Logbook Reference:**
All actions must conform to standard technical log recording guidelines [DEMO-POL-02]. Certifying engineer sign-off required.`;
}

function getOfflinePartAskFallback(
  partData: EnginePartData,
  question: string,
  snippets: DocSnippet[]
): { text: string; sources: GroundedSource[]; searchQueries: string[] } {
  const qLower = question.toLowerCase();
  const docRef = snippets[0]?.id || "DEMO-AMM-72-01";

  const searchQueries: string[] = [
    `Pratt & Whitney PW1100G-JM ${partData.name} OEM technical specification`,
    `Aviation propulsion ${partData.technicalName} manufacturing and airworthiness directives`,
  ];

  const sources: GroundedSource[] = [
    {
      title: `Pratt & Whitney GTF PW1100G OEM Propulsion Architecture & Supplier Consortium`,
      url: "https://www.prattwhitney.com/engines/commercial-engines/gtf/pw1100g-jm-architecture",
    },
    {
      title: `FAA DRS Type Certificate Data Sheet (TCDS E00087EN) - PW1100G-JM Turbofan`,
      url: "https://drs.faa.gov/currentDoc/TCDS-E00087EN",
    },
    {
      title: `EASA Certification Basis & Maintenance Review Board Report (MRBR PW1100G)`,
      url: "https://ad.easa.europa.eu/tcds/EASA.IM.E.093",
    },
  ];

  let answer = "";

  // 1. Manufacturers, Suppliers, Consortium Partners, Vendors ("manufacture", "who makes", "vendor", "supplier", "good", "company", "oem")
  if (
    qLower.includes("manufactur") ||
    qLower.includes("maker") ||
    qLower.includes("who make") ||
    qLower.includes("vendor") ||
    qLower.includes("supplier") ||
    qLower.includes("which fan blade") ||
    qLower.includes("who all") ||
    qLower.includes("partner")
  ) {
    if (partData.id === "fan_blades" || partData.id === "fan_case") {
      answer = `**Pratt & Whitney GTF Fan Blade Architecture & Manufacturing Consortium:**

• **Primary OEM & Design Authority:** Pratt & Whitney (Raytheon Technologies / RTX, USA) developed and certifies the PW1100G-JM 81-inch fan rotor system.
• **Manufacturing Consortium Partners:**
  1. **Pratt & Whitney (USA):** Manufactures the diffusion-bonded, superplastically formed (DB/SPF) hollow titanium wide-chord fan blades at automated forging facilities in Lansing, Michigan and East Hartford, Connecticut.
  2. **Japanese Aero Engines Corporation (JAEC / IHI, Kawasaki, Mitsubishi Heavy Industries):** Fabricates key fan stage structural components, low-pressure compressor blisks, and containment casing hardware (~23% program share).
  3. **MTU Aero Engines (Germany):** Engineering partner responsible for high-speed low-pressure turbine and structural design (~18% program share).
  4. **GKN Aerospace (UK/Sweden):** Supplies the advanced lightweight composite fan containment case structure and acoustic panels.

• **Technology Comparison (Titanium vs Composite):**
  - **PW1100G (IndiGo Fleet):** Uses **20 hollow Wide-Chord Titanium (Ti-6Al-4V)** blades. Because the Fan Drive Gear System (FDGS with 3.06:1 ratio) decouples fan speed from the turbine, the fan rotates at ~4,000 RPM (one-third of conventional turbofans). This allows lighter, aerodynamically optimized hollow titanium airfoils with exceptional FOD bird-strike resistance.
  - **CFM LEAP-1A (Alternative on A320neo):** Uses 18 3D-woven carbon-fiber composite blades with bonded titanium leading edges.
  - **Verdict for Fleet Operations:** The PW1100G titanium blades provide superior erosion resistance in harsh, dusty operating environments (such as Indian subcontinent regional routes) and permit field boroblending within strict AMM limits [${docRef}].`;
    } else {
      answer = `**OEM Manufacturing & Supply Chain for ${partData.name} (${partData.technicalName}):**

• **OEM Consortium Partners:**
  - **Pratt & Whitney (USA):** Overall propulsion integrator, combustor assembly, and high-pressure turbine module.
  - **MTU Aero Engines (Munich, Germany):** Key manufacturing partner responsible for the high-pressure compressor (HPC) blisks and high-speed low-pressure turbine (LPT).
  - **JAEC (IHI, Kawasaki, Mitsubishi - Japan):** Fabricates fan modules, shafting, and low-pressure compressor hardware.
• **Material & Tooling Standard:** Components are precision CNC-machined and certified under Pratt & Whitney PWA metallurgy standards conforming to FAA TCDS E00087EN [${docRef}].`;
    }
  }

  // 2. Airworthiness Directives, Powder Metal Recalls, FAA/EASA
  else if (qLower.includes("ad") || qLower.includes("directive") || qLower.includes("bulletin") || qLower.includes("powder metal") || qLower.includes("recall")) {
    answer = `**Live Regulatory Airworthiness Findings for ${partData.name}:**

• **FAA AD 2024-001 Mandate:** Enforces accelerated angular ultrasonic testing (UT) and eddy-current inspections for PW1100G-JM ${partData.name} rotating hardware produced via powder-metal metallurgy to detect potential rare micro-inclusions.
• **EASA Inspection Threshold:** Mandatory repetitive borescope and on-wing non-destructive inspection (NDI) required every 100 to 200 cycles for high-stress stations.
• **IndiGo Airlines Fleet Action:** Units with serial identifiers in the affected batches undergo expedited off-wing shop visits at certified CAMO overhaul facilities [${docRef}].`;
  }

  // 3. Materials, Metallurgy, Coatings
  else if (qLower.includes("material") || qLower.includes("alloy") || qLower.includes("made of") || qLower.includes("coating") || qLower.includes("titanium")) {
    answer = `**Certified Metallurgy & Material Architecture for ${partData.name}:**

• **Primary Alloy:** ${partData.dimensions?.primaryAlloy || partData.madeOf}.
• **Coating Specification:** ${partData.dimensions?.coatingSpec || "Aluminide diffusion coating with thermal/erosion barrier"}.
• **Thermal & Pressure Envelope:** Designed to withstand continuous operating temperatures of ${partData.typicalOperatingConditions.temperature} and pressures up to ${partData.typicalOperatingConditions.pressure}.
• **Design Advantage:** Manufactured under Pratt & Whitney PWA specifications to balance high yield strength against thermal creep and centrifugal stress [${docRef}].`;
  }

  // 4. Damage, Failure Modes, Bird Strike, FOD, Cracks, Boroblending
  else if (qLower.includes("fail") || qLower.includes("damage") || qLower.includes("bird") || qLower.includes("strike") || qLower.includes("fod") || qLower.includes("nick") || qLower.includes("crack") || qLower.includes("blend")) {
    answer = `**Damage Thresholds & Maintenance Action for ${partData.name}:**

• **Primary Failure & Damage Modes:** ${partData.howItFails.join(", ")}.
• **On-Wing Boroblend Criteria:**
  - Minor leading-edge nicks $\\le 1.0\\text{ mm}$ depth without cracking can be repaired on-wing via diamond-file boroblend with a minimum 4:1 blend radius [${docRef}].
  - Damage exceeding $2.5\\text{ mm}$ chord loss or any through-thickness cracks require immediate component replacement.
• **Bird Strike / FOD Protocol:** Immediate visual and fluorescent dye-penetrant inspection of all adjacent blade roots, fan hub attachments, and casing acoustic panels.`;
  }

  // 5. Life Limits, Cycles, LLP Retirement Basis
  else if (qLower.includes("life") || qLower.includes("limit") || qLower.includes("cycle") || qLower.includes("hour") || qLower.includes("retire")) {
    answer = `**Life Basis & Mandatory Retirement for ${partData.name}:**

• **Governing Classification:** ${partData.lifeLimitCycles ? `Life-Limited Part (LLP) with certified limit of ${partData.lifeLimitCycles.toLocaleString()} flight cycles.` : "On-Condition component governed by scheduled visual, borescope, and NDT checks."}
• **Retirement Calculation:** Operating cycles are tracked 1:1 on the Engine Electronic Controller (EEC/FADEC) based on takeoff-to-touchdown cycles.
• **Replacement Guidance:** ${partData.replacementGuidance} [${docRef}].`;
  }

  // 6. Inspection, Borescope, Ultrasonic, NDT
  else if (qLower.includes("inspect") || qLower.includes("borescope") || qLower.includes("ultrasonic") || qLower.includes("ndt") || qLower.includes("interval")) {
    answer = `**Approved Maintenance & Inspection Procedures for ${partData.name}:**

• **Inspection Methods:** ${partData.howInspected.join(", ")}.
• **Typical Routine Interval:** Visual transit checks every 48 operating hours; detailed video borescope inspection every 500 flight cycles or following high-vibration engine alerts.
• **Governing AMM Procedure:** Strictly follow task protocols documented in [${docRef}].`;
  }

  // 7. General Overview
  else {
    answer = `**Engineering Briefing for ${partData.name} (${partData.technicalName}):**

• **Functional Role:** ${partData.whatItDoes}
• **Station & Mount Location:** Positioned at ${partData.whereItSits} (Station: ${partData.dimensions?.stationRange || "Turbofan Spool"}).
• **Operating Envelope:** Operates under nominal conditions of ${partData.typicalOperatingConditions.temperature}, ${partData.typicalOperatingConditions.pressure}, and ${partData.typicalOperatingConditions.speed}.
• **Maintenance Framework:** All service procedures are governed by Pratt & Whitney GTF AMM Chapter 72 [${docRef}].`;
  }

  const text = `${answer}

Notice: Synthesized from EngineIQ On-Wing Knowledge Engine and Pratt & Whitney GTF technical manuals. Certifying engineer sign-off strictly required.`;

  return { text, sources, searchQueries };
}

function getOfflineTrainingFeedbackFallback(params: {
  scenario: any;
  traineeParts: string[];
  traineeLevel: number;
  traineeReasoning: string;
  score: any;
}): string {
  const isLevelCorrect = params.traineeLevel === params.scenario.expectedLevel;
  const docs = params.scenario.docRefs.join(", ");

  let feedback = isLevelCorrect
    ? `Excellent decision analysis. Your choice of Action Level ${params.traineeLevel} strictly matches the governing threshold in [${params.scenario.docRefs[0]}]. `
    : `Your chosen Action Level ${params.traineeLevel} diverges from the expected Level ${params.scenario.expectedLevel}. Review the specific limit thresholds in [${params.scenario.docRefs[0]}]. `;

  feedback += `\n\nExpected Reasoning:\n${params.scenario.expectedReasoning}\n\nApplicable Manual References: [${docs}]. Certifying engineer sign-off required.`;
  return feedback;
}

/**
 * Derives 1-click navigation action buttons from the question/answer and live fleet snapshot
 */
export function deriveSuggestedActionsFromAnswer(
  combinedText: string,
  fleetSnapshot: CopilotFleetSnapshot,
  activeContext: {
    flightNumber?: string;
    engineId?: string;
    partId?: string;
  }
): CopilotSuggestedAction[] {
  const actions: CopilotSuggestedAction[] = [];
  const lower = combinedText.toLowerCase();

  // Check for specific flights or tails mentioned
  for (const f of fleetSnapshot.flights) {
    if (
      lower.includes(f.flightNumber.toLowerCase()) ||
      lower.includes(f.aircraftTail.toLowerCase())
    ) {
      actions.push({
        label: `View Flight ${f.flightNumber} (${f.aircraftTail})`,
        type: "open_flight",
        flightNumber: f.flightNumber,
      });
      const actionEngineId =
        f.engine1Status === "action_required"
          ? f.engine1Id
          : f.engine2Status === "action_required"
          ? f.engine2Id
          : f.engine1Id;
      actions.push({
        label: `Inspect ${f.aircraftTail} in 3D Twin (${actionEngineId})`,
        type: "open_engine",
        engineId: actionEngineId,
      });
      break;
    }
  }

  // Check for specific components mentioned
  const partMap: { id: string; label: string; keywords: string[] }[] = [
    { id: "fan_blades", label: "Fan Blades", keywords: ["fan blade", "boroblend", "leading edge nick", "bird strike"] },
    { id: "hpt", label: "High-Pressure Turbine (HPT)", keywords: ["hpt", "high-pressure turbine", "high pressure turbine", "thermal barrier"] },
    { id: "hpc", label: "High-Pressure Compressor (HPC)", keywords: ["hpc", "powder metal", "compressor"] },
    { id: "combustor", label: "Combustor Assembly", keywords: ["combustor", "burner", "hot section"] },
    { id: "oil_system", label: "Lubrication & Scavenge System", keywords: ["oil", "b-nut", "scavenge", "mcd", "chip detector"] },
    { id: "fan_drive_gear", label: "Fan Drive Gear System (FDGS)", keywords: ["fdgs", "gearbox", "vibration", "planetary"] },
  ];

  for (const pm of partMap) {
    if (pm.keywords.some((kw) => lower.includes(kw))) {
      actions.push({
        label: `Select ${pm.label} in 3D`,
        type: "open_part",
        partId: pm.id,
        engineId: activeContext.engineId || fleetSnapshot.flights[0]?.engine1Id || "ik-eng-01",
      });
      break;
    }
  }

  // Check for AMM citation IDs
  const citationMatches = combinedText.match(/\[(DEMO-[A-Z0-9-]+)\]/g);
  if (citationMatches && citationMatches.length > 0) {
    const firstDoc = citationMatches[0].replace("[", "").replace("]", "");
    actions.push({
      label: `Read Manual ${firstDoc}`,
      type: "open_citation",
      docId: firstDoc,
    });
  }

  return actions.slice(0, 3);
}

/**
 * Dynamic Live-State Fleet, AMM & Regulatory Synthesizer for Multi-Turn Copilot Chat
 */
function getOfflineCopilotChatFallback(params: {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  fleetSnapshot: CopilotFleetSnapshot;
  activeContext: {
    scope: "fleet" | "flight" | "engine" | "part";
    label: string;
    flightNumber?: string;
    tailNumber?: string;
    engineId?: string;
    partId?: string;
    partName?: string;
    userRole?: string;
    userName?: string;
  };
  snippets: DocSnippet[];
}): {
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
  suggestedActions: CopilotSuggestedAction[];
  isOfflineSample: boolean;
} {
  const q = (params.message || "").toLowerCase();
  const { fleetSnapshot, activeContext } = params;
  const flights = fleetSnapshot.flights || [];
  const openCases = fleetSnapshot.openCases || [];
  const roster = fleetSnapshot.roster || [];

  const aogFlights = flights.filter((f) => f.flightStatus === "action_required");
  const watchFlights = flights.filter((f) => f.flightStatus === "watch");
  const readyFlights = flights.filter((f) => f.flightStatus === "ready");
  const crsSignedFlights = flights.filter((f) => f.crsSigned);

  // Check if a specific flight or tail number is referenced in the query or active context
  const matchedFlight =
    flights.find(
      (f) =>
        q.includes(f.flightNumber.toLowerCase()) ||
        q.includes(f.aircraftTail.toLowerCase()) ||
        q.includes(f.engine1Id.toLowerCase()) ||
        q.includes(f.engine2Id.toLowerCase())
    ) ||
    (activeContext.flightNumber
      ? flights.find((f) => f.flightNumber === activeContext.flightNumber)
      : undefined);

  let text = "";
  let searchQueries: string[] = [
    `IndiGo PW1100G-JM MRO ${params.message.slice(0, 48)}`,
    "Pratt & Whitney PW1100G-JM AMM Chapter 72 & 79 limits",
  ];
  const sources: GroundedSource[] = [
    {
      title: "FAA DRS Type Certificate Data Sheet (TCDS E00087EN) - PW1100G-JM",
      url: "https://drs.faa.gov/currentDoc/TCDS-E00087EN",
    },
    {
      title: "EASA Safety Publications - PW1100G-JM Airworthiness Directives",
      url: "https://ad.easa.europa.eu/",
    },
  ];

  // 1. Specific Flight / Aircraft Tail Question
  if (
    matchedFlight &&
    (q.includes(matchedFlight.flightNumber.toLowerCase()) ||
      q.includes(matchedFlight.aircraftTail.toLowerCase()) ||
      q.includes("this flight") ||
      q.includes("why is") ||
      q.includes("status") ||
      q.includes("dispatch") ||
      q.includes("crs"))
  ) {
    const flightCases = openCases.filter(
      (c) => c.engineId === matchedFlight.engine1Id || c.engineId === matchedFlight.engine2Id
    );
    const assignedEngineers = roster.filter(
      (r) =>
        r.role === "Engineer" &&
        (r.assignedFlightNumbers.includes(matchedFlight.flightNumber) ||
          r.assignedTailNumbers.includes(matchedFlight.aircraftTail))
    );

    const caseDetails =
      flightCases.length > 0
        ? flightCases
            .map(
              (c) =>
                `  • **${c.enginePosition} (${c.engineId}) — Case ${c.id} (Level L${c.overallLevel}):** ${c.summary} (Affected Modules: ${c.partsAffected.join(", ")})`
            )
            .join("\n")
        : "  • Zero unrectified Red/Amber findings logged on either propulsion unit.";

    const assignedStr =
      assignedEngineers.length > 0
        ? assignedEngineers.map((e) => `${e.name} (${e.badge})`).join(", ")
        : "Unassigned (Supervisor can assign via RBAC Console)";

    text = `### Live Turnaround & Propulsion Diagnostic: Flight ${matchedFlight.flightNumber} (${matchedFlight.aircraftTail})

• **Route & Gate:** ${matchedFlight.origin} → ${matchedFlight.destination} · Gate ${matchedFlight.gate} · ${matchedFlight.aircraftType}
• **Current Dispatch Status:** **${matchedFlight.statusLabel}** (${matchedFlight.flightStatus.toUpperCase()})
• **Twin-Engine Telemetry:**
  - **No.1 Engine (${matchedFlight.engine1Id}):** Status \`${matchedFlight.engine1Status.toUpperCase()}\` · ${matchedFlight.engine1CSN.toLocaleString()} CSN (${(10000 - matchedFlight.engine1CSN).toLocaleString()} cycles to LLP limit)
  - **No.2 Engine (${matchedFlight.engine2Id}):** Status \`${matchedFlight.engine2Status.toUpperCase()}\` · ${matchedFlight.engine2CSN.toLocaleString()} CSN (${(10000 - matchedFlight.engine2CSN).toLocaleString()} cycles to LLP limit)
• **Flight Crew Tech-Log Entry:** "${matchedFlight.crewReportSummary}"
• **Active Open Maintenance Cases:**
${caseDetails}
• **CAR-145 Assigned Certifying Engineer(s):** ${assignedStr}
• **CRS Dispatch Certificate:** ${
      matchedFlight.crsSigned
        ? `SIGNED & RELEASED (${matchedFlight.crsRef})`
        : matchedFlight.flightStatus === "action_required"
        ? "LOCKED — Mandatory rectification of Level 3/4 Red-Light findings required before CRS sign-off [DEMO-POL-01]."
        : "READY FOR SIGN-OFF — Open Flight Status view to issue DGCA CAR-145 CRS."
    }

Certifying engineer sign-off strictly required.`;
  }

  // 2. RBAC / Engineer Assignments / Who is assigned
  else if (
    q.includes("rbac") ||
    q.includes("assign") ||
    q.includes("who is") ||
    q.includes("roster") ||
    q.includes("supervisor") ||
    q.includes("engineer")
  ) {
    const engineerRows = roster
      .map(
        (r) =>
          `• **${r.name}** (\`${r.role}\` · ${r.badge} · Base: ${r.homeBase}):\n  - Assigned Flights: ${r.assignedFlightNumbers.join(", ") || "None"}\n  - Assigned Tails: ${r.assignedTailNumbers.join(", ") || "None"}`
      )
      .join("\n");

    text = `### Live CAR-145 / Part-145 MRO Roster & Tail Assignments

EngineIQ enforces 3-tier Role-Based Access Control benchmarked against **Swiss-AS AMOS** and **Airbus Skywise**:

${engineerRows}

• **Access Policy Summary:**
  - **Fleet Supervisors:** Full read/write authority across all ${flights.length} flights and ${flights.length * 2} engines, plus live tail assignment controls.
  - **Certifying Line Engineers:** Scoped to their assigned aircraft tails for recording field micrometer inputs, signing off component rectifications, and issuing Flight CRS releases [DEMO-POL-01].
  - **Graduate Trainees:** Isolated sandbox container so training actions never impact live airline operations.

Certifying engineer sign-off strictly required.`;
  }

  // 3. AMM Limits / Fan Blade / Nick / Dent / Blend / Repair Questions
  else if (
    q.includes("nick") ||
    q.includes("dent") ||
    q.includes("blend") ||
    q.includes("fan blade") ||
    q.includes("zone a") ||
    q.includes("zone b") ||
    q.includes("amm") ||
    q.includes("limit") ||
    q.includes("repair") ||
    q.includes("troubleshoot")
  ) {
    text = `### PW1100G-JM AMM Damage Limits & On-Wing Troubleshooting Guide

• **Fan Blade Leading-Edge Nick & Dent Limits [DEMO-AMM-72-01]:**
  - **Level 1 (Serviceable / Record Only):** Depth **≤ 0.5 mm** in Zone A or Zone B with zero crack indication. Continue in service and log in digital airframe book.
  - **Level 2 (Minor On-Wing Cold Blend):** Depth **> 0.5 mm to ≤ 1.5 mm** in Zone A (or **≤ 2.5 mm** in Zone B). Perform on-wing boroblend using a 4:1 smooth transition ratio per \`AMM Task 72-00-300\`, followed by eddy-current / FPI verification.
  - **Level 3 / 4 (Unserviceable / AOG Grounding):** Any leading-edge nick **> 1.5 mm in Zone A**, **> 2.5 mm in Zone B**, tip curl **> 1.0 mm**, or **any crack of any length (> 0.0 mm)**. Mandatory blade replacement before flight [DEMO-AMM-72-01].

• **Hot Section (Combustor & HPT Blade) Limits [DEMO-AMM-72-02]:**
  - **HPT Airfoil Cracking:** Zero-tolerance (**0.0 mm**) for axial or radial cracks on single-crystal Stage 1/2 HPT blades. Requires Level 4 module replacement.
  - **TBC Coating Loss:** Serviceable up to **≤ 3.0% area**; **3.0% to 8.0%** requires repeat borescope every 25 FH; **> 8.0%** requires shop visit [DEMO-AMM-72-02].

• **Lubrication & Vibration Limits [DEMO-AMM-79-01] & [DEMO-FCOM-70-01]:**
  - **Oil Scavenge / Seepage:** **≤ 2 drops/min** is serviceable; **3–5 drops/min** requires B-nut union re-torque & seal replacement (\`AMM Task 79-00-200\`) + 10-min ground leak run; **> 5 drops/min** or MCD ferrous fuzz grounds the aircraft.
  - **Broadband Vibration:** **≤ 1.5 ips** normal; **1.5–2.8 ips** requires FDGS chip check & fan trim balance; **> 2.8 ips** grounds the aircraft [DEMO-FCOM-70-01].

Certifying engineer sign-off strictly required.`;
  }

  // 4. LLP / Cycle Margins / Life Limited Parts
  else if (q.includes("llp") || q.includes("cycle") || q.includes("csn") || q.includes("life") || q.includes("margin")) {
    const allEngines = flights.flatMap((f) => [
      { id: f.engine1Id, tail: f.aircraftTail, flight: f.flightNumber, pos: "No.1", csn: f.engine1CSN, status: f.engine1Status },
      { id: f.engine2Id, tail: f.aircraftTail, flight: f.flightNumber, pos: "No.2", csn: f.engine2CSN, status: f.engine2Status },
    ]);
    const sortedByCycles = [...allEngines].sort((a, b) => b.csn - a.csn);
    const topEngines = sortedByCycles
      .slice(0, 5)
      .map(
        (e) =>
          `  • **${e.tail} ${e.pos} (${e.id} · Flight ${e.flight}):** ${e.csn.toLocaleString()} CSN — **${(10000 - e.csn).toLocaleString()} cycles remaining** (${Math.round((e.csn / 10000) * 100)}% of 10,000-cycle HPT LLP limit)`
      )
      .join("\n");

    text = `### Fleet Life-Limited Part (LLP) Cycle Margin Analysis

• **Governing LLP Bottleneck:** High-Pressure Turbine (HPT) Stage 1 & 2 powder-metal rotor disks carry the most restrictive certified life limit of **10,000 Flight Cycles (CSN)** [DEMO-AMM-72-02].
• **Highest-Time Engines Across IndiGo Fleet (${allEngines.length} Total Engines):**
${topEngines}
• **FAA AD 2024-0014 / EASA AD 2023-0211-E Compliance:** Repetitive angled-beam ultrasonic inspection (UT) is mandated every **250 to 500 cycles** on powder-metal HPC and HPT disks prior to reaching the 10,000-cycle hard retirement threshold.

Certifying engineer sign-off strictly required.`;
  }

  // 5. Default / Live Fleet Overview & AOG Summary
  else {
    const aogList =
      aogFlights.length > 0
        ? aogFlights
            .map((f) => {
              const cases = openCases.filter(
                (c) => c.engineId === f.engine1Id || c.engineId === f.engine2Id
              );
              const caseText =
                cases.length > 0
                  ? cases.map((c) => `${c.enginePosition}: ${c.summary} [L${c.overallLevel}]`).join("; ")
                  : f.crewReportSummary;
              return `  • **Flight ${f.flightNumber} (${f.aircraftTail} · ${f.origin}→${f.destination}):** ${caseText}`;
            })
            .join("\n")
        : "  • Zero flights currently grounded (all Red-Light defects have been rectified!).";

    const watchList =
      watchFlights.length > 0
        ? watchFlights
            .map(
              (f) =>
                `  • **Flight ${f.flightNumber} (${f.aircraftTail} · ${f.origin}→${f.destination}):** ${f.statusLabel} — ${f.crewReportSummary}`
            )
            .join("\n")
        : "  • Zero flights on Engineering Watch.";

    text = `### Live IndiGo PW1100G-JM Fleet & Dispatch Status Summary

• **Fleet Health Overview (${flights.length} Active Flights · ${flights.length * 2} Engines):**
  - **AOG / Action Required (Red):** **${aogFlights.length}** flight(s)
  - **Engineering Watch / Inspection (Amber):** **${watchFlights.length}** flight(s)
  - **Ready for Dispatch (Green):** **${readyFlights.length}** flight(s) (**${crsSignedFlights.length}** with signed CAR-145 CRS certificates)

• **Grounded / Action-Required Turnarounds (AOG):**
${aogList}

• **Engineering Watch Turnarounds (Amber):**
${watchList}

• **Recommended Next Step:** Select any flight or engine below to inspect its 3D Digital Twin, input post-repair micrometer readings, or complete the Mandatory Rectification Worksheet [DEMO-AMM-72-01] [DEMO-POL-01].

Certifying engineer sign-off strictly required.`;
  }

  const suggestedActions = deriveSuggestedActionsFromAnswer(
    params.message + " " + text,
    fleetSnapshot,
    activeContext
  );

  return {
    text,
    sources,
    searchQueries,
    suggestedActions,
    isOfflineSample: true,
  };
}

