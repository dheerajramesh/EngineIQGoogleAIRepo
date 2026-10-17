import React, { useState, useMemo, useEffect } from "react";
import {
  EnginePartData,
  PartId,
  PartStatus,
  CaseLogEntry,
  ComponentHistoryEntry,
  UserSession,
  PreventiveMaintenanceTask,
  PMSignOffRecord,
  DamageType,
  MeasurementUnit,
} from "../types";
import { AIProviderPreference, askAboutPart, GroundedSource } from "../services/gemini";
import { retrieveRelevantDocuments } from "../logic/retrieval";
import { evaluateLimitsCheck, formatDamageType, formatUnit } from "../logic/rulesEngine";
import { ENGINE_PARTS } from "../data/parts";
import { ComponentHistoryView } from "./ComponentHistoryView";
import { ComponentLifeTracker } from "./ComponentLifeTracker";
import { ComponentPreventiveTab } from "./ComponentPreventiveTab";
import { COMPONENT_DEFECTS } from "../data/componentDefects";
import {
  Info,
  Layers,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Search,
  Clock,
  Wrench,
  HelpCircle,
  Send,
  Loader2,
  Sparkles,
  Link2,
  Ruler,
  ArrowUpRight,
  ClipboardList,
  CheckCircle2,
  RefreshCw,
  Calendar,
  ChevronRight,
  Gauge,
  Cpu,
  Globe,
  ExternalLink,
  Bot,
  ChevronDown,
} from "lucide-react";

interface PartCardProps {
  part: EnginePartData;
  onSelectConnectedPart: (id: PartId) => void;
  onOpenCitation: (docId: string) => void;
  onOpenSpecsSheet?: () => void;
  historyLogs?: ComponentHistoryEntry[];
  onAddLog?: (entry: ComponentHistoryEntry) => void;
  userSession?: UserSession;
  engineId?: string;
  tailNumber?: string;
  engineCycles?: number;
  engineHours?: number;
  preventiveTasks?: PreventiveMaintenanceTask[];
  onSignOffPreventiveTask?: (taskId: string, record: PMSignOffRecord) => void;
  onOpenFullPreventiveSchedule?: () => void;
  activeSubTab?: "specs" | "preventive" | "lifetracker" | "history";
  onSubTabChange?: (tab: "specs" | "preventive" | "lifetracker" | "history") => void;
  partStatus?: PartStatus;
  allPartStatuses?: Record<PartId, PartStatus>;
  onUpdatePartStatus?: (partId: PartId, status: PartStatus) => void;
  openCases?: CaseLogEntry[];
  onSaveCaseLog?: (entry: CaseLogEntry) => void;
  onOpenAICopilot?: (prompt?: string) => void;
}

const DEFAULT_PART_PARAMETER: Record<PartId, { damageType: DamageType; unit: MeasurementUnit; label: string; placeholder: string }> = {
  fan_blades: { damageType: "leading_edge_nick", unit: "depth_mm", label: "Leading Edge Nick Depth (mm)", placeholder: "e.g. 1.9" },
  fan_case: { damageType: "dent", unit: "depth_mm", label: "Containment Casing Dent Depth (mm)", placeholder: "e.g. 3.2" },
  fan_drive_gear: { damageType: "vibration", unit: "n1_units", label: "FDGS / N1 Spool Vibration (N1 units)", placeholder: "e.g. 2.8" },
  lpc: { damageType: "blade_nick", unit: "depth_mm", label: "LPC Booster Airfoil Nick Depth (mm)", placeholder: "e.g. 0.9" },
  hpc: { damageType: "blade_nick", unit: "depth_mm", label: "HPC Core Airfoil Nick Depth (mm)", placeholder: "e.g. 1.2" },
  combustor: { damageType: "coating_loss", unit: "percent_area", label: "Combustor Liner TBC Spallation (% area)", placeholder: "e.g. 18" },
  hpt: { damageType: "coating_loss", unit: "percent_area", label: "HPT Blade TBC Coating Loss (% area)", placeholder: "e.g. 35" },
  lpt: { damageType: "coating_loss", unit: "percent_area", label: "LPT Airfoil TBC Coating Loss (% area)", placeholder: "e.g. 15" },
  exhaust: { damageType: "dent", unit: "depth_mm", label: "Exhaust Mixer / Cone Dent Depth (mm)", placeholder: "e.g. 2.0" },
  oil_system: { damageType: "leak", unit: "drops_per_min", label: "AGB / Scavenge Oil Seepage (drops/min)", placeholder: "e.g. 18" },
};

