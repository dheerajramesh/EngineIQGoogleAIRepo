import { ExtractedIncident, IncidentFinding, IncidentMeasurementInput, LimitsCheckResultRow, ActionLevel, DocSnippet, EnginePartData } from "../types";
import { DUMMY_SCENARIOS } from "../data/scenarios";

export interface GeminiExtractResponse {
  data: ExtractedIncident;
  isOfflineSample: boolean;
  notes?: string;
}

export interface GeminiExplainResponse {
  text: string;
  isOfflineSample: boolean;
}

export interface GeminiPartAskResponse {
  text: string;
  isOfflineSample: boolean;
}

export interface GeminiTrainingResponse {
  text: string;
  isOfflineSample: boolean;
}

/**
 * Robust timeout fetch helper
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000): Promise<Response> {
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
 * 1. EXTRACTOR: Extracts structured incident fields
 */
export async function extractIncidentData(
  narrative: string,
  measurements: IncidentMeasurementInput,
  image?: { base64: string; mimeType: string }
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
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const json = await res.json();
    if (json.data && Array.isArray(json.data.findings)) {
      return {
        data: json.data,
        isOfflineSample: Boolean(json.isOfflineSample),
      };
    }
    throw new Error("Invalid format from extractor");
  } catch (err) {
    console.warn("Using offline sample for extraction due to error/timeout:", err);
    return {
      data: getOfflineExtractionFallback(narrative, measurements, Boolean(image)),
      isOfflineSample: true,
      notes: "Server/API offline. Loaded deterministic pre-compiled sample extraction.",
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
}): Promise<GeminiExplainResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    if (json.text) {
      return { text: json.text, isOfflineSample: Boolean(json.isOfflineSample) };
    }
    throw new Error("No text in explanation response");
  } catch (err) {
    console.warn("Using offline sample for explanation:", err);
    return {
      text: getOfflineExplanationFallback(params),
      isOfflineSample: true,
    };
  }
}

/**
 * 3. PART ASSISTANT: Q&A on specific part
 */
export async function askAboutPart(
  partData: EnginePartData,
  question: string,
  snippets: DocSnippet[]
): Promise<GeminiPartAskResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/part-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partData, question, snippets }),
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    if (json.text) {
      return { text: json.text, isOfflineSample: Boolean(json.isOfflineSample) };
    }
    throw new Error("No text in part Q&A response");
  } catch (err) {
    console.warn("Using offline sample for part Q&A:", err);
    return {
      text: getOfflinePartAskFallback(partData, question, snippets),
      isOfflineSample: true,
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
}): Promise<GeminiTrainingResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/training-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    if (json.text) {
      return { text: json.text, isOfflineSample: Boolean(json.isOfflineSample) };
    }
    throw new Error("No text in training feedback response");
  } catch (err) {
    console.warn("Using offline sample for training feedback:", err);
    return {
      text: getOfflineTrainingFeedbackFallback(params),
      isOfflineSample: true,
    };
  }
}

// ----------------------------------------------------
// Deterministic Fallback Sample Generators
// ----------------------------------------------------

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
): string {
  const qLower = question.toLowerCase();
  const docRef = snippets[0]?.id || "DEMO-AMM-72-01";

  let answer = "";
  if (qLower.includes("life") || qLower.includes("limit") || qLower.includes("cycle")) {
    answer = `${partData.name} life basis is defined as: ${partData.lifeBasis} (illustrative limit: ${partData.lifeLimitCycles ? partData.lifeLimitCycles.toLocaleString() + " cycles" : "on-condition"}). Replacement guidance requires maintenance strictly ${partData.replacementGuidance} [${docRef}].`;
  } else if (qLower.includes("fail") || qLower.includes("damage")) {
    answer = `${partData.name} typical failure modes include: ${partData.howItFails.join(", ")}. Documented inspection procedures are detailed in [${docRef}].`;
  } else if (qLower.includes("material") || qLower.includes("made of")) {
    answer = `${partData.name} is manufactured from ${partData.madeOf}. Operating temperature range is typically ${partData.typicalOperatingConditions.temperature} [${docRef}].`;
  } else {
    answer = `${partData.name} (${partData.technicalName}): ${partData.whatItDoes} It sits at ${partData.whereItSits}. Typical operating conditions include ${partData.typicalOperatingConditions.temperature} and ${partData.typicalOperatingConditions.pressure}. Relevant inspection criteria are specified in [${docRef}].`;
  }

  return `${answer}\n\nNotice: Data provided is illustrative and non-operational. Certifying engineer sign-off required.`;
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
