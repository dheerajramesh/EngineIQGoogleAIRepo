import React, { useState, useEffect } from "react";
import {
  ActionLevel,
  CaseLogEntry,
  DocSnippet,
  ExtractedIncident,
  FlightInfo,
  IncidentFinding,
  IncidentMeasurementInput,
  LimitsCheckResult,
  PartId,
  PartStatus,
} from "../types";
import { DUMMY_SCENARIOS } from "../data/scenarios";
import { evaluateLimitsCheck, formatDamageType, formatPartName } from "../logic/rulesEngine";
import { retrieveRelevantDocuments } from "../logic/retrieval";
import { extractIncidentData, generateIncidentExplanation } from "../services/gemini";
import { DecisionLadder } from "./DecisionLadder";
import {
  AlertOctagon,
  Check,
  CheckCircle,
  Clock,
  Copy,
  FileCheck,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  X,
  XCircle,
  GraduationCap,
  ArrowRight,
  AlertTriangle,
  Search,
} from "lucide-react";

interface IncidentViewProps {
  onUpdate3DStatuses: (statuses: Record<PartId, PartStatus>) => void;
  onOpenCitation: (docId: string) => void;
  onSaveCaseLog: (entry: CaseLogEntry) => void;
  onSelectPartIn3D: (partId: PartId) => void;
  defaultAircraftType?: string;
  defaultEnginePosition?: "No.1" | "No.2";
  currentEngineId?: string;
  tailNumber?: string;
  userRole?: string;
  userName?: string;
  userBadge?: string;
  activeFlight?: FlightInfo;
  openCases?: CaseLogEntry[];
  onGoToTraining?: () => void;
}