export function PartCard({
  part,
  onSelectConnectedPart,
  onOpenCitation,
  onOpenSpecsSheet,
  historyLogs = [],
  onAddLog,
  userSession,
  engineId = "VT-DEM1-ENG1",
  tailNumber = "VT-ITG",
  engineCycles = 5120,
  engineHours = 9472,
  preventiveTasks = [],
  onSignOffPreventiveTask,
  onOpenFullPreventiveSchedule,
  activeSubTab,
  onSubTabChange,
  partStatus = "default",
  allPartStatuses,
  onUpdatePartStatus,
  openCases = [],
  onSaveCaseLog,
  onOpenAICopilot,
}: PartCardProps) {
  const [internalTab, setInternalTab] = useState<"specs" | "preventive" | "lifetracker" | "history">("specs");
  const cardTab = activeSubTab !== undefined ? activeSubTab : internalTab;
  const setCardTab = onSubTabChange || setInternalTab;
  const [showDefectManualView, setShowDefectManualView] = useState(false);

  // Interactive Field Measurement / Micrometer Input State
  const [showGaugeInput, setShowGaugeInput] = useState(false);
  const [gaugeDamageType, setGaugeDamageType] = useState<DamageType>(
    DEFAULT_PART_PARAMETER[part.id]?.damageType || "leading_edge_nick"
  );
  const [gaugeUnit, setGaugeUnit] = useState<MeasurementUnit>(
    DEFAULT_PART_PARAMETER[part.id]?.unit || "depth_mm"
  );
  const [gaugeValue, setGaugeValue] = useState<string>("");
  const [gaugeZone, setGaugeZone] = useState<string>(part.defaultZone);
  const [gaugeSuccessBanner, setGaugeSuccessBanner] = useState<string | null>(null);

  // Interactive Mandatory Rectification Worksheet State
  const [showRectificationForm, setShowRectificationForm] = useState(false);
  const [rectActionType, setRectActionType] = useState<string>("On-Wing Cold Blend & Polish Repair (AMM Task 72-00-300)");
  const [rectPostValue, setRectPostValue] = useState<string>("0.0");
  const [rectWorkOrder, setRectWorkOrder] = useState<string>(
    `WO-RECT-${part.id.toUpperCase().slice(0, 4)}-${engineCycles}`
  );
  const [rectLicenseId, setRectLicenseId] = useState<string>(
    userSession?.badge || "DGCA AME #8842"
  );
  const [rectRemovedSn, setRectRemovedSn] = useState<string>(
    `PWA-${part.id.toUpperCase().slice(0, 4)}-1942`
  );
  const [rectInstalledSn, setRectInstalledSn] = useState<string>(
    `PWA-${part.id.toUpperCase().slice(0, 4)}-8804`
  );
  const [rectForm1Cert, setRectForm1Cert] = useState<string>("EASA Form 1 / FAA 8130-3 #PWA-2026-991");
  const [rectNotes, setRectNotes] = useState<string>(
    "Completed AMM rectification procedure. FPI / NDT verified zero crack indication and full compliance with dispatch limits."
  );
  const [rectError, setRectError] = useState<string | null>(null);

  // Reset part-specific defaults when switching components
  useEffect(() => {
    const def = DEFAULT_PART_PARAMETER[part.id] || DEFAULT_PART_PARAMETER.fan_blades;
    setGaugeDamageType(def.damageType);
    setGaugeUnit(def.unit);
    setGaugeValue("");
    setGaugeZone(part.defaultZone);
    setGaugeSuccessBanner(null);
    setShowRectificationForm(false);
    setRectError(null);
    setRectWorkOrder(`WO-RECT-${part.id.toUpperCase().slice(0, 4)}-${engineCycles}`);
    setRectPostValue("0.0");
    if (part.id === "oil_system") {
      setRectActionType("B-Nut Union Re-Torque & Seal Replacement (AMM Task 79-00-200)");
    } else if (part.id === "hpt" || part.id === "combustor") {
      setRectActionType("QEC / Line Replaceable Unit Component Swap (AMM Task 72-00-400)");
    } else if (part.id === "fan_drive_gear") {
      setRectActionType("Trim Balance & Chip Detector Verification (AMM Task 77-10-00)");
    } else {
      setRectActionType("On-Wing Cold Blend & Polish Repair (AMM Task 72-00-300)");
    }
  }, [part.id, part.defaultZone, engineCycles]);

  // Live deterministic AMM rule evaluation for the Field Gauge Input
  const liveGaugeEvaluation = useMemo(() => {
    const parsed = parseFloat(gaugeValue);
    if (isNaN(parsed) || parsed < 0) return null;
    const checkPart = gaugeDamageType === "vibration" ? "engine" : part.id;
    return evaluateLimitsCheck([
      {
        id: "live-gauge-preview",
        part: checkPart,
        damageType: gaugeDamageType,
        zone: gaugeZone || part.defaultZone,
        measurement: { value: parsed, unit: gaugeUnit },
      },
    ]);
  }, [gaugeValue, gaugeDamageType, gaugeUnit, gaugeZone, part.id, part.defaultZone]);

  // Live post-repair measurement validation for the Rectification Worksheet
  const activeDefectFinding = useMemo(() => {
    const matchingCase = openCases.find((c) => c.findings.some((f) => f.part === part.id));
    return matchingCase?.findings.find((f) => f.part === part.id);
  }, [openCases, part.id]);

  const rectDamageType: DamageType = activeDefectFinding?.damageType || DEFAULT_PART_PARAMETER[part.id]?.damageType || "leading_edge_nick";
  const rectUnit: MeasurementUnit = activeDefectFinding?.measurement?.unit || DEFAULT_PART_PARAMETER[part.id]?.unit || "depth_mm";

  const postRepairEvaluation = useMemo(() => {
    const parsed = parseFloat(rectPostValue);
    if (isNaN(parsed) || parsed < 0) return null;
    const checkPart = rectDamageType === "vibration" ? "engine" : part.id;
    return evaluateLimitsCheck([
      {
        id: "post-repair-check",
        part: checkPart,
        damageType: rectDamageType,
        zone: part.defaultZone,
        measurement: { value: parsed, unit: rectUnit },
      },
    ]);
  }, [rectPostValue, rectDamageType, rectUnit, part.id, part.defaultZone]);

  // Active defect information for the selected part (dynamically overlaid with the engine's actual open case if present)
  const defectInfo = useMemo(() => {
    const baseDefect = COMPONENT_DEFECTS[part.id];
    const matchingCase = openCases.find((c) =>
      c.findings.some((f) => f.part === part.id)
    );
    if (!matchingCase) return baseDefect;

    const finding = matchingCase.findings.find((f) => f.part === part.id);
    const matchingRow =
      matchingCase.limitsRows.find(
        (r) =>
          r.component.toLowerCase().includes(part.name.split(" ")[0].toLowerCase()) ||
          r.damageType === finding?.damageType
      ) || matchingCase.limitsRows[0];

    const isCritical = matchingCase.overallLevel >= 3;
    const damageLabel = finding?.damageType
      ? finding.damageType.replace(/_/g, " ").toUpperCase()
      : "ANOMALY";
    const measuredStr = finding?.measurement
      ? `${finding.measurement.value} ${finding.measurement.unit.replace(/_/g, " ")}`
      : matchingRow?.measured || "Confirmed finding";

    return {
      ...baseDefect,
      defectTitle: `${part.name}: ${damageLabel} in ${finding?.zone || part.defaultZone} (${measuredStr})`,
      findings: `${matchingCase.summary} [Measured: ${measuredStr} • Limit Band: ${matchingRow?.limitBandApplied || "Evaluated"}]`,
      isFixRequired: isCritical,
      fixDetermination: isCritical
        ? `LEVEL ${matchingCase.overallLevel} — MANDATORY FIX BEFORE FLIGHT (AOG)`
        : `LEVEL ${matchingCase.overallLevel} — ON-WING BLEND / INSPECTION REQUIRED`,
      fixDeterminationDescription:
        matchingRow?.notes || matchingCase.aiExplanation || baseDefect.fixDeterminationDescription,
      severity: isCritical ? ("critical" as const) : ("urgent" as const),
      sourceDocId: matchingRow?.sourceDocId || baseDefect.sourceDocId,
      bulletinRef: `Active Case ${matchingCase.id} • ${baseDefect.bulletinRef}`,
    };
  }, [part.id, part.name, part.defaultZone, openCases]);

  const isPartAffected = partStatus === "affected";
  const isPartInspect = partStatus === "inspect";
  const shouldShowDefectBanner = isPartAffected || isPartInspect || showDefectManualView;

  // Check if other components in the engine have active Red/Amber warnings
  const otherAffectedParts = useMemo(() => {
    if (!allPartStatuses) return [];
    return (Object.entries(allPartStatuses) as [PartId, PartStatus][])
      .filter(([id, status]) => (status === "affected" || status === "inspect") && id !== part.id)
      .map(([id]) => id);
  }, [allPartStatuses, part.id]);

  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundedSource[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [isOfflineSample, setIsOfflineSample] = useState(false);
  const [answerProvider, setAnswerProvider] = useState<string | undefined>(undefined);
  const [answerModel, setAnswerModel] = useState<string | undefined>(undefined);
  const [answerLatencyMs, setAnswerLatencyMs] = useState<number | undefined>(undefined);
  const [preferredProvider, setPreferredProvider] = useState<AIProviderPreference>(() => {
    const saved = localStorage.getItem("engineiq_preferred_ai_provider");
    if (saved === "gemini" || saved === "groq" || saved === "auto") return saved;
    return "auto";
  });
  const [apiError, setApiError] = useState<{
    type: string;
    message: string;
    attemptErrors?: string[];
  } | null>(null);

  // Scope and normalize history logs strictly to the current engine's identity & cycle count
  const scopedHistoryLogs = useMemo(() => {
    // 1. Keep user-recorded logs only if they belong to this exact engineId
    const relevantLogs = historyLogs.filter((log) => {
      const isUserCreated =
        log.id.startsWith("LOG-MAN-") ||
        log.id.startsWith("LOG-RECT-") ||
        log.id.startsWith("LOG-PM-") ||
        log.id.startsWith("LOG-CUSTOM-") ||
        (log.engineId && log.engineId !== "VT-DEM1-ENG1");
      if (isUserCreated) {
        return log.engineId === engineId;
      }
      return true;
    });

    // 2. Normalize baseline seeded logs so their CSN, FH, and tailNumber match this engine
    const partIndexTracker: Record<string, number> = {};
    return relevantLogs.map((log) => {
      const isBaseline =
        !log.id.startsWith("LOG-MAN-") &&
        !log.id.startsWith("LOG-RECT-") &&
        !log.id.startsWith("LOG-PM-") &&
        !log.id.startsWith("LOG-CUSTOM-") &&
        log.engineId === "VT-DEM1-ENG1";
      if (!isBaseline) return log;

      const idx = partIndexTracker[log.partId] || 0;
      partIndexTracker[log.partId] = idx + 1;
      const cycleOffsets = [14, 58, 290, 920];
      const offset = cycleOffsets[idx] ?? (idx + 1) * 350;
      const adjustedCycles = Math.max(120, engineCycles - offset);
      const adjustedHours = Math.round(adjustedCycles * 1.85);

      return {
        ...log,
        engineId,
        tailNumber,
        flightCycles: adjustedCycles,
        flightHours: adjustedHours,
        findingsSummary: log.findingsSummary.replace("flight AI-402", `aircraft ${tailNumber}`),
      };
    });
  }, [historyLogs, engineId, tailNumber, engineCycles]);

  // Compute logs for this component
  const componentLogs = useMemo(
    () => scopedHistoryLogs.filter((log) => log.partId === part.id),
    [scopedHistoryLogs, part.id]
  );
  const latestLog = componentLogs[0];

  // Compute LLP parameters for this component
  const isLLP = !!part.lifeLimitCycles;
  const percentUsed = isLLP
    ? Math.min(100, Math.round(((engineCycles || 0) / (part.lifeLimitCycles || 1)) * 1000) / 10)
    : null;

  // Compute PM tasks for this component
  const componentPMTasks = preventiveTasks.filter(
    (t) => t.partId === part.id || t.partId === "all"
  );
  const hasDueSoonPM = componentPMTasks.some(
    (t) => (t.nextDueCycles - engineCycles) <= 200 || t.complianceStatus === "due_soon"
  );

  const handleAsk = async (qText?: string) => {
    const query = qText || question;
    if (!query.trim()) return;
    setIsAsking(true);
    setAnswer(null);
    setSources([]);
    setSearchQueries([]);
    setApiError(null);
    setAnswerProvider(undefined);
    setAnswerModel(undefined);
    setAnswerLatencyMs(undefined);

    try {
      const snippets = await retrieveRelevantDocuments({ partId: part.id, freeText: query }, 3);
      const res = await askAboutPart(part, query, snippets, preferredProvider);
      if (res.liveError) {
        setAnswer(null);
        setIsOfflineSample(false);
        setApiError({
          type: res.errorType || "LIVE_PROVIDERS_FAILED",
          message: res.errorMessage || "All live AI providers failed.",
          attemptErrors: res.attemptErrors || [],
        });
      } else {
        setAnswer(res.text);
        setSources(res.sources || []);
        setSearchQueries(res.searchQueries || []);
        setIsOfflineSample(res.isOfflineSample);
        setAnswerProvider(res.provider);
        setAnswerModel(res.modelUsed);
        setAnswerLatencyMs(res.latencyMs);
      }
    } catch (err: any) {
      setAnswer(null);
      setIsOfflineSample(false);
      setApiError({
        type: "NETWORK_ERROR",
        message: err.message || "Could not reach live AI service.",
      });
    } finally {
      setIsAsking(false);
    }
  };

  const renderTextWithCitations = (text: string) => {
    // Replace [DEMO-...] with clickable badge
    const parts = text.split(/(\[DEMO-[A-Z0-9-]+\])/g);
    return parts.map((seg, idx) => {
      if (seg.startsWith("[DEMO-") && seg.endsWith("]")) {
        const cleanId = seg.slice(1, -1);
        return (
          <button
            key={idx}
            onClick={() => onOpenCitation(cleanId)}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-semibold text-sky-400 bg-sky-950/80 border border-sky-600/50 rounded hover:bg-sky-900 transition underline underline-offset-2"
          >
            {seg}
          </button>
        );
      }
      return <span key={idx}>{seg}</span>;
    });
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* Component Subsystem Selector (Responsive, contained within widget) */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono shadow-md">
        <div className="flex items-center gap-2 w-full min-w-0">
          <label htmlFor="select-component-switcher" className="text-[10px] uppercase tracking-wider font-bold text-slate-400 shrink-0">
            Subsystem:
          </label>
          <div className="relative flex-1 min-w-0">
            <select
              id="select-component-switcher"
              value={part.id}
              onChange={(e) => onSelectConnectedPart(e.target.value as PartId)}
              className="w-full min-w-0 bg-slate-950 border border-slate-700 hover:border-sky-500/70 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-500 cursor-pointer truncate appearance-none transition shadow-inner"
            >
              {Object.values(ENGINE_PARTS).map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">
                  {p.name} ({p.defaultZone})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Subsystem Airworthiness Status & Field Measurement Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isPartAffected
                ? "bg-rose-500 animate-ping"
                : isPartInspect
                ? "bg-amber-400"
                : "bg-emerald-500 shadow-sm shadow-emerald-500/50"
            }`}
          />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Status:{" "}
            {isPartAffected ? (
              <span className="text-rose-400 font-extrabold">Red Alert (Action Required)</span>
            ) : isPartInspect ? (
              <span className="text-amber-400 font-extrabold">Amber Watch (Inspect)</span>
            ) : (
              <span className="text-emerald-400 font-extrabold">Dispatch Ready (Normal)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="btn-toggle-field-gauge"
            onClick={() => setShowGaugeInput(!showGaugeInput)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              showGaugeInput
                ? "bg-sky-500 text-white border-sky-400 shadow"
                : "bg-sky-950/90 hover:bg-sky-900 text-sky-300 border-sky-700/80"
            }`}
            title="Enter a live physical micrometer or telemetry gauge reading on this component to evaluate AMM limits"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{showGaugeInput ? "Close Gauge Input" : "Enter Field Measurement"}</span>
          </button>

          {!isPartAffected && !isPartInspect && (
            <button
              onClick={() => setShowDefectManualView(!showDefectManualView)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer"
              title="Inspect standard Airbus/PW AMM defect criteria and rectification procedures"
            >
              {showDefectManualView ? "Hide AMM Limits" : "AMM Limits"}
            </button>
          )}
        </div>
      </div>

      {/* Interactive On-Wing Field Measurement / Micrometer Input Panel */}
      {showGaugeInput && (
        <div className="p-4 rounded-xl bg-slate-900/95 border-2 border-sky-500/70 shadow-xl space-y-3.5 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-sky-400" />
              <div>
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  On-Wing Micrometer & Telemetry Gauge Entry ({part.name})
                </h4>
                <p className="text-[11px] text-slate-400 font-sans">
                  Enter a physical measurement to evaluate against deterministic AMM rules and update 3D status.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              {tailNumber} • {engineId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">
                Inspection Parameter
              </label>
              <select
                id="select-gauge-parameter"
                value={gaugeDamageType}
                onChange={(e) => {
                  const dt = e.target.value as DamageType;
                  setGaugeDamageType(dt);
                  if (dt === "crack") setGaugeUnit("length_mm");
                  else if (dt === "coating_loss") setGaugeUnit("percent_area");
                  else if (dt === "leak") setGaugeUnit("drops_per_min");
                  else if (dt === "vibration") setGaugeUnit("n1_units");
                  else setGaugeUnit("depth_mm");
                }}
                className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="leading_edge_nick">Leading Edge Nick (mm depth)</option>
                <option value="crack">Structural Crack (mm length)</option>
                <option value="tip_curl">Blade Tip Curl (mm deflection)</option>
                <option value="dent">Containment / Casing Dent (mm depth)</option>
                <option value="blade_nick">Compressor Airfoil Nick (mm depth)</option>
                <option value="coating_loss">TBC Thermal Coating Loss (% area)</option>
                <option value="leak">Oil System Seepage (drops/min)</option>
                <option value="vibration">N1 Spool Vibration (N1 units)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">
                Measured Reading ({formatUnit(gaugeUnit)}) *
              </label>
              <input
                id="input-field-gauge-value"
                type="number"
                step="0.1"
                min="0"
                value={gaugeValue}
                onChange={(e) => {
                  setGaugeValue(e.target.value);
                  setGaugeSuccessBanner(null);
                }}
                placeholder={DEFAULT_PART_PARAMETER[part.id]?.placeholder || "e.g. 2.1"}
                className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold tabular-nums focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">
                Component Zone / Stage
              </label>
              <input
                id="input-field-gauge-zone"
                type="text"
                value={gaugeZone}
                onChange={(e) => setGaugeZone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Deterministic AMM Rule Evaluation Preview */}
          {liveGaugeEvaluation && liveGaugeEvaluation.rows[0] && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                liveGaugeEvaluation.overallLevel >= 3
                  ? "bg-rose-950/70 border-rose-500/80 text-rose-200"
                  : liveGaugeEvaluation.overallLevel === 2
                  ? "bg-amber-950/70 border-amber-500/80 text-amber-200"
                  : "bg-emerald-950/60 border-emerald-500/70 text-emerald-200"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold uppercase text-[11px]">
                  Live AMM Rule Evaluation: Level {liveGaugeEvaluation.overallLevel} —{" "}
                  {liveGaugeEvaluation.overallLevel >= 3
                    ? "RED LIGHT (MANDATORY FIX / AOG)"
                    : liveGaugeEvaluation.overallLevel === 2
                    ? "AMBER LIGHT (ON-WING BLEND / WATCH)"
                    : "GREEN (WITHIN SERVICEABLE LIMITS)"}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenCitation(liveGaugeEvaluation.rows[0].sourceDocId)}
                  className="px-2 py-0.5 rounded bg-slate-950 text-sky-400 border border-sky-700/60 text-[10px] hover:underline"
                >
                  [{liveGaugeEvaluation.rows[0].sourceDocId}]
                </button>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                <strong>Band Applied:</strong> {liveGaugeEvaluation.rows[0].limitBandApplied} — {liveGaugeEvaluation.rows[0].notes}
              </p>
            </div>
          )}

          {gaugeSuccessBanner && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/70 text-xs text-emerald-200 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{gaugeSuccessBanner}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowGaugeInput(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-commit-field-measurement"
              disabled={!liveGaugeEvaluation}
              onClick={() => {
                if (!liveGaugeEvaluation || !liveGaugeEvaluation.rows[0]) return;
                const parsedVal = parseFloat(gaugeValue);
                const row = liveGaugeEvaluation.rows[0];
                const lvl = liveGaugeEvaluation.overallLevel;
                const newStatus: PartStatus =
                  lvl >= 3 ? "affected" : lvl === 2 ? "inspect" : "default";

                onUpdatePartStatus?.(part.id, newStatus);

                // Record to Component History Logbook
                onAddLog?.({
                  id: `LOG-MAN-${Date.now().toString(36)}`,
                  partId: part.id,
                  engineId,
                  tailNumber,
                  date: new Date().toISOString().split("T")[0],
                  flightHours: engineHours,
                  flightCycles: engineCycles,
                  logType: "field_measurement",
                  status: lvl >= 2 ? "discrepancy" : "passed",
                  workOrderNumber: `WO-INSP-${part.id.toUpperCase().slice(0, 4)}-${engineCycles}`,
                  ammTaskRef: row.sourceDocId,
                  technicianName: userSession?.name || "Line Engineer",
                  technicianBadge: userSession?.badge || "DGCA AME #8842",
                  itemsChecked: [
                    `Measured ${formatDamageType(gaugeDamageType)}: ${parsedVal} ${formatUnit(gaugeUnit)} in ${gaugeZone}`,
                    `Evaluated against ${row.sourceDocId} (${row.limitBandApplied})`,
                  ],
                  findingsSummary: `Field Gauge Check: ${formatDamageType(gaugeDamageType)} measured at ${parsedVal} ${formatUnit(gaugeUnit)} -> Level ${lvl}`,
                  technicianNotes: row.notes,
                });

                // If Level >= 2, also create an active CaseLogEntry so the Defect Banner & Engine Status reflect the new measurement
                if (lvl >= 2 && onSaveCaseLog) {
                  const newCase: CaseLogEntry = {
                    id: `CASE-FLD-${Date.now().toString().slice(-4)}`,
                    timestamp: new Date().toISOString(),
                    aircraftType: "Airbus A320neo Family (PW1100G-JM)",
                    tailNumber,
                    engineId,
                    enginePosition: engineId.endsWith("ENG1") ? "No.1" : "No.2",
                    eventType:
                      gaugeDamageType === "leak"
                        ? "oil_leak"
                        : gaugeDamageType === "vibration"
                        ? "vibration"
                        : gaugeDamageType === "coating_loss"
                        ? "hot_section"
                        : "fod",
                    summary: `On-wing inspection on ${part.name} (${gaugeZone}) recorded ${formatDamageType(
                      gaugeDamageType
                    )} of ${parsedVal} ${formatUnit(gaugeUnit)}.`,
                    overallLevel: lvl,
                    findings: [
                      {
                        id: `f-fld-${Date.now()}`,
                        part: part.id,
                        damageType: gaugeDamageType,
                        zone: gaugeZone,
                        measurement: { value: parsedVal, unit: gaugeUnit },
                        isAiSuggested: false,
                      },
                    ],
                    limitsRows: [row],
                    engineerName: userSession?.name || "Certifying Engineer",
                    engineerId: userSession?.badge || "DGCA AME #8842",
                    decision: "Approved",
                    draftTechLog: `FIELD MEASUREMENT LOGGED: ${tailNumber} (${engineId}) ${part.name} ${formatDamageType(
                      gaugeDamageType
                    )} measured ${parsedVal} ${formatUnit(gaugeUnit)}. Classified Level ${lvl} per [${row.sourceDocId}].`,
                    aiExplanation: row.notes,
                  };
                  onSaveCaseLog(newCase);
                }

                setGaugeSuccessBanner(
                  `Recorded ${parsedVal} ${formatUnit(gaugeUnit)} (Level ${lvl}). 3D component status updated to ${newStatus.toUpperCase()}.`
                );
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-mono font-bold text-xs shadow-md transition cursor-pointer"
            >
              Commit Measurement & Update 3D Status
            </button>
          </div>
        </div>
      )}

      {/* 1. Global Attention Strip: When other components have active red/amber warning lights */}
      {otherAffectedParts.length > 0 && !isPartAffected && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 border-2 border-rose-600/70 shadow-lg flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-rose-300 font-bold tracking-wider block">
                ⚠ {otherAffectedParts.length} Component Flagged with Red Warning Lights:
              </span>
              <p className="text-xs text-white font-semibold truncate mt-0.5 font-sans">
                {otherAffectedParts.map((id) => ENGINE_PARTS[id]?.name || id).join(", ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectConnectedPart(otherAffectedParts[0])}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-md shadow-rose-950/50 transition cursor-pointer"
            title="Inspect the affected component and its required fix"
          >
            <span>Inspect Defect & Fix</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Prominent Defect & Fix Required Alert Banner */}
      {shouldShowDefectBanner && (
        <div
          className={`p-4 rounded-xl border-2 shadow-2xl space-y-3.5 animate-scale-in ${
            isPartAffected
              ? "bg-gradient-to-b from-rose-950/90 via-slate-900 to-slate-950 border-rose-500 shadow-rose-950/60"
              : isPartInspect
              ? "bg-gradient-to-b from-amber-950/90 via-slate-900 to-slate-950 border-amber-500 shadow-amber-950/60"
              : "bg-gradient-to-b from-sky-950/80 via-slate-900 to-slate-950 border-sky-500/80 shadow-sky-950/40"
          }`}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  isPartAffected
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : isPartInspect
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                }`}
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                      isPartAffected
                        ? "bg-rose-500 text-white shadow animate-pulse"
                        : isPartInspect
                        ? "bg-amber-500 text-slate-950 font-extrabold"
                        : "bg-sky-500 text-slate-950 font-extrabold"
                    }`}
                  >
                    {isPartAffected
                      ? "RED LIGHT • ACTION REQUIRED BEFORE DISPATCH"
                      : isPartInspect
                      ? "AMBER LIGHT • SCHEDULED INSPECTION"
                      : "AMM REFERENCE GUIDELINES • RECTIFICATION PROTOCOL"}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {part.defaultZone}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">
                  {defectInfo?.defectTitle || `${part.name} Active Airworthiness Defect`}
                </h3>
              </div>
            </div>

            <button
              onClick={() => onOpenCitation(defectInfo?.sourceDocId || "DEMO-AMM-72-01")}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white border border-sky-800/60 font-mono text-xs flex items-center gap-1 transition cursor-pointer"
              title="Open Governing Maintenance Manual"
            >
              <span>{defectInfo?.governingManual || "AMM 72-00-00"}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Core Findings & Telemetry Measurements */}
          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Observed Defect & Measured Findings:
            </span>
            <p className="text-xs text-rose-200 font-mono leading-relaxed">
              {defectInfo?.findings}
            </p>
          </div>

          {/* Airworthiness Determination (Does it need to be fixed or not?) */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-3">
            <div
              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                defectInfo?.isFixRequired
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {defectInfo?.isFixRequired ? (
                <AlertOctagon className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono uppercase font-bold text-slate-300">
                  Airworthiness Fix Determination:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    defectInfo?.isFixRequired
                      ? "bg-rose-950 text-rose-300 border border-rose-700"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  }`}
                >
                  {defectInfo?.fixDetermination}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {defectInfo?.fixDeterminationDescription}
              </p>
            </div>
          </div>

          {/* Step-by-Step Required Action / Rectification Procedure */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-sky-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Required Rectification Procedure (How to Fix This):
            </span>
            <div className="space-y-1.5 pl-1">
              {defectInfo?.requiredAction.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-sans">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Interactive Rectification & Post-Repair Measurement Worksheet */}
          {(isPartAffected || isPartInspect) && onUpdatePartStatus && showRectificationForm && (
            <div className="p-3.5 rounded-xl bg-slate-950/95 border-2 border-emerald-500/70 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Mandatory AMM Rectification & Post-Repair Sign-Off Worksheet
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Part-145 / CAR-145 CRS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    1. Rectification Action Performed *
                  </label>
                  <select
                    id="select-rect-action"
                    value={rectActionType}
                    onChange={(e) => setRectActionType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="On-Wing Cold Blend & Polish Repair (AMM Task 72-00-300)">
                      On-Wing Cold Blend & Polish Repair (AMM Task 72-00-300)
                    </option>
                    <option value="QEC / Line Replaceable Unit Component Swap (AMM Task 72-00-400)">
                      QEC / Line Replaceable Unit Component Swap (AMM Task 72-00-400)
                    </option>
                    <option value="B-Nut Union Re-Torque & Seal Replacement (AMM Task 79-00-200)">
                      B-Nut Union Re-Torque & Seal Replacement (AMM Task 79-00-200)
                    </option>
                    <option value="Trim Balance & Chip Detector Verification (AMM Task 77-10-00)">
                      Trim Balance & Chip Detector Verification (AMM Task 77-10-00)
                    </option>
                    <option value="MEL Category C Deferred Dispatch (Within Allowable Limit)">
                      MEL Category C Deferred Dispatch (Within Allowable Limit)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    2. Post-Repair Measurement ({formatUnit(rectUnit)}) *
                  </label>
                  <input
                    id="input-rect-post-value"
                    type="number"
                    step="0.1"
                    min="0"
                    value={rectPostValue}
                    onChange={(e) => {
                      setRectPostValue(e.target.value);
                      if (rectError) setRectError(null);
                    }}
                    placeholder="0.0"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    3. Work Order Reference # *
                  </label>
                  <input
                    id="input-rect-work-order"
                    type="text"
                    value={rectWorkOrder}
                    onChange={(e) => {
                      setRectWorkOrder(e.target.value);
                      if (rectError) setRectError(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                {rectActionType.includes("Swap") && (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">
                        Removed Unserviceable S/N *
                      </label>
                      <input
                        type="text"
                        value={rectRemovedSn}
                        onChange={(e) => setRectRemovedSn(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">
                        Installed Serviceable S/N & Form 1 *
                      </label>
                      <input
                        type="text"
                        value={`${rectInstalledSn} (${rectForm1Cert})`}
                        onChange={(e) => setRectInstalledSn(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    4. Certifying AME License ID *
                  </label>
                  <input
                    id="input-rect-license"
                    type="text"
                    value={rectLicenseId}
                    onChange={(e) => {
                      setRectLicenseId(e.target.value);
                      if (rectError) setRectError(null);
                    }}
                    placeholder="e.g. DGCA AME #8842"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    5. NDT / Rectification Verification Remarks
                  </label>
                  <input
                    id="input-rect-notes"
                    type="text"
                    value={rectNotes}
                    onChange={(e) => setRectNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Post-Repair AMM Limit Check Indicator */}
              {postRepairEvaluation && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] font-mono flex items-center justify-between ${
                    postRepairEvaluation.overallLevel <= 1
                      ? "bg-emerald-950/70 border-emerald-600/70 text-emerald-300"
                      : postRepairEvaluation.overallLevel === 2
                      ? "bg-amber-950/70 border-amber-600/70 text-amber-300"
                      : "bg-rose-950/80 border-rose-500 text-rose-300"
                  }`}
                >
                  <span>
                    Post-Repair AMM Check: <strong>{rectPostValue} {formatUnit(rectUnit)}</strong> &rarr; Level {postRepairEvaluation.overallLevel} (
                    {postRepairEvaluation.overallLevel <= 1
                      ? "Serviceable — Ready to Clear Red Light"
                      : postRepairEvaluation.overallLevel === 2
                      ? "Within Level 2 Blend/Watch Envelope"
                      : "Exceeds AMM Limit — Must Reduce Below Threshold"}
                    )
                  </span>
                </div>
              )}

              {rectError && (
                <div className="p-2.5 rounded-lg bg-rose-950 border border-rose-500 text-xs text-rose-200 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{rectError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRectificationForm(false);
                    setRectError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-rectification-signoff"
                  onClick={() => {
                    const parsedPost = parseFloat(rectPostValue);
                    if (isNaN(parsedPost) || parsedPost < 0) {
                      setRectError("Please enter a valid numeric Post-Repair Measurement.");
                      return;
                    }
                    if (!rectWorkOrder.trim() || !rectLicenseId.trim()) {
                      setRectError("Work Order Reference # and Certifying AME License ID are mandatory.");
                      return;
                    }
                    if (postRepairEvaluation && postRepairEvaluation.overallLevel >= 3) {
                      setRectError(
                        `Post-repair value (${parsedPost} ${formatUnit(
                          rectUnit
                        )}) still triggers Level ${postRepairEvaluation.overallLevel} grounding. Enter a compliant post-repair reading (e.g. 0.0) after rectification.`
                      );
                      return;
                    }

                    onUpdatePartStatus(part.id, "default");
                    onAddLog?.({
                      id: `LOG-RECT-${Date.now().toString(36)}`,
                      partId: part.id,
                      engineId,
                      tailNumber,
                      date: new Date().toISOString().split("T")[0],
                      flightHours: engineHours,
                      flightCycles: engineCycles,
                      logType: "defect_rectification",
                      status: rectActionType.includes("Swap") ? "replaced" : "repaired",
                      workOrderNumber: rectWorkOrder.trim(),
                      ammTaskRef: defectInfo?.governingManual || "AMM 72-00-00",
                      technicianName: userSession?.name || "Certifying Engineer",
                      technicianBadge: rectLicenseId.trim(),
                      itemsChecked: [
                        `Action: ${rectActionType}`,
                        `Post-Repair Reading: ${parsedPost} ${formatUnit(rectUnit)} (Verified Level ${
                          postRepairEvaluation?.overallLevel ?? 0
                        })`,
                        ...(defectInfo?.requiredAction.slice(0, 2) || []),
                      ],
                      findingsSummary: `Rectified (${rectActionType.split("(")[0].trim()}): Post-repair reading ${parsedPost} ${formatUnit(
                        rectUnit
                      )} verified compliant per ${defectInfo?.governingManual || "AMM"}`,
                      technicianNotes: rectNotes.trim(),
                      repairDetails: !rectActionType.includes("Swap")
                        ? {
                            actionTaken: rectActionType,
                            blendedDepthMm: parsedPost,
                            ndtMethod: "FPI / Eddy-Current & Borescope Verification",
                            ndtResult: "Passed — Zero crack or limit exceedance",
                          }
                        : undefined,
                      replacementDetails: rectActionType.includes("Swap")
                        ? {
                            removedPartSerialNumber: rectRemovedSn,
                            installedPartSerialNumber: rectInstalledSn,
                            airworthinessReleaseCert: rectForm1Cert,
                            reasonForRemoval: defectInfo?.defectTitle || "Unserviceable defect exceedance",
                          }
                        : undefined,
                    });
                    setShowRectificationForm(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify Post-Repair Limits & Clear Red Light</span>
                </button>
              </div>
            </div>
          )}

          {/* Bulletin & Regulatory Mandate Footer with Rectification Sign-Off Trigger */}
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-slate-400 truncate">
              Mandate: <strong className="text-slate-300">{defectInfo?.bulletinRef}</strong>
            </span>
            <div className="flex items-center gap-2">
              {(isPartAffected || isPartInspect) && onUpdatePartStatus && !showRectificationForm && (
                <button
                  id="btn-open-rectification-worksheet"
                  onClick={() => setShowRectificationForm(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition cursor-pointer"
                  title="Open Rectification & Post-Repair Measurement Worksheet to sign off fix"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Complete Rectification & Sign Off Fix</span>
                </button>
              )}
              <button
                onClick={() => setCardTab("history")}
                className="text-sky-400 hover:text-white hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>View Logbook</span> &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                {part.defaultZone}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {tailNumber} • {engineId}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{part.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{part.technicalName}</p>
          </div>
          {part.lifeLimitCycles && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-amber-400">LLP Limit</span>
              <p className="text-sm font-bold text-amber-300 font-mono">
                {part.lifeLimitCycles.toLocaleString()} cyc
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs: Specs vs Predictive vs Life Tracker vs History */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
        <button
          id="tab-part-specs"
          onClick={() => setCardTab("specs")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition font-medium ${
            cardTab === "specs"
              ? "bg-sky-500 text-white font-bold shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Specs</span>
          <span className="sm:hidden">Spec</span>
        </button>

        <button
          id="tab-part-preventive"
          onClick={() => setCardTab("preventive")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition font-medium ${
            cardTab === "preventive"
              ? "bg-sky-500 text-white font-bold shadow"
              : "text-slate-400 hover:text-white"
          }`}
          title="Component-wise scheduled predictive maintenance & AMM inspection intervals"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Predictive</span>
          <span className="sm:hidden">PdM</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              cardTab === "preventive"
                ? "bg-white/20 text-white"
                : hasDueSoonPM
                ? "bg-amber-950 text-amber-300 border border-amber-800"
                : "bg-sky-950 text-sky-400 border border-sky-800"
            }`}
          >
            {componentPMTasks.length}
          </span>
        </button>

        <button
          id="tab-part-lifetracker"
          onClick={() => setCardTab("lifetracker")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition font-medium ${
            cardTab === "lifetracker"
              ? "bg-sky-500 text-white font-bold shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Life Tracker</span>
          <span className="sm:hidden">LLP</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              cardTab === "lifetracker"
                ? "bg-white/20 text-white"
                : isLLP
                ? percentUsed! >= 90
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : percentUsed! >= 70
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-sky-950 text-sky-400 border border-sky-800"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {isLLP ? `${percentUsed}%` : "OC"}
          </span>
        </button>

        <button
          id="tab-part-history"
          onClick={() => setCardTab("history")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition font-medium ${
            cardTab === "history"
              ? "bg-sky-500 text-white font-bold shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>History</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              cardTab === "history"
                ? "bg-white/20 text-white"
                : "bg-sky-950 text-sky-400 border border-sky-800"
            }`}
          >
            {componentLogs.length}
          </span>
        </button>
      </div>

      {/* Render Component Preventive Maintenance View if active */}
      {cardTab === "preventive" ? (
        <ComponentPreventiveTab
          part={part}
          engineCycles={engineCycles}
          engineHours={engineHours}
          engineId={engineId}
          tailNumber={tailNumber}
          tasks={preventiveTasks}
          onSignOffTask={onSignOffPreventiveTask || (() => {})}
          onOpenFullSchedule={onOpenFullPreventiveSchedule}
        />
      ) : cardTab === "lifetracker" ? (
        <ComponentLifeTracker
          part={part}
          engineCycles={engineCycles}
          engineId={engineId}
          tailNumber={tailNumber}
          historyLogs={scopedHistoryLogs}
          onSelectComponent={onSelectConnectedPart}
          onOpenHistoryTab={() => setCardTab("history")}
          onOpenCitation={onOpenCitation}
        />
      ) : cardTab === "history" ? (
        <ComponentHistoryView
          part={part}
          historyLogs={scopedHistoryLogs}
          onAddLog={onAddLog || (() => {})}
          userSession={
            userSession || {
              name: "Lead Engineer",
              role: "Engineer",
              homeBase: "Bengaluru (BLR)",
            }
          }
          engineId={engineId}
          tailNumber={tailNumber}
          engineCycles={engineCycles}
        />
      ) : (
        <>
          {/* Quick Component Life & LLP Status Banner on Specs View */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    Component Life (LLP):
                  </span>
                  {isLLP ? (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                        percentUsed! >= 90
                          ? "bg-rose-950 text-rose-400 border border-rose-700/60"
                          : percentUsed! >= 70
                          ? "bg-amber-950 text-amber-400 border border-amber-700/60"
                          : "bg-emerald-950 text-emerald-400 border border-emerald-700/60"
                      }`}
                    >
                      {percentUsed}% Expended
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      On-Condition
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-mono truncate mt-0.5">
                  {isLLP
                    ? `${engineCycles.toLocaleString()} / ${part.lifeLimitCycles!.toLocaleString()} cyc • ${Math.max(
                        0,
                        part.lifeLimitCycles! - engineCycles
                      ).toLocaleString()} cyc remaining`
                    : "No mandatory cycle limit • Monitored via line inspections & NDT"}
                </p>
              </div>
            </div>

            <button
              id="btn-inspect-component-life"
              onClick={() => setCardTab("lifetracker")}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700 text-xs font-mono transition"
            >
              <span>Inspect Life</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Maintenance History Banner on Specs View */}
          {latestLog && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-sky-500/30 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      Latest Check ({latestLog.date}):
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                      {latestLog.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-mono truncate mt-0.5">
                    {latestLog.findingsSummary}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCardTab("history")}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700 text-xs font-mono transition"
              >
                <span>View All ({componentLogs.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 1. What it is and does */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Info className="w-3.5 h-3.5" />
              <span>What It Is and Does</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{part.whatItDoes}</p>
          </div>

          {/* 2. Where it sits */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Layers className="w-3.5 h-3.5" />
              <span>Where It Sits</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{part.whereItSits}</p>
          </div>

      {/* 3. Connected to (Upstream/Downstream) - Clickable to jump 3D */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
          <Link2 className="w-3.5 h-3.5" />
          <span>Connected Subsystems & Hardware</span>
          <span className="text-[10px] text-slate-500 font-normal font-mono">(click to focus in 3D)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {part.connectedTo.map((conn) => (
            <button
              key={conn.id}
              onClick={() => onSelectConnectedPart(conn.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800/90 hover:bg-sky-950/80 text-slate-200 hover:text-sky-300 border border-slate-700/80 hover:border-sky-500/50 transition group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 group-hover:scale-125 transition"></span>
              <span className="font-medium">{conn.label}</span>
              <span className="text-[10px] text-slate-400 font-mono">({conn.relation})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Real Engineering Specifications & Dimensions (PW1100G-JM Benchmark) */}
      {part.dimensions && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 font-mono">
              <Ruler className="w-3.5 h-3.5" />
              <span>Authentic Dimensions & Metallurgy (PW1100G-JM)</span>
            </div>
            {onOpenSpecsSheet && (
              <button
                onClick={onOpenSpecsSheet}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 hover:underline"
              >
                <span>Full Blueprint</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase block">Axial Length</span>
              <span className="font-bold text-slate-200 tabular-nums">{part.dimensions.axialLengthCm} cm</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase block">Outer Diameter</span>
              <span className="font-bold text-sky-400 tabular-nums">Ø {part.dimensions.outerDiameterCm} cm</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase block">Stage / Ratio</span>
              <span className="font-bold text-slate-200">
                {part.dimensions.gearRatio || (part.dimensions.stageCount ? `${part.dimensions.stageCount} stage(s)` : "Casing")}
              </span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase block">Module Mass</span>
              <span className="font-bold text-slate-200 tabular-nums">
                {part.dimensions.weightKg ? `${part.dimensions.weightKg} kg` : "—"}
              </span>
            </div>
          </div>

          <div className="pt-1 space-y-1 text-[11px] font-mono border-t border-slate-800/60">
            <div>
              <span className="text-slate-500">Certified Alloy: </span>
              <span className="text-slate-200 font-semibold">{part.dimensions.primaryAlloy}</span>
            </div>
            {part.dimensions.coatingSpec && (
              <div>
                <span className="text-slate-500">Coating Spec: </span>
                <span className="text-slate-300">{part.dimensions.coatingSpec}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Station: {part.dimensions.stationRange}</span>
              <span>Tolerance: {part.dimensions.tolerancesMm || "±0.05 mm"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Made of & Typical Operating Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Material Composition</span>
          <p className="text-xs text-slate-200 leading-relaxed">{part.madeOf}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Operating Envelope</span>
            <span className="text-[10px] text-amber-400/90 font-mono">illustrative</span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
            <div><span className="text-slate-500">Temp:</span> {part.typicalOperatingConditions.temperature}</div>
            <div><span className="text-slate-500">Pressure:</span> {part.typicalOperatingConditions.pressure}</div>
            <div><span className="text-slate-500">Speed:</span> {part.typicalOperatingConditions.speed}</div>
          </div>
        </div>
      </div>

      {/* 5. How it fails & How it's inspected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>How It Fails</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
            {part.howItFails.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Search className="w-3.5 h-3.5" />
            <span>How It's Inspected</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
            {part.howInspected.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Life basis & Replacement guidance */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Life Basis & Retirement Thresholds</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Cycles vs Hours</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{part.lifeBasis}</p>
        <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2">
          <Wrench className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 italic">
            {part.replacementGuidance}
          </p>
        </div>
      </div>

      {/* 7. Related Incidents */}
      {part.relatedIncidents && part.relatedIncidents.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Typical Related Event Categories</span>
          <div className="flex flex-wrap gap-1.5">
            {part.relatedIncidents.map((inc, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                {inc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 8. Unified AI Copilot Entry Point */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 border border-sky-500/40 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Ask AI Copilot About {part.name}</span>
            </h4>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              Open the multi-turn AI copilot drawer for deep AMM troubleshooting, live search grounding, and LLM failover.
            </p>
          </div>
        </div>

        {onOpenAICopilot && (
          <button
            onClick={() =>
              onOpenAICopilot(
                `What are the AMM damage limits, troubleshooting steps, and active findings for ${part.name} on ${tailNumber}?`
              )
            }
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-mono font-bold text-xs shadow-md transition cursor-pointer whitespace-nowrap"
            title="Open Multi-Turn AI Copilot Drawer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Copilot</span>
          </button>
        )}
      </div>
      </>
      )}
    </div>
  );
}
