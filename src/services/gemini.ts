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

export interface GroundedSource {
  title: string;
  url: string;
}

export interface GeminiSearchGroundingResponse {
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
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

/**
 * 5. SEARCH GROUNDING: Query up-to-date FAA/EASA ADs and OEM SBs via Google Search (gemini-3.8-flash)
 */
export async function searchGroundedIntel(
  query: string,
  context?: any
): Promise<GeminiSearchGroundingResponse> {
  try {
    const res = await fetchWithTimeout("/api/gemini/search-grounded-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, context }),
    }, 20000); // 20s timeout for search grounding

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    return {
      text: json.text || "No intelligence report generated.",
      sources: json.sources || [],
      searchQueries: json.searchQueries || [],
      isOfflineSample: Boolean(json.isOfflineSample),
    };
  } catch (err) {
    console.warn("Using offline sample for search grounding:", err);
    return getOfflineSearchGroundingFallback(query);
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