export function IncidentView({
  onUpdate3DStatuses,
  onOpenCitation,
  onSaveCaseLog,
  onSelectPartIn3D,
  defaultAircraftType = "A320-family, illustrative",
  defaultEnginePosition = "No.2",
  currentEngineId,
  tailNumber,
  userRole,
  userName,
  userBadge,
  activeFlight,
  openCases = [],
  onGoToTraining,
}: IncidentViewProps) {
  // Form State
  const [aircraftType, setAircraftType] = useState(defaultAircraftType);
  const [enginePosition, setEnginePosition] = useState<"No.1" | "No.2">(defaultEnginePosition);

  // Sync with current engine if changed
  useEffect(() => {
    if (defaultAircraftType) setAircraftType(defaultAircraftType);
    if (defaultEnginePosition) setEnginePosition(defaultEnginePosition);
  }, [defaultAircraftType, defaultEnginePosition, currentEngineId]);

  const [narrative, setNarrative] = useState("");
  const [measurements, setMeasurements] = useState<IncidentMeasurementInput>({
    damageDepthMm: null,
    crackLengthMm: null,
    vibrationN1: null,
    oilLeakDropsMin: null,
    coatingLossPct: null,
  });
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string; name: string } | null>(null);

  // Workflow State: 'input' | 'extracting' | 'confirm' | 'evaluating' | 'results'
  const [stage, setStage] = useState<"input" | "extracting" | "confirm" | "results">("input");

  // Extracted Data
  const [extractedData, setExtractedData] = useState<ExtractedIncident | null>(null);
  const [isExtractOffline, setIsExtractOffline] = useState(false);

  // Confirmed Findings & Rules Check
  const [confirmedFindings, setConfirmedFindings] = useState<IncidentFinding[]>([]);
  const [limitsResult, setLimitsResult] = useState<LimitsCheckResult | null>(null);
  const [retrievedSnippets, setRetrievedSnippets] = useState<DocSnippet[]>([]);

  // AI Explanation
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationText, setExplanationText] = useState("");
  const [isExplainOffline, setIsExplainOffline] = useState(false);

  // Draft Tech Log & Sign-Off
  const [draftTechLog, setDraftTechLog] = useState("");
  const [copiedTechLog, setCopiedTechLog] = useState(false);
  const [engineerName, setEngineerName] = useState(() =>
    userName ? userName.split(" (")[0] : ""
  );
  const [engineerId, setEngineerId] = useState(() => userBadge || "DGCA AME #8842");
  const [rejectReason, setRejectReason] = useState("");
  const [signOffStatus, setSignOffStatus] = useState<"Pending" | "Approved" | "Edited" | "Rejected">("Pending");
  const [signOffTimestamp, setSignOffTimestamp] = useState<string | null>(null);
  const [signOffError, setSignOffError] = useState<string | null>(null);

  // Load Active Flight Crew Tech Log Report & Open Case Measurements
  const handleLoadActiveFlightReport = () => {
    const activeCase = openCases[0];
    const reportText =
      activeFlight?.crewReport ||
      activeCase?.summary ||
      "Transit walkaround inspection logged elevated engine telemetry.";
    setNarrative(reportText);
    if (defaultEnginePosition) setEnginePosition(defaultEnginePosition);

    const nextMeasurements: IncidentMeasurementInput = {
      damageDepthMm: null,
      crackLengthMm: null,
      vibrationN1: null,
      oilLeakDropsMin: null,
      coatingLossPct: null,
    };

    if (activeCase) {
      for (const f of activeCase.findings) {
        if (!f.measurement) continue;
        if (f.damageType === "crack") nextMeasurements.crackLengthMm = f.measurement.value;
        else if (f.damageType === "vibration") nextMeasurements.vibrationN1 = f.measurement.value;
        else if (f.damageType === "leak") nextMeasurements.oilLeakDropsMin = f.measurement.value;
        else if (f.damageType === "coating_loss") nextMeasurements.coatingLossPct = f.measurement.value;
        else nextMeasurements.damageDepthMm = f.measurement.value;
      }
    }
    setMeasurements(nextMeasurements);
    setSignOffStatus("Pending");
  };

  // Load Example Scenario
  const handleLoadScenario = (scenarioId: string) => {
    const s = DUMMY_SCENARIOS.find((item) => item.id === scenarioId);
    if (!s) return;
    setNarrative(s.narrative);
    setEnginePosition(s.enginePosition);
    setMeasurements({ ...s.measurements });
    setPhoto(null);
    setStage("input");
    setSignOffStatus("Pending");
  };

  // Photo Upload Handler (Supports Drag-and-Drop & Manual Select)
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPhoto({
        base64,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Trigger Extraction
  const handleStartExtraction = async () => {
    if (!narrative.trim()) return;
    setStage("extracting");

    try {
      const res = await extractIncidentData(narrative, measurements, photo ? { base64: photo.base64, mimeType: photo.mimeType } : undefined);
      setExtractedData(res.data);
      setIsExtractOffline(res.isOfflineSample);
      setConfirmedFindings(res.data.findings || []);
      setStage("confirm");
    } catch (err) {
      console.error(err);
      setStage("input");
    }
  };

  // Step 2: Confirm Findings -> Run Rules Engine & Retrieve AMM
  const handleConfirmAndEvaluate = async () => {
    const result = evaluateLimitsCheck(confirmedFindings);
    setLimitsResult(result);

    // Compute 3D Engine Color-Coding
    const eventType = extractedData?.eventType || "other";
    const statusMap: Record<PartId, PartStatus> = {
      fan_case: "unaffected",
      fan_blades: "unaffected",
      fan_drive_gear: "unaffected",
      lpc: "unaffected",
      hpc: "unaffected",
      combustor: "unaffected",
      hpt: "unaffected",
      lpt: "unaffected",
      exhaust: "unaffected",
      oil_system: "unaffected",
    };

    // Set affected parts (red)
    for (const f of confirmedFindings) {
      if (f.part !== "engine" && statusMap[f.part as PartId]) {
        statusMap[f.part as PartId] = "affected";
      }
    }

    // Set inspection parts based on event type / adjacency (amber)
    if (eventType === "bird_strike") {
      if (statusMap.fan_case !== "affected") statusMap.fan_case = "inspect";
      if (statusMap.lpc !== "affected") statusMap.lpc = "inspect";
      if (confirmedFindings.some((f) => f.damageType === "crack" || (f.measurement?.value ?? 0) > 3)) {
        if (statusMap.fan_drive_gear !== "affected") statusMap.fan_drive_gear = "inspect";
      }
    } else if (eventType === "fod") {
      if (statusMap.lpc !== "affected") statusMap.lpc = "inspect";
      if (statusMap.combustor !== "affected") statusMap.combustor = "inspect";
      if (statusMap.lpt !== "affected") statusMap.lpt = "inspect";
    } else if (eventType === "oil_leak") {
      if (statusMap.fan_drive_gear !== "affected") statusMap.fan_drive_gear = "inspect";
      if (statusMap.hpc !== "affected") statusMap.hpc = "inspect";
    } else if (eventType === "vibration") {
      if (statusMap.fan_blades !== "affected") statusMap.fan_blades = "inspect";
      if (statusMap.fan_drive_gear !== "affected") statusMap.fan_drive_gear = "inspect";
    } else if (eventType === "hot_section") {
      if (statusMap.combustor !== "affected") statusMap.combustor = "inspect";
      if (statusMap.lpt !== "affected") statusMap.lpt = "inspect";
    }

    onUpdate3DStatuses(statusMap);

    // Retrieve Documents
    const docs = await retrieveRelevantDocuments({
      eventType,
      findings: confirmedFindings,
      freeText: narrative,
    }, 4);
    setRetrievedSnippets(docs);

    // Auto-generate draft tech log
    const highestRow = result.rows[0];
    const techText = `[TECH-LOG DRAFT ENTRY - ${enginePosition} ENG - ${aircraftType}]
EVENT: ${eventType.toUpperCase()} reported. Findings confirmed: ${confirmedFindings
      .map((f) => `${formatPartName(f.part)} ${formatDamageType(f.damageType)} (${f.measurement ? f.measurement.value + " " + f.measurement.unit : "unmeasured"})`)
      .join("; ")}.
DETERMINATION: Governed by ${highestRow?.sourceDocId || "DEMO-AMM-72-01"} as Level ${result.overallLevel} action.
ACTION REQUIRED: ${result.overallLevel === 0 ? "Normal release to service." : result.overallLevel === 1 ? "Repetitive inspection logged." : result.overallLevel === 2 ? "Borescope / on-wing repair before next sector." : result.overallLevel === 3 ? "OEM Technical escalation initiated." : "Engine removed from service for shop visit."}
STATUS: Illustrative assessment. Certifying engineer sign-off required.`;
    setDraftTechLog(techText);

    // Trigger AI Explanation
    setStage("results");
    setIsExplaining(true);
    try {
      const explainRes = await generateIncidentExplanation({
        eventType,
        overallLevel: result.overallLevel,
        findings: confirmedFindings,
        rulesResults: result.rows,
        snippets: docs,
      });
      setExplanationText(explainRes.text);
      setIsExplainOffline(explainRes.isOfflineSample);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExplaining(false);
    }
  };

  // Sign-Off Handler
  const handleSignOff = (decision: "Approved" | "Edited" | "Rejected") => {
    if (!engineerName.trim() || !engineerId.trim()) {
      setSignOffError(
        "Certifying Engineer Full Name and Part-66 / A&P License ID are mandatory before signing off an airworthiness determination."
      );
      return;
    }
    setSignOffError(null);

    const timestamp = new Date().toISOString();
    setSignOffStatus(decision);
    setSignOffTimestamp(timestamp);

    // Save to Case Log
    const entry: CaseLogEntry = {
      id: `CASE-${Date.now().toString().slice(-6)}`,
      timestamp,
      aircraftType,
      enginePosition,
      engineId: currentEngineId,
      tailNumber: tailNumber || aircraftType,
      eventType: extractedData?.eventType || "other",
      summary: narrative.slice(0, 150),
      overallLevel: limitsResult?.overallLevel ?? 0,
      findings: confirmedFindings,
      limitsRows: limitsResult?.rows || [],
      engineerName: engineerName.trim(),
      engineerId: engineerId.trim(),
      decision,
      reason: decision === "Rejected" ? rejectReason : undefined,
      draftTechLog,
      aiExplanation: explanationText,
    };
    onSaveCaseLog(entry);
  };

  const handleCopyTechLog = () => {
    navigator.clipboard.writeText(draftTechLog);
    setCopiedTechLog(true);
    setTimeout(() => setCopiedTechLog(false), 2000);
  };

  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[DEMO-[A-Z0-9-]+\])/g);
    return parts.map((seg, idx) => {
      if (seg.startsWith("[DEMO-") && seg.endsWith("]")) {
        const cleanId = seg.slice(1, -1);
        return (
          <button
            key={idx}
            onClick={() => onOpenCitation(cleanId)}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-600/50 rounded hover:bg-sky-900 transition underline underline-offset-2"
          >
            {seg}
          </button>
        );
      }
      return <span key={idx}>{seg}</span>;
    });
  };

  return (
    <div className="space-y-5 text-slate-200 animate-fade-in pb-12">


      {/* If Trainee role, display guidance banner indicating practice simulation mode */}
      {userRole === "Trainee" && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <p className="leading-snug">
              <strong>Trainee Simulation Mode:</strong> You can practice entering measurements and evaluating rules engine limits. Final sign-off will be marked as a practice review.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60 shrink-0">
            Practice Only
          </span>
        </div>
      )}

      {/* Mode Navigation Breadcrumb / State Stepper */}
      <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
        <span className={`px-2 py-1 rounded ${stage === "input" ? "bg-sky-500 text-white font-bold" : "text-slate-400"}`}>
          1. Incident Report
        </span>
        <span className="text-slate-600">→</span>
        <span className={`px-2 py-1 rounded ${stage === "confirm" ? "bg-sky-500 text-white font-bold" : "text-slate-400"}`}>
          2. Confirm Extraction
        </span>
        <span className="text-slate-600">→</span>
        <span className={`px-2 py-1 rounded ${stage === "results" ? "bg-sky-500 text-white font-bold" : "text-slate-400"}`}>
          3. Decision & Sign-Off
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STAGE 1: INPUT FORM */}
      {/* ------------------------------------------------------------- */}
      {stage === "input" && (
        <div className="space-y-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Engine Incident Intake</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Input flight crew reports, pilot logbook entries, or load an illustrative scenario.
              </p>
            </div>

            {/* Load Example Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Example:</span>
              <select
                id="select-load-example"
                onChange={(e) => handleLoadScenario(e.target.value)}
                defaultValue=""
                className="bg-slate-950 border border-slate-700 text-sky-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
              >
                <option value="" disabled>Select scenario...</option>
                {DUMMY_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Flight Crew Tech Logbook Pre-Loader Banner */}
          {(activeFlight?.crewReport || openCases.length > 0) && (
            <div className="p-3.5 rounded-xl bg-sky-950/50 border border-sky-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-sky-300 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    Active Aircraft Tech Log ({activeFlight ? `Flight ${activeFlight.flightNumber} • ${activeFlight.aircraftTail}` : tailNumber})
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">
                  {activeFlight?.crewReport || openCases[0]?.summary}
                </p>
              </div>
              <button
                type="button"
                id="btn-load-active-crew-report"
                onClick={handleLoadActiveFlightReport}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-mono font-bold text-xs shadow-md transition cursor-pointer"
              >
                Load Flight Crew Report & Telemetry
              </button>
            </div>
          )}

          {/* Aircraft & Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                Aircraft Type
              </label>
              <input
                id="input-aircraft-type"
                type="text"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                Engine Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-engine-pos-1"
                  onClick={() => setEnginePosition("No.1")}
                  className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition ${
                    enginePosition === "No.1"
                      ? "bg-sky-500/20 text-sky-300 border-sky-500"
                      : "bg-slate-950 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  No. 1 (Port)
                </button>
                <button
                  type="button"
                  id="btn-engine-pos-2"
                  onClick={() => setEnginePosition("No.2")}
                  className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition ${
                    enginePosition === "No.2"
                      ? "bg-sky-500/20 text-sky-300 border-sky-500"
                      : "bg-slate-950 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  No. 2 (Starboard)
                </button>
              </div>
            </div>
          </div>

          {/* Narrative Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Incident Narrative / Pilot Logbook Text
            </label>
            <textarea
              id="textarea-incident-narrative"
              rows={4}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g. Flight crew reported flock bird strike on climb out. Fan blade #14 shows leading-edge nick depth 1.9 mm, tip curl 2.0 mm, vibration 2.2 units recorded..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition leading-relaxed font-sans"
            />
          </div>

          {/* Damage Photo Upload */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono uppercase text-slate-400">
              Damage Photo (Optional Borescope / Optical Micrometer Image)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl p-4 text-center bg-slate-950/60 transition cursor-pointer"
              onClick={() => document.getElementById("photo-upload-input")?.click()}
            >
              <input
                id="photo-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              {photo ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <img
                      src={photo.base64}
                      alt="Damage preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{photo.name}</p>
                      <p className="text-[10px] text-sky-400 font-mono">
                        Ready for visual AI damage suggestion (requires engineer confirmation)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(null);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <p className="text-xs text-slate-300">
                    <span className="text-sky-400 font-semibold">Click to upload</span> or drag and drop photo
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Numeric Fields (Optional / Pre-populated) */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Direct Calibrated Measurement Fields (Optional)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">Depth (mm)</label>
                <input
                  id="input-damage-depth"
                  type="number"
                  step="0.1"
                  value={measurements.damageDepthMm ?? ""}
                  onChange={(e) =>
                    setMeasurements({
                      ...measurements,
                      damageDepthMm: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 1.9"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">Crack (mm)</label>
                <input
                  id="input-crack-length"
                  type="number"
                  step="0.1"
                  value={measurements.crackLengthMm ?? ""}
                  onChange={(e) =>
                    setMeasurements({
                      ...measurements,
                      crackLengthMm: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 0.0"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">Vibration (N1)</label>
                <input
                  id="input-vibration-n1"
                  type="number"
                  step="0.1"
                  value={measurements.vibrationN1 ?? ""}
                  onChange={(e) =>
                    setMeasurements({
                      ...measurements,
                      vibrationN1: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 2.2"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">Oil Leak (drops/min)</label>
                <input
                  id="input-oil-leak"
                  type="number"
                  step="0.5"
                  value={measurements.oilLeakDropsMin ?? ""}
                  onChange={(e) =>
                    setMeasurements({
                      ...measurements,
                      oilLeakDropsMin: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 3.5"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">Coating Loss (%)</label>
                <input
                  id="input-coating-loss"
                  type="number"
                  step="1"
                  value={measurements.coatingLossPct ?? ""}
                  onChange={(e) =>
                    setMeasurements({
                      ...measurements,
                      coatingLossPct: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 18"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 flex items-center justify-end">
            <button
              id="btn-start-extraction"
              type="button"
              onClick={handleStartExtraction}
              disabled={!narrative.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extract Structured Findings (Gemini)</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LOADING STATE */}
      {/* ------------------------------------------------------------- */}
      {stage === "extracting" && (
        <div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">Extracting Incident Parameters...</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Parsing technical terminology, isolating quantitative dimensions, and checking image features.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STAGE 2: CONFIRM SCREEN (Engineer Mandatory Confirmation) */}
      {/* ------------------------------------------------------------- */}
      {stage === "confirm" && extractedData && (
        <div className="p-5 rounded-xl bg-slate-900 border border-sky-500/40 shadow-2xl space-y-5 animate-scale-up">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold uppercase border border-sky-500/30">
                  Step 2 of 3
                </span>
                {isExtractOffline && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] uppercase border border-amber-700/50">
                    offline sample
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mt-1">Review & Confirm Extracted Findings</h3>
              <p className="text-xs text-slate-400">
                A certifying engineer must verify every quantitative value before limits check executes.
              </p>
            </div>
            <button
              onClick={() => setStage("input")}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 transition"
            >
              ← Edit Intake
            </button>
          </div>

          {/* Event Type & Position Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono">
            <div>
              <span className="text-slate-500">Event Classification: </span>
              <span className="text-sky-300 font-bold uppercase">{extractedData.eventType.replace(/_/g, " ")}</span>
            </div>
            <div>
              <span className="text-slate-500">Engine Position: </span>
              <span className="text-sky-300 font-bold">{extractedData.enginePosition}</span>
            </div>
            <div>
              <span className="text-slate-500">Aircraft: </span>
              <span className="text-slate-200">{aircraftType}</span>
            </div>
          </div>

          {/* Findings Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
                Confirmed Findings ({confirmedFindings.length})
              </span>
              <button
                onClick={() => {
                  const newF: IncidentFinding = {
                    id: `manual-${Date.now()}`,
                    part: "fan_blades",
                    damageType: "leading_edge_nick",
                    zone: "Zone 102",
                    measurement: { value: 1.0, unit: "depth_mm" },
                  };
                  setConfirmedFindings([...confirmedFindings, newF]);
                }}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800 transition"
              >
                <Plus className="w-3 h-3" /> Add Finding
              </button>
            </div>

            <div className="space-y-2.5">
              {confirmedFindings.map((finding, idx) => (
                <div
                  key={finding.id || idx}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span className="font-bold text-slate-100">{formatPartName(finding.part)}</span>
                      <span className="text-slate-400 font-mono">({finding.zone})</span>
                      {finding.isAiSuggested && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/70 text-amber-300 border border-amber-700/60">
                          AI-suggested, needs confirmation
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setConfirmedFindings(confirmedFindings.filter((_, i) => i !== idx));
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                      title="Remove finding"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">Damage Type</span>
                      <select
                        value={finding.damageType}
                        onChange={(e) => {
                          const updated = [...confirmedFindings];
                          updated[idx].damageType = e.target.value as any;
                          setConfirmedFindings(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="leading_edge_nick">Leading Edge Nick</option>
                        <option value="crack">Structural Crack</option>
                        <option value="tip_curl">Tip Curl</option>
                        <option value="dent">Casing Dent</option>
                        <option value="blade_nick">Blade Nick</option>
                        <option value="coating_loss">Coating Loss (%)</option>
                        <option value="leak">Oil Leak</option>
                        <option value="vibration">N1 Vibration</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">Measured Value</span>
                      <input
                        type="number"
                        step="0.1"
                        value={finding.measurement?.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value);
                          const updated = [...confirmedFindings];
                          if (val === null) {
                            updated[idx].measurement = null;
                          } else {
                            updated[idx].measurement = {
                              value: val,
                              unit: updated[idx].measurement?.unit || "depth_mm",
                            };
                          }
                          setConfirmedFindings(updated);
                        }}
                        placeholder="Numeric value"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">Unit</span>
                      <select
                        value={finding.measurement?.unit || "depth_mm"}
                        onChange={(e) => {
                          const updated = [...confirmedFindings];
                          if (updated[idx].measurement) {
                            updated[idx].measurement!.unit = e.target.value;
                          }
                          setConfirmedFindings(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="depth_mm">depth (mm)</option>
                        <option value="length_mm">length (mm)</option>
                        <option value="n1_units">N1 units</option>
                        <option value="drops_per_min">drops/min</option>
                        <option value="percent_area">% area</option>
                      </select>
                    </div>
                  </div>

                  {finding.aiNotes && (
                    <p className="text-[11px] text-amber-300/80 italic font-mono">{finding.aiNotes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Missing info notices */}
          {extractedData.missingInfo && extractedData.missingInfo.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" /> Missing Information Flagged:
              </span>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                {extractedData.missingInfo.map((info, i) => (
                  <li key={i}>{info}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory Confirmation Action Button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Status: <span className="text-amber-400">Awaiting Engineer Confirmation</span>
            </span>
            <button
              id="btn-confirm-findings"
              onClick={handleConfirmAndEvaluate}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/25"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Findings & Run Rules Engine</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STAGE 3: RESULTS (Limits check, 3D update, References, Explainer, Sign-off) */}
      {/* ------------------------------------------------------------- */}
      {stage === "results" && limitsResult && (
        <div className="space-y-6">
          {/* Top Banner with Governing Level */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                Evaluation Complete
              </span>
              <h2 className="text-lg font-bold text-white mt-1">Maintenance Decision Support Results</h2>
              <p className="text-xs text-slate-400 font-mono">
                {confirmedFindings.length} confirmed findings evaluated by deterministic code against AMM/PRC criteria.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStage("input")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> New Assessment
              </button>
            </div>
          </div>

          {/* Split 2-col: Deterministic Limits Table + Decision Ladder */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 cols: Limits Check Table (Pure code, NO AI) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                      Deterministic Limits Check (Code Engine)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Zero AI in Limits Determination</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        <th className="py-2 px-2">Component</th>
                        <th className="py-2 px-2">Damage Type</th>
                        <th className="py-2 px-2">Measured</th>
                        <th className="py-2 px-2">Limit Band Applied</th>
                        <th className="py-2 px-2">Result</th>
                        <th className="py-2 px-2">Source Doc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {limitsResult.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-2 font-medium text-slate-200">{row.component}</td>
                          <td className="py-2.5 px-2 text-slate-300">{row.damageType}</td>
                          <td className="py-2.5 px-2 font-mono font-bold text-sky-400">{row.measured}</td>
                          <td className="py-2.5 px-2 text-slate-300 text-[11px]">{row.limitBandApplied}</td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                row.resultLevel === 4
                                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                                  : row.resultLevel === 3
                                  ? "bg-orange-950 text-orange-300 border border-orange-800"
                                  : row.resultLevel === 2
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : row.resultLevel === 1
                                  ? "bg-sky-950 text-sky-300 border border-sky-800"
                                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              }`}
                            >
                              L{row.resultLevel}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <button
                              onClick={() => onOpenCitation(row.sourceDocId)}
                              className="font-mono text-[11px] text-sky-400 hover:underline bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/50"
                            >
                              [{row.sourceDocId}]
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* References Found */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-sky-400" />
                    Retrieved AMM / PRC Reference Library Snippets
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Click citation to open
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {retrievedSnippets.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => onOpenCitation(doc.id)}
                      className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-sky-400 group-hover:underline">
                          [{doc.id}]
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{doc.category}</span>
                      </div>
                      <h5 className="text-xs font-semibold text-slate-200 line-clamp-1">{doc.title}</h5>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {doc.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col: Decision Ladder Stepper */}
            <div className="space-y-3">
              <DecisionLadder currentLevel={limitsResult.overallLevel} />

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-500">Governing Logic</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Overall action level is mathematically determined as the maximum level across all confirmed findings (Level {limitsResult.overallLevel}).
                </p>
              </div>
            </div>
          </div>

          {/* Explanation Section (Gemini) */}
          <div className="p-5 rounded-xl bg-slate-900/90 border border-sky-500/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300 font-mono">
                  Copilot Technical Explanation & Next Steps
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {isExplainOffline && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] uppercase border border-amber-800/50">
                    offline sample
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Cited from AMM/POL
                </span>
              </div>
            </div>

            {isExplaining ? (
              <div className="flex items-center gap-2 py-6 text-xs text-slate-400 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Generating cited technical explanation and next-steps checklist...</span>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-xs leading-relaxed text-slate-200 font-sans whitespace-pre-line space-y-2">
                {renderTextWithCitations(explanationText)}
              </div>
            )}
          </div>


          {/* Draft Tech Log Entry with Copy Button */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Draft Technical Log Entry (Ready for Aircraft Logbook)
              </span>
              <button
                id="btn-copy-tech-log"
                onClick={handleCopyTechLog}
                className="flex items-center gap-1 px-3 py-1 text-xs font-mono font-medium rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition"
              >
                {copiedTechLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTechLog ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={draftTechLog}
              onChange={(e) => setDraftTechLog(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-500 leading-relaxed overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
            />
          </div>

          {/* Certifying Engineer Sign-Off Panel */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide font-mono">
                    Certifying Engineer Sign-Off Panel
                  </h4>
                  <p className="text-xs text-amber-300 font-mono">
                    Mandatory sign-off before case entry closure and aircraft release.
                  </p>
                </div>
              </div>
              {signOffStatus !== "Pending" ? (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                    signOffStatus === "Approved"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-600"
                      : signOffStatus === "Edited"
                      ? "bg-sky-950 text-sky-300 border border-sky-600"
                      : "bg-rose-950 text-rose-300 border border-rose-600"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Signed: {signOffStatus}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600 animate-pulse">
                  Sign-Off Required
                </span>
              )}
            </div>

            {/* Engineer Identity Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Certifying Engineer Full Name *
                </label>
                <input
                  id="input-engineer-name"
                  type="text"
                  value={engineerName}
                  onChange={(e) => {
                    setEngineerName(e.target.value);
                    if (signOffError) setSignOffError(null);
                  }}
                  placeholder="e.g. Captain D. Vance / Eng. Sarah Lin"
                  disabled={signOffStatus !== "Pending"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  License / Authorization ID (EASA Part-66 / FAA A&P) *
                </label>
                <input
                  id="input-engineer-id"
                  type="text"
                  value={engineerId}
                  onChange={(e) => {
                    setEngineerId(e.target.value);
                    if (signOffError) setSignOffError(null);
                  }}
                  placeholder="e.g. UK.66.19842A / FAA-AP-39201"
                  disabled={signOffStatus !== "Pending"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>
            </div>

            {signOffError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/80 text-xs text-rose-200 font-mono flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{signOffError}</span>
              </div>
            )}

            {/* Reject Reason input if selecting Reject */}
            {signOffStatus === "Pending" && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Disposition Notes / Modification Justification (if Edited or Rejected)
                </label>
                <input
                  id="input-reject-reason"
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Disagree with blade nick measurement; re-gauged at 0.7 mm..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {/* Action Buttons */}
            {signOffStatus === "Pending" ? (
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  id="btn-signoff-reject"
                  onClick={() => handleSignOff("Rejected")}
                  className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 font-semibold text-xs transition"
                >
                  Reject Determination
                </button>
                <button
                  id="btn-signoff-edit"
                  onClick={() => handleSignOff("Edited")}
                  className="px-4 py-2 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700 font-semibold text-xs transition"
                >
                  Approve with Modifications
                </button>
                <button
                  id="btn-signoff-approve"
                  onClick={() => handleSignOff("Approved")}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve & Sign-Off to Tech Log</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">
                    Signed off by {engineerName} ({engineerId}) as <span className="text-sky-400">{signOffStatus}</span>.
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Timestamp: {signOffTimestamp} • Saved permanently to Case Log.
                  </p>
                </div>
                <button
                  onClick={() => setSignOffStatus("Pending")}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 transition"
                >
                  Re-evaluate
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="py-2 text-center text-[10px] text-slate-500 font-mono border-t border-slate-900/80 bg-slate-950/40 select-none shrink-0 mt-8">
        ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
      </div>
    </div>
  );
}
