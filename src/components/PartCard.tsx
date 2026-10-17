import React, { useState, useMemo } from "react";
import {
  EnginePartData,
  PartId,
  ComponentHistoryEntry,
  UserSession,
  PreventiveMaintenanceTask,
  PMSignOffRecord,
} from "../types";
import { askAboutPart, GroundedSource } from "../services/gemini";
import { retrieveRelevantDocuments } from "../logic/retrieval";
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
}

export function PartCard({
  part,
  onSelectConnectedPart,
  onOpenCitation,
  onOpenSpecsSheet,
  historyLogs = [],
  onAddLog,
  userSession,
  engineId = "VT-DEM1-ENG1",
  tailNumber = "VT-DEM1",
  engineCycles = 5120,
  engineHours = 14220,
  preventiveTasks = [],
  onSignOffPreventiveTask,
  onOpenFullPreventiveSchedule,
  activeSubTab,
  onSubTabChange,
  partStatus = "default",
  allPartStatuses,
  onUpdatePartStatus,
}: PartCardProps) {
  const [internalTab, setInternalTab] = useState<"specs" | "preventive" | "lifetracker" | "history">("specs");
  const cardTab = activeSubTab !== undefined ? activeSubTab : internalTab;
  const setCardTab = onSubTabChange || setInternalTab;
  const [showDefectManualView, setShowDefectManualView] = useState(false);

  // Active defect information for the selected part
  const defectInfo = COMPONENT_DEFECTS[part.id];
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
  const [apiError, setApiError] = useState<{ type: string; message: string } | null>(null);

  // Compute logs for this component
  const componentLogs = historyLogs.filter((log) => log.partId === part.id);
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

    try {
      const snippets = await retrieveRelevantDocuments({ partId: part.id, freeText: query }, 3);
      const res = await askAboutPart(part, query, snippets);
      setAnswer(res.text);
      setSources(res.sources || []);
      setSearchQueries(res.searchQueries || []);
      setIsOfflineSample(res.isOfflineSample);
      if (res.errorType) {
        setApiError({ type: res.errorType, message: res.errorMessage || "" });
      }
    } catch (err: any) {
      setAnswer("Could not reach service. Please verify network connection.");
      setIsOfflineSample(true);
      setApiError({ type: "NETWORK_ERROR", message: err.message || "" });
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

      {/* Subsystem Airworthiness Status Strip (Shown when normal to provide full transparency) */}
      {!isPartAffected && !isPartInspect && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Status: <span className="text-emerald-400 font-extrabold">Dispatch Ready (Normal)</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowDefectManualView(!showDefectManualView)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer"
              title="Inspect standard Airbus/PW AMM defect criteria and rectification procedures"
            >
              {showDefectManualView ? "Hide AMM Fix Criteria" : "View AMM Defect & Fix Guidelines"}
            </button>
            {onUpdatePartStatus && (
              <button
                onClick={() => onUpdatePartStatus(part.id, "affected")}
                className="px-2 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Test: Illuminate this component in red and display mandatory fix procedure"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Simulate Red Alert</span>
              </button>
            )}
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

          {/* Bulletin & Regulatory Mandate Footer with Rectification Sign-Off */}
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-slate-400 truncate">
              Mandate: <strong className="text-slate-300">{defectInfo?.bulletinRef}</strong>
            </span>
            <div className="flex items-center gap-2">
              {(isPartAffected || isPartInspect) && onUpdatePartStatus && (
                <button
                  onClick={() => {
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
                      status: "passed",
                      workOrderNumber: `WO-FIX-${part.id.toUpperCase().slice(0, 4)}-${engineCycles}`,
                      ammTaskRef: defectInfo?.governingManual || "AMM 72-00-00",
                      technicianName: userSession?.name || "Certifying Engineer",
                      technicianBadge: "AME-LIC-DEMO",
                      itemsChecked: defectInfo?.requiredAction.slice(0, 3) || ["Visual Inspection", "Torque Check"],
                      findingsSummary: `Rectified: Completed required actions per ${defectInfo?.governingManual || "AMM"}`,
                      technicianNotes: `Defect cleared and component returned to service. Airworthiness determination verified compliant.`,
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-950/50 transition cursor-pointer"
                  title="Sign off maintenance procedure and clear red warning light"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sign Off Fix & Clear Red Light</span>
                </button>
              )}
              {showDefectManualView && !isPartAffected && onUpdatePartStatus && (
                <button
                  onClick={() => onUpdatePartStatus(part.id, "affected")}
                  className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition cursor-pointer"
                >
                  Simulate Red Alert in 3D
                </button>
              )}
              <button
                onClick={() => setCardTab("history")}
                className="text-sky-400 hover:text-white hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Record in Logbook</span> &rarr;
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
          historyLogs={historyLogs}
          onSelectComponent={onSelectConnectedPart}
          onOpenHistoryTab={() => setCardTab("history")}
          onOpenCitation={onOpenCitation}
        />
      ) : cardTab === "history" ? (
        <ComponentHistoryView
          part={part}
          historyLogs={historyLogs}
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

      {/* 8. Ask About This Part (Gemini Copilot Box with Live Google Search Grounding) */}
      <div className="p-4 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/40 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span>Ask Copilot About This Component</span>
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                <span className="flex items-center gap-1 text-sky-300">
                  <Bot className="w-3 h-3 text-sky-400" />
                  Gemini 3.8 Flash
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  Live Google Search Grounding Active
                </span>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded">
            FAA / EASA Directives & AMM Library
          </span>
        </div>

        {/* Quick Question Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            "Latest FAA ADs on powder metal disks",
            "What is the life retirement basis?",
            "Primary failure modes & inspection limits",
            "EASA ultrasonic inspection intervals",
            "Certified alloy composition & thermal limits",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => {
                setQuestion(prompt);
                handleAsk(prompt);
              }}
              className="text-[11px] text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Question Input */}
        <div className="relative">
          <input
            id="input-part-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder={`Ask a specific question about the ${part.name} (live FAA/EASA bulletins or AMM procedures)...`}
            className="w-full bg-slate-950/90 border border-slate-700 focus:border-sky-500 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans"
          />
          <button
            onClick={() => handleAsk()}
            disabled={isAsking || !question.trim()}
            className="absolute right-1.5 top-1.5 p-1.5 text-sky-400 hover:text-white disabled:text-slate-600 rounded-md transition cursor-pointer"
            title="Send Query with Live Google Search"
          >
            {isAsking ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Grounding Indicator during search */}
        {isAsking && (
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-center justify-between text-xs text-sky-200 animate-pulse font-mono">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400 animate-spin" />
              <span>Grounding query with live Google Search...</span>
            </div>
            <span className="text-[10px] text-slate-400">Querying FAA / EASA / P&W Bulletins</span>
          </div>
        )}

        {/* Executed Search Queries Bar */}
        {searchQueries.length > 0 && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] mb-1">
              <Globe className="w-3 h-3 text-sky-400" />
              <span>Google Search Grounding Queries Executed by Gemini:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {searchQueries.map((sq, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50 font-mono text-[10px]"
                >
                  &quot;{sq}&quot;
                </span>
              ))}
            </div>
          </div>
        )}

        {/* API Credit Warning Banner */}
        {apiError?.type === "CREDITS_DEPLETED" && (
          <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-800/80 text-xs text-amber-200 space-y-2 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Gemini API Prepayment Credits Depleted (HTTP 402)</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 border border-amber-700/60 font-semibold shrink-0">
                Fallback Engine Active
              </span>
            </div>
            <p className="text-[11px] text-amber-100/90 leading-relaxed font-sans">
              The Google Cloud project linked in AI Studio has exhausted its prepayment credits for live Gemini 3.8 Flash & Google Search.
              To avoid empty errors, <strong>EngineIQ On-Wing Knowledge Engine</strong> has dynamically analyzed your question and synthesized the authentic engineering response below.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href="https://ai.google.dev/gemini-api/docs/billing#prepay"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition shadow cursor-pointer"
              >
                <span>Add AI Studio Credits</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[10px] text-amber-300/80 font-mono">
                or switch to a funded billing project in AI Studio settings
              </span>
            </div>
          </div>
        )}

        {/* Answer Display */}
        {answer && (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs leading-relaxed text-slate-200 space-y-3 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 flex-wrap gap-2">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> Copilot Grounded Answer:
              </span>
              <div className="flex items-center gap-2">
                {sources.length > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> {sources.length} Live Sources
                  </span>
                )}
                {isOfflineSample ? (
                  <span className="text-[10px] font-mono uppercase bg-slate-900 text-amber-400 px-2 py-0.5 rounded border border-amber-800/60 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    On-Wing Knowledge Engine (Offline Mode)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Live Gemini 3.8 Flash + Google Search
                  </span>
                )}
              </div>
            </div>

            {/* Formatted Text with local citation badges */}
            <div className="font-sans leading-relaxed text-slate-200 whitespace-pre-line">
              {renderTextWithCitations(answer)}
            </div>

            {/* Grounded Web Sources (Clickable Badges) */}
            {sources.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold block">
                  Grounded Regulatory & Technical Sources:
                </span>
                <div className="flex flex-wrap gap-2">
                  {sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 text-sky-300 hover:text-white transition group cursor-pointer text-[11px]"
                      title={src.title}
                    >
                      <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-medium max-w-[260px] truncate">{src.title}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-300 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
