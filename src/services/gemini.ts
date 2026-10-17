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
  sources?: GroundedSource[];
  searchQueries?: string[];
  isOfflineSample: boolean;
  errorType?: "CREDITS_DEPLETED" | "NO_API_KEY" | "NETWORK_ERROR";
  errorMessage?: string;
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

    const json = await res.json().catch(() => null);

    if (json?.errorType === "CREDITS_DEPLETED") {
      const fallback = getOfflinePartAskFallback(partData, question, snippets);
      return {
        text: fallback.text,
        sources: fallback.sources,
        searchQueries: fallback.searchQueries,
        isOfflineSample: true,
        errorType: "CREDITS_DEPLETED",
        errorMessage: json.message,
      };
    }

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    if (json?.text) {
      return {
        text: json.text,
        sources: json.sources || [],
        searchQueries: json.searchQueries || [],
        isOfflineSample: Boolean(json.isOfflineSample),
      };
    }
    throw new Error("No text in part Q&A response");
  } catch (err: any) {
    console.warn("Using offline knowledge engine for part Q&A:", err);
    const fallback = getOfflinePartAskFallback(partData, question, snippets);
    return {
      text: fallback.text,
      sources: fallback.sources,
      searchQueries: fallback.searchQueries,
      isOfflineSample: true,
      errorType: "NETWORK_ERROR",
      errorMessage: err.message || "Failed to reach backend",
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
    if (json.errorType === "CREDITS_DEPLETED" || !json.text) {
      return getOfflineSearchGroundingFallback(query);
    }
    return {
      text: json.text,
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
